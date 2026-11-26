/* Motor del deck BPM 2674: escalado 16:9, navegación, dock, notas, mapa e interacciones por lámina. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const TOTAL = slides.length;
  const NOTES = window.BPM_NOTES || [];
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');
  const TALK_SECONDS = 20 * 60;
  const VIDEO_SECONDS = 144;
  const DOCK_IDLE_MS = 2600;
  const BRIDGE_POLL_MS = 3000;
  let current = 0;

  if (CAPTURE) document.body.classList.add('capture');

  /* ---------- Escalado del lienzo 1920×1080 ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty('--s', String(s));
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- Micro-encabezado editorial ---------- */
  slides.forEach((s, i) => {
    const mh = s.querySelector('.mh');
    if (!mh) return;
    mh.innerHTML =
      '<span class="mh__l"><i class="mh__dot"></i>UAM · Gerencia de la Calidad</span>' +
      `<span class="mh__r">Res. 2674 de 2013 · Omar &amp; Luis<b class="mh__num">${String(i + 1).padStart(2, '0')} / ${TOTAL}</b></span>`;
  });

  /* ---------- Navegación ---------- */
  const slideHooks = {};
  /** Índice de la lámina que coincide con el selector (robusto a inserciones). */
  const idxOf = (sel) => slides.findIndex((s) => s.matches(sel));
  function goTo(index) {
    const next = Math.max(0, Math.min(TOTAL - 1, index));
    if (current === 0 && next === 1) timer.autoStart();
    slides[current].classList.remove('is-active');
    current = next;
    const s = slides[current];
    s.classList.add('is-active');
    if (window.BPM3D) window.BPM3D.activate(s.dataset.gl || null);
    updateChrome();
    if (slideHooks[current]) slideHooks[current]();
    if (!CAPTURE) history.replaceState(null, '', `#${current + 1}`);
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  function updateChrome() {
    const s = slides[current];
    const n = NOTES[current] || {};
    $('dockNum').textContent = `${String(current + 1).padStart(2, '0')} / ${TOTAL}`;
    $('dockTitle').textContent = s.dataset.title || '';
    $('dockSpeaker').textContent = s.dataset.speaker || '';
    $('dockSpeaker').dataset.sp = s.dataset.speaker || '';
    $('notesTime').textContent = n.time || '';
    $('notesSpeaker').textContent = n.speaker || s.dataset.speaker || '';
    $('notesTitle').textContent = `${current + 1}. ${s.dataset.title || ''}`;
    $('notesScript').textContent = n.script || '';
    const cues = $('notesCues');
    cues.replaceChildren(...(n.cues || []).map((c) => Object.assign(document.createElement('li'), { textContent: c })));
    renderGrid();
  }

  $('prevBtn').addEventListener('click', prev);
  $('nextBtn').addEventListener('click', next);
  document.querySelectorAll('[data-go="next"]').forEach((b) => b.addEventListener('click', next));

  /* ---------- Mapa (G) ---------- */
  const gridOverlay = $('gridOverlay');
  function renderGrid() {
    $('gridList').replaceChildren(
      ...slides.map((s, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `gtile${i === current ? ' is-current' : ''}`;
        const time = (NOTES[i] && NOTES[i].time) || '';
        b.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span></span><small>${s.dataset.speaker || ''} · ${time}</small>`;
        b.querySelector('span').textContent = s.dataset.title || '';
        b.addEventListener('click', () => {
          toggleGrid(false);
          goTo(i);
        });
        return b;
      })
    );
  }
  function toggleGrid(force) {
    const open = typeof force === 'boolean' ? force : gridOverlay.hidden;
    gridOverlay.hidden = !open;
    $('gridBtn').classList.toggle('is-on', open);
  }
  $('gridBtn').addEventListener('click', () => toggleGrid());

  /* ---------- Notas (N) ---------- */
  function toggleNotes(force) {
    const notes = $('notes');
    const open = typeof force === 'boolean' ? force : notes.hidden;
    notes.hidden = !open;
    $('notesBtn').classList.toggle('is-on', open);
  }
  $('notesBtn').addEventListener('click', () => toggleNotes());
  $('notesClose').addEventListener('click', () => toggleNotes(false));

  /* ---------- Pantalla completa (F) ---------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  $('fsBtn').addEventListener('click', toggleFullscreen);

  /* ---------- Teclado ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') goTo(0);
    else if (k === 'End') goTo(TOTAL - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'g' || k === 'G') toggleGrid();
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'Escape') { toggleGrid(false); toggleNotes(false); }
  });

  /* ---------- Dock autoocultable ---------- */
  const dock = $('dock');
  let idleTimer = 0;
  function wake() {
    dock.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dock.matches(':hover')) dock.classList.add('is-idle'); }, DOCK_IDLE_MS);
  }
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('keydown', wake);
  wake();

  /* ---------- Cronómetro 20:00 ---------- */
  const fmt = (sec) => {
    const a = Math.abs(sec);
    return `${sec < 0 ? '+' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
  };
  const timer = (function () {
    let left = TALK_SECONDS;
    let handle = 0;
    let started = false;
    const btn = $('timerBtn');
    const out = $('timerDisplay');
    const paint = () => {
      out.textContent = fmt(left);
      btn.classList.toggle('is-over', left < 0);
      btn.classList.toggle('is-run', Boolean(handle));
    };
    const start = () => {
      if (handle) return;
      started = true;
      handle = setInterval(() => { left -= 1; paint(); }, 1000);
      paint();
    };
    const pause = () => { clearInterval(handle); handle = 0; paint(); };
    btn.addEventListener('click', () => (handle ? pause() : start()));
    btn.addEventListener('dblclick', () => { pause(); left = TALK_SECONDS; started = false; paint(); });
    paint();
    return { autoStart: () => { if (!started && !CAPTURE) start(); } };
  })();

  /* =====================================================================
     Interacciones por lámina
     ===================================================================== */
  const with3D = (name, fn) => {
    const api = window.BPM3D && window.BPM3D.get(name);
    if (api) fn(api);
  };

  /* 02 · Escalera de inocuidad */
  const steps = Array.from(document.querySelectorAll('#ladder .step'));
  function ladderLevel(level) {
    steps.forEach((li) => li.classList.toggle('is-on', Number(li.dataset.step) <= level));
  }
  let ladder = 1;
  $('ladderUp').addEventListener('click', () => { ladder = ladder >= 4 ? 1 : ladder + 1; ladderLevel(ladder); });
  steps.forEach((li) => li.querySelector('button').addEventListener('click', () => { ladder = Number(li.dataset.step); ladderLevel(ladder); }));

  /* 04 · Planta 3D */
  const PLANT_INFO = {
    1: ['Art. 7 · Pisos', 'Pendiente ≥ 2 % y 1 sifón de 10 cm cada 40 m² en áreas húmedas (≥ 1 % y 1 cada 90 m² en baja humedad).'],
    2: ['Art. 7 · Paredes', 'Unión pared-piso redondeada (media caña): no acumula suciedad. Paredes claras, techos sin condensación.'],
    3: ['Art. 7 num. 7 · Iluminación', 'Luz que no altere colores ni cause sombras, protegida contra rotura. La norma no fija lux.'],
    4: ['Art. 7 · Ventilación', 'Ventanas con malla removible contra insectos, fácil de limpiar.']
  };
  const plantButtons = Array.from(document.querySelectorAll('#plantPoints [data-hs]'));
  plantButtons.forEach((b) => b.addEventListener('click', () => with3D('plant', (p) => p.focus(Number(b.dataset.hs)))));
  stage.addEventListener('bpm3d:focus', (e) => {
    const n = e.detail.n;
    plantButtons.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.hs) === n));
    const info = PLANT_INFO[n];
    $('plantInfo').innerHTML = info ? `<b>${info[0]}</b>${info[1]}` : 'Toca un punto de la maqueta.';
  });
  $('plantFail').addEventListener('click', () => {
    with3D('plant', (p) => {
      const fail = p.mode !== 'fail';
      p.setMode(fail ? 'fail' : 'ok');
      $('plantFail').classList.toggle('is-on', fail);
      $('plantFail').textContent = fail ? 'Volver al flujo conforme' : 'Simular cruce sucio/limpio';
      $('plantAlert').hidden = !fail;
    });
  });

  /* 05 · 5 NO en la línea */
  document.querySelectorAll('#nos .no').forEach((b) => b.addEventListener('click', () => b.classList.toggle('is-off')));

  /* 06 · Bodega 3D */
  const segButtons = Array.from(document.querySelectorAll('[data-storage]'));
  segButtons.forEach((b) => b.addEventListener('click', () => with3D('storage', (api) => api.setMode(b.dataset.storage))));
  stage.addEventListener('bpm3d:storage', (e) => segButtons.forEach((b) => b.classList.toggle('is-on', b.dataset.storage === e.detail.mode)));

  /* 07 · Video: embebido en línea, enlace directo sin red / file:// */
  const VIDEO_ID = 'SDw6DCOkTrs';
  const canEmbed = () => location.protocol.startsWith('http') && navigator.onLine;
  const cine = (function () {
    let left = VIDEO_SECONDS;
    let handle = 0;
    const btn = $('cineTimer');
    const out = $('cineTime');
    const paint = () => { out.textContent = fmt(Math.max(0, left)); btn.classList.toggle('is-run', Boolean(handle)); };
    const stop = () => { clearInterval(handle); handle = 0; paint(); };
    const start = () => {
      if (handle) return;
      handle = setInterval(() => { left -= 1; if (left <= 0) stop(); paint(); }, 1000);
      paint();
    };
    btn.addEventListener('click', () => (handle ? stop() : start()));
    btn.addEventListener('dblclick', () => { stop(); left = VIDEO_SECONDS; paint(); });
    return { start };
  })();
  slideHooks[idxOf('.s7')] = () => {
    $('videoMode').textContent = canEmbed()
      ? 'En línea · reproductor embebido · youtube.com/watch?v=' + VIDEO_ID
      : 'Sin servidor/red · el botón abre YouTube en pestaña nueva';
  };
  $('videoPlay').addEventListener('click', (e) => {
    cine.start();
    if (!canEmbed()) return;
    e.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.title = '¿Qué son las BPM en los alimentos? — Alimentos con Calidad';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    $('videoFrame').replaceChildren(iframe);
  });
  $('planBBtn').addEventListener('click', () => {
    const show = $('planB').hidden;
    $('planB').hidden = !show;
    $('videoFrame').hidden = show;
    $('planBBtn').textContent = show ? 'Volver al video' : 'Plan B offline';
  });

  /* 08 · Riesgo (ejemplos verificados en el Anexo Técnico de la Res. 719/2015) */
  const RISK = {
    alto: {
      num: '5', name: 'Registro Sanitario · RSA', fact: 'Dato: la sal (13.1.1) también es Alto riesgo',
      foods: [['alto-leche.jpg', 'Leche líquida', '1.1.1'], ['alto-carne.jpg', 'Carne', '8.1.1'], ['alto-huevos.jpg', 'Huevos frescos', '10.1.1']]
    },
    medio: {
      num: '7', name: 'Permiso Sanitario · PSA', fact: 'Ejemplos: Anexo técnico, Res. 719/2015',
      foods: [['medio-pan.jpg', 'Pan', '7.1.1'], ['medio-galletas.jpg', 'Galletas', '7.1.2 · 7.1.3'], ['medio-pasta.jpg', 'Pastas', '6.4.1']]
    },
    menor: {
      num: '10', name: 'Notificación Sanitaria · NSA', fact: 'También menor riesgo: chocolate de mesa (5.1.1)',
      foods: [['menor-azucar.jpg', 'Azúcar', '11.1.1'], ['menor-panela.jpg', 'Panela', '11.3.2'], ['menor-cafe.jpg', 'Café instantáneo', '3.4.2']]
    }
  };
  function setRisk(key) {
    const r = RISK[key];
    document.querySelectorAll('#riskTabs [data-risk]').forEach((b) => {
      const on = b.dataset.risk === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.risk-bars i').forEach((i) => i.classList.toggle('is-on', i.dataset.bar === key));
    $('riskNum').textContent = r.num;
    $('riskName').textContent = r.name;
    $('riskFact').textContent = r.fact;
    $('riskFoods').replaceChildren(
      ...r.foods.map(([img, name, code]) => {
        const el = document.createElement('article');
        el.className = 'food';
        el.innerHTML = `<img src="assets/images/${img}" alt="" width="640" height="400"><div><h4></h4><code>Res. 719 · ${code}</code></div>`;
        el.querySelector('img').alt = name;
        el.querySelector('h4').textContent = name;
        return el;
      })
    );
  }
  document.querySelectorAll('#riskTabs [data-risk]').forEach((b) => b.addEventListener('click', () => setRisk(b.dataset.risk)));
  setRisk('alto');

  /* 09 · Inspección INVIMA por equipos (2 equipos, turnos alternos)
     Falla real +1 · trampa (sí cumple) −1 · el turno pasa tras cada señalamiento o al agotarse. */
  const GAME_SECONDS = 120;
  const TURN_SECONDS = 12;
  const game = { score: { A: 0, B: 0 }, turn: 'A', left: GAME_SECONDS, turnLeft: TURN_SECONDS, handle: 0, over: false };
  const teamBtns = Array.from(document.querySelectorAll('.team[data-team]'));
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const log = (html) => { $('gameLog').innerHTML = html; };
  function paintGame() {
    $('scoreA').textContent = String(game.score.A);
    $('scoreB').textContent = String(game.score.B);
    $('gameClock').textContent = mmss(Math.max(0, game.left));
    $('turnClock').textContent = `${Math.max(0, game.turnLeft)} s`;
    $('turnBar').style.transform = `scaleX(${Math.max(0, game.turnLeft) / TURN_SECONDS})`;
    $('turnBar').dataset.team = game.turn;
    teamBtns.forEach((b) => b.setAttribute('aria-pressed', String(!game.over && b.dataset.team === game.turn)));
    $('gameStart').textContent = game.handle ? 'Pausar' : game.over ? 'Terminado' : game.left < GAME_SECONDS ? 'Seguir' : 'Iniciar 2:00';
  }
  function setTurn(t) {
    game.turn = t;
    game.turnLeft = TURN_SECONDS;
    with3D('inspector', (api) => api.setTeam(t));
    paintGame();
  }
  const nextTurn = () => setTurn(game.turn === 'A' ? 'B' : 'A');
  function endGame(reason) {
    clearInterval(game.handle);
    game.handle = 0;
    game.over = true;
    with3D('inspector', (api) => api.revealAll());
    const { A, B } = game.score;
    const win = A === B ? '' : A > B ? 'A' : 'B';
    teamBtns.forEach((btn) => btn.classList.toggle('is-win', btn.dataset.team === win));
    const verdict = win ? `${reason}: gana el Equipo ${win}, ${Math.max(A, B)} a ${Math.min(A, B)}.` : `${reason}: empate ${A} a ${B}.`;
    $('winner').textContent = verdict;
    $('sanctions').classList.add('is-on');
    $('sanctions').setAttribute('aria-hidden', 'false');
    log(`<b>${verdict}</b> Las fallas con <b>!</b> nadie las encontró; los ✓ verdes eran trampas.`);
    paintGame();
  }
  function tick() {
    game.left -= 1;
    game.turnLeft -= 1;
    if (game.left <= 0) return endGame('Se acabó el tiempo');
    if (game.turnLeft <= 0) {
      log(`Se agotó el turno del Equipo ${game.turn}.`);
      nextTurn();
    }
    paintGame();
  }
  function startGame() {
    if (game.handle || game.over) return;
    with3D('inspector', (api) => { api.setTeam(game.turn); api.setEnabled(true); });
    game.handle = setInterval(tick, 1000);
    paintGame();
  }
  function pauseGame() {
    clearInterval(game.handle);
    game.handle = 0;
    paintGame();
  }
  function resetGame() {
    pauseGame();
    Object.assign(game, { score: { A: 0, B: 0 }, left: GAME_SECONDS, over: false });
    with3D('inspector', (api) => api.reset());
    $('findCount').textContent = '0';
    teamBtns.forEach((btn) => btn.classList.remove('is-win'));
    $('sanctions').classList.remove('is-on');
    $('sanctions').setAttribute('aria-hidden', 'true');
    log('Clic en "Iniciar" y que el Equipo A señale primero.');
    setTurn('A');
  }
  /** Partida de ejemplo para capturas/PDF (?capture). ?demo=start deja la sala sin revelar. */
  function demoGame() {
    resetGame();
    if (params.get('demo') === 'start') return;
    ['sacos', 'raton', 'quimico', 'estiba', 'mano', 'ventana', 'grieta', 'uv'].forEach((id) => with3D('inspector', (api) => api.pick(id)));
    endGame('Partida de ejemplo');
  }
  stage.addEventListener('bpm3d:finding', (e) => {
    const { item, team, faults, faultsTotal } = e.detail;
    if (!item || game.over) return;
    if (!game.handle) startGame();
    const who = team || game.turn;
    $('findCount').textContent = String(faults);
    if (item.kind === 'fault') {
      game.score[who] += 1;
      log(`<b class="ok">+1 Equipo ${who}</b> · ${item.title} → ${item.fix} <i>(${item.art})</i>`);
    } else {
      game.score[who] -= 1;
      log(`<b class="ko">−1 Equipo ${who}</b> · ¡Trampa! ${item.title} sí cumple <i>(${item.art})</i>`);
    }
    if (faults >= faultsTotal) return endGame('¡Encontraron las 14 fallas!');
    nextTurn();
  });
  $('gameStart').addEventListener('click', () => (game.handle ? pauseGame() : startGame()));
  $('gamePass').addEventListener('click', () => { if (!game.over) { log(`El Equipo ${game.turn} pasa.`); nextTurn(); } });
  teamBtns.forEach((b) => b.addEventListener('click', () => { if (!game.over) setTurn(b.dataset.team); }));
  $('findAll').addEventListener('click', () => { if (!game.over) endGame('Inspección revelada'); });
  $('findReset').addEventListener('click', resetGame);
  paintGame();

  /* 10 · Empresas ↔ mapa */
  const cos = Array.from(document.querySelectorAll('#companies .co'));
  function pickCompany(card) {
    cos.forEach((c) => c.classList.toggle('is-on', c === card));
    const pins = (card.dataset.pins || '').split(' ');
    document.querySelectorAll('.pin').forEach((p) => p.classList.toggle('is-on', pins.includes(p.dataset.pin)));
  }
  cos.forEach((c) => c.addEventListener('click', () => pickCompany(c)));
  pickCompany(cos[0]);

  /* Copia estática (GitHub Pages): el quiz vive en otro origen, definido en <meta name="bpm-quiz-origin">. */
  const QUIZ_ORIGIN = (document.querySelector('meta[name="bpm-quiz-origin"]')?.content || '').replace(/\/+$/, '');
  if (QUIZ_ORIGIN) {
    document.querySelectorAll('a[href^="quiz.html"]').forEach((a) => { a.href = `${QUIZ_ORIGIN}/${a.getAttribute('href')}`; });
  }

  /* 12 · Puente a BPM Arena (misma API que server.js) */
  async function refreshBridge() {
    const api = QUIZ_ORIGIN ? `${QUIZ_ORIGIN}/` : './';
    let joinUrl = new URL('quiz.html?role=player', QUIZ_ORIGIN ? api : location.href).href;
    const badge = $('bridgeBadge');
    if (location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`${api}api/info`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const info = await res.json();
        if (info.joinUrl) joinUrl = info.joinUrl;
        badge.textContent = info.tunnelActive ? '· en internet: entra con tus datos móviles' : '· red local';
        const st = await fetch(`${api}api/state`, { cache: 'no-store' });
        if (st.ok) {
          const state = await st.json();
          $('bridgeCount').textContent = String(Array.isArray(state.players) ? state.players.length : 0);
        }
      } catch {
        badge.textContent = '· inicie server.js para jugar en vivo';
      }
    } else {
      badge.textContent = '· archivo local: abra con Iniciar_Actividad_BPM.bat';
    }
    $('bridgeUrl').textContent = joinUrl;
    if (window.QRCodeSVG) {
      try {
        $('bridgeQr').innerHTML = window.QRCodeSVG.toSVG(joinUrl, { fg: '#0D1114', bg: '#FFFFFF', quiet: 2 });
      } catch {
        $('bridgeQr').textContent = joinUrl;
      }
    }
  }
  const BRIDGE_INDEX = idxOf('.s12');
  slideHooks[BRIDGE_INDEX] = refreshBridge;
  setInterval(() => { if (current === BRIDGE_INDEX && !CAPTURE) refreshBridge(); }, BRIDGE_POLL_MS);

  /* =====================================================================
     Captura (PDF / verificación): estado final de cada interacción
     ===================================================================== */
  const PREPARE = {
    [idxOf('.s2')]: () => ladderLevel(4),
    [idxOf('.s4')]: () => with3D('plant', (p) => p.focus(0)),
    [idxOf('.s5')]: () => document.querySelectorAll('#nos .no').forEach((b) => b.classList.add('is-off')),
    [idxOf('.s6')]: () => with3D('storage', (api) => api.setMode('ok')),
    [idxOf('.s9')]: () => demoGame()
  };
  window.__deck = {
    total: TOTAL,
    go: goTo,
    /** Muestra la lámina i en su estado completo y devuelve cuando está estable. */
    async prepare(i) {
      goTo(i);
      if (PREPARE[i]) PREPARE[i]();
      const gl = slides[i].dataset.gl;
      if (gl && window.BPM3D) window.BPM3D.settle(gl, 120);
      await document.fonts.ready;
      await Promise.all(Array.from(slides[i].querySelectorAll('img')).map((img) => (img.complete ? null : img.decode().catch(() => null))));
      if (i === BRIDGE_INDEX) await refreshBridge();
      return true;
    }
  };

  const fromHash = parseInt(location.hash.slice(1), 10);
  slides[0].classList.add('is-active');
  goTo(Number.isFinite(fromHash) ? fromHash - 1 : 0);
})();
