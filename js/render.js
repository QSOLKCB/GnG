/* Hand-authored pixel art and scenery. Apache-2.0. */
(function (G) {
  'use strict';
  const palettes = {
    hero: { g: '#a4d375', G: '#638c49', d: '#111e22', e: '#f9efc6', o: '#e9a05b', p: '#626080', P: '#3d405c', b: '#cfc6a5' },
    agent: { g: '#cad0bb', G: '#899b91', d: '#111e22', e: '#e9b668', o: '#a4d6df', p: '#687b7b', P: '#384d51', b: '#cfc6a5' },
    dev: { g: '#d7a961', G: '#a47748', d: '#141c25', e: '#e9efce', o: '#bd7365', p: '#995d55', P: '#643c43', b: '#a4d6df' },
    actor: { g: '#e2c9b2', G: '#b78883', d: '#241c2b', e: '#f3e5b7', o: '#e89ba8', p: '#a55e81', P: '#633751', b: '#f4d5b8' }
  };
  const sprites = {
    hero: [
      '....GG....GG....', '....gG....Gg....', '..GGggGGGGggGG..', '.GggggggggggggG.', 'GggggggggggggggG', '..GgddgGGgddgG..', '..GgedgGGgdegG..', '...GggggggggG...', '....GggddggG....', '....oooooooo....', '...ppppoppPooo..', '..gpppppppPP.o..', '..gppbbbbbPP....', '...pPppppPP.....', '....PP..PP......', '....dd..dd......'
    ],
    agent: [
      '.....dddddd.....', '....dddddddd....', '...dddddddddd...', '..dddddddddddd..', '....gggggggg....', '....dddddddd....', '....dodddodd....', '....GggggggG....', '.....GggggG.....', '....pPpbbPpp....', '...ppPpooPppp...', '...gpPpooPpPg...', '...ggPpppPPgg...', '.....PPPPP......', '.....PP.PP......', '.....dd.dd......'
    ],
    dev: [
      '....dddddddd....', '...dppppppppd...', '..ddppppppppdd..', '..gggggggggggg..', '...gddgGGgddg...', '...gbdgGGgdbg...', '...GggggggggG...', '....GggggggG....', '...pppppppppp...', '..ppppoppopppp..', '..gppppppppppg..', '..gPddddddddPg..', '...PdbbbbbbdP...', '....dddddddd....', '.....PP.PP......', '.....dd.dd......'
    ],
    actor: [
      '.....dddddd.....', '....dddddddd....', '....dggggggd....', '...dggggggggd...', '...ggddggddgg...', '...ggedggdegg...', '....GggggggG....', '.....GddddG.....', '....bggggggb....', '...ppbbbbpppp...', '..gppppppppppg..', '..gPppppppppPg..', '...PppppppppP...', '...PPppppppPP...', '....PPP.PPP.....', '....ddd.ddd.....'
    ],
    gremlin: [
      'gG........Gg', 'ggG......Ggg', '.ggGGGGGGgg.', '..gggggggg..', '.ggedggdegg.', '..gggggggg..', '...ggddgg...', '..GGggggGG..', '..gGggggGg..', '...GGGGGG...', '...Gg..gG...', '..ddd..ddd..'
    ]
  };
  const colors = [
    { sky: '#18242c', far: '#263b40', mid: '#243435', near: '#18292b', stone: '#46534c', edge: '#82916a', ground: '#263730', accent: '#b9d985', fog: '#587169' },
    { sky: '#2c242a', far: '#483039', mid: '#3d3234', near: '#2d292e', stone: '#69564b', edge: '#d69c62', ground: '#3d342e', accent: '#edb46d', fog: '#896c5c' },
    { sky: '#292333', far: '#48354d', mid: '#443342', near: '#302434', stone: '#695366', edge: '#c48d9c', ground: '#3c2d3c', accent: '#d9acbf', fog: '#805f7d' }
  ];
  const cache = new Map();
  function sprite(ctx, name, x, y, facing = 1, scale = 2) {
    const key = name;
    if (!cache.has(key)) {
      const rows = sprites[name], c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
      const pen = c.getContext('2d'), palette = palettes[name] || palettes.hero;
      rows.forEach((row, yy) => [...row].forEach((pixel, xx) => { if (palette[pixel]) { pen.fillStyle = palette[pixel]; pen.fillRect(xx, yy, 1, 1); } }));
      cache.set(key, c);
    }
    const image = cache.get(key);
    ctx.save(); ctx.translate(Math.round(x) + (facing < 0 ? image.width * scale : 0), Math.round(y)); ctx.scale(facing, 1);
    ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale); ctx.restore();
  }
  function text(ctx, value, x, y, color = '#e9e5c9', size = 8, align = 'left') {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = '#101b23'; ctx.fillText(value, Math.round(x) + 1, Math.round(y) + 1);
    ctx.fillStyle = color; ctx.fillText(value, Math.round(x), Math.round(y));
  }
  const rect = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function tree(ctx, x, y, scale, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 7 * scale; ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + 5 * scale, y - 85 * scale); ctx.lineTo(x - 14 * scale, y - 145 * scale);
    ctx.moveTo(x + 3 * scale, y - 66 * scale); ctx.lineTo(x - 32 * scale, y - 94 * scale); ctx.lineTo(x - 47 * scale, y - 127 * scale);
    ctx.moveTo(x + 4 * scale, y - 82 * scale); ctx.lineTo(x + 35 * scale, y - 117 * scale); ctx.lineTo(x + 40 * scale, y - 150 * scale);
    ctx.moveTo(x - 25 * scale, y - 85 * scale); ctx.lineTo(x - 52 * scale, y - 91 * scale);
    ctx.stroke();
  }
  function arch(ctx, x, y, width, height, c) {
    rect(ctx, x, y + 12, width, height - 12, c); rect(ctx, x + 5, y + 5, width - 10, 9, c); rect(ctx, x + 11, y, width - 22, 6, c);
  }
  function scenery(ctx, game, time) {
    const s = game.stage, theme = colors[s.index], cam = game.camera;
    rect(ctx, 0, 0, 640, 360, theme.sky);
    for (let i = 0; i < 65; i++) {
      const x = ((i * 73 + 21) % 640 - cam * 0.04 + 640) % 640, y = (i * 47 + 13) % 183;
      rect(ctx, x, y, i % 8 === 0 ? 2 : 1, 1, i % 3 === 0 ? '#9eab99' : '#586f71');
    }
    // A deliberately stepped moon, with a few quiet crater pixels.
    const mx = 494 - cam * 0.04;
    rect(ctx, mx + 10, 29, 42, 64, '#d7d3ae'); rect(ctx, mx, 40, 62, 42, '#d7d3ae');
    rect(ctx, mx + 5, 34, 52, 54, '#e8dfb9'); rect(ctx, mx + 14, 29, 34, 64, '#e8dfb9');
    for (const [x, y, w, h] of [[14, 14, 8, 6], [30, 30, 15, 9], [10, 40, 7, 7], [40, 10, 6, 4]]) rect(ctx, mx + x, 29 + y, w, h, '#ccc8a7');
    for (let i = 0; i < 6; i++) {
      const x = ((i * 161 - cam * 0.1 + time * 1.5) % 900 + 900) % 900 - 130;
      rect(ctx, x, 80 + i % 3 * 22, 130, 9, theme.far); rect(ctx, x + 25, 72 + i % 3 * 22, 65, 10, theme.far);
    }
    // Distant architecture is separate from the solid play geometry.
    for (let i = -1; i < 10; i++) {
      const x = i * 126 - cam * 0.18 % 126, h = 62 + (i * i * 17 % 70);
      if (s.theme === 'foundry') {
        rect(ctx, x, 220 - h, 80, h + 50, theme.far); rect(ctx, x + 15, 110 - h / 3, 15, 130, theme.far);
        rect(ctx, x + 49, 120 - h / 4, 19, 130, theme.far);
        for (let k = 0; k < 4; k++) rect(ctx, x + 9 + k * 17, 235 - h, 8, 17, '#7d5950');
      } else {
        rect(ctx, x, 225 - h, 77, h + 50, theme.far);
        rect(ctx, x + 6, 213 - h, 12, 15, theme.far); rect(ctx, x + 35, 213 - h, 12, 15, theme.far); rect(ctx, x + 64, 213 - h, 12, 15, theme.far);
        arch(ctx, x + 22, 242 - h, 24, 39, theme.sky);
      }
    }
    rect(ctx, 0, 244, 640, 52, theme.mid);
    for (let i = -1; i < 9; i++) {
      const x = i * 138 - cam * 0.42 % 138;
      if (s.theme === 'graveyard') tree(ctx, x + 18, 296, 0.9 + (i % 2) * 0.15, theme.near);
      else if (s.theme === 'foundry') {
        rect(ctx, x, 184, 8, 112, theme.near); rect(ctx, x, 184, 80, 8, theme.near); rect(ctx, x + 75, 184, 8, 112, theme.near);
        rect(ctx, x + 30, 200, 35, 65, theme.near); rect(ctx, x + 35, 210, 25, 4, '#73594b');
      } else {
        arch(ctx, x, 155, 90, 140, theme.near);
        arch(ctx, x + 10, 166, 70, 130, '#563749');
        for (let k = 0; k < 4; k++) rect(ctx, x + 12 + k * 16, 167, 7, 112, '#683b4e');
        rect(ctx, x + 10, 260, 70, 36, theme.near);
      }
    }
    // Fence and gravestones move with the world, but never block the player.
    const left = Math.floor(cam / 90) - 1;
    for (let i = left; i < left + 10; i++) {
      const x = i * 90 - cam;
      rect(ctx, x, 268, 90, 3, theme.far);
      for (let j = 0; j < 6; j++) { rect(ctx, x + j * 15, 252, 2, 44, theme.far); rect(ctx, x + j * 15 - 1, 250, 4, 3, theme.far); }
      if (i % 3 === 1 && s.theme === 'graveyard') {
        arch(ctx, x + 18, 263, 30, 33, '#3b4c49'); text(ctx, ['BLOAT', 'TODO', 'RIP'][Math.abs(i) % 3], x + 33, 275, '#758476', 6, 'center');
      }
    }
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 3; i++) rect(ctx, ((i * 260 + time * 6 - cam * 0.3) % 900 + 900) % 900 - 260, 253 + i * 13, 270, 7, theme.fog);
    ctx.globalAlpha = 1;
  }
  function ground(ctx, game) {
    const c = colors[game.stage.index], cam = game.camera;
    rect(ctx, 0, 296, 640, 64, c.ground); rect(ctx, 0, 296, 640, 4, c.edge); rect(ctx, 0, 300, 640, 4, '#172324');
    for (let row = 0; row < 3; row++) for (let i = -1; i < 18; i++) {
      const x = i * 44 - cam % 44 + row % 2 * 22;
      rect(ctx, x, 308 + row * 20, 40, 16, row % 2 ? '#23312d' : '#2e3d35');
      rect(ctx, x + 2, 308 + row * 20, 34, 2, '#3b493b');
    }
    for (const plat of game.stage.platforms) {
      const x = plat.x - cam;
      rect(ctx, x, plat.y, plat.w, plat.h, c.stone); rect(ctx, x, plat.y, plat.w, 3, c.edge);
      for (let j = 10; j < plat.w; j += 26) rect(ctx, x + j, plat.y + 5, 2, 9, '#27352e');
      for (let j = 4; j < plat.w; j += 18) rect(ctx, x + j, plat.y + 16, 3, 5 + j % 7, '#465c3e');
    }
  }
  function drawBoss(ctx, b, cam, time) {
    const x = b.x - cam, y = b.y + Math.sin(time * 3) * 2, color = b.hp <= 0 ? '#647864' : b.hit ? '#f7e5bd' : '#a494a5';
    for (const dir of [-1, 1]) {
      rect(ctx, x + 23 + dir * 31, y - 9, 9, 46, '#6e617f');
      rect(ctx, x + 23 + dir * 23, y + 2, 14, 34, '#8b7c92');
      rect(ctx, x + 23 + dir * 35, y + 23, 8, 21, '#6e617f');
    }
    rect(ctx, x + 4, y + 21, 46, 36, color); rect(ctx, x + 10, y + 3, 34, 24, color);
    rect(ctx, x + 8, y - 5, 8, 17, color); rect(ctx, x + 38, y - 5, 8, 17, color);
    rect(ctx, x + 15, y + 13, 9, 5, b.awake ? '#f3a16c' : '#292937'); rect(ctx, x + 31, y + 13, 9, 5, b.awake ? '#f3a16c' : '#292937');
    rect(ctx, x + 17, y + 30, 23, 16, '#e3d7b1'); text(ctx, 'AUDIT', x + 28, y + 35, '#4b4148', 6, 'center');
    rect(ctx, x + 7, y + 55, 14, 9, '#4d475d'); rect(ctx, x + 33, y + 55, 14, 9, '#4d475d');
    if (b.hp > 0) { rect(ctx, x - 3, y - 25, 62, 5, '#1b202b'); rect(ctx, x - 2, y - 24, 60 * b.hp / b.maxHp, 3, '#dca795'); text(ctx, 'GRAND AUDITOR', x + 27, y - 38, '#eedbbd', 7, 'center'); }
  }
  function render(ctx, game, time = 0, reduced = false) {
    ctx.imageSmoothingEnabled = false;
    const s = game.stage, cam = Math.floor(game.camera), p = game.player, t = reduced ? 0 : time;
    scenery(ctx, game, t); ground(ctx, game);
    // Portal is visible from afar; all objectives are needed to open it.
    const portal = s.portal, px = portal.x - cam, open = game.gateOpen();
    arch(ctx, px - 6, portal.y - 6, 68, 90, '#6d7770'); arch(ctx, px, portal.y, 56, 84, '#17262b');
    if (open) { arch(ctx, px + 7, portal.y + 7, 42, 77, '#6b9972'); arch(ctx, px + 16, portal.y + 15, 24, 69, '#b8df9b'); }
    else for (let x = 8; x < 53; x += 11) rect(ctx, px + x, portal.y + 16, 3, 68, '#68756c');
    text(ctx, open ? 'EXIT OPEN' : 'QSOL GATE', px + 28, portal.y - 20, '#c3d7a0', 8, 'center');
    for (const c of s.checkpoints) {
      const x = c.x - cam;
      rect(ctx, x + 8, c.y, 3, 44, '#8d957e'); rect(ctx, x + 11, c.y + 2, 23, 16, c.active ? '#b6d982' : '#797163');
      text(ctx, '+', x + 17, c.y + 5, '#263a32', 9); rect(ctx, x + 4, 292, 12, 4, '#c9bea0');
    }
    for (const h of s.spikes) {
      for (let x = 0; x < h.w; x += 11) { rect(ctx, h.x + x - cam, h.y + 6, 10, 4, '#938f83'); rect(ctx, h.x + x + 2 - cam, h.y + 3, 6, 4, '#c2bd9c'); rect(ctx, h.x + x + 4 - cam, h.y, 2, 6, '#e5dab0'); }
    }
    for (const r of s.receipts) if (!r.collected) {
      const x = r.x - cam, y = r.y + Math.sin(t * 4 + r.id) * 3;
      rect(ctx, x - 2, y - 2, 22, 28, '#475a4e'); rect(ctx, x, y, 18, 24, '#efe3ba'); rect(ctx, x + 12, y, 6, 5, '#b6bda0');
      for (let i = 0; i < 3; i++) rect(ctx, x + 3, y + 7 + i * 4, 10, 1, '#7b886f');
      text(ctx, '#', x + 6, y + 16, '#58745b', 6);
    }
    for (const h of s.hearts) if (!h.collected) { text(ctx, '+', h.x - cam, h.y + Math.sin(t * 3) * 2, '#efa58f', 22); }
    for (const g of s.gremlins) if (!g.rescued) {
      sprite(ctx, 'gremlin', g.x - cam, g.y - (g.caged ? 0 : Math.abs(Math.sin(t * 3 + g.id)) * 3));
      if (g.caged) {
        rect(ctx, g.x - 4 - cam, g.y - 10, 32, 4, '#b3a385'); rect(ctx, g.x - 4 - cam, g.y + 20, 32, 4, '#b3a385');
        for (let j = 0; j < 5; j++) rect(ctx, g.x - 4 + j * 7 - cam, g.y - 7, 2, 28, '#8d9990');
        text(ctx, 'HELP!', g.x + 11 - cam, g.y - 23, '#cfdaa8', 7, 'center');
      } else { text(ctx, 'RESCUE', g.x + 11 - cam, g.y - 14, '#aace8c', 6, 'center'); }
    }
    for (const e of s.enemies) {
      if (e.served) { text(ctx, 'RETRACTED', e.x + 12 - cam, e.y + 14, '#baa6b8', 6, 'center'); continue; }
      const bob = !e.stun && e.type !== 'actor' ? Math.sin(t * 10 + e.home) : 0;
      sprite(ctx, e.type, e.x - 4 - cam, e.y + bob, e.dir);
      if (e.stun) { text(ctx, '*  *', e.x + 11 - cam, e.y - 13 + Math.sin(t * 8) * 2, '#b4e3d6', 10, 'center'); }
      else if (e.type === 'actor') { text(ctx, 'CONCERN!', e.x + 12 - cam, e.y - 17, '#e8afc0', 7, 'center'); }
      else { text(ctx, e.type === 'agent' ? 'IAOPEN' : 'Z.CORP', e.x + 11 - cam, e.y - 13, e.type === 'agent' ? '#b2c6c3' : '#dab47b', 6, 'center'); }
    }
    for (const item of s.tech) if (!item.collected) {
      const x = item.x - cam, y = item.y;
      rect(ctx, x, y, 20, 20, '#edba69'); rect(ctx, x + 4, y + 4, 12, 12, '#3e5e5a'); rect(ctx, x + 8, y + 7, 5, 6, '#b9e2b0');
      for (let i = 2; i < 20; i += 5) { rect(ctx, x - 3, y + i, 3, 2, '#baac7d'); rect(ctx, x + 20, y + i, 3, 2, '#baac7d'); }
    }
    if (s.boss) drawBoss(ctx, s.boss, cam, t);
    if (p.invuln <= 0 || reduced || Math.floor(time * 12) % 2 === 0) {
      const bob = p.grounded && p.vx ? Math.sin(t * 18) : 0;
      sprite(ctx, 'hero', p.x - 5 - cam, p.y + bob, p.facing);
      if (p.shot > 0.15) rect(ctx, p.x + (p.facing > 0 ? 25 : -7) - cam, p.y + 11, 7, 6, '#edc77c');
    }
    for (const b of game.bullets) { rect(ctx, b.x - cam, b.y, b.w, b.h, '#b8e0c2'); rect(ctx, b.x - cam + 2, b.y + 2, b.w - 4, 3, '#f8e6b4'); }
    for (const b of game.hazards) { rect(ctx, b.x - cam, b.y, b.w, b.h, '#d18b98'); text(ctx, '!', b.x + 4 - cam, b.y, '#3d2b3c', 8); }
    if (!reduced) for (const f of game.particles) { ctx.globalAlpha = Math.min(1, f.life * 3); rect(ctx, f.x - cam, f.y, 3, 3, f.color); }
    ctx.globalAlpha = 1;
    // Tiny foreground plants keep the lower silhouette from becoming a flat line.
    for (let i = Math.floor(cam / 117); i < Math.floor(cam / 117) + 7; i++) {
      const x = i * 117 + 37 - cam; rect(ctx, x, 291, 3, 9, '#6f875b'); rect(ctx, x - 5, 288, 6, 3, '#6f875b'); rect(ctx, x + 3, 285, 5, 3, '#6f875b');
      if (i % 2 === 0) { rect(ctx, x + 20, 291, 2, 6, '#b9a481'); rect(ctx, x + 16, 288, 10, 4, '#b87c61'); }
    }
    // Stage title, compass, and action prompts are part of the game surface.
    rect(ctx, 12, 12, 225, 28, '#172329'); text(ctx, `0${s.index + 1} / ${s.short}`, 21, 21, colors[s.index].accent, 9);
    text(ctx, 'QSOL-INC  /  NIGHT SHIFT', 628, 19, '#c8cab0', 7, 'right');
    const prompt = game.prompt();
    if (prompt) { rect(ctx, 135, 310, 370, 23, '#192329'); text(ctx, prompt, 320, 318, '#f0d4a0', 9, 'center'); }
    else if (game.messageTime > 0) { text(ctx, game.message, 320, 321, '#d6d7b9', 8, 'center'); }
    if (game.ready() && !game.gateOpen()) text(ctx, 'THE GRAND AUDITOR AWAITS  >', 628, 42, '#e9b5a3', 7, 'right');
    else if (game.gateOpen()) text(ctx, 'DISTRICT CLEAR — HEAD TO THE GATE  >', 628, 42, '#c0dc9d', 7, 'right');
  }
  G.render = render; G.drawSprite = sprite;
})(globalThis.GnG);
