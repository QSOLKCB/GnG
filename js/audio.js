/* Original oscillator-only effects and score. No samples. Apache-2.0. */
(function (G) {
  'use strict';
  class Audio {
    constructor() { this.enabled = false; this.context = null; this.voices = new Set(); this.beat = 0; this.clock = 0; this.music = 0.35; }
    async enable() {
      try {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        if (!this.context) this.context = new Context();
        await this.context.resume(); this.enabled = true; return true;
      } catch (_) { return false; }
    }
    stop() {
      for (const osc of this.voices) { try { osc.stop(); } catch (_) { /* already ended */ } }
      this.voices.clear(); this.clock = 0;
    }
    tone(frequency, seconds = 0.1, volume = 0.05, type = 'square', end = frequency) {
      if (!this.enabled || !this.context || this.context.state !== 'running' || this.voices.size >= 16 || volume <= 0) return;
      const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
      osc.type = type; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + seconds);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain); gain.connect(ctx.destination); this.voices.add(osc);
      osc.onended = () => { this.voices.delete(osc); osc.disconnect(); gain.disconnect(); };
      osc.start(); osc.stop(now + seconds + 0.02);
    }
    effect(event) {
      const sound = {
        shoot: [460, 0.07, 0.025, 'square', 130], jump: [150, 0.14, 0.03, 'triangle', 390],
        stun: [120, 0.2, 0.045, 'sawtooth', 38], hit: [85, 0.22, 0.06, 'sawtooth', 28],
        receipt: [650, 0.22, 0.045, 'triangle', 980], rescue: [440, 0.3, 0.045, 'square', 880],
        serve: [880, 0.35, 0.045, 'triangle', 220], tech: [240, 0.25, 0.04, 'square', 960],
        checkpoint: [330, 0.45, 0.05, 'triangle', 660], boss: [98, 0.18, 0.04, 'sawtooth', 40], clear: [440, 0.8, 0.045, 'triangle', 1320]
      }[event];
      if (sound) this.tone(...sound);
    }
    tick(dt, stage) {
      if (!this.enabled) return;
      this.clock -= dt;
      if (this.clock > 0) return;
      this.clock = 0.2;
      const notes = [0, 7, 12, 7, 3, 10, 15, 10, 5, 12, 17, 12, 7, 14, 19, 10];
      const root = [110, 98, 123.47][stage];
      this.tone(root * Math.pow(2, notes[this.beat % 16] / 12), 0.15, 0.035 * this.music, 'triangle');
      if (this.beat % 4 === 0) this.tone(root / 2, 0.27, 0.055 * this.music, 'triangle');
      this.beat++;
    }
  }
  G.Audio = Audio;
})(globalThis.GnG);
