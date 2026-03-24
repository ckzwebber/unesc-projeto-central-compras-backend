const { getLogs } = require("./logBuffer.js");

const LOG_VIEWER_SECRET = process.env.LOG_VIEWER_SECRET;

function authMiddleware(req, res, next) {
  if (!LOG_VIEWER_SECRET) {
    return res.status(503).json({ error: "LOG_VIEWER_SECRET não configurado." });
  }
  const token = req.query.token;
  if (!token || token !== LOG_VIEWER_SECRET) {
    return res.status(401).json({ error: "Token inválido ou ausente." });
  }
  next();
}

const viewerHtml = /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Log Viewer — Central de Compras</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0c0f;
    --surface: #111318;
    --surface2: #181c22;
    --border: #1f242d;
    --text: #c9d1e0;
    --muted: #4a5568;
    --accent: #00d4aa;
    --accent2: #7c6af7;

    --get: #00d4aa;
    --post: #7c6af7;
    --put: #f5a623;
    --patch: #f5a623;
    --delete: #f04747;

    --2xx: #00d4aa;
    --4xx: #f5a623;
    --5xx: #f04747;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    min-height: 100vh;
  }

  header {
    padding: 20px 28px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 100;
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 15px;
    color: var(--accent);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .logo span { color: var(--muted); font-weight: 400; }

  .metrics {
    display: flex;
    gap: 20px;
    margin-left: auto;
    align-items: center;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .metric-val {
    font-weight: 700;
    font-size: 15px;
    color: var(--text);
    line-height: 1;
  }

  .metric-label {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 2px;
  }

  .metric-val.error { color: var(--5xx); }
  .metric-val.accent { color: var(--accent); }

  .sep { width: 1px; height: 28px; background: var(--border); }

  .controls {
    padding: 12px 28px;
    display: flex;
    gap: 10px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  select, input {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 4px;
    outline: none;
    transition: border-color 0.15s;
  }

  select:focus, input:focus { border-color: var(--accent); }

  input[type=text] { width: 180px; }

  .btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn:hover { background: var(--surface); border-color: var(--accent); color: var(--accent); }

  .btn.active { border-color: var(--accent); color: var(--accent); }

  .btn-refresh {
    margin-left: auto;
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-refresh:hover { background: var(--accent); color: var(--bg); }

  #auto-label { font-size: 11px; color: var(--muted); }

  .logs {
    padding: 16px 28px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .log-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .log-card:hover { border-color: var(--accent); background: var(--surface2); }

  .log-card.expanded { border-color: var(--accent2); }

  .log-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 3px;
    letter-spacing: 0.06em;
    min-width: 48px;
    text-align: center;
  }

  .method-GET    { background: color-mix(in srgb, var(--get) 15%, transparent);    color: var(--get); }
  .method-POST   { background: color-mix(in srgb, var(--post) 15%, transparent);   color: var(--post); }
  .method-PUT    { background: color-mix(in srgb, var(--put) 15%, transparent);    color: var(--put); }
  .method-PATCH  { background: color-mix(in srgb, var(--patch) 15%, transparent);  color: var(--patch); }
  .method-DELETE { background: color-mix(in srgb, var(--delete) 15%, transparent); color: var(--delete); }

  .status {
    font-weight: 700;
    font-size: 12px;
    min-width: 32px;
  }

  .s2xx { color: var(--2xx); }
  .s4xx { color: var(--4xx); }
  .s5xx { color: var(--5xx); }

  .path {
    flex: 1;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rt-bar-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 120px;
  }

  .rt-bar-bg {
    flex: 1;
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .rt-bar {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.3s;
  }

  .rt-bar.slow { background: var(--4xx); }
  .rt-bar.very-slow { background: var(--5xx); }

  .rt-val {
    font-size: 11px;
    color: var(--muted);
    min-width: 48px;
    text-align: right;
  }

  .ts { font-size: 11px; color: var(--muted); min-width: 80px; text-align: right; }

  .log-detail {
    display: none;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .log-card.expanded .log-detail { display: block; }

  pre {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.6;
    color: #8fbcbb;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .empty {
    text-align: center;
    color: var(--muted);
    padding: 60px 0;
    font-size: 13px;
  }

  .level-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    font-weight: 600;
  }

  .level-30 { background: color-mix(in srgb, var(--2xx) 12%, transparent); color: var(--2xx); }
  .level-40 { background: color-mix(in srgb, var(--4xx) 12%, transparent); color: var(--4xx); }
  .level-50, .level-60 { background: color-mix(in srgb, var(--5xx) 12%, transparent); color: var(--5xx); }

  .msg { flex: 1; color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }

  .copy-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', monospace;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .copy-btn:hover { color: var(--accent); border-color: var(--border); }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
</style>
</head>
<body>

<header>
  <div class="logo">Central<span>/</span>Logs</div>
  <div class="sep"></div>
  <div id="env-badge" style="font-size:11px;color:var(--muted)">carregando...</div>
  <div class="metrics">
    <div class="metric"><span class="metric-val accent" id="m-total">—</span><span class="metric-label">requests</span></div>
    <div class="sep"></div>
    <div class="metric"><span class="metric-val" id="m-avg">—</span><span class="metric-label">avg ms</span></div>
    <div class="sep"></div>
    <div class="metric"><span class="metric-val" id="m-peak">—</span><span class="metric-label">peak ms</span></div>
    <div class="sep"></div>
    <div class="metric"><span class="metric-val error" id="m-errors">—</span><span class="metric-label">errors</span></div>
  </div>
</header>

<div class="controls">
  <select id="f-method">
    <option value="">Método</option>
    <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
  </select>
  <select id="f-status">
    <option value="">Status</option>
    <option value="2xx">2xx OK</option>
    <option value="4xx">4xx Client</option>
    <option value="5xx">5xx Server</option>
  </select>
  <input type="text" id="f-path" placeholder="filtrar path..." />
  <select id="f-limit">
    <option value="50">50 logs</option>
    <option value="100" selected>100 logs</option>
    <option value="200">200 logs</option>
    <option value="500">500 logs</option>
  </select>
  <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
    <input type="checkbox" id="auto-refresh" checked style="accent-color:var(--accent)" />
    <span id="auto-label">auto 5s</span>
  </label>
  <button class="btn btn-refresh" onclick="loadLogs()">↻ Atualizar</button>
</div>

<div class="logs" id="logs-container">
  <div class="empty">Carregando logs...</div>
</div>

<script>
  const token = new URLSearchParams(location.search).get('token') || '';
  let peakRt = 1;
  let autoTimer = null;

  function levelName(l) {
    return { 10:'TRACE',20:'DEBUG',30:'INFO',40:'WARN',50:'ERROR',60:'FATAL' }[l] || l;
  }

  function statusClass(code) {
    if (!code) return '';
    if (code < 300) return 's2xx';
    if (code < 500) return 's4xx';
    return 's5xx';
  }

  function rtClass(rt, peak) {
    const ratio = rt / peak;
    if (ratio > 0.7) return 'very-slow';
    if (ratio > 0.4) return 'slow';
    return '';
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3,'0');
  }

  // store para lookup dos JSONs por índice — evita passar JSON em atributos HTML
  const logStore = {};

  function renderCard(log, idx, peak) {
    const method = log.req?.method || '—';
    const path = log.req?.path || log.msg || '—';
    const status = log.res?.statusCode;
    const rt = log.responseTime;
    const rtPct = rt ? Math.max(3, Math.round((rt / peak) * 100)) : 0;
    const rtCls = rt ? rtClass(rt, peak) : '';
    const lvl = log.level;
    const json = JSON.stringify(log, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    logStore['i' + idx] = JSON.stringify(log, null, 2);

    return \`<div class="log-card" data-idx="i\${idx}">
      <div class="log-row">
        <span class="badge method-\${method}">\${method}</span>
        \${status ? \`<span class="status \${statusClass(status)}">\${status}</span>\` : \`<span class="level-badge level-\${lvl}">\${levelName(lvl)}</span>\`}
        <span class="path">\${path}</span>
        \${log.msg && log.req ? \`<span class="msg">\${log.msg}</span>\` : ''}
        \${rt != null ? \`<div class="rt-bar-wrap">
          <div class="rt-bar-bg"><div class="rt-bar \${rtCls}" style="width:\${rtPct}%"></div></div>
          <span class="rt-val">\${rt}ms</span>
        </div>\` : ''}
        <span class="ts">\${fmtTime(log.time)}</span>
        <button class="copy-btn" data-copy="i\${idx}" title="Copiar JSON">⎘</button>
      </div>
      <div class="log-detail"><pre>\${json}</pre></div>
    </div>\`;
  }

  // agrupa logs internos do viewer (/_logs) em um único card colapsável
  function groupInternalLogs(logs) {
    const internal = [];
    const external = [];
    for (const l of logs) {
      const p = l.req?.path || '';
      if (p.startsWith('/_logs')) internal.push(l);
      else external.push(l);
    }
    return { internal, external };
  }

  function renderInternalGroup(logs) {
    if (!logs.length) return '';
    const json = JSON.stringify(logs, null, 2);
    logStore['_internal'] = json;
    return \`<div class="log-card internal-group" data-idx="_internal_card" style="border-color:var(--border);opacity:0.5">
      <div class="log-row">
        <span class="badge" style="background:color-mix(in srgb,var(--muted) 15%,transparent);color:var(--muted)">GET</span>
        <span class="status" style="color:var(--muted)">2xx</span>
        <span class="path" style="color:var(--muted)">/_logs/api — \${logs.length} requisições internas do viewer</span>
        <button class="copy-btn" data-copy="_internal" title="Copiar JSON">⎘</button>
      </div>
      <div class="log-detail"><pre>\${json.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></div>
    </div>\`;
  }

  // event delegation no container — resolve expand e copy de uma vez
  document.getElementById('logs-container').addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      e.stopPropagation();
      const key = copyBtn.dataset.copy;
      const text = logStore[key] || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓';
        copyBtn.style.color = 'var(--accent)';
        setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.style.color = ''; }, 1200);
      });
      return;
    }
    const card = e.target.closest('.log-card');
    if (card) card.classList.toggle('expanded');
  });

  async function loadLogs() {
    const method = document.getElementById('f-method').value;
    const status = document.getElementById('f-status').value;
    const path = document.getElementById('f-path').value;
    const limit = document.getElementById('f-limit').value;

    const params = new URLSearchParams({ token, limit });
    if (method) params.set('method', method);
    if (status) params.set('status', status);
    if (path) params.set('path', path);

    try {
      const res = await fetch(\`/_logs/api?\${params}\`);
      if (!res.ok) {
        document.getElementById('logs-container').innerHTML = \`<div class="empty">Erro \${res.status} ao buscar logs.</div>\`;
        return;
      }
      const data = await res.json();
      const logs = data.logs || [];

      // calcula peak
      peakRt = Math.max(1, ...logs.map(l => l.responseTime || 0));

      // métricas
      const reqs = logs.filter(l => l.req);
      const rts = reqs.map(l => l.responseTime).filter(Boolean);
      const avg = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : 0;
      const errors = logs.filter(l => l.level >= 50 || (l.res?.statusCode >= 500)).length;

      document.getElementById('m-total').textContent = logs.length;
      document.getElementById('m-avg').textContent = avg ? avg + 'ms' : '—';
      document.getElementById('m-peak').textContent = peakRt > 1 ? peakRt + 'ms' : '—';
      document.getElementById('m-errors').textContent = errors;
      document.getElementById('env-badge').textContent = data.env || '';

      if (!logs.length) {
        document.getElementById('logs-container').innerHTML = '<div class="empty">Nenhum log encontrado com esses filtros.</div>';
        return;
      }

      const { internal, external } = groupInternalLogs(logs);
      const cards = external.map((l, i) => renderCard(l, i, peakRt)).join('');
      const internalCard = renderInternalGroup(internal);
      document.getElementById('logs-container').innerHTML = cards + internalCard;
    } catch(e) {
      document.getElementById('logs-container').innerHTML = '<div class="empty">Falha ao conectar.</div>';
    }
  }

  function setupAutoRefresh() {
    if (autoTimer) clearInterval(autoTimer);
    const enabled = document.getElementById('auto-refresh').checked;
    if (enabled) autoTimer = setInterval(loadLogs, 5000);
  }

  document.getElementById('auto-refresh').addEventListener('change', setupAutoRefresh);
  ['f-method','f-status','f-limit'].forEach(id => document.getElementById(id).addEventListener('change', loadLogs));
  document.getElementById('f-path').addEventListener('input', () => { clearTimeout(window._pt); window._pt = setTimeout(loadLogs, 400); });

  setupAutoRefresh();
  loadLogs();
</script>
</body>
</html>`;

function registerLogRoutes(app) {
  // GET /_logs/api — retorna logs como JSON
  app.get("/_logs/api", authMiddleware, (req, res) => {
    const { limit, method, status, path } = req.query;
    const logs = getLogs({ limit, method, status, path });
    res.json({
      logs,
      total: logs.length,
      env: process.env.NODE_ENV || "development",
    });
  });

  // GET /_logs — viewer HTML
  app.get("/_logs", authMiddleware, (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(viewerHtml);
  });
}

module.exports = { registerLogRoutes };
