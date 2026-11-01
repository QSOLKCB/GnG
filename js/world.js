/* Gremlins & Goblins — original game code. Apache-2.0. */
(function (root) {
  'use strict';
  const G = root.GnG = root.GnG || {};
  const STEP = 1 / 60, GROUND = 296, WIDTH = 3200;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const near = (a, b, range = 60) => Math.abs(a.x + a.w / 2 - b.x - b.w / 2) < range && Math.abs(a.y + a.h / 2 - b.y - b.h / 2) < 48;
  const stages = [
    { name: 'The Context Graveyard', short: 'CONTEXT GRAVEYARD', theme: 'graveyard', tagline: 'Some ideas refuse to stay buried.', boss: false },
    { name: 'The Borrowed-Tech Foundry', short: 'BORROWED-TECH FOUNDRY', theme: 'foundry', tagline: 'Their innovation. Your source code.', boss: false },
    { name: 'The Theatre of Concern', short: 'THEATRE OF CONCERN', theme: 'theatre', tagline: 'Extraordinary claims. Ordinary receipts.', boss: true }
  ];

  function makeStage(index) {
    const offset = index * 24;
    const platforms = [
      [340, 228, 130], [515, 168, 115], [1120, 228, 130],
      [1305, 168, 130], [1910, 228, 150], [2120, 170, 125], [2600, 228, 150]
    ].map(([x, y, w]) => ({ x, y, w, h: 16 }));
    const gremlins = [490, 1450, 2490].map((x, i) => ({ x, y: GROUND - 22, w: 22, h: 22, rescued: false, caged: i === 1, capture: 0, id: i }));
    const tech = [1160, 2110].map((x, i) => ({ x, y: GROUND - 20, w: 20, h: 20, collected: false, carrier: 'dev' + i, id: i }));
    const enemies = [
      ...gremlins.map((g, i) => ({ id: 'agent' + i, type: 'agent', x: g.x + 130, target: i, home: g.x + 130, y: GROUND - 32, w: 22, h: 32, stun: 0, timer: 0, dir: -1 })),
      ...tech.map((t, i) => ({ id: 'dev' + i, type: 'dev', x: t.x, target: i, home: t.x, vault: t.x + 150, y: GROUND - 30, w: 24, h: 30, stun: 0, timer: 0, dir: 1 })),
      ...[950 + offset, 2290 + offset].map((x, i) => ({ id: 'actor' + i, type: 'actor', x, home: x, y: GROUND - 36, w: 24, h: 36, served: false, stun: 0, timer: 1 + i, dir: -1 }))
    ];
    return {
      ...stages[index], index, width: WIDTH, platforms, gremlins, tech, enemies,
      spikes: [760 + offset, 1750 + offset, 2730].map(x => ({ x, y: GROUND - 10, w: 44, h: 10 })),
      receipts: [280, 880, 2000].map((x, i) => ({ x, y: GROUND - 25, w: 18, h: 24, collected: false, id: index * 3 + i })),
      hearts: [{ x: 560, y: 140, w: 16, h: 16, collected: false }, { x: 2160, y: 142, w: 16, h: 16, collected: false }],
      checkpoints: [1040, 1860].map(x => ({ x, y: GROUND - 44, w: 20, h: 44, active: false })),
      portal: { x: 3070, y: GROUND - 84, w: 56, h: 84 },
      boss: index === 2 ? { x: 2930, y: GROUND - 64, w: 54, h: 64, hp: 12, maxHp: 12, timer: 1.2, hit: 0, awake: false } : null
    };
  }

  class Game {
    constructor(mode = 'merciful') {
      this.mode = mode === 'arcade' ? 'arcade' : 'merciful';
      this.maxHp = this.mode === 'arcade' ? 3 : 5;
      this.score = 0; this.ticks = 0; this.retries = 0;
      this.inventory = []; this.ledger = []; this.events = [];
      this.state = 'playing'; this.loadStage(0);
    }
    loadStage(index) {
      this.stage = makeStage(index);
      this.player = { x: 70, y: GROUND - 32, w: 22, h: 32, vx: 0, vy: 0, facing: 1, hp: this.maxHp, grounded: true, invuln: 1.5, coyote: 0.1, jumpBuffer: 0, shot: 0, use: 0 };
      this.checkpoint = 70; this.bullets = []; this.hazards = []; this.particles = [];
      this.camera = 0; this.jumpHeld = false; this.message = this.stage.tagline; this.messageTime = 4;
      this.state = 'playing';
    }
    emit(type, x = this.player.x, y = this.player.y) {
      this.events.push(type);
      if (this.events.length > 32) this.events.shift();
      const colors = { rescue: '#b9e277', tech: '#f2bb66', receipt: '#f7e4b1', stun: '#a4d6df', hit: '#f17861', serve: '#e6a0bb', boss: '#f2bb66' };
      if (colors[type]) for (let i = 0; i < 10; i++) this.particles.push({ x, y, vx: (i % 5 - 2) * 32, vy: -25 - Math.floor(i / 3) * 30, life: 0.55, color: colors[type] });
      if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
    }
    say(text) { this.message = text; this.messageTime = 3; }
    objectives() {
      const s = this.stage;
      return { gremlins: s.gremlins.filter(g => g.rescued).length, tech: s.tech.filter(t => t.collected).length, actors: s.enemies.filter(e => e.type === 'actor' && e.served).length };
    }
    ready() { const o = this.objectives(); return o.gremlins === 3 && o.tech === 2 && o.actors === 2; }
    gateOpen() { return this.ready() && (!this.stage.boss || this.stage.boss.hp <= 0); }
    hurt() {
      const p = this.player;
      if (p.invuln > 0 || this.state !== 'playing') return;
      p.hp--; p.invuln = 1.6; p.vy = -180;
      this.emit('hit');
      if (p.hp <= 0) { this.state = 'downed'; this.emit('downed'); }
    }
    retry() {
      if (this.state !== 'downed') return;
      const p = this.player;
      p.x = this.checkpoint; p.y = GROUND - p.h; p.vx = p.vy = 0; p.hp = this.maxHp;
      p.invuln = 2; p.grounded = true; p.coyote = 0.1; p.jumpBuffer = 0; p.shot = p.use = 0;
      this.bullets = []; this.hazards = []; this.jumpHeld = false;
      this.retries++; this.state = 'playing'; this.say('Back on your feet. Your progress is safe.');
    }
    advance() {
      if (this.state === 'cleared' && this.stage.index < 2) this.loadStage(this.stage.index + 1);
    }
    interact() {
      if (this.state !== 'playing') return;
      const p = this.player, s = this.stage;
      const actor = s.enemies.find(e => e.type === 'actor' && !e.served && near(p, e, 94));
      if (actor) {
        if (!this.inventory.length) { this.say('Bring a receipt. The paper kind, with a hash.'); return; }
        const id = this.inventory.shift();
        actor.served = true;
        const record = this.ledger.find(r => r.id === id); record.served = s.name;
        this.score += 300; this.emit('serve', actor.x, actor.y);
        this.say(['"Oh. You have evidence."', '"I withdraw my very theatrical concern."'][s.index % 2]);
        return;
      }
      const cage = s.gremlins.find(g => g.caged && !g.rescued && near(p, g, 60));
      if (cage) {
        const guard = s.enemies.find(e => e.type === 'agent' && !e.stun && near(e, cage, 65));
        if (guard) { this.say('Stun the agent, then open the cage.'); return; }
        cage.caged = false; this.rescue(cage); return;
      }
      if (near(p, s.portal, 85)) {
        if (this.gateOpen()) {
          this.state = s.index === 2 ? 'won' : 'cleared';
          this.score += 1000; this.emit('clear');
        } else this.say(this.ready() ? 'The Grand Auditor still has objections. Stun it!' : 'Three gremlins. Two tech cores. Two actors. Then we leave.');
      }
    }
    rescue(g) {
      if (g.rescued) return;
      g.rescued = true; this.score += 250;
      this.emit('rescue', g.x, g.y); this.say('Gremlin safe. Knowledge containment unsuccessful.');
    }
    stun(e) {
      e.stun = this.mode === 'arcade' ? 3.5 : 5;
      if (!e.rewarded) { this.score += 50; e.rewarded = true; }
      if (e.type === 'dev') {
        const t = this.stage.tech[e.target];
        if (t.carrier === e.id) { t.carrier = null; t.x = e.x; t.y = GROUND - t.h; }
      }
      this.emit('stun', e.x, e.y);
    }
    step(input = {}) {
      if (this.state !== 'playing') return;
      const dt = STEP, s = this.stage, p = this.player;
      this.ticks++;
      this.messageTime = Math.max(0, this.messageTime - dt);
      for (const key of ['invuln', 'shot', 'use', 'jumpBuffer']) p[key] = Math.max(0, p[key] - dt);
      p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
      if (input.jump && !this.jumpHeld) p.jumpBuffer = 0.13;
      if (!input.jump && this.jumpHeld && p.vy < -160) p.vy *= 0.55;
      this.jumpHeld = !!input.jump;
      p.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 185;
      if (p.vx) p.facing = Math.sign(p.vx);
      if (p.jumpBuffer > 0 && p.coyote > 0) {
        p.vy = -440; p.grounded = false; p.coyote = p.jumpBuffer = 0; this.emit('jump');
      }
      p.x = clamp(p.x + p.vx * dt, 0, s.width - p.w);
      const oldBottom = p.y + p.h;
      p.vy = Math.min(p.vy + 1100 * dt, 650); p.y += p.vy * dt;
      p.grounded = false;
      if (p.vy >= 0) {
        let floor = GROUND;
        for (const platform of s.platforms) if (p.x + p.w > platform.x && p.x < platform.x + platform.w && oldBottom <= platform.y + 0.5 && p.y + p.h >= platform.y) floor = Math.min(floor, platform.y);
        if (p.y + p.h >= floor) { p.y = floor - p.h; p.vy = 0; p.grounded = true; }
      }
      if (input.fire && p.shot === 0 && this.bullets.length < 12) {
        this.bullets.push({ x: p.x + (p.facing > 0 ? p.w : -12), y: p.y + 12, w: 14, h: 7, vx: p.facing * 440, life: 0.9 });
        p.shot = 0.24; this.emit('shoot');
      }
      for (const e of s.enemies) {
        e.stun = Math.max(0, e.stun - dt); e.timer -= dt;
        if (e.served || e.stun || Math.abs(e.x - p.x) > 580) continue;
        const speed = this.mode === 'arcade' ? 39 : 28;
        if (e.type === 'agent') {
          const g = s.gremlins[e.target];
          const target = !g.rescued ? g.x + 20 : clamp(p.x, e.home - 150, e.home + 160);
          e.dir = Math.sign(target - e.x) || e.dir;
          if (Math.abs(target - e.x) > 5) e.x += e.dir * speed * dt;
          if (!g.rescued && !g.caged && near(e, g, 50)) {
            g.capture += dt;
            if (g.capture > 4) { g.caged = true; this.say('A gremlin was caged. Stun its guard and press E.'); }
          }
        } else if (e.type === 'dev') {
          const t = s.tech[e.target];
          const target = t.collected ? e.home : t.carrier === e.id ? e.vault : t.x;
          e.dir = Math.sign(target - e.x) || e.dir;
          if (Math.abs(target - e.x) > 4) e.x += e.dir * speed * dt;
          if (!t.collected && t.carrier === e.id) {
            t.x = e.x; t.y = e.y - 10;
            if (Math.abs(e.x - e.vault) < 8) { t.carrier = null; t.y = GROUND - t.h; e.timer = 3; }
          } else if (!t.collected && !t.carrier && near(e, t, 26) && e.timer <= 0) { t.carrier = e.id; e.vault = e.x > e.home + 60 ? e.home : e.home + 150; }
        } else if (e.type === 'actor' && e.timer <= 0) {
          const dir = Math.sign(p.x - e.x) || -1;
          if (this.hazards.length < 24) this.hazards.push({ x: e.x, y: e.y + 10, w: 12, h: 10, vx: dir * (this.mode === 'arcade' ? 125 : 90), vy: 0, life: 3 });
          e.timer = this.mode === 'arcade' ? 2 : 3.2;
        }
        if (overlap(p, e)) this.hurt();
      }
      for (const b of this.bullets) {
        b.x += b.vx * dt; b.life -= dt;
        const e = s.enemies.find(e => e.type !== 'actor' && !e.stun && overlap(b, e));
        if (e) { this.stun(e); b.life = 0; }
        const boss = s.boss;
        if (b.life > 0 && boss && boss.hp > 0 && overlap(b, boss)) {
          b.life = 0;
          if (this.ready() && boss.hit <= 0) { boss.hp--; boss.hit = 0.12; this.emit('boss', boss.x + 20, boss.y); if (boss.hp === 0) { this.score += 1500; this.say('Audit complete. No actionable findings.'); } }
        }
      }
      this.bullets = this.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < s.width);
      if (s.boss && s.boss.hp > 0) {
        const boss = s.boss;
        boss.hit = Math.max(0, boss.hit - dt); boss.awake = this.ready();
        if (boss.awake && Math.abs(p.x - boss.x) < 540) {
          boss.timer -= dt;
          if (boss.timer <= 0) {
            const dir = Math.sign(p.x - boss.x) || -1;
            for (const y of [boss.y + 36, boss.y - 8]) if (this.hazards.length < 24) this.hazards.push({ x: boss.x + 20, y, w: 15, h: 12, vx: dir * 110, vy: 0, life: 4 });
            boss.timer = this.mode === 'arcade' ? 1.2 : 1.9;
          }
        }
        if (overlap(p, boss)) this.hurt();
      }
      for (const b of this.hazards) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (overlap(p, b)) { this.hurt(); b.life = 0; }
      }
      this.hazards = this.hazards.filter(b => b.life > 0);
      for (const spike of s.spikes) if (overlap(p, spike)) this.hurt();
      // A fatal contact is terminal for this tick: it cannot also clear the stage.
      if (this.state !== 'playing') return;
      for (const g of s.gremlins) if (!g.rescued && !g.caged && near(p, g, 28)) this.rescue(g);
      for (const t of s.tech) if (!t.collected && !t.carrier && overlap(p, t)) { t.collected = true; this.score += 400; this.emit('tech', t.x, t.y); this.say('QSOL-INC technology recovered. Nice try, Z.Corp.'); }
      for (const r of s.receipts) if (!r.collected && overlap(p, r)) { r.collected = true; this.inventory.push(r.id); this.ledger.push({ id: r.id, served: null }); this.score += 100; this.emit('receipt', r.x, r.y); this.say('SHA-256 receipt acquired. Weaponised due diligence.'); }
      for (const h of s.hearts) if (!h.collected && p.hp < this.maxHp && overlap(p, h)) { h.collected = true; p.hp++; this.emit('rescue', h.x, h.y); }
      for (const c of s.checkpoints) if (!c.active && near(p, c, 32)) { c.active = true; this.checkpoint = c.x; p.hp = this.maxHp; this.emit('checkpoint'); this.say('Checkpoint. Armour restored. Your work is safe.'); }
      if (input.use && p.use === 0) { this.interact(); p.use = 0.35; }
      for (const f of this.particles) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 150 * dt; }
      this.particles = this.particles.filter(f => f.life > 0);
      this.camera = clamp(p.x - 215, 0, s.width - 640);
    }
    prompt() {
      const p = this.player, s = this.stage;
      if (s.enemies.some(e => e.type === 'actor' && !e.served && near(p, e, 94))) return this.inventory.length ? 'E / X  ·  SERVE RECEIPT' : 'FIND A SHA-256 RECEIPT';
      if (s.gremlins.some(g => !g.rescued && g.caged && near(p, g, 60))) return 'STUN GUARD + E / X  ·  OPEN CAGE';
      if (near(p, s.portal, 85)) return this.gateOpen() ? 'E / X  ·  LEAVE DISTRICT' : 'FINISH THE DISTRICT OBJECTIVES';
      return '';
    }
  }
  Object.assign(G, { Game, makeStage, stages, STEP, GROUND, overlap, near, clamp });
  if (typeof module !== 'undefined') module.exports = G;
})(typeof globalThis !== 'undefined' ? globalThis : window);
