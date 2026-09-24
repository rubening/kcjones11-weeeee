/* Personal Space Polka: an original 184 BPM, 32-bar chiptune loop. */
'use strict';
(() => {
  const el = id => document.getElementById(id);
  let context, musicBus, fxBus, timer, nextTime = 0, step = 0;
  let musicOn = false, fxOn = false;
  const voices = new Set();
  const bpm = 184, tick = 60 / bpm / 4;
  let volumes = { music: 35, fx: 65 };
  try { const saved = JSON.parse(localStorage.getItem('kcw-audio') || '{}'); for (const key of ['music','fx']) if (Number.isFinite(saved[key])) volumes[key] = Math.max(0, Math.min(100, saved[key])); } catch {}
  const save = () => { try { localStorage.setItem('kcw-audio', JSON.stringify(volumes)); } catch {} };
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
    el('music-state').textContent = musicOn ? 'Playing · Personal Space Polka' : 'Personal Space Polka · 184 BPM';
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
  function scheduleStep(index, time) {
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
  function pump() {
    if (!musicOn || document.hidden || context.state !== 'running') return;
    if (nextTime < context.currentTime - .1) nextTime = context.currentTime + .03;
    while (nextTime < context.currentTime + .16) { scheduleStep(step, nextTime); nextTime += tick; step = (step + 1) % 512; }
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
  el('music').onclick = () => toggle('music'); el('sound').onclick = () => toggle('fx');
  document.addEventListener('visibilitychange', async () => {
    if (!context) return;
    if (document.hidden) { stopSequencer(); refresh(); }
    else if (musicOn) { try { await context.resume(); startSequencer(); refresh(); } catch {} }
  });
  window.GameAudio = { effect }; refresh();
})();
