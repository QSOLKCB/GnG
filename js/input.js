/* Keyboard, simultaneous touch pointers, and standard gamepads. Apache-2.0. */
(function (G) {
  'use strict';
  const bindings = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyJ: 'fire', KeyZ: 'fire', KeyE: 'use', KeyK: 'use', KeyX: 'use' };
  class Input {
    constructor(canvas, onPause) {
      this.keys = new Set(); this.pointers = new Map(); this.pending = new Set(); this.padPause = false; this.blockPad = false; this.active = false;
      this.canvas = canvas;
      document.addEventListener('keydown', e => {
        if (!this.active || /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName)) return;
        if (bindings[e.code]) {
          e.preventDefault(); this.keys.add(e.code);
          if (!e.repeat && ['jump', 'fire', 'use'].includes(bindings[e.code])) this.pending.add(bindings[e.code]);
        }
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); this.onPause(); }
      });
      document.addEventListener('keyup', e => this.keys.delete(e.code));
      for (const button of document.querySelectorAll('[data-action]')) {
        button.addEventListener('pointerdown', e => {
          e.preventDefault(); if (!this.active) return;
          button.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, button.dataset.action); button.classList.add('pressed');
          if (['jump', 'fire', 'use'].includes(button.dataset.action)) this.pending.add(button.dataset.action);
          canvas.focus({ preventScroll: true });
        });
        const release = e => { this.pointers.delete(e.pointerId); if (![...this.pointers.values()].includes(button.dataset.action)) button.classList.remove('pressed'); };
        button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
      }
      this.onPause = onPause;
    }
    clear() { this.keys.clear(); this.pointers.clear(); this.pending.clear(); this.blockPad = true; document.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); }
    consume() { this.pending.clear(); }
    read() {
      const out = {};
      if (this.active) {
        for (const key of this.keys) out[bindings[key]] = true;
        for (const action of this.pointers.values()) out[action] = true;
        for (const action of this.pending) out[action] = true;
      }
      let pads = [];
      try { pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(p => p && p.mapping === 'standard') : []; } catch (_) { /* keyboard remains available */ }
      const p = pads[0];
      if (p) {
        const down = i => !!(p.buttons[i] && p.buttons[i].pressed);
        const neutral = !p.buttons.some(b => b.pressed) && Math.abs(p.axes[0] || 0) < 0.3;
        if (this.blockPad) { if (neutral) this.blockPad = false; this.padPause = down(9); return out; }
        if (this.active) {
          out.left ||= (p.axes[0] || 0) < -0.3 || down(14); out.right ||= (p.axes[0] || 0) > 0.3 || down(15);
          out.jump ||= down(0); out.fire ||= down(2); out.use ||= down(1) || down(3);
        }
        if (down(9) && !this.padPause) this.onPause();
        this.padPause = down(9);
      } else { this.blockPad = false; this.padPause = false; }
      return out;
    }
  }
  G.Input = Input;
})(globalThis.GnG);
