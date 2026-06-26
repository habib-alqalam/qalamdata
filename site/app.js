'use strict';

/* ---------- Config ---------- */
const DEFAULT_ENDPOINT = 'http://127.0.0.1:8077';
const CONFIG = (window.QALAM_CONFIG || {});
const params = new URLSearchParams(location.search);
let AI_ENDPOINT = params.get('ai') || localStorage.getItem('qalam_ai_endpoint') || CONFIG.aiEndpoint || DEFAULT_ENDPOINT;

const DATA_FILES = { dubai: 'data/dubai.json', abudhabi: 'data/abudhabi.json' };
const AI_HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
const cache = {};
let emirate = 'dubai';
let selection = null; // { scope, title, context }

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const fmt = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mdToHtml(md) {
  const lines = String(md).replace(/\r/g, '').split('\n');
  let html = '', list = false;
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  for (let raw of lines) {
    const line = raw.trim();
    if (/^#{2,3}\s+/.test(line)) { if (list) { html += '</ul>'; list = false; } html += `<h3>${inline(line.replace(/^#+\s+/, ''))}</h3>`; }
    else if (/^[-*]\s+/.test(line)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`; }
    else if (line === '') { if (list) { html += '</ul>'; list = false; } }
    else { if (list) { html += '</ul>'; list = false; } html += `<p>${inline(line)}</p>`; }
  }
  if (list) html += '</ul>';
  return html;
}

/* ---------- Data load + render ---------- */
async function loadEmirate(name) {
  if (!cache[name]) {
    const res = await fetch(DATA_FILES[name]);
    cache[name] = await res.json();
  }
  return cache[name];
}

async function switchEmirate(name) {
  emirate = name;
  document.querySelectorAll('.em-btn').forEach((b) => b.classList.toggle('active', b.dataset.emirate === name));
  const data = await loadEmirate(name);
  $('sourceLine').textContent = `Source: ${data.source}` + (data.data_status === 'preview' ? ' · representative preview' : '');
  if (name === 'dubai') {
    const t = data.totals; const total = (t.land_parcels || 0) + (t.buildings || 0) + (t.building_summaries || 0);
    $('recordCount').textContent = fmt(total);
  } else {
    $('recordCount').textContent = '1,000,000+';
  }
  renderKPIs(data); renderMix(data);
  $('areaSearch').value = ''; $('parcelSearch').value = '';
  $('areaCard').innerHTML = ''; $('parcelCard').innerHTML = '';
  renderAreaResults(''); renderParcelResults('');
  clearSelection();
}

function renderKPIs(data) {
  const t = data.totals, m = data.market;
  const items = [
    { v: fmt(t.land_parcels), l: 'Land parcels', c: '' },
    { v: fmt(t.buildings), l: 'Buildings', c: '' },
    { v: m.freehold_pct + '%', l: 'Freehold', c: 'gold' },
    { v: m.registered_pct + '%', l: 'Registered', c: 'teal' },
    { v: fmt(t.areas), l: 'Areas covered', c: '' },
  ];
  $('kpis').innerHTML = items.map((k) => `<div class="kpi"><div class="val ${k.c}">${k.v}</div><div class="lbl">${k.l}</div></div>`).join('');
}

function barlist(rows, gold) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return rows.map((r) => `<div class="bar-row"><div class="bar-top"><span class="name">${esc(r.name)}</span><span class="cnt">${fmt(r.count)}</span></div><div class="bar-track"><div class="bar-fill ${gold ? 'gold' : ''}" style="width:${Math.max(4, 100 * r.count / max)}%"></div></div></div>`).join('');
}
function renderMix(data) {
  $('propertyMix').innerHTML = barlist(data.market.top_property_types || [], false);
  $('ownershipMix').innerHTML = barlist(data.market.building_ownership_types || data.market.top_land_types || [], true);
}

/* ---------- Area explorer ---------- */
function renderAreaResults(q) {
  const data = cache[emirate]; if (!data) return;
  const query = q.trim().toLowerCase();
  let rows = data.areas;
  if (query) rows = rows.filter((a) => (a.name_en || '').toLowerCase().includes(query) || (a.name_ar || '').includes(q));
  rows = rows.slice(0, 8);
  $('areaResults').innerHTML = rows.map((a, i) => `<div class="result-item" data-i="${data.areas.indexOf(a)}"><span><strong>${esc(a.name_en)}</strong> · ${fmt(a.parcels)} parcels</span><span class="ar">${esc(a.name_ar || '')}</span></div>`).join('') || `<div class="muted small" style="padding:8px">No matches.</div>`;
  $('areaResults').querySelectorAll('.result-item').forEach((el) => el.addEventListener('click', () => selectArea(data.areas[+el.dataset.i])));
}

function selectArea(a) {
  const ctx = {
    name_en: a.name_en, parcels: a.parcels, buildings: a.buildings,
    freehold_pct: a.freehold_pct, registered_pct: a.registered_pct,
    avg_parcel_area_sqm: a.avg_parcel_area_sqm, avg_built_up_area_sqm: a.avg_built_up_area_sqm,
    total_flats: a.total_flats, top_property_types: a.top_property_types, top_projects: a.top_projects,
  };
  const projects = (a.top_projects || []).map((p) => `<span class="pill muted">${esc(p.name)}</span>`).join('') || '<span class="muted small">—</span>';
  $('areaCard').className = 'detail show';
  $('areaCard').innerHTML = `
    <h3>${esc(a.name_en)}</h3>
    <div class="sub">${esc(a.name_ar || '')}</div>
    <div class="stat-grid">
      <div class="stat"><div class="s-val">${fmt(a.parcels)}</div><div class="s-lbl">Land parcels</div></div>
      <div class="stat"><div class="s-val">${fmt(a.buildings)}</div><div class="s-lbl">Buildings</div></div>
      <div class="stat"><div class="s-val">${a.freehold_pct}%</div><div class="s-lbl">Freehold</div></div>
      <div class="stat"><div class="s-val">${a.registered_pct}%</div><div class="s-lbl">Registered</div></div>
      <div class="stat"><div class="s-val">${fmt(a.avg_parcel_area_sqm)}</div><div class="s-lbl">Avg plot (sqm)</div></div>
      <div class="stat"><div class="s-val">${fmt(a.total_flats)}</div><div class="s-lbl">Total flats</div></div>
    </div>
    <div><span class="muted small">Top projects:</span><br>${projects}</div>`;
  setSelection('area', a.name_en, ctx);
}

/* ---------- Parcel lookup ---------- */
function renderParcelResults(q) {
  const data = cache[emirate]; if (!data) return;
  const query = q.trim().toLowerCase();
  let rows = data.sample_parcels || [];
  if (query) rows = rows.filter((p) => String(p.parcel_id).toLowerCase().includes(query) || (p.area_name_en || '').toLowerCase().includes(query) || (p.property_type_en || '').toLowerCase().includes(query));
  rows = rows.slice(0, 8);
  $('parcelResults').innerHTML = rows.map((p) => `<div class="result-item" data-id="${esc(p.parcel_id)}"><span><strong>${esc(p.parcel_id)}</strong> · ${esc(p.property_type_en || '')}</span><span class="muted">${esc(p.area_name_en || '')}</span></div>`).join('') || `<div class="muted small" style="padding:8px">No matches.</div>`;
  $('parcelResults').querySelectorAll('.result-item').forEach((el) => el.addEventListener('click', () => selectParcel((data.sample_parcels || []).find((p) => String(p.parcel_id) === el.dataset.id))));
}

function selectParcel(p) {
  if (!p) return;
  const fh = [1, '1', '1.00', true].includes(p.is_free_hold);
  const reg = [1, '1', '1.00', true].includes(p.is_registered);
  $('parcelCard').className = 'detail show';
  $('parcelCard').innerHTML = `
    <h3>Parcel ${esc(p.parcel_id)}</h3>
    <div class="sub" style="direction:ltr">${esc(p.area_name_en || '')} · ${esc(p.property_type_en || '')}</div>
    <div class="stat-grid">
      <div class="stat"><div class="s-val">${esc(p.actual_area || '—')}</div><div class="s-lbl">Plot area (sqm)</div></div>
      <div class="stat"><div class="s-val">${esc(p.property_sub_type_en || p.property_type_en || '—')}</div><div class="s-lbl">Sub type</div></div>
    </div>
    <div>
      <span class="pill ${fh ? 'gold' : 'muted'}">${fh ? 'Freehold' : 'Non-freehold'}</span>
      <span class="pill ${reg ? 'green' : 'muted'}">${reg ? 'Registered' : 'Unregistered'}</span>
      ${p.project_name_en ? `<span class="pill muted">${esc(p.project_name_en)}</span>` : ''}
    </div>`;
  setSelection('parcel', `Parcel ${p.parcel_id}`, p);
}

/* ---------- Selection + AI ---------- */
function setSelection(scope, title, context) {
  selection = { scope, title, context };
  $('analyzeBtn').disabled = false;
  $('aiContextLabel').textContent = `Ready: ${title}`;
}
function clearSelection() {
  selection = null;
  $('analyzeBtn').disabled = true;
  $('aiContextLabel').textContent = 'No selection yet';
  $('aiOutput').innerHTML = '';
  $('aiBadge').className = 'ai-badge hidden';
}

const THINKING = ['Routing to on-premise UAE node 🇦🇪…', 'Loading model weights…', 'Reading the parcel statistics…', 'Composing analyst brief…'];
let thinkTimer = null;
function startThinking() {
  let i = 0; $('aiThinking').classList.remove('hidden'); $('aiThinkingText').textContent = THINKING[0];
  thinkTimer = setInterval(() => { i = (i + 1) % THINKING.length; $('aiThinkingText').textContent = THINKING[i]; }, 1800);
}
function stopThinking() { clearInterval(thinkTimer); $('aiThinking').classList.add('hidden'); }

async function analyze() {
  if (!selection) return;
  $('analyzeBtn').disabled = true; $('aiOutput').innerHTML = ''; $('aiBadge').className = 'ai-badge hidden';
  startThinking();
  const payload = { emirate: emirate === 'dubai' ? 'Dubai' : 'Abu Dhabi', scope: selection.scope, title: selection.title, context: selection.context, model: $('modelSelect').value };
  let result = null;
  try {
    const res = await fetch(AI_ENDPOINT.replace(/\/$/, '') + '/api/analyze', { method: 'POST', headers: AI_HEADERS, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('bad status ' + res.status);
    result = await res.json();
  } catch (e) {
    result = { engine: 'fallback', sovereign: false, model: 'on-device', analysis: localAnalyst(payload), location: 'In-browser fallback', latency_ms: 0 };
  }
  stopThinking();
  const engine = result.engine;
  let bClass = 'fallback', bText = '\u26a1 On-device fallback engine';
  if (engine === 'ollama-onprem') { bClass = 'sovereign'; bText = `\uD83D\uDD12 Sovereign AI \u00b7 ${esc(result.model)} \u00b7 on UAE soil`; }
  else if (engine === 'anthropic-cloud') { bClass = 'cloud'; bText = `\u2601 Cloud AI \u00b7 Claude (Anthropic)`; }
  else if (engine === 'template') { bClass = 'fallback'; bText = '\u26a1 On-prem template engine'; }
  $('aiBadge').className = 'ai-badge ' + bClass;
  $('aiBadge').innerHTML = bText;
  $('aiOutput').innerHTML = mdToHtml(result.analysis) +
    `<div class="ai-meta">Engine: ${esc(result.engine)} · ${esc(result.location || '')}${result.latency_ms ? ' · ' + (result.latency_ms / 1000).toFixed(1) + 's' : ''}</div>`;
  $('analyzeBtn').disabled = false;
}

/* Local deterministic analyst (mirrors server fallback so the demo never breaks) */
function localAnalyst(p) {
  const c = p.context || {}, t = p.title, em = p.emirate, scope = p.scope;
  const types = (x) => (x || []).slice(0, 3).map((y) => `${y.name} (${fmt(y.count)})`).join(', ') || 'n/a';
  if (scope === 'area') {
    const fh = c.freehold_pct || 0, reg = c.registered_pct || 0;
    const liq = fh >= 60 ? 'high' : fh >= 25 ? 'moderate' : 'limited (mostly granted / citizen housing)';
    return `**Executive read** — ${t} in ${em} holds ${fmt(c.parcels)} parcels and ${fmt(c.buildings)} buildings, with ${fh}% freehold and ${reg}% registered. Investor liquidity here is ${liq}.\n\n**Key signals**\n- Freehold share ${fh}% — ${fh >= 25 ? 'expat-investable' : 'predominantly national / granted'}\n- Registration ${reg}% — ${reg >= 90 ? 'clean title pipeline' : 'verify registration status'}\n- Avg plot ${fmt(c.avg_parcel_area_sqm)} sqm; dominant types: ${types(c.top_property_types)}\n\n**Risk flags**\n- ${fh < 25 ? 'Low freehold limits the resale pool to nationals.' : 'Standard investment-zone diligence applies.'}\n\n**Recommendation** — ${fh >= 60 ? 'Prioritise for expat-facing investment products.' : 'Suitable for end-user / citizen-housing strategies; confirm ownership eligibility before acquisition.'}`;
  }
  if (scope === 'parcel') {
    const fh = [1, '1', '1.00', true].includes(c.is_free_hold), reg = [1, '1', '1.00', true].includes(c.is_registered);
    return `**Executive read** — Parcel ${c.parcel_id} (${c.property_type_en || '—'}) in ${c.area_name_en || t}, ${em}; plot ${c.actual_area || '—'} sqm.\n\n**Key signals**\n- Tenure: ${fh ? 'Freehold' : 'Non-freehold / granted'}\n- Registration: ${reg ? 'Registered' : 'Not registered'}\n- Project: ${c.project_name_en || c.master_project_en || 'n/a'}\n\n**Risk flags**\n- ${fh ? 'Confirm title deed and service charges.' : 'Confirm ownership eligibility and transfer restrictions.'}\n\n**Recommendation** — ${(fh && reg) ? 'Proceed to standard due diligence.' : 'Resolve registration / tenure status before commitment.'}`;
  }
  return `**Executive read** — ${em} market overview.\n\n**Recommendation** — Select an area for a deeper read.`;
}

/* ---------- Health ---------- */
async function checkHealth() {
  const chip = $('aiStatus'), txt = $('aiStatusText');
  try {
    const res = await fetch(AI_ENDPOINT.replace(/\/$/, '') + '/health', { headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(7000) });
    const h = await res.json();
    if (h.ollama) { chip.className = 'chip chip-live'; txt.textContent = 'Sovereign AI · on-prem 🇦🇪'; }
    else { chip.className = 'chip chip-fallback'; txt.textContent = 'AI node up · loading model'; }
  } catch (e) {
    chip.className = 'chip chip-fallback'; txt.textContent = 'On-device fallback ready';
  }
}

/* ---------- Events ---------- */
function bind() {
  document.querySelectorAll('.em-btn').forEach((b) => b.addEventListener('click', () => switchEmirate(b.dataset.emirate)));
  $('areaSearch').addEventListener('input', (e) => renderAreaResults(e.target.value));
  $('parcelSearch').addEventListener('input', (e) => renderParcelResults(e.target.value));
  $('analyzeBtn').addEventListener('click', analyze);
  $('settingsBtn').addEventListener('click', () => { $('endpointInput').value = AI_ENDPOINT; $('settingsModal').classList.remove('hidden'); });
  $('closeSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
  $('saveSettings').addEventListener('click', () => {
    AI_ENDPOINT = $('endpointInput').value.trim() || DEFAULT_ENDPOINT;
    localStorage.setItem('qalam_ai_endpoint', AI_ENDPOINT);
    $('settingsModal').classList.add('hidden'); checkHealth();
  });
}

(async function init() {
  bind();
  await switchEmirate('dubai');
  checkHealth();
})();
