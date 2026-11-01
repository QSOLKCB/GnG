/* Browser shell: one fixed-step loop, explicit pause, local-only scores. Apache-2.0. */
(function (G) {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('game'), ctx = canvas.getContext('2d');
  const audio = new G.Audio();
  let game = new G.Game(), phase = 'title', last = 0, accumulator = 0, displayTime = 0, lastAnnouncement = '', hudKey = '';
  game.player.invuln = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const input = new G.Input(canvas, togglePause);
  const scoreKey = mode => 'gng.best.v1.' + mode;
  function readBest(mode) { try { const n = Number(localStorage.getItem(scoreKey(mode))); return Number.isSafeInteger(n) && n >= 0 && n < 10000000 ? n : 0; } catch (_) { return 0; } }
  let best = readBest(game.mode);
  function focusGame() { canvas.focus({ preventScroll: true }); }
  function stopInput() { input.active = false; input.clear(); audio.stop(); accumulator = 0; game.jumpHeld = false; }
  function showOverlay(kind) {
    phase = kind; stopInput();
    const overlay = $('overlay'); overlay.hidden = false; overlay.classList.toggle('compact', kind !== 'title');
    $('mode-wrap').hidden = kind !== 'title'; $('restart').hidden = kind === 'title' || kind === 'won';
    const copy = {
      title: ['NIGHT SHIFT / NO. 001', 'Have you got<br><em>the receipts?</em>', 'The gremlins know too much. The developers want your tech. The actors are very, very concerned.', 'START THE NIGHT SHIFT →', 'FREE PLAY · 3 DISTRICTS · UNLIMITED SECOND CHANCES'],
      paused: ['TAKE A BREATHER', 'Mischief on hold.', 'Your progress is safe. The corporate concern can wait.', 'RESUME THE NIGHT SHIFT →', 'P / ESC TO RESUME'],
      downed: ['A MINOR SETBACK', 'Still less cruel<br>than the C64.', 'Retry from your last checkpoint with full armour. Rescues, tech and receipts stay with you.', 'RETRY CHECKPOINT →', 'NO COINS. NO LOST PROGRESS.'],
      cleared: [`DISTRICT 0${game.stage.index + 1} / COMPLETE`, 'Receipts delivered.<br><em>Concern withdrawn.</em>', 'Gremlins safe. Tech recovered. There is more corporate nonsense up ahead.', 'NEXT DISTRICT →', `SCORE ${String(game.score).padStart(6, '0')} · ARMOUR RESTORED NEXT DISTRICT`],
      won: ['NIGHT SHIFT / COMPLETE', 'No actionable<br><em>findings.</em>', 'Nine gremlins safe. Six tech cores recovered. Six actors quietly reconsidering their career choices.', 'PLAY ANOTHER SHIFT →', `SCORE ${String(game.score).padStart(6, '0')} · ${game.retries} CHECKPOINT RETRIES`]
    }[kind];
    $('overlay-kicker').textContent = copy[0]; $('overlay-title').innerHTML = copy[1]; $('overlay-description').textContent = copy[2];
    $('start').textContent = copy[3]; $('overlay-note').textContent = copy[4];
    $('pause').disabled = kind !== 'paused'; $('pause').textContent = kind === 'paused' ? 'RESUME' : 'PAUSE P';
    $('run-state').textContent = { title: 'READY FOR MISCHIEF', paused: 'MISCHIEF ON HOLD', downed: 'SECOND CHANCES AVAILABLE', cleared: 'DISTRICT COMPLETE', won: 'ALL RECEIPTS DELIVERED' }[kind];
    if (kind !== 'title') $('start').focus({ preventScroll: true });
  }
  function play() {
    phase = 'playing'; $('overlay').hidden = true; input.clear(); input.active = true;
    accumulator = 0; last = performance.now(); $('pause').disabled = false; $('pause').textContent = 'PAUSE P';
    $('run-state').textContent = 'NIGHT SHIFT IN PROGRESS'; focusGame();
    canvas.closest('.cabinet').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function togglePause() {
    if ($('help-dialog').open || $('receipt-dialog').open) return;
    if (phase === 'playing') showOverlay('paused'); else if (phase === 'paused') play();
  }
  function newGame() { game = new G.Game($('mode').value); best = readBest(game.mode); hudKey = ''; lastAnnouncement = ''; play(); }
  $('start').addEventListener('click', () => {
    if (phase === 'title') newGame();
    else if (phase === 'paused') play();
    else if (phase === 'downed') { game.retry(); play(); }
    else if (phase === 'cleared') { game.advance(); play(); }
    else if (phase === 'won') { game = new G.Game($('mode').value); game.player.invuln = 0; hudKey = ''; showOverlay('title'); }
  });
  $('restart').addEventListener('click', () => { game = new G.Game($('mode').value); game.player.invuln = 0; best = readBest(game.mode); hudKey = ''; showOverlay('title'); $('start').focus(); });
  $('pause').addEventListener('click', togglePause);
  document.addEventListener('keydown', e => { if (phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && !$('help-dialog').open && !$('receipt-dialog').open) { e.preventDefault(); play(); } });
  $('mode').addEventListener('change', () => { if (phase === 'title') { game = new G.Game($('mode').value); game.player.invuln = 0; best = readBest(game.mode); hudKey = ''; } });
  let audioBusy = false;
  $('sound').addEventListener('click', async () => {
    if (audioBusy) return;
    audioBusy = true;
    if (audio.enabled) { audio.enabled = false; audio.stop(); }
    else if (!await audio.enable()) { $('announcement').textContent = 'Audio is unavailable in this browser. You can continue silently.'; }
    $('sound').textContent = audio.enabled ? 'SOUND ON' : 'SOUND OFF'; $('sound').setAttribute('aria-pressed', String(audio.enabled)); audioBusy = false;
    if (phase === 'playing') focusGame();
  });
  function openDialog(id) { if (phase === 'playing') showOverlay('paused'); $(id).showModal(); }
  $('help').addEventListener('click', () => openDialog('help-dialog'));
  $('ledger').addEventListener('click', () => {
    const list = $('receipt-list'); list.replaceChildren();
    if (!game.ledger.length) { const p = document.createElement('p'); p.textContent = 'No receipts yet. Pick up the parchment sheets on your route.'; list.append(p); }
    for (const record of game.ledger) {
      const data = G.receipts[record.id], article = document.createElement('article'); article.className = 'receipt-entry';
      for (const [tag, value, cls] of [['h3', data.title, ''], ['p', data.payload, ''], ['code', data.sha256, ''], ['p', record.served ? 'SERVED · ' + record.served : 'IN YOUR POCKET', 'receipt-status']]) {
        const el = document.createElement(tag); el.textContent = value; el.className = cls; article.append(el);
      }
      list.append(article);
    }
    openDialog('receipt-dialog');
  });
  for (const id of ['help-dialog', 'receipt-dialog']) $(id).addEventListener('close', () => { if (phase === 'paused') $('start').focus({ preventScroll: true }); });
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('screen').parentElement.requestFullscreen) await $('screen').parentElement.requestFullscreen(); }
    catch (_) { $('announcement').textContent = 'Fullscreen is unavailable. The game still works in this window.'; }
    if (phase === 'playing') focusGame();
  });
  function setTouch(enabled) { $('touch-controls').hidden = !enabled; $('touch-toggle').setAttribute('aria-pressed', String(enabled)); $('touch-toggle').textContent = enabled ? 'TOUCH CONTROLS −' : 'TOUCH CONTROLS +'; if (!enabled) input.clear(); }
  $('touch-toggle').addEventListener('click', () => setTouch($('touch-controls').hidden));
  setTouch(matchMedia('(pointer: coarse)').matches);
  function loseFocus() { input.clear(); if (phase === 'playing') showOverlay('paused'); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) loseFocus(); });
  window.addEventListener('blur', loseFocus);
  function hud() {
    const o = game.objectives(), p = game.player, key = [p.hp, o.gremlins, o.tech, o.actors, game.score, game.inventory.length, game.stage.index, game.mode, best].join(':');
    if (key === hudKey) return; hudKey = key;
    const pad = n => String(n).padStart(2, '0');
    $('health').replaceChildren();
    for (let i = 0; i < game.maxHp; i++) { const h = document.createElement('span'); h.textContent = '♥' + (i < game.maxHp - 1 ? ' ' : ''); if (i >= p.hp) h.className = 'lost'; $('health').append(h); }
    $('health').setAttribute('aria-label', `${p.hp} of ${game.maxHp} armour`);
    for (const [id, count, total] of [['rescued', o.gremlins, 3], ['tech', o.tech, 2], ['actors', o.actors, 2]]) { $(id).textContent = pad(count) + ' '; const small = document.createElement('small'); small.textContent = '/ ' + pad(total); $(id).append(small); }
    $('score').textContent = String(game.score).padStart(6, '0'); $('receipts').textContent = pad(game.inventory.length) + ' ▤';
    $('district-label').textContent = `0${game.stage.index + 1} / 03   ${game.stage.short}`;
    $('mode-label').textContent = game.mode.toUpperCase(); $('best').textContent = String(best).padStart(6, '0');
  }
  function loop(now) {
    const elapsed = Math.min((now - last) / 1000 || 0, 0.1); last = now;
    const controls = input.read();
    if (phase === 'playing') {
      // Input can pause the game while polling a controller.
      if (phase === 'playing') {
        accumulator += elapsed;
        while (accumulator >= G.STEP && phase === 'playing') {
          game.step(controls); input.consume(); accumulator -= G.STEP; displayTime += G.STEP;
          const events = game.events.splice(0);
          for (const event of events) audio.effect(event);
          audio.tick(G.STEP, game.stage.index);
          if (game.state !== 'playing') {
            if (game.state === 'won' && game.score > best) { best = game.score; try { localStorage.setItem(scoreKey(game.mode), String(best)); } catch (_) { /* play without storage */ } }
            showOverlay(game.state);
          }
        }
      }
    } else if (phase === 'title') displayTime += elapsed;
    hud(); G.render(ctx, game, displayTime, motion.matches);
    if (game.messageTime > 0 && game.message !== lastAnnouncement) { lastAnnouncement = game.message; $('announcement').textContent = game.message; }
    requestAnimationFrame(loop);
  }
  for (const c of document.querySelectorAll('[data-sprite]')) { const pen = c.getContext('2d'); pen.imageSmoothingEnabled = false; G.drawSprite(pen, c.dataset.sprite, 16, 15); }
  showOverlay('title'); hud(); requestAnimationFrame(loop);
})(globalThis.GnG);
