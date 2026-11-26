/* Servidor Zero-Dependency para BPM Arena (UAM) + Soporte opcional de túnel Cloudflare */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

require('./quiz-data.js');
const CFG = globalThis.BPM_QUIZ_CONFIG;

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const USE_TUNNEL = process.argv.includes('--tunnel');
// En hosting (Render define RENDER_EXTERNAL_URL) el QR apunta a la URL pública.
const PUBLIC_URL = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
// Clave del anfitrión: si está definida, solo quien la tenga puede iniciar/avanzar/reiniciar.
const HOST_KEY = String(process.env.HOST_KEY || '');
const MAX_PLAYERS = 300;
const cleanText = (v, max) => String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, max);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf'
};

let tunnelUrl = '';
let cloudflaredProc = null;

const room = {
  pin: CFG.pin,
  phase: 'lobby', // lobby | question | reveal | finished
  qIndex: 0,
  questionStartedAt: 0,
  questionEndsAt: 0,
  players: new Map() // id -> { id, name, role, score, streak, correctCount, answers: {} }
};

const sseClients = new Set();

function getLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) {
        const score = /wi-?fi|wlan|wireless/i.test(name) ? 0 : /virtual|vmware|vbox|hyper-v|wsl|docker/i.test(name) ? 2 : 1;
        candidates.push({ score, address: a.address });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.address || '127.0.0.1';
}

function buildPublicState(playerId) {
  const playersArr = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    score: p.score,
    streak: p.streak,
    correctCount: p.correctCount
  }));

  const q = CFG.questions[room.qIndex];
  let answeredCount = 0;
  const counts = [0, 0, 0, 0];
  for (const p of room.players.values()) {
    const ans = p.answers[room.qIndex];
    if (ans) {
      answeredCount++;
      if (ans.optIndex >= 0 && ans.optIndex < 4) counts[ans.optIndex]++;
    }
  }

  let myAnswer = null;
  if (playerId && room.players.has(playerId)) {
    const ans = room.players.get(playerId).answers[room.qIndex];
    if (ans) {
      myAnswer = room.phase === 'question'
        ? { optIndex: ans.optIndex }
        : ans;
    }
  }

  return {
    pin: room.pin,
    phase: room.phase,
    qIndex: room.qIndex,
    questionStartedAt: room.questionStartedAt,
    questionEndsAt: room.questionEndsAt,
    answeredCount,
    counts: room.phase === 'reveal' ? counts : null,
    players: playersArr,
    myAnswer,
    totalQuestions: CFG.questions.length,
    timeSec: q?.timeSec || 20
  };
}

