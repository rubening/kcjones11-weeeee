/* Three original chiptunes, synthesized locally. No sampled recordings. */
'use strict';
(() => {
  const el = id => document.getElementById(id);
  let context, musicBus, fxBus, timer, nextTime = 0, step = 0;
  let musicOn = false, fxOn = false;
  const voices = new Set();
  const tracks = [
    { id: 'critter', name: 'Critter Shuffle', bpm: 176, swing: .12, description: 'Squeaky lead · bouncy dance rhythm' },
    { id: 'polka', name: 'Personal Space Polka', bpm: 184, swing: 0, description: 'Bright arcade pop · bouncing bass' },
    { id: 'turbo', name: 'Turbo Tippy Toes', bpm: 202, swing: 0, description: 'Fast synth racer · punchy drums' }
  ];
  let trackIndex = 0;
  let tick = 60 / tracks[trackIndex].bpm / 4;
  let volumes = { music: 35, fx: 65 };
  try { const saved = JSON.parse(localStorage.getItem('kcw-audio') || '{}'); if (typeof saved.track === 'string') trackIndex = Math.max(0, tracks.findIndex(track => track.id === saved.track)); tick = 60 / tracks[trackIndex].bpm / 4; for (const key of ['music','fx']) if (Number.isFinite(saved[key])) volumes[key] = Math.max(0, Math.min(100, saved[key])); } catch {}
  const save = () => { try { localStorage.setItem('kcw-audio', JSON.stringify({ ...volumes, track: tracks[trackIndex].id })); } catch {} };
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);
  function init() {
    if (context) return;
    context = new (window.AudioContext || window.webkitAudioContext)();
    musicBus = context.createGain(); fxBus = context.createGain();
    musicBus.gain.value = 0; fxBus.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.knee.value = 14; limiter.ratio.value = 5;
    musicBus.connect(limiter); fxBus.connect(limiter); limiter.connect(context.destination);
  }
  function level(bus, value) { if (!context) return; bus.gain.cancelScheduledValues(context.currentTime); bus.gain.setTargetAtTime(value, context.currentTime, .018); }
  function refresh() {
    el('music').textContent = musicOn ? '♫ MUSIC ON' : '♫ MUSIC OFF';
    el('music').setAttribute('aria-pressed', String(musicOn));
    el('sound').textContent = fxOn ? 'FX ON' : 'FX OFF';
    el('sound').setAttribute('aria-pressed', String(fxOn));
    const track = tracks[trackIndex];
    el('music-state').textContent = (musicOn ? 'Playing · ' : '') + track.name + ' · ' + track.bpm + ' BPM';
    el('track-select').value = track.id;
    el('track-description').textContent = track.description;
    el('next-track').setAttribute('aria-label', 'Next track: ' + tracks[(trackIndex + 1) % tracks.length].name);
    el('track-number').textContent = (trackIndex + 1) + ' / ' + tracks.length;
    if (context) { level(musicBus, musicOn && !document.hidden ? volumes.music / 100 : 0); level(fxBus, fxOn ? volumes.fx / 100 : 0); }
  }
  function tone(note, time, length, type, amplitude, pan = 0, glide = 0) {
    const osc = context.createOscillator(), gain = context.createGain(), stereo = context.createStereoPanner();
    osc.type = type; osc.frequency.setValueAtTime(frequency(note), time);
    if (glide) osc.frequency.exponentialRampToValueAtTime(frequency(note + glide), time + length);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(amplitude, time + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    stereo.pan.value = pan; osc.connect(gain); gain.connect(stereo); stereo.connect(musicBus);
    voices.add(osc); osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); stereo.disconnect(); };
    osc.start(time); osc.stop(time + length + .01);
  }
  let noise;
  function drum(time, length, amp, highpass) {
    if (!noise) { noise = context.createBuffer(1, context.sampleRate * .3, context.sampleRate); const data = noise.getChannelData(0); let seed = 123456; for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1; } }
    const src = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    src.buffer = noise; filter.type = 'highpass'; filter.frequency.value = highpass;
    gain.gain.setValueAtTime(amp, time); gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    src.connect(filter); filter.connect(gain); gain.connect(musicBus); voices.add(src);
    src.onended = () => { voices.delete(src); src.disconnect(); filter.disconnect(); gain.disconnect(); };
    src.start(time); src.stop(time + length);
  }
  // Newly composed call-and-response melodies; no sampled or quoted song melody.
  const melodies = [
    [76,null,79,83,81,null,79,null,74,76,79,null,81,79,76,null],
    [74,null,78,81,83,81,78,null,74,null,76,78,81,null,78,null],
    [72,76,79,null,84,null,83,79,76,null,79,81,79,76,72,null],
    [74,null,78,81,86,83,81,null,78,74,76,null,78,81,79,null],
    [83,null,86,88,86,83,81,null,79,81,83,null,79,76,79,null],
    [81,78,74,null,78,81,86,null,88,86,83,81,78,null,74,null],
    [84,null,79,76,79,83,84,null,88,86,84,83,79,76,79,null],
    [81,83,86,null,83,81,78,null,74,78,81,79,78,74,71,null]
  ];
  const roots = [43,50,48,50,43,47,48,50];
  function schedulePolka(index, time) {
    const bar = Math.floor(index / 16) % 32, beat = index % 16, section = Math.floor(bar / 8);
    const root = roots[bar % 8], minor = bar % 8 === 5;
    const melody = melodies[(bar % 4) + (section === 1 || section === 3 ? 4 : 0)];
    const note = melody[beat];
    if (note !== null && !(section === 2 && bar % 8 < 4 && beat % 4 !== 0)) {
      tone(note + (section === 3 && bar % 8 >= 6 ? 12 : 0), time, tick * 1.35, 'square', .065, -.13);
      tone(note - 12, time + tick * .04, tick, 'triangle', .05, .13);
      if (section === 1 || section === 3) tone(note, time + tick * 3, tick * .9, 'triangle', .022, .45);
    }
    if (beat % 4 === 0 || beat === 10) tone(root + (beat === 8 ? 7 : 0), time, tick * 2.4, 'triangle', .29, 0);
    if (beat % 4 === 2) for (const interval of [12,minor ? 15 : 16,19]) tone(root + interval, time, tick * .8, 'square', .017, -.3);
    if (section >= 2 && beat % 2 === 1) tone(root + [24,28,31,36][Math.floor(beat / 2) % 4], time, tick * .65, 'triangle', .037, .4);
    if (beat % 4 === 0) tone(44, time, .13, 'sine', .42, 0, -26);
    if (beat === 4 || beat === 12) { drum(time, .115, .12, 1100); tone(49, time, .055, 'triangle', .12, 0, -9); }
    if (beat % 2 === 0) drum(time, beat % 4 === 2 ? .06 : .028, .043, 6500);
    if (bar % 8 === 7 && beat >= 12) drum(time, .045, .065, 1800);
  }
  // Short, repeated eighth-note phrases with longer replies give this original
  // tune a playful novelty-dance rhythm. Pitches and harmony are newly composed.
  const critterPhrases = [
    [[0,85,1.6],[2,80,1.6],[4,83,1.6],[6,87,1.6],[8,85,1.6],[10,80,1.6],[12,78,3.4],[16,83,1.6],[18,80,1.6],[20,78,1.6],[22,75,1.6],[24,80,3.4],[28,78,3.4]],
    [[0,85,1.6],[2,80,1.6],[4,83,1.6],[6,87,1.6],[8,90,1.6],[10,87,1.6],[12,85,3.4],[16,87,1.6],[18,83,1.6],[20,80,1.6],[22,83,1.6],[24,78,3.4],[28,73,3.4]],
    [[0,90,1.6],[2,87,1.6],[4,85,1.6],[6,83,1.6],[8,87,1.6],[10,90,1.6],[12,92,3.4],[16,90,1.6],[18,85,1.6],[20,83,1.6],[22,80,1.6],[24,83,3.4],[28,85,3.4]],
    [[0,87,1.6],[2,83,1.6],[4,80,1.6],[6,78,1.6],[8,80,1.6],[10,83,1.6],[12,85,3.4],[16,83,1.6],[18,80,1.6],[20,78,1.6],[22,75,1.6],[24,73,3.4],[28,78,3.4]]
  ];
  function scheduleCritter(index, time) {
    const bar = Math.floor(index / 16), beat = index % 16, section = Math.floor(bar / 8);
    const root = [42,42,47,49,42,46,47,49][bar % 8];
    const phrase = critterPhrases[Math.floor(bar / 2) % 4];
    const event = phrase.find(note => note[0] === index % 32);
    if (event && !(section === 2 && bar % 8 < 4 && beat % 4 !== 0)) {
      const pitch = event[1] + (section === 3 ? 12 : 0);
      tone(pitch, time, tick * event[2], 'triangle', .13, -.15, .16);
      tone(pitch + 12, time, tick * event[2] * .7, 'sine', .035, .15, -.1);
      tone(pitch - 12, time, tick * event[2] * .9, 'square', .023, .1);
      if (section === 1 || section === 3) tone(pitch, time + tick * 3, tick, 'triangle', .024, .5);
    }
    if (beat % 4 === 0) tone(root + (beat === 8 ? 7 : 0), time, tick * 2.7, 'triangle', .3);
    if (beat % 4 === 2) for (const interval of [12,16,19]) tone(root + interval, time, tick * .8, 'square', .02, -.3);
    if (beat % 4 === 0) tone(44, time, .13, 'sine', .4, 0, -26);
    if (beat === 4 || beat === 12) { drum(time, .11, .12, 1250); tone(51, time, .055, 'triangle', .09, 0, -8); }
    if (beat % 2 === 0) drum(time, beat % 4 === 2 ? .07 : .025, .045, 7000);
    if (section >= 2 && beat % 2 === 1) tone(root + [24,31,28,36][Math.floor(beat / 2) % 4], time, tick * .75, 'triangle', .04, .4);
    if (bar % 8 === 7 && beat >= 12) drum(time, .045, .07, 1900);
  }
  const turboLead = [
    [76,null,83,79,null,86,83,null,88,86,null,83,79,null,83,86],
    [74,81,null,78,85,null,81,78,null,86,85,81,78,null,74,null],
    [72,null,79,76,83,null,84,83,79,76,null,79,84,83,null,79],
    [71,78,null,75,83,81,78,null,87,83,81,78,75,78,83,null]
  ];
  function scheduleTurbo(index, time) {
    const bar = Math.floor(index / 16), beat = index % 16, section = Math.floor(bar / 8);
    const root = [40,38,36,35][bar % 4], note = turboLead[bar % 4][beat];
    if (note !== null && !(section === 2 && bar % 8 < 4 && beat % 2)) {
      tone(note + (section === 3 ? 12 : 0), time, tick * .95, 'sawtooth', .04, -.12);
      tone(note - 12, time, tick * 1.4, 'square', .04, .12);
      if (section === 1 || section === 3) tone(note, time + tick * 3, tick, 'triangle', .027, .4);
    }
    if (beat % 2 === 0) { tone(root + (beat % 4 === 2 ? 12 : 0), time, tick * 1.4, 'triangle', .27); tone(root, time, tick, 'sawtooth', .024); }
    if (beat % 4 === 0 || beat === 10) tone(46, time, .12, 'sine', .42, 0, -28);
    if (beat === 4 || beat === 12) { drum(time, .12, .13, 950); tone(52, time, .06, 'triangle', .1, 0, -12); }
    if (beat % 2 === 0 || section === 3) drum(time, .035, .035, 6500);
    if (beat % 4 === 2) for (const interval of [24,27,31]) tone(root + interval, time, tick * .6, 'square', .015, -.4);
    if (bar % 8 === 7 && beat >= 12) tone(root + [24,27,31,36][beat - 12], time, tick, 'square', .05, .2);
  }
  function scheduleStep(index, time) {
    if (tracks[trackIndex].id === 'critter') scheduleCritter(index, time);
    else if (tracks[trackIndex].id === 'turbo') scheduleTurbo(index, time);
    else schedulePolka(index, time);
  }
  function selectTrack(index) {
    trackIndex = (index + tracks.length) % tracks.length;
    tick = 60 / tracks[trackIndex].bpm / 4;
    step = 0;
    if (musicOn && context) startSequencer();
    refresh(); save();
  }
  function pump() {
    if (!musicOn || document.hidden || context.state !== 'running') return;
    if (nextTime < context.currentTime - .1) nextTime = context.currentTime + .03;
    while (nextTime < context.currentTime + .16) { scheduleStep(step, nextTime + (step % 2 ? tick * tracks[trackIndex].swing : 0)); nextTime += tick; step = (step + 1) % 512; }
  }
  function stopSequencer() { clearInterval(timer); timer = null; for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); }
  function startSequencer() { stopSequencer(); nextTime = context.currentTime + .04; pump(); timer = setInterval(pump, 25); }
  async function toggle(kind) {
    const button = el(kind === 'music' ? 'music' : 'sound'); button.disabled = true;
    try {
      init(); await context.resume();
      if (kind === 'music') { musicOn = !musicOn; if (musicOn) { step = 0; startSequencer(); } else stopSequencer(); }
      else fxOn = !fxOn;
      refresh(); if (kind === 'fx' && fxOn) effect(440, .12);
    } catch { el('music-state').textContent = 'Audio unavailable. Try again or refresh your browser.'; }
    finally { button.disabled = false; }
  }
  function effect(f = 440, duration = .12) {
    if (!fxOn || !context || document.hidden) return;
    const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
    osc.frequency.setValueAtTime(f, now); osc.frequency.exponentialRampToValueAtTime(f * 2, now + duration);
    gain.gain.setValueAtTime(.10, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain); gain.connect(fxBus); osc.start(now); osc.stop(now + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  for (const kind of ['music','fx']) {
    const slider = el(kind + '-volume'), output = el(kind + '-value');
    slider.value = volumes[kind]; output.value = volumes[kind] + '%';
    slider.oninput = () => { volumes[kind] = Number(slider.value); output.value = slider.value + '%'; refresh(); save(); };
  }
  for (const track of tracks) { const option = document.createElement('option'); option.value = track.id; option.textContent = track.name; el('track-select').append(option); }
  el('track-select').onchange = event => selectTrack(tracks.findIndex(track => track.id === event.target.value));
  el('next-track').onclick = () => selectTrack(trackIndex + 1);
  el('previous-track').onclick = () => selectTrack(trackIndex - 1);
  el('mixer-next-track').onclick = () => selectTrack(trackIndex + 1);
  el('music').onclick = () => toggle('music'); el('sound').onclick = () => toggle('fx');
  document.addEventListener('visibilitychange', async () => {
    if (!context) return;
    if (document.hidden) { stopSequencer(); refresh(); }
    else if (musicOn) { try { await context.resume(); startSequencer(); refresh(); } catch {} }
  });
  window.GameAudio = { effect }; refresh();
})();
