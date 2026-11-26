(function () {
  'use strict';

  const cfg = globalThis.BPM_QUIZ_CONFIG;
  const qs = new URLSearchParams(window.location.search);
  let role = qs.get('role') === 'host' ? 'host' : 'player';

  let liveServer = false;
  let tunnelActive = false;
  let publicJoinUrl = new URL('quiz.html?role=player', window.location.href).href;
  let playerId = sessionStorage.getItem('bpm_player_id') || '';
  let playerNick = sessionStorage.getItem('bpm_player_nick') || '';
  let playerRole = sessionStorage.getItem('bpm_player_role') || 'Auditor INVIMA';

  // Local standalone state (when served statically without Node backend)
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bpm_arena_sync') : null;
  let standaloneState = {
    phase: 'lobby', // lobby | question | reveal | finished
    qIndex: 0,
    questionStartedAt: 0,
    questionEndsAt: 0,
    players: []
  };

  // Player standalone personal progress
  let localPlayer = {
    joined: false,
    qIndex: 0,
    score: 0,
    streak: 0,
    correctCount: 0,
    step: 'join', // join | question | feedback | finish
    selectedOpt: null,
    lastPoints: 0,
    lastCorrect: false,
    qEndsAt: 0
  };

  let lastServerState = null;
  let tickTimer = null;
  let sse = null;

  // DOM helpers
  const $ = (id) => document.getElementById(id);
  const show = (id, yes) => $(id).classList.toggle('hidden', !yes);

  function setRole(nextRole) {
    role = nextRole;
    $('switchPlayerBtn').classList.toggle('active', role === 'player');
    $('switchHostBtn').classList.toggle('active', role === 'host');
    $('mainWrap').classList.toggle('mobile-narrow', role === 'player');
    show('playerView', role === 'player');
    show('hostView', role === 'host');
    if (role === 'host') renderHostQR();
    renderAll();
  }

  $('switchPlayerBtn').addEventListener('click', () => setRole('player'));
  $('switchHostBtn').addEventListener('click', () => setRole('host'));

  function renderHostQR() {
    $('hostJoinUrl').textContent = publicJoinUrl;
    if (globalThis.QRCodeSVG) {
      try {
        $('hostQrBox').innerHTML = globalThis.QRCodeSVG.toSVG(publicJoinUrl, {
          fg: '#111C1E',
          bg: '#FFFFFF',
          quiet: 3
        });
      } catch {
        $('hostQrBox').innerHTML = '<div class="mono" style="padding:12px;">QR disponible al publicar o iniciar servidor</div>';
      }
    }
  }

  async function detectBackend() {
    if (!window.location.protocol.startsWith('http')) {
      setStandaloneBanner();
      return;
    }
    try {
      const r = await fetch('./api/info', { cache: 'no-store' });
      if (!r.ok) throw new Error('no backend');
      const info = await r.json();
      liveServer = true;
      tunnelActive = !!info.tunnelActive;
      if (info.joinUrl) publicJoinUrl = info.joinUrl;
      $('connBanner').classList.add('live');
      $('connStatusText').textContent = tunnelActive
        ? 'SALA EN VIVO MULTIJUGADOR · Túnel HTTPS público activo'
        : 'SALA EN VIVO MULTIJUGADOR · Red local activa';
      renderHostQR();
      connectLiveSync();
    } catch {
      liveServer = false;
      setStandaloneBanner();
    }
  }

  function setStandaloneBanner() {
    $('connBanner').classList.remove('live');
    $('connStatusText').textContent = role === 'host'
      ? 'Modo Proyector Independiente (sin servidor activo)'
      : 'Reto Móvil Individual · Puntaje sincronizado por tiempo';
  }

  function connectLiveSync() {
    fetchLiveState();
    if (typeof EventSource !== 'undefined') {
      try {
        sse = new EventSource('./api/events');
        sse.onmessage = (ev) => {
          try {
            lastServerState = JSON.parse(ev.data);
            renderAll();
          } catch {}
        };
      } catch {}
    }
    setInterval(fetchLiveState, 1500);
  }

  async function fetchLiveState() {
    if (!liveServer) return;
    try {
      const url = playerId ? `./api/state?playerId=${encodeURIComponent(playerId)}` : './api/state';
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        lastServerState = await r.json();
        renderAll();
      }
    } catch {}
  }

  // Player Join
  $('joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = $('nickInput').value.trim();
    const pRole = $('roleInput').value;
    const pin = $('pinInput').value.trim();
    if (!nick) return;
    if (pin !== cfg.pin) {
      alert(`PIN incorrecto. Usa el PIN de la sala: ${cfg.pin}`);
      return;
    }

    playerNick = nick;
    playerRole = pRole;
    sessionStorage.setItem('bpm_player_nick', playerNick);
    sessionStorage.setItem('bpm_player_role', playerRole);

    if (liveServer) {
      try {
        const res = await fetch('./api/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nick, role: pRole, pin })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'No se pudo ingresar a la sala.');
          return;
        }
        playerId = data.playerId;
        sessionStorage.setItem('bpm_player_id', playerId);
        lastServerState = data.state;
        renderAll();
      } catch {
        alert('Error de conexión con la sala. Intenta de nuevo.');
      }
    } else {
      localPlayer = {
        joined: true,
        qIndex: 0,
        score: 0,
        streak: 0,
        correctCount: 0,
        step: 'question',
        selectedOpt: null,
        lastPoints: 0,
        lastCorrect: false,
        qEndsAt: Date.now() + cfg.questions[0].timeSec * 1000
      };
      renderAll();
    }
  });

  $('leaveRoomBtn').addEventListener('click', () => {
    playerId = '';
    sessionStorage.removeItem('bpm_player_id');
    localPlayer.joined = false;
    localPlayer.step = 'join';
    renderAll();
  });

  // Render Loop
  function renderAll() {
    if (role === 'player') {
      if (liveServer) renderLivePlayer();
      else renderStandalonePlayer();
    } else {
      renderHostView();
    }
  }

  function renderOptionButtons(container, q, selectedOpt, revealCorrect, onPick) {
    container.innerHTML = '';
    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt-btn';
      btn.dataset.opt = String(idx);
      if (selectedOpt !== null) {
        if (idx === selectedOpt) btn.classList.add('selected');
        else btn.classList.add('dimmed');
      }
      if (revealCorrect !== null && revealCorrect !== undefined) {
        btn.classList.remove('dimmed');
        if (idx === revealCorrect) btn.classList.add('reveal-correct');
        else btn.classList.add('reveal-wrong');
      }
      btn.innerHTML = `<span class="opt-badge">${cfg.letters[idx]} ${cfg.symbols[idx]}</span><span>${optText}</span>`;
      if (onPick && selectedOpt === null && (revealCorrect === null || revealCorrect === undefined)) {
        btn.addEventListener('click', () => onPick(idx));
      } else {
        btn.disabled = true;
      }
      container.appendChild(btn);
    });
  }

  // LIVE SERVER PLAYER VIEW
  function renderLivePlayer() {
    const st = lastServerState;
    const me = st?.players?.find((p) => p.id === playerId);
    if (!playerId || !me) {
      show('pJoinCard', true);
      show('pLobbyCard', false);
      show('pQuestionCard', false);
      show('pFeedbackWrap', false);
      show('pFinishCard', false);
      return;
    }

    show('pJoinCard', false);
    if (st.phase === 'lobby') {
      show('pLobbyCard', true);
      show('pQuestionCard', false);
      show('pFeedbackWrap', false);
      show('pFinishCard', false);
      $('pLobbyName').textContent = me.name;
      $('pLobbyRole').textContent = me.role;
      $('pLobbyCount').textContent = String(st.players.length);
      return;
    }

    if (st.phase === 'question') {
      show('pLobbyCard', false);
      show('pQuestionCard', true);
      show('pFeedbackWrap', false);
      show('pFinishCard', false);

      const q = cfg.questions[st.qIndex];
      const myAns = st.myAnswer;
      $('pQProgress').textContent = `PREGUNTA ${st.qIndex + 1} / ${cfg.questions.length}`;
      $('pScoreBadge').textContent = `${me.score} pts`;
      $('pQStem').textContent = q.prompt;
      show('pLockedMsg', Boolean(myAns));

      renderOptionButtons($('pOptionsGrid'), q, myAns ? myAns.optIndex : null, null, async (idx) => {
        await fetch('./api/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, qIndex: st.qIndex, optIndex: idx })
        });
        fetchLiveState();
      });
      return;
    }

    if (st.phase === 'reveal') {
      show('pLobbyCard', false);
      show('pQuestionCard', false);
      show('pFeedbackWrap', true);
      show('pNextLocalBtn', false);
      show('pFinishCard', false);

      const q = cfg.questions[st.qIndex];
      const myAns = st.myAnswer;
      const ok = Boolean(myAns && myAns.isCorrect);
      $('pFeedbackCard').className = `feedback-card ${ok ? 'ok' : 'bad'}`;
      $('pFbTag').textContent = `PREGUNTA ${st.qIndex + 1} / ${cfg.questions.length}`;
      $('pFbHeadline').textContent = ok ? '¡Respuesta correcta!' : (myAns ? 'Respuesta incorrecta' : 'Sin respuesta a tiempo');
      $('pFbPoints').textContent = ok ? `+${myAns.points} pts` : '+0 pts';
      $('pFbTotals').textContent = `Acumulado: ${me.score} pts · Racha: ${me.streak}`;
      $('pFbArt').textContent = q.article;
      $('pFbExplain').textContent = q.explanation;
      return;
    }

    if (st.phase === 'finished') {
      show('pLobbyCard', false);
      show('pQuestionCard', false);
      show('pFeedbackWrap', false);
      show('pFinishCard', true);
      const sorted = [...st.players].sort((a, b) => b.score - a.score);
      const rank = sorted.findIndex((p) => p.id === playerId) + 1;
      $('pFinalName').textContent = me.name;
      $('pFinalRankBadge').textContent = `PUESTO #${rank} DE ${sorted.length} · ${me.role}`;
      $('pFinalScore').textContent = String(me.score);
      $('pFinalAcc').textContent = `${me.correctCount} / ${cfg.questions.length} aciertos`;
      $('pFinalBoard').innerHTML = sorted.slice(0, 5).map((p, i) =>
        `<div class="leaderboard-row${i === 0 ? ' top1' : ''}"><span>#${i + 1} ${p.name}</span><span class="mono">${p.score} pts</span></div>`
      ).join('');
      show('pPlayAgainBtn', false);
    }
  }

  // STANDALONE PLAYER VIEW
  function renderStandalonePlayer() {
    show('pLobbyCard', false);
    if (!localPlayer.joined || localPlayer.step === 'join') {
      show('pJoinCard', true);
      show('pQuestionCard', false);
      show('pFeedbackWrap', false);
      show('pFinishCard', false);
      return;
    }
    show('pJoinCard', false);

    if (localPlayer.step === 'question') {
      show('pQuestionCard', true);
      show('pFeedbackWrap', false);
      show('pFinishCard', false);
      show('pLockedMsg', false);

      const q = cfg.questions[localPlayer.qIndex];
      $('pQProgress').textContent = `PREGUNTA ${localPlayer.qIndex + 1} / ${cfg.questions.length}`;
      $('pScoreBadge').textContent = `${localPlayer.score} pts`;
      $('pQStem').textContent = q.prompt;

      renderOptionButtons($('pOptionsGrid'), q, null, null, (idx) => {
        const leftMs = Math.max(0, localPlayer.qEndsAt - Date.now());
        const timeLeft = leftMs / 1000;
        const ok = idx === q.correctIndex;
        const pts = ok ? cfg.basePoints + Math.round(cfg.speedBonus * (timeLeft / q.timeSec)) : 0;
        localPlayer.selectedOpt = idx;
        localPlayer.lastCorrect = ok;
        localPlayer.lastPoints = pts;
        if (ok) {
          localPlayer.score += pts;
          localPlayer.streak += 1;
          localPlayer.correctCount += 1;
        } else {
          localPlayer.streak = 0;
        }
        localPlayer.step = 'feedback';
        renderAll();
      });
      return;
    }

    if (localPlayer.step === 'feedback') {
      show('pQuestionCard', false);
      show('pFeedbackWrap', true);
      show('pFinishCard', false);
      const q = cfg.questions[localPlayer.qIndex];
      const ok = localPlayer.lastCorrect;
      $('pFeedbackCard').className = `feedback-card ${ok ? 'ok' : 'bad'}`;
      $('pFbTag').textContent = `PREGUNTA ${localPlayer.qIndex + 1} / ${cfg.questions.length}`;
      $('pFbHeadline').textContent = ok ? '¡Respuesta correcta!' : (localPlayer.selectedOpt === null ? 'Tiempo agotado' : 'Respuesta incorrecta');
      $('pFbPoints').textContent = ok ? `+${localPlayer.lastPoints} pts` : '+0 pts';
      $('pFbTotals').textContent = `Acumulado: ${localPlayer.score} pts · Racha: ${localPlayer.streak}`;
      $('pFbArt').textContent = q.article;
      $('pFbExplain').textContent = q.explanation;
      const btn = $('pNextLocalBtn');
      show('pNextLocalBtn', true);
      btn.textContent = localPlayer.qIndex + 1 < cfg.questions.length ? 'Siguiente pregunta →' : 'Ver certificado final →';
      return;
    }

    if (localPlayer.step === 'finish') {
      show('pQuestionCard', false);
      show('pFeedbackWrap', false);
      show('pFinishCard', true);
      show('pPlayAgainBtn', true);
      const tier = localPlayer.correctCount >= 7 ? 'Auditor Líder BPM' : localPlayer.correctCount >= 5 ? 'Inspector Certificado' : 'Manipulador en Formación';
      $('pFinalName').textContent = playerNick;
      $('pFinalRankBadge').textContent = `${tier} · ${playerRole}`;
      $('pFinalScore').textContent = String(localPlayer.score);
      $('pFinalAcc').textContent = `${localPlayer.correctCount} / ${cfg.questions.length} aciertos`;
      $('pFinalBoard').innerHTML = `<div class="panel" style="background:var(--soft);padding:12px;font-size:13px;text-align:center;">Muestra esta tarjeta al expositor para comparar puntajes del salón.</div>`;
    }
  }

  $('pNextLocalBtn').addEventListener('click', () => {
    if (localPlayer.qIndex + 1 < cfg.questions.length) {
      localPlayer.qIndex += 1;
      localPlayer.selectedOpt = null;
      localPlayer.step = 'question';
      localPlayer.qEndsAt = Date.now() + cfg.questions[localPlayer.qIndex].timeSec * 1000;
    } else {
      localPlayer.step = 'finish';
    }
    renderAll();
  });

  $('pPlayAgainBtn').addEventListener('click', () => {
    localPlayer = {
      joined: true,
      qIndex: 0,
      score: 0,
      streak: 0,
      correctCount: 0,
      step: 'question',
      selectedOpt: null,
      lastPoints: 0,
      lastCorrect: false,
      qEndsAt: Date.now() + cfg.questions[0].timeSec * 1000
    };
    renderAll();
  });

  // HOST VIEW (Works both with liveServer and standalone projector)
  function getHostState() {
    return liveServer && lastServerState ? lastServerState : standaloneState;
  }

  async function hostAction(action) {
    if (liveServer) {
      const send = (key) => fetch('./api/host/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, key })
      });
      let key = qs.get('key') || sessionStorage.getItem('bpm_host_key') || '';
      let r = await send(key);
      if (r.status === 401) {
        key = (window.prompt('Clave del anfitrión:') || '').trim();
        r = await send(key);
        if (r.status === 401) window.alert('Clave incorrecta: solo el expositor controla el quiz.');
      }
      if (r.ok) sessionStorage.setItem('bpm_host_key', key);
      fetchLiveState();
      return;
    }
    // Standalone projector mode
    const st = standaloneState;
    if (action === 'start') {
      st.phase = 'question';
      st.qIndex = 0;
      const q = cfg.questions[0];
      st.questionStartedAt = Date.now();
      st.questionEndsAt = st.questionStartedAt + q.timeSec * 1000;
    } else if (action === 'reveal') {
      st.phase = 'reveal';
    } else if (action === 'next') {
      if (st.qIndex + 1 < cfg.questions.length) {
        st.qIndex += 1;
        st.phase = 'question';
        const q = cfg.questions[st.qIndex];
        st.questionStartedAt = Date.now();
        st.questionEndsAt = st.questionStartedAt + q.timeSec * 1000;
      } else {
        st.phase = 'finished';
      }
    } else if (action === 'reset') {
      st.phase = 'lobby';
      st.qIndex = 0;
    }
    bc?.postMessage(st);
    renderAll();
  }

  $('hStartBtn').addEventListener('click', () => hostAction('start'));
  $('hRevealBtn').addEventListener('click', () => hostAction('reveal'));
  $('hNextBtn').addEventListener('click', () => hostAction('next'));
  $('hostResetBtn').addEventListener('click', () => hostAction('reset'));

  function renderHostView() {
    const st = getHostState();
    show('hLobby', st.phase === 'lobby');
    show('hQuestion', st.phase === 'question' || st.phase === 'reveal');
    show('hFinish', st.phase === 'finished');

    if (st.phase === 'lobby') {
      const players = st.players || [];
      $('hPlayerCount').textContent = String(players.length);
      $('hModeHint').textContent = liveServer
        ? 'Cuando tus compañeros aparezcan aquí, haz clic en Iniciar Pregunta 1.'
        : 'Modo Proyector Independiente activo: puedes proyectar y controlar las 8 preguntas mientras el grupo juega desde el QR.';
      $('hPlayerChips').innerHTML = players.length
        ? players.map((p) => `<span class="p-chip">${p.name} · <span class="mono" style="font-size:11px;color:var(--azul);">${p.role}</span></span>`).join('')
        : '<span class="mono" style="font-size:12px;color:var(--acero);">Esperando escaneos…</span>';
      return;
    }

    if (st.phase === 'question' || st.phase === 'reveal') {
      const q = cfg.questions[st.qIndex];
      $('hQNum').textContent = `PREGUNTA ${st.qIndex + 1} / ${cfg.questions.length} · ${q.speaker}`;
      $('hQStem').textContent = q.prompt;

      const players = st.players || [];
      const answered = st.answeredCount ?? 0;
      $('hAnsweredCount').textContent = liveServer
        ? `${answered} / ${players.length} respondieron`
        : 'Modo Proyector en Vivo';

      const revealIdx = st.phase === 'reveal' ? q.correctIndex : null;
      renderOptionButtons($('hOptionsGrid'), q, null, revealIdx, null);

      if (st.phase === 'reveal' && st.counts) {
        const btns = $('hOptionsGrid').querySelectorAll('.opt-btn');
        btns.forEach((b, i) => {
          const span = document.createElement('span');
          span.className = 'mono';
          span.style.marginLeft = 'auto';
          span.textContent = `${st.counts[i] || 0} votos`;
          b.appendChild(span);
        });
      }

      show('hRevealBox', st.phase === 'reveal');
      $('hRevealArt').textContent = q.article;
      $('hRevealExplain').textContent = q.explanation;

      show('hRevealBtn', st.phase === 'question');
      show('hNextBtn', st.phase === 'reveal');
      $('hNextBtn').textContent = st.qIndex + 1 < cfg.questions.length ? 'Siguiente pregunta →' : 'Mostrar podio final →';
      return;
    }

    if (st.phase === 'finished') {
      const sorted = [...(st.players || [])].sort((a, b) => b.score - a.score);
      const top3 = sorted.slice(0, 3);
      if (!top3.length) {
        $('hPodium').innerHTML = '';
        $('hLeaderboard').innerHTML = '<div class="panel" style="background:var(--soft);text-align:center;"><b>Actividad finalizada.</b> Invita a los 3 puntajes más altos del salón a compartir su tarjeta móvil.</div>';
        return;
      }
      const order = [top3[1], top3[0], top3[2]];
      const classes = ['p2', 'p1', 'p3'];
      const labels = ['#2', '#1 CAMPEÓN', '#3'];
      $('hPodium').innerHTML = order.map((p, idx) => p ? `
        <div class="podium-slot ${classes[idx]}">
          <div class="mono" style="font-size:12px;">${labels[idx]}</div>
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin:6px 0;">${p.name}</div>
          <div class="mono" style="font-size:15px;">${p.score} pts</div>
        </div>
      ` : '<div></div>').join('');

      $('hLeaderboard').innerHTML = sorted.map((p, i) =>
        `<div class="leaderboard-row${i === 0 ? ' top1' : ''}"><span>#${i + 1} ${p.name} <small style="color:var(--acero);">(${p.role})</small></span><span class="mono">${p.score} pts · ${p.correctCount}/${cfg.questions.length}</span></div>`
      ).join('');
    }
  }

  // Smooth countdown bar ticker (runs at 200ms)
  function startTickLoop() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      // Player countdown
      if (role === 'player') {
        if (liveServer && lastServerState?.phase === 'question') {
          const q = cfg.questions[lastServerState.qIndex];
          const left = Math.max(0, Math.ceil((lastServerState.questionEndsAt - Date.now()) / 1000));
          const pct = Math.max(0, Math.min(100, ((lastServerState.questionEndsAt - Date.now()) / (q.timeSec * 1000)) * 100));
          $('pTimerNum').textContent = `${left}s`;
          $('pTimerFill').style.width = `${pct}%`;
          $('pTimerFill').classList.toggle('low', left <= 5);
        } else if (!liveServer && localPlayer.step === 'question') {
          const q = cfg.questions[localPlayer.qIndex];
          const remMs = Math.max(0, localPlayer.qEndsAt - Date.now());
          const left = Math.ceil(remMs / 1000);
          $('pTimerNum').textContent = `${left}s`;
          $('pTimerFill').style.width = `${(remMs / (q.timeSec * 1000)) * 100}%`;
          $('pTimerFill').classList.toggle('low', left <= 5);
          if (remMs === 0) {
            localPlayer.selectedOpt = null;
            localPlayer.lastCorrect = false;
            localPlayer.lastPoints = 0;
            localPlayer.streak = 0;
            localPlayer.step = 'feedback';
            renderAll();
          }
        }
      }

      // Host countdown
      if (role === 'host') {
        const st = getHostState();
        if (st?.phase === 'question') {
          const q = cfg.questions[st.qIndex];
          const remMs = Math.max(0, st.questionEndsAt - Date.now());
          const left = Math.ceil(remMs / 1000);
          $('hTimerNum').textContent = `${left}s`;
          $('hTimerFill').style.width = `${(remMs / (q.timeSec * 1000)) * 100}%`;
          $('hTimerFill').classList.toggle('low', left <= 5);
          if (!liveServer && remMs === 0) {
            st.phase = 'reveal';
            renderAll();
          }
        }
      }
    }, 200);
  }

  // Init
  setRole(role);
  renderHostQR();
  startTickLoop();
  detectBackend();
})();