function broadcastState() {
  const basePayload = JSON.stringify(buildPublicState(null));
  for (const res of sseClients) {
    try {
      res.write(`data: ${basePayload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
      if (buf.length > 64 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // Lectura pública: la copia del deck en GitHub Pages consulta /api/info y /api/state.
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// Auto-advance question -> reveal when timer ends
setInterval(() => {
  if (room.phase === 'question' && Date.now() >= room.questionEndsAt) {
    room.phase = 'reveal';
    broadcastState();
  }
}, 400);

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = urlObj.pathname;

  if (pathname === '/api/info' && req.method === 'GET') {
    const lanUrl = `http://${getLanIp()}:${PORT}/quiz.html?role=player`;
    const base = PUBLIC_URL || tunnelUrl;
    const joinUrl = base ? `${base}/quiz.html?role=player` : lanUrl;
    return sendJson(res, 200, {
      ok: true,
      pin: room.pin,
      lanUrl,
      joinUrl,
      tunnelActive: Boolean(base),
      hostKeyRequired: Boolean(HOST_KEY),
      questionsCount: CFG.questions.length
    });
  }

  if (pathname === '/api/state' && req.method === 'GET') {
    const pid = urlObj.searchParams.get('playerId') || '';
    return sendJson(res, 200, buildPublicState(pid));
  }

  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    sseClients.add(res);
    res.write(`data: ${JSON.stringify(buildPublicState(null))}\n\n`);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (pathname === '/api/join' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const name = cleanText(body.name, 24);
      const role = cleanText(body.role, 32) || 'Auditor INVIMA';
      const pin = String(body.pin || '').trim();
      if (!name) return sendJson(res, 400, { error: 'Ingresa tu nombre.' });
      if (pin !== room.pin) return sendJson(res, 403, { error: 'PIN incorrecto.' });
      if (room.players.size >= MAX_PLAYERS) return sendJson(res, 429, { error: 'La sala está llena.' });

      const playerId = crypto.randomBytes(6).toString('hex');
      room.players.set(playerId, {
        id: playerId,
        name,
        role,
        score: 0,
        streak: 0,
        correctCount: 0,
        answers: {}
      });
      broadcastState();
      return sendJson(res, 200, { playerId, state: buildPublicState(playerId) });
    } catch {
      return sendJson(res, 400, { error: 'Solicitud inválida.' });
    }
  }

  if (pathname === '/api/answer' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const player = room.players.get(String(body.playerId || ''));
      const qIndex = Number(body.qIndex);
      const optIndex = Number(body.optIndex);
      if (!player) return sendJson(res, 404, { error: 'Jugador no encontrado.' });
      if (room.phase !== 'question' || qIndex !== room.qIndex) {
        return sendJson(res, 409, { error: 'Pregunta cerrada.' });
      }
      if (player.answers[qIndex]) {
        return sendJson(res, 200, { ok: true, state: buildPublicState(player.id) });
      }

      const q = CFG.questions[qIndex];
      const timeLeft = Math.max(0, (room.questionEndsAt - Date.now()) / 1000);
      const isCorrect = optIndex === q.correctIndex;
      const points = isCorrect
        ? CFG.basePoints + Math.round(CFG.speedBonus * (timeLeft / q.timeSec))
        : 0;

      player.answers[qIndex] = { optIndex, points, isCorrect, timeLeft };
      if (isCorrect) {
        player.score += points;
        player.streak += 1;
        player.correctCount += 1;
      } else {
        player.streak = 0;
      }

      // If everyone answered, reveal immediately
      let allAnswered = room.players.size > 0;
      for (const p of room.players.values()) {
        if (!p.answers[qIndex]) { allAnswered = false; break; }
      }
      if (allAnswered) room.phase = 'reveal';

      broadcastState();
      return sendJson(res, 200, { ok: true, state: buildPublicState(player.id) });
    } catch {
      return sendJson(res, 400, { error: 'Respuesta inválida.' });
    }
  }

  if (pathname === '/api/host/action' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const action = String(body.action || '');
      if (HOST_KEY && String(body.key || '') !== HOST_KEY) {
        return sendJson(res, 401, { error: 'Clave de anfitrión incorrecta.' });
      }
      if (action === 'start') {
        room.phase = 'question';
        room.qIndex = 0;
        const q = CFG.questions[0];
        room.questionStartedAt = Date.now();
        room.questionEndsAt = room.questionStartedAt + q.timeSec * 1000;
      } else if (action === 'reveal') {
        room.phase = 'reveal';
      } else if (action === 'next') {
        if (room.qIndex + 1 < CFG.questions.length) {
          room.qIndex += 1;
          room.phase = 'question';
          const q = CFG.questions[room.qIndex];
          room.questionStartedAt = Date.now();
          room.questionEndsAt = room.questionStartedAt + q.timeSec * 1000;
        } else {
          room.phase = 'finished';
        }
      } else if (action === 'reset') {
        room.phase = 'lobby';
        room.qIndex = 0;
        room.players.clear();
      }
      broadcastState();
      return sendJson(res, 200, { ok: true, state: buildPublicState(null) });
    } catch {
      return sendJson(res, 400, { error: 'Acción inválida.' });
    }
  }

  // Static files inside Exposicion_BPM
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT, rel);
  if (!fullPath.startsWith(ROOT + path.sep) && fullPath !== ROOT) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

function startTunnelIfRequested() {
  if (!USE_TUNNEL) return;
  const cfPaths = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'cloudflared'
  ];
  const exe = cfPaths.find((p) => p === 'cloudflared' || fs.existsSync(p));
  if (!exe) {
    console.log('[Tunnel] cloudflared no encontrado; usando IP de red local.');
    return;
  }
  console.log('[Tunnel] Iniciando túnel HTTPS público con cloudflared...');
  cloudflaredProc = spawn(exe, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const onOut = (chunk) => {
    const s = chunk.toString();
    const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m && !tunnelUrl) {
      tunnelUrl = m[0];
      console.log(`\n==================================================`);
      console.log(`ENLACE PÚBLICO PARA CELULARES: ${tunnelUrl}/quiz.html?role=player`);
      console.log(`CONSOLA DEL PROYECTOR:        ${tunnelUrl}/quiz.html?role=host`);
      console.log(`==================================================\n`);
    }
  };
  cloudflaredProc.stdout.on('data', onOut);
  cloudflaredProc.stderr.on('data', onOut);
  cloudflaredProc.on('exit', () => { cloudflaredProc = null; });
}

server.listen(PORT, '0.0.0.0', () => {
  const lan = getLanIp();
  console.log(`BPM Arena & Presentación activos en:`);
  console.log(`  - Presentación:   http://127.0.0.1:${PORT}/index.html`);
  console.log(`  - Consola Host:   http://127.0.0.1:${PORT}/quiz.html?role=host`);
  console.log(`  - Celulares LAN:  http://${lan}:${PORT}/quiz.html?role=player`);
  console.log(`  - PIN de sala:    ${room.pin}`);
  startTunnelIfRequested();
});

function shutdown() {
  if (cloudflaredProc) {
    try { cloudflaredProc.kill(); } catch {}
  }
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
