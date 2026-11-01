'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const G = require('../js/world.js');
require('../js/receipts.js');
const steps = (g, n, input = {}) => { for (let i = 0; i < n; i++) g.step(input); };

test('jump can reach raised platforms; release produces a shorter jump', () => {
  const held = new G.Game(), tap = new G.Game();
  let high = G.GROUND, low = G.GROUND;
  for (let i = 0; i < 60; i++) { held.step({ jump: true }); tap.step({ jump: i < 2 }); high = Math.min(high, held.player.y); low = Math.min(low, tap.player.y); }
  assert.ok(low - high > 35);
  const g = new G.Game(); g.player.x = 360;
  steps(g, 60, { jump: true });
  assert.equal(g.player.y + g.player.h, 228);
  assert.ok(g.player.grounded);
});

test('jump buffering and coyote time tolerate late/early presses', () => {
  const g = new G.Game();
  g.player.grounded = false; g.player.y = 263; g.player.vy = 15; g.player.coyote = 0.08;
  g.step({ jump: true }); assert.ok(g.player.vy < -400);
  const b = new G.Game(); b.player.grounded = false; b.player.y = 260; b.player.vy = 80; b.player.coyote = 0;
  b.step({ jump: true }); steps(b, 4, { jump: true }); assert.ok(b.player.vy < -350);
});

test('receipt payloads have real SHA-256 hashes', () => {
  assert.equal(G.receipts.length, 9);
  for (const r of G.receipts) assert.equal(crypto.createHash('sha256').update(r.payload, 'utf8').digest('hex'), r.sha256);
  assert.equal(new Set(G.receipts.map(r => r.sha256)).size, 9);
});

test('receipts are collected once and only consumed for an unserved nearby actor', () => {
  const g = new G.Game(), r = g.stage.receipts[0];
  g.player.x = r.x; g.step(); assert.deepEqual(g.inventory, [r.id]);
  steps(g, 80, { use: true }); assert.equal(g.inventory.length, 1);
  const actor = g.stage.enemies.find(e => e.type === 'actor');
  g.player.x = actor.x - 50; g.player.y = 264; g.interact();
  assert.ok(actor.served); assert.equal(g.inventory.length, 0); assert.equal(g.ledger[0].served, g.stage.name);
  const score = g.score; g.interact(); assert.equal(g.score, score);
});

test('agents capture gremlins, but every capture remains recoverable', () => {
  const g = new G.Game(), gremlin = g.stage.gremlins[0], guard = g.stage.enemies[0];
  g.player.x = 400; guard.x = gremlin.x + 20;
  steps(g, 250); assert.ok(gremlin.caged);
  g.player.x = gremlin.x - 20; g.interact(); assert.equal(gremlin.rescued, false);
  g.stun(guard); g.interact(); assert.ok(gremlin.rescued);
});

test('stun bolts release stolen technology, and repeated stun gives no score farm', () => {
  const g = new G.Game(), dev = g.stage.enemies.find(e => e.type === 'dev'), t = g.stage.tech[0];
  g.player.x = dev.x - 90; g.player.facing = 1;
  steps(g, 24, { fire: true });
  assert.ok(dev.stun > 0); assert.equal(t.carrier, null);
  const score = g.score; g.stun(dev); assert.equal(g.score, score);
  g.player.x = t.x; g.step(); assert.ok(t.collected);
});

test('a developer reaching its vault leaves tech inside the playable map', () => {
  const g = new G.Game(), dev = g.stage.enemies.find(e => e.type === 'dev'), t = g.stage.tech[0];
  g.player.x = dev.home - 190;
  steps(g, 340);
  assert.equal(t.carrier, null); assert.ok(t.x <= dev.home + 150); assert.ok(t.x >= dev.home);
  g.stun(dev); g.player.x = t.x; g.step(); assert.ok(t.collected);
});

test('checkpoint retry keeps receipts and objectives, restores armour, clears hazards', () => {
  const g = new G.Game();
  g.rescue(g.stage.gremlins[0]);
  g.player.x = g.stage.receipts[0].x; g.step();
  g.player.x = g.stage.checkpoints[0].x; g.step();
  const score = g.score;
  g.player.hp = 1; g.player.invuln = 0; g.hurt(); assert.equal(g.state, 'downed');
  const ticks = g.ticks; g.step({ right: true }); assert.equal(g.ticks, ticks);
  g.retry(); assert.equal(g.player.x, g.checkpoint); assert.equal(g.player.hp, 5); assert.equal(g.score, score);
  assert.equal(g.objectives().gremlins, 1); assert.equal(g.inventory.length, 1); assert.equal(g.hazards.length, 0);
});

