/* BPM Arena en la nube: en la web pública (GitHub Pages) no hay server.js, así que
   las llamadas a ./api/* se atienden con funciones de Supabase (misma forma de respuesta).
   En el salón, con server.js local, este archivo no hace nada. */
(function () {
  'use strict';
  const isPublicSite = /\.github\.io$/i.test(location.hostname) || new URLSearchParams(location.search).has('cloud');
  if (!isPublicSite) return;

  const SUPABASE_URL = 'https://garahrwebevldwyddlae.supabase.co';
  // Clave publicable: está hecha para ir en el navegador; las tablas solo se tocan vía funciones.
  const SUPABASE_KEY = 'sb_publishable_C98M-rePLr74CMwId5_OXg_ykR3mD5_';
  const nativeFetch = window.fetch.bind(window);
  let clockOffset = 0; // Date.now() del celular menos la hora del servidor

  const json = (status, data) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });

  function toLocalClock(state) {
    if (!state || typeof state !== 'object') return state;
    if (state.serverNow) clockOffset = Date.now() - state.serverNow;
    const shift = (t) => (t ? t + clockOffset : 0);
    return { ...state, questionStartedAt: shift(state.questionStartedAt), questionEndsAt: shift(state.questionEndsAt) };
  }

  async function rpc(fn, args) {
    const r = await nativeFetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(args)
    });
    if (!r.ok) throw new Error(`Supabase ${fn}: HTTP ${r.status}`);
    return r.json();
  }

  function reply(data) {
    if (data && data.error) return json(data.status || 400, { error: data.error });
    if (data && data.state) return json(200, { ...data, state: toLocalClock(data.state) });
    return json(200, data);
  }

  async function route(path, init) {
    const url = new URL(path, location.href);
    const body = init && init.body ? JSON.parse(init.body) : {};
    switch (url.pathname.replace(/^.*\/api\//, '')) {
      case 'info':
        return json(200, {
          ok: true, pin: '2674', tunnelActive: true, hostKeyRequired: true, questionsCount: 8,
          joinUrl: new URL('quiz.html?role=player', location.href).href
        });
      case 'state':
        return json(200, toLocalClock(await rpc('bpm_state', { p_player: url.searchParams.get('playerId') || '' })));
      case 'join':
        return reply(await rpc('bpm_join', { p_name: body.name, p_role: body.role, p_pin: body.pin }));
      case 'answer':
        return reply(await rpc('bpm_answer', { p_player: body.playerId, p_q: body.qIndex, p_opt: body.optIndex }));
      case 'host/action':
        return reply(await rpc('bpm_host', { p_action: body.action, p_key: body.key || '' }));
      default:
        return json(404, { error: 'Ruta desconocida.' });
    }
  }

  window.fetch = function (input, init) {
    const path = typeof input === 'string' ? input : input && input.url;
    if (typeof path === 'string' && /(^|\/)api\//.test(path) && !/^https?:/i.test(path)) {
      return route(path, init).catch((err) => json(503, { error: `Sin conexión con la sala (${err.message}).` }));
    }
    return nativeFetch(input, init);
  };
  // Sin SSE en la nube: quiz.js ya consulta el estado cada 1,5 s.
  window.EventSource = undefined;
})();
