'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup() {
  function element(action) {
    const handlers = {}, classes = new Set();
    return { dataset: { action }, tagName: 'CANVAS', handlers,
      classList: { add: s => classes.add(s), remove: s => classes.delete(s), contains: s => classes.has(s) },
      addEventListener: (type, fn) => (handlers[type] ||= []).push(fn), setPointerCapture() {}, focus() {},
      emit(type, options = {}) {
        const e = { target: this, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; }, ...options };
        for (const fn of handlers[type] || []) { fn(e); if (e.stopped) break; }
      }
    };
  }
  const buttons = ['left', 'right', 'jump', 'fire', 'use'].map(element), canvas = element();
  const document = element(); document.querySelectorAll = q => q === '[data-action]' ? buttons : buttons.filter(b => b.classList.contains('pressed'));
  const navigator = { getGamepads: () => [] };
  const context = vm.createContext({ GnG: {}, document, navigator });
  vm.runInContext(fs.readFileSync('js/input.js', 'utf8'), context);
  let phase = 'playing', toggles = 0;
  const input = new context.GnG.Input(canvas, () => { phase = phase === 'playing' ? 'paused' : 'playing'; toggles++; input.active = phase === 'playing'; input.clear(); });
  input.active = true;
  return { input, document, buttons, canvas, navigator, phase: () => phase, toggles: () => toggles };
}

test('keyboard aliases do not cancel each other when one key is released', () => {
  const { input, document } = setup();
  document.emit('keydown', { code: 'ArrowLeft' }); document.emit('keydown', { code: 'KeyA' });
  document.emit('keyup', { code: 'ArrowLeft' }); assert.equal(input.read().left, true);
  document.emit('keyup', { code: 'KeyA' }); assert.equal(input.read().left, undefined);
});

test('pause key cannot immediately bubble into the shell resume listener', () => {
  const s = setup(); let downstream = false;
  s.document.addEventListener('keydown', () => downstream = true);
  s.document.emit('keydown', { code: 'KeyP', repeat: false });
  assert.equal(s.phase(), 'paused'); assert.equal(s.toggles(), 1); assert.equal(downstream, false);
});

test('buttons and selects keep native keyboard activation', () => {
  const s = setup();
  s.document.emit('keydown', { code: 'Space', target: { tagName: 'BUTTON' } });
  s.document.emit('keydown', { code: 'ArrowLeft', target: { tagName: 'SELECT' } });
  assert.equal(Object.keys(s.input.read()).length, 0);
});

test('simultaneous touch controls, cancellation, and scene clearing', () => {
  const { input, buttons } = setup();
  buttons[0].emit('pointerdown', { pointerId: 1 }); buttons[3].emit('pointerdown', { pointerId: 2 });
  assert.equal(input.read().left, true); assert.equal(input.read().fire, true);
  buttons[0].emit('pointercancel', { pointerId: 1 }); assert.equal(input.read().left, undefined); assert.equal(input.read().fire, true);
  input.clear(); assert.equal(Object.keys(input.read()).length, 0); assert.equal(buttons[3].classList.contains('pressed'), false);
});

test('standard gamepad Start pauses and resumes after controls return to neutral', () => {
  const s = setup(), pad = { mapping: 'standard', axes: [0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  s.navigator.getGamepads = () => [pad];
  pad.buttons[9].pressed = true; s.input.read(); assert.equal(s.phase(), 'paused');
  s.input.read(); assert.equal(s.toggles(), 1);
  pad.buttons[9].pressed = false; s.input.read();
  pad.buttons[9].pressed = true; s.input.read(); assert.equal(s.phase(), 'playing'); assert.equal(s.toggles(), 2);
  pad.buttons[9].pressed = false; s.input.read();
  pad.buttons[0].pressed = true; pad.axes[0] = 0.8; const action = s.input.read(); assert.equal(action.jump, true); assert.equal(action.right, true);
});

test('denied gamepad API preserves keyboard play', () => {
  const s = setup(); s.navigator.getGamepads = () => { throw Error('denied'); };
  s.document.emit('keydown', { code: 'KeyJ' }); assert.equal(s.input.read().fire, true);
});

test('a short action tap survives keyup and render frames until a simulation tick consumes it', () => {
  const s = setup();
  s.document.emit('keydown', { code: 'Space' }); s.document.emit('keyup', { code: 'Space' });
  assert.equal(s.input.read().jump, true); assert.equal(s.input.read().jump, true);
  s.input.consume(); assert.equal(s.input.read().jump, undefined);
  s.buttons[4].emit('pointerdown', { pointerId: 9 }); s.buttons[4].emit('pointerup', { pointerId: 9 });
  assert.equal(s.input.read().use, true); s.input.clear(); assert.equal(s.input.read().use, undefined);
});