test('gate and final auditor enforce objectives; terminal state does not advance twice', () => {
  const g = new G.Game(); g.loadStage(2);
  g.player.x = g.stage.portal.x; g.interact(); assert.equal(g.state, 'playing');
  g.stage.gremlins.forEach(x => x.rescued = true); g.stage.tech.forEach(x => x.collected = true);
  g.stage.enemies.filter(x => x.type === 'actor').forEach(x => x.served = true);
  assert.ok(g.ready()); assert.equal(g.gateOpen(), false);
  g.player.x = g.stage.boss.x - 180;
  steps(g, 240, { fire: true }); assert.ok(g.stage.boss.hp < 12);
  g.stage.boss.hp = 0; g.player.x = g.stage.portal.x; g.interact(); assert.equal(g.state, 'won');
  const score = g.score; steps(g, 600, { right: true, use: true }); assert.equal(g.score, score);
});

test('fatal contact cannot also collect or clear in the same simulation tick', () => {
  const g = new G.Game(); g.player.x = 270; g.player.hp = 1; g.player.invuln = 0;
  g.hazards.push({ x: 270, y: 265, w: 20, h: 20, vx: 0, vy: 0, life: 2 });
  g.step({ use: true }); assert.equal(g.state, 'downed'); assert.equal(g.inventory.length, 0);
});

// Drives the real simulation solely through normal controls. No entity moves,
// invulnerability, objective injection, or stage skips are used by this bot.
function campaign(mode) {
  const g = new G.Game(mode);
  let jumpTicks = 0, lastStage = 0, clears = 0;
  for (let tick = 0; tick < 36000; tick++) {
    if (g.state === 'won') return { g, tick, clears };
    if (g.state === 'downed') { g.retry(); jumpTicks = 0; }
    if (g.state === 'cleared') { clears++; g.advance(); jumpTicks = 0; }
    if (g.stage.index !== lastStage) lastStage = g.stage.index;
    const s = g.stage, p = g.player;
    const targets = [
      ...s.receipts.filter(r => !r.collected), ...s.gremlins.filter(r => !r.rescued), ...s.tech.filter(r => !r.collected),
      ...s.enemies.filter(e => e.type === 'actor' && !e.served && g.inventory.length)
    ].sort((a, b) => a.x - b.x);
    let target = targets[0] || s.portal;
    let tx = target.x;
    if (!targets.length && s.boss && s.boss.hp > 0) tx = s.boss.x - 185;
    // Step off an optional platform if knocked onto it above an objective.
    if (p.grounded && p.y + p.h < G.GROUND && Math.abs(p.x - tx) < 20) {
      const platform = s.platforms.find(f => Math.abs(f.y - p.y - p.h) < 1 && p.x + p.w > f.x && p.x < f.x + f.w);
      if (platform) tx = platform.x + platform.w + 5;
    }
    let left = p.x > tx + 4, right = p.x < tx - 4;
    // When opening a cage, face its still-active guard before firing.
    const guard = s.enemies.find(e => e.type === 'agent' && !e.stun && Math.abs(e.x - p.x) < 100);
    if (!left && !right && guard) { left = guard.x < p.x; right = !left; }
    const obstacle = s.spikes.find(h => right && h.x > p.x && h.x - p.x < 65 || left && h.x + h.w < p.x + p.w && p.x - h.x - h.w < 65);
    if (obstacle && p.grounded && jumpTicks === 0) jumpTicks = 38;
    g.step({ left, right, fire: true, use: true, jump: jumpTicks-- > 0 });
    jumpTicks = Math.max(0, jumpTicks);
  }
  assert.fail(`Campaign stalled: ${JSON.stringify({ mode, stage: g.stage.index, x: g.player.x, y: g.player.y, state: g.state, objectives: g.objectives(), inventory: g.inventory.length, boss: g.stage.boss?.hp, tech: g.stage.tech })}`);
}
for (const mode of ['merciful', 'arcade']) test(`full three-district ${mode} campaign is completable with real controls`, () => {
  const { g, tick, clears } = campaign(mode);
  assert.equal(g.state, 'won'); assert.equal(clears, 2); assert.equal(g.ledger.length, 9);
  assert.equal(g.ledger.filter(r => r.served).length, 6); assert.equal(g.stage.boss.hp, 0);
  assert.ok(tick < 36000); assert.ok(g.score > 10000);
});

test('fixed input sequence is deterministic and effect/projectile pools stay bounded', () => {
  const a = new G.Game(), b = new G.Game();
  for (let i = 0; i < 10000; i++) {
    const input = { right: i % 800 < 400, left: i % 800 >= 400, jump: i % 55 < 28, fire: true, use: true };
    for (const g of [a, b]) {
      if (g.state === 'downed') g.retry();
      g.step(input);
      assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y));
      assert.ok(g.bullets.length <= 12 && g.hazards.length <= 24 && g.particles.length <= 160 && g.events.length <= 32);
    }
  }
  assert.deepEqual(a, b);
});
