// Élysée 2027 : application sans serveur. Les réponses restent dans le navigateur.
// Identité visuelle : identite/ (palette nuit + or, couleurs des partis réservées aux données).
const CFG = window.E2027_CONFIG || {};
const $app = document.getElementById('app');
const OPTIONS = [
  { v: 2, t: "Tout à fait d'accord" },
  { v: 1, t: "Plutôt d'accord" },
  { v: 0, t: 'Neutre' },
  { v: -1, t: "Plutôt pas d'accord" },
  { v: -2, t: "Pas du tout d'accord" },
  { v: null, t: 'Sans avis', na: true },
];
const IMPORTANCE = [['faible', 'Faible', 0.5], ['moyenne', 'Moyenne', 1], ['forte', 'Forte', 2]];
const STANCE = { 2: ['Favorable', 'p2'], 1: ['Plutôt favorable', 'p1'], 0: ['Nuancé', 'p0'], '-1': ['Plutôt opposé', 'm1'], '-2': ['Opposé', 'm2'] };
const NIVEAU = { programme: 3, candidat: 2, proche: 1, silence: 0.5 };
const NIVEAU_LABEL = { programme: 'Programme', candidat: 'Déclaration du candidat', proche: "Déclaration d'un proche", silence: 'Déduit du silence' };
const MIN_COMMON = 6;    // questions comparables minimales pour une proximité non « indicative »
const MAX_SEL = 3;       // candidats affichés sur les pistes
const MIN_RESULTS = 9;   // réponses avec un avis sur les axes nécessaires pour afficher le graphe
const GOLD = '#D8B45A';

let D = {};
let state = { answers: {}, counted: false, seed: 0 };
let mem = null;
const KEY = 'e2027.v1';
let resSel = null;
let polesOpen = false; // pistes : pôles et détails dépliés pour tous les thèmes
let streak = 0;       // nouvelles réponses données depuis la dernière page de série : sert à espacer ces pages quand beaucoup de questions sont déjà traitées
let markSel = null;   // pistes : marqueur ouvert { i: indice du thème, who: id du candidat ou 'me' }
let showLines = true;  // pistes : lignes reliant les positions des candidats cochés (et les vôtres)
let chipSort = 'alpha'; // 'alpha' (par défaut) | 'prox'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const lastName = (c) => c.nom.split(' ').slice(-1)[0];
const alpha = (a, b) => lastName(a).localeCompare(lastName(b), 'fr');
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
};

// ---------- stockage local ----------
function load() {
  try { const r = localStorage.getItem(KEY); if (r) state = { ...state, ...JSON.parse(r) }; } catch { if (mem) state = mem; }
  if (!state.seed) { state.seed = (Math.random() * 2 ** 31) | 0; save(); }
}
// ordre aléatoire (fixe pendant une session) partout où l'ordre pourrait suggérer une préférence
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, salt = 0) { const r = rng(state.seed + salt), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { mem = state; } }
function reset() { state = { answers: {}, counted: false, seed: (Math.random() * 2 ** 31) | 0, statsConsent: state.statsConsent }; save(); resSel = null; chipSort = 'alpha'; polesOpen = false; showLines = true; markSel = null; D.questions = orderQuestions(D.baseQuestions); }

// Ordre semi-aléatoire, propre à chaque appareil. Chaque série (« tour ») contient une question par axe
// du graphe, dans un ordre tiré au sort, plus une question hors graphe tant qu'il en reste : les axes restent
// équilibrés quel que soit le nombre de réponses. Dans chaque axe, l'ordre est un tirage pondéré : une
// question documentée par beaucoup de candidats a plus de chances de sortir tôt, sans jamais être assurée de l'être.
function orderQuestions(qs) {
  const clivant = new Set(qs.filter((q) => q.clivant).map((q) => q.id));
  // Les questions sur des sujets très clivants ne sont pas reléguées en fin de thème, même si peu de candidats se sont prononcés.
  const cover = (id) => clivant.has(id) ? 12 : new Set(D.positions.filter((p) => p.question === id).map((p) => p.candidat)).size;
  // Tirage pondéré sans remise (clé = ln(u) / poids) : poids = 2 + nombre de candidats documentés (plafonné à 12).
  const pick = (list, salt) => { const r = rng(state.seed + salt); return list.map((q) => ({ q, k: Math.log(r() || 1e-9) / (2 + Math.min(cover(q.id), 12)) })).sort((a, b) => b.k - a.k).map((x) => x.q); };
  const byAxe = {};
  D.axes.forEach((a, ai) => { byAxe[a.id] = pick(qs.filter((q) => q.axe === a.id), 101 + ai); });
  // Hors graphe : les questions d'actualité passent en premier (deux dans la première série, puis une par série),
  // de sorte qu'il y en ait toujours quelques-unes quel que soit le nombre de questions posées.
  const actu = shuffled(qs.filter((q) => !q.axe && q.actualite), 555);
  const hors = [...actu, ...pick(qs.filter((q) => !q.axe && !q.actualite), 777)];
  let cur = 0;
  const takeHors = (r) => { const n = r === 0 && actu.length >= 2 ? 2 : 1; const out = hors.slice(cur, cur + n); cur += out.length; return out; };
  const rounds = Math.max(...Object.values(byAxe).map((l) => l.length), 1 + Math.max(0, hors.length - (actu.length >= 2 ? 2 : 1)));
  const out = [], series = [];
  for (let r = 0; r < rounds; r++) {
    const round = shuffled([...D.axes.map((a) => byAxe[a.id][r]), ...takeHors(r)].filter(Boolean), 1009 + r);
    if (!round.length) continue;
    series.push([out.length + 1, out.length + round.length]);
    out.push(...round);
  }
  D.series = series;
  return out;
}
const seriesOf = (n) => D.series.findIndex(([a, b]) => n >= a && n <= b) + 1;

// ---------- calculs ----------
function posFor(qid, cid) {
  const list = D.positions.filter((p) => p.question === qid && p.candidat === cid);
  if (!list.length) return null;
  const top = Math.max(...list.map((p) => NIVEAU[p.niveau] || 0));
  const best = list.filter((p) => (NIVEAU[p.niveau] || 0) === top);
  return { score: best.reduce((s, p) => s + p.score, 0) / best.length, items: best };
}
const answered = (qid) => state.answers[qid] && 'v' in state.answers[qid];
const valued = (qid) => answered(qid) && state.answers[qid].v !== null && state.answers[qid].v !== undefined;
const countAnswered = () => D.questions.filter((q) => answered(q.id)).length;
const countValued = () => D.questions.filter((q) => valued(q.id)).length;
const countRadar = () => D.questions.filter((q) => q.axe && valued(q.id)).length;
const nbSeries = () => D.series.length;
// Prochaine question pas encore répondue après la position n (0 s'il n'y en a plus) : on ne repose jamais une question déjà traitée.
const nextTodo = (n) => { const i = D.questions.findIndex((q, k) => k >= n && !answered(q.id)); return i < 0 ? 0 : i + 1; };
const firstUnanswered = () => { const i = D.questions.findIndex((q) => !answered(q.id)); return i < 0 ? D.questions.length : i + 1; };
const unlocked = () => countRadar() >= MIN_RESULTS;
function weight(a) {
  if (a.imp === true) return 2;                    // ancien format (case à cocher)
  const f = IMPORTANCE.find((x) => x[0] === a.imp); return f ? f[2] : 1;
}
function axisPos(axeId, scoreOf) {
  let sum = 0, n = 0;
  for (const q of D.questions.filter((x) => x.axe === axeId)) {
    const s = scoreOf(q); if (s === null || s === undefined) continue;
    sum += (q.sens * s) / 2; n++;
  }
  return n ? sum / n : null;
}
const userPos = (axeId) => axisPos(axeId, (q) => (valued(q.id) ? state.answers[q.id].v : null));
const candPos = (axeId, cid) => axisPos(axeId, (q) => { const p = posFor(q.id, cid); return p ? p.score : null; });
// Une question n'entre dans le calcul de proximité que si elle peut départager des candidats : positions documentées
// des deux côtés, ou au moins MIN_CONTRASTE_N candidats documentés. Sinon (une ou deux positions, toutes du même
// côté) répondre « pas d'accord » ne rapprocherait de personne et ne ferait que pénaliser les candidats qui se sont exprimés.
const MIN_CONTRASTE_N = 3;
const contrastCache = new Map();
function countsInProximity(qid) {
  if (contrastCache.has(qid)) return contrastCache.get(qid);
  const sc = D.positions.filter((p) => p.question === qid);
  const ok = (sc.some((p) => p.score >= 1) && sc.some((p) => p.score <= -1)) || new Set(sc.map((p) => p.candidat)).size >= MIN_CONTRASTE_N;
  contrastCache.set(qid, ok); return ok;
}
function proximity(cid) {
  let num = 0, den = 0, n = 0;
  for (const q of D.questions) {
    if (!valued(q.id) || !countsInProximity(q.id)) continue;
    const p = posFor(q.id, cid); if (!p) continue;
    const a = state.answers[q.id], w = weight(a);
    num += w * (1 - Math.abs(a.v - p.score) / 4); den += w; n++;
  }
  return { pct: den ? Math.round((num / den) * 100) : null, n };
}
const withData = () => D.candidats.filter((c) => D.positions.some((p) => p.candidat === c.id));
const candCount = (cid) => new Set(D.positions.filter((p) => p.candidat === cid).map((p) => p.question)).size;
const byId = (id) => D.candidats.find((c) => c.id === id);

// ---------- compteur anonyme ----------
async function counter(method) {
  if (!CFG.COUNTER_URL) return;
  try {
    const r = await fetch(CFG.COUNTER_URL, { method });
    const j = await r.json();
    document.getElementById('foot-counter').textContent = `${Number(j.total).toLocaleString('fr-FR')} simulations`;
  } catch { /* compteur facultatif */ }
}
function counterBump() { if (state.counted) return; state.counted = true; save(); counter('POST'); }

// ---------- statistiques anonymes (avec accord explicite) ----------
// Rien n'est envoyé sans accord. Avec accord, le navigateur envoie seulement des incréments
// « question, réponse, +1 », sans identifiant ni score de proximité. Une fraction des réponses
// (STATS_P, 25 % par défaut) est remplacée par une valeur tirée au hasard : il est impossible de
// connaître la réponse réelle d'une personne, mais les totaux restent exploitables une fois redressés.
const STATS_VALUES = ['2', '1', '0', '-1', '-2', 'na'];
const statsOn = () => !!CFG.STATS_URL && state.statsConsent === true;
function randomize(v) {
  const p = typeof CFG.STATS_P === 'number' ? CFG.STATS_P : 0.25;
  return Math.random() < p ? STATS_VALUES[Math.floor(Math.random() * STATS_VALUES.length)] : v;
}
function statsFlush(serie) {
  if (!statsOn()) return;
  state.sent = state.sent || [];
  const items = D.questions.filter((q) => answered(q.id) && !state.sent.includes(q.id))
    .map((q) => ({ q: q.id, a: randomize(state.answers[q.id].v === null ? 'na' : String(state.answers[q.id].v)) }));
  const events = serie ? [{ e: 'serie', k: serie }] : [];
  if (!items.length && !events.length) return;
  state.sent.push(...items.map((i) => i.q)); save();
  try { fetch(CFG.STATS_URL.replace(/\/$/, '') + '/hit', { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: 1, items, events }) }).catch(() => {}); } catch { /* facultatif */ }
}
function consentBlock(where) {
  if (!CFG.STATS_URL) return '';
  const on = state.statsConsent === true;
  return `<div class="card consent"><label class="switch" style="color:var(--txt);margin:0"><input type="checkbox" data-consent ${on ? 'checked' : ''}> Partager anonymement mes réponses pour aider à améliorer l'outil</label>
  <p class="small muted" style="margin:8px 0 0">Facultatif. Seuls des compteurs par question sont envoyés, sans identifiant ni adresse IP conservée, et une partie des réponses est volontairement remplacée au hasard : aucune réponse reçue ne peut être attribuée avec certitude, ni rattachée à vous. Aucun résultat n'est publié. ${where === 'legal' ? '' : '<a href="#/mentions">En savoir plus</a>.'}</p></div>`;
}

// ---------- dessins ----------
function miniRadar(idx) {
  const n = D.axes.length, c = 20, r = 17;
  const pt = (i, k) => [c + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * k, c + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n) * r * k];
  const ring = D.axes.map((_, i) => pt(i, 1).map((v) => v.toFixed(1)).join(',')).join(' ');
  const spokes = D.axes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${i === idx ? GOLD : '#26344F'}" stroke-width="${i === idx ? 2 : 1}"/>`; }).join('');
  const [hx, hy] = pt(Math.max(idx, 0), 1);
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="${ring}" fill="none" stroke="#26344F"/>${spokes}${idx >= 0 ? `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3" fill="${GOLD}"/>` : `<circle cx="20" cy="20" r="4" fill="none" stroke="${GOLD}" stroke-width="1.5"/>`}</svg>`;
}
// Couleurs du graphe : la couleur du parti est conservée tant qu'elle se distingue nettement
// de l'or (« vous ») et des autres candidats affichés ; sinon une couleur de remplacement est prise.
const ME = '#EEF1F6'; // votre marqueur : blanc cassé, jamais jaune
const ALT = ['#4CC9F0', '#F72585', '#B8E986', '#FF9F1C', '#B388FF', '#2EC4B6', '#FFD166', '#FF8FA3'];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'plus', 'down'];
function lab(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const [x, y, z] = [(c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const MIN_DE = 32;
// Couleur et forme de chaque candidat : calculées une fois pour toute la page, donc identiques partout (pistes, liste, légendes).
// Deux candidats ne partagent jamais la même forme avec des couleurs trop proches ; un candidat dont la couleur de parti est
// trop proche du fond, de votre marqueur ou d'un autre reçoit une couleur de remplacement. Les plus documentés sont servis d'abord.
let STYLES = null;
function buildStyles() {
  const bg = ['#0B1220', '#121B2E', '#17223A', ME], out = {};
  const free = (col, sh) => Object.values(out).every((o) => !(o.shape === sh && dE(col, o.color) < MIN_DE));
  const order = [...D.candidats].sort((a, b) => candCount(b.id) - candCount(a.id) || a.id.localeCompare(b.id));
  for (const c of order) {
    const own = c.couleur, ownOk = bg.every((u) => dE(u, own) >= MIN_DE), alts = ALT.filter((a) => bg.every((u) => dE(u, a) >= MIN_DE));
    let pick = null;
    if (ownOk) for (const sh of SHAPES) if (free(own, sh)) { pick = { color: own, shape: sh }; break; }
    if (!pick) for (const sh of SHAPES) { const col = alts.find((a) => free(a, sh)); if (col) { pick = { color: col, shape: sh }; break; } }
    if (!pick) pick = { color: ownOk ? own : alts[0], shape: SHAPES[Object.keys(out).length % SHAPES.length] };
    out[c.id] = { ...pick, adjusted: pick.color !== own };
  }
  return out;
}
const styleOf = (id) => { if (!STYLES) STYLES = buildStyles(); return STYLES[id]; };
const displayStyles = (ids) => Object.fromEntries(ids.map((id) => [id, styleOf(id)]));
function marker(x, y, shape, color, r) {
  if (shape === 'square') return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" fill="${color}"/>`;
  if (shape === 'triangle') return `<polygon points="${x.toFixed(1)},${(y - r * 1.25).toFixed(1)} ${(x + r * 1.15).toFixed(1)},${(y + r * 0.85).toFixed(1)} ${(x - r * 1.15).toFixed(1)},${(y + r * 0.85).toFixed(1)}" fill="${color}"/>`;
  const poly = (pts) => `<polygon points="${pts.map(([px, py]) => `${(x + px * r).toFixed(1)},${(y + py * r).toFixed(1)}`).join(' ')}" fill="${color}"/>`;
  if (shape === 'diamond') return poly([[0, -1.3], [1.15, 0], [0, 1.3], [-1.15, 0]]);
  if (shape === 'down') return poly([[0, 1.25], [1.15, -0.85], [-1.15, -0.85]]);
  if (shape === 'hexagon') return poly([[1.1, 0], [0.55, 0.95], [-0.55, 0.95], [-1.1, 0], [-0.55, -0.95], [0.55, -0.95]]);
  if (shape === 'plus') { const a = 1.2, b = 0.42; return poly([[-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b]]); }
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}"/>`;
}
const candN = (axeId, cid) => D.questions.filter((q) => q.axe === axeId && posFor(q.id, cid)).length;
const legendMark = (color, shape, hollow = false) => { const m = marker(7, 7, shape || 'circle', color, hollow ? 4.4 : 5); return `<svg viewBox="0 0 14 14" aria-hidden="true" style="width:14px;height:14px">${hollow ? m.replace(`fill="${color}"`, `fill="none" stroke="${color}" stroke-width="2"`) : m}</svg>`; };

// Pistes : une seule ligne par thème. Par défaut : votre position et, sur ce thème, le candidat le plus proche de
// chaque côté (étiquetés). Si vous cochez des candidats dans « Comparer avec », ce sont eux qui sont affichés.
// Toucher la ligne déplie le détail (pôles, valeurs, tous les candidats du thème).
const shortName = (c) => { const t = c.nom.split(' '); return t.length > 2 && ['Le', 'La', 'de', 'du', 'des'].includes(t[t.length - 2]) ? t.slice(-2).join(' ') : t[t.length - 1]; };
const fmtPos = (v) => (v > 0.04 ? '+' : v < -0.04 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',');
function nearestSides(a, u) {
  const all = withData().map((c) => ({ c, v: candPos(a.id, c.id), n: candN(a.id, c.id) })).filter((x) => x.v !== null);
  const left = all.filter((x) => x.v <= u).sort((p, q) => u - p.v - (u - q.v) || q.n - p.n);
  const right = all.filter((x) => x.v > u).sort((p, q) => p.v - u - (q.v - u) || q.n - p.n);
  let pick = [left[0], right[0]].filter(Boolean);
  if (pick.length < 2) pick = [...pick, ...(left.length ? left.slice(1) : right.slice(1))].slice(0, 2);
  return { pick, all };
}
// Place les étiquettes des pistes sans chevauchement : on essaie les 4 combinaisons gauche/droite ; sinon la
// seconde étiquette passe sur une deuxième rangée.
function layoutPistes() {
  const modal = document.querySelector('.mdl');
  document.body.classList.toggle('noscroll', !!modal);
  if (modal && !modal.contains(document.activeElement)) modal.querySelector('.pdet-x')?.focus({ preventScroll: true });
  // Un marqueur de candidat posé sur votre étoile n'étend pas sa zone de toucher, pour que les branches de l'étoile restent cliquables.
  document.querySelectorAll('.prow').forEach((row) => {
    const me = row.querySelector('.pmk.me'); if (!me) return;
    const mr = me.getBoundingClientRect(), cx = mr.left + mr.width / 2;
    row.querySelectorAll('.pmk:not(.me)[data-mark]').forEach((m) => { const r = m.getBoundingClientRect(); m.classList.toggle('tight', Math.abs(r.left + r.width / 2 - cx) < 22); });
  });
  // Candidats cochés : une ligne fine relie, thème après thème, les positions de chaque candidat, et les vôtres.
  // Un trait en pointillés signale un thème sans position entre deux positions connues.
  document.querySelectorAll('.pistes').forEach((box) => {
    box.querySelector('.plines')?.remove();
    if (!box.dataset.manual || !box.dataset.lines) return;
    const R = box.getBoundingClientRect(), series = {};
    box.querySelectorAll('.pmk[data-who]').forEach((m) => {
      const r = m.getBoundingClientRect(), sh = m.querySelector('circle,rect,polygon'); if (!sh) return;
      const col = sh.getAttribute('fill') !== 'none' ? sh.getAttribute('fill') : sh.getAttribute('stroke');
      (series[m.dataset.who] ||= { col, me: m.dataset.who === 'me', pts: [] }).pts.push({ i: +m.dataset.i, x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top });
    });
    let g = '';
    for (const sr of Object.values(series)) {
      sr.pts.sort((a, b) => a.i - b.i);
      for (let k = 0; k + 1 < sr.pts.length; k++) { const a = sr.pts[k], b = sr.pts[k + 1]; g += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${sr.col}" stroke-width="${sr.me ? 1.6 : 1.3}"${b.i - a.i > 1 ? ' stroke-dasharray="3 3"' : ''}/>`; }
    }
    if (g) box.insertAdjacentHTML('beforeend', `<svg class="plines" width="${R.width.toFixed(0)}" height="${R.height.toFixed(0)}" aria-hidden="true">${g}</svg>`);
  });
  // légendes des pistes : noms entiers si tout tient sur une ligne, sinon les 5 premières lettres suivies de « … »
  document.querySelectorAll('.plegend').forEach((leg) => {
    const nms = [...leg.querySelectorAll('.nm')];
    nms.forEach((n) => { n.textContent = n.dataset.full; });
    const lh = parseFloat(getComputedStyle(leg).lineHeight) || 16;
    if (leg.getBoundingClientRect().height > lh * 1.5) nms.forEach((n) => { n.textContent = n.dataset.short; });
  });
}
// Votre marqueur : une étoile blanche dont les branches dépassent des formes des candidats (affichées par-dessus).
const starSVG = (size = 22) => { const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.8 : 11; return `${(12 + Math.cos(a) * r).toFixed(1)},${(12 + Math.sin(a) * r).toFixed(1)}`; }).join(' '); return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><polygon points="${pts}" fill="${ME}" stroke="#0B1220" stroke-width="1" stroke-linejoin="round"/></svg>`; };

// Ligne « Proximité globale » : mêmes marqueurs que les thèmes, mais l'échelle va de « éloigné » (0 %) à « proche » (100 %).
// Par défaut les deux candidats les plus proches sur une base suffisante ; sinon les candidats cochés.
function globalRow(prox) {
  const manual = resSel.length > 0, byC = new Map(prox.map((x) => [x.c.id, x]));
  const shown = manual ? resSel.map((id) => byC.get(id)).filter(Boolean) : prox.filter((x) => x.n >= MIN_COMMON).slice(0, 2);
  const st = displayStyles(shown.map((x) => x.c.id));
  const items = shown.map((x) => ({ id: x.c.id, name: shortName(x.c), n: x.n, xp: x.pct, label: `${x.c.nom} : ${x.pct} % sur ${x.n} question${x.n > 1 ? 's' : ''} comparable${x.n > 1 ? 's' : ''}${x.n < MIN_COMMON ? ' (base étroite)' : ''}` })).sort((a, b) => a.xp - b.xp);
  // vous êtes le point de référence : étoile à 100 % ; les candidats se placent selon leur proximité avec vous.
  // Pas d'étiquettes sur la piste : une légende en dessous. Deux marqueurs voisins sont décalés en hauteur.
  let prevX = -99, flip = 1;
  items.forEach((it) => { if (it.xp - prevX < 7) { it.y = 18 + flip * 5; flip = -flip; } else { it.y = 18; flip = 1; } prevX = it.xp; });
  const meMark = `<span class="pmk me" style="--x:1;top:18px" title="Vous : point de référence (100 %)" role="img" aria-label="Vous : point de référence">${starSVG(24)}</span>`;
  const marks = meMark + items.map((it) => {
    const m = marker(10, 10, st[it.id].shape, st[it.id].color, it.n < MIN_COMMON ? 6 : 7);
    const svg = `<svg viewBox="0 0 20 20" width="14" height="14">${it.n < MIN_COMMON ? m.replace(`fill="${st[it.id].color}"`, `fill="none" stroke="${st[it.id].color}" stroke-width="2.4"`) : m}</svg>`;
    return `<span class="pmk" style="--x:${(it.xp / 100).toFixed(3)};top:${it.y}px" title="${esc(it.label)}" role="img" aria-label="${esc(it.label)}">${svg}</span>`;
  }).join('');
  const legend = `<span class="plegend"><span>${starSVG(16)}Vous</span>${items.map((it) => `<span>${legendMark(st[it.id].color, st[it.id].shape)}<span class="nm" data-full="${esc(it.name)}" data-short="${esc(it.name.length > 5 ? it.name.slice(0, 5) + '…' : it.name)}">${esc(it.name)}</span> ${it.xp} %</span>`).join('')}</span>`;
  const solidP = prox.filter((x) => x.n >= MIN_COMMON), thinP = prox.filter((x) => x.n < MIN_COMMON);
  const rk = solidP.slice(0, 10).map((x, i) => `${i + 1}. ${esc(shortName(x.c))} ${x.pct} %`).join(' · ');
  return `<details class="prow pglobal"${polesOpen ? ' open' : ''}>
      <summary><span class="plabel">Global<span class="pchev">${ICON.chev}</span></span><span class="pband">${marks}${items.length ? '' : '<span class="pnone">pas assez de questions comparables</span>'}</span>${legend}</summary>
      <div class="pmore"><div class="ppoles"><span>Éloigné de vous</span><span>Proche de vous</span></div>
      <p class="small muted"><b>Proximité globale</b> : vous êtes le point de référence (l'étoile, à 100 %) ; chaque candidat se place selon l'écart moyen entre vos réponses et ses positions documentées, sur l'ensemble des questions (thèmes et hors graphe), pondéré par l'importance indiquée. 0 % à gauche, 100 % à droite.</p>
      ${rk ? `<p class="small muted">Les plus proches : ${rk}${solidP.length > 10 ? ' …' : ''}</p>` : ''}
      ${thinP.length ? `<p class="small muted">Base trop étroite (moins de ${MIN_COMMON} questions comparables) : ${thinP.map((x) => esc(shortName(x.c))).join(', ')}.</p>` : ''}</div>
    </details>`;
}

// Réponses d'un candidat (ou les vôtres) aux questions d'un thème, ouvertes en touchant son marqueur sur la piste.
function markPanel(a, who) {
  const c = who === 'me' ? null : byId(who);
  if (who !== 'me' && !c) return '';
  const all = D.questions.filter((q) => q.axe === a.id);
  // pour un candidat : uniquement les questions où une position est identifiée (citée ou déduite)
  const qs = c ? all.filter((q) => posFor(q.id, c.id)) : all;
  const myTxt = (q) => { const m = state.answers[q.id]; return !m || !('v' in m) ? 'pas encore répondu' : m.v === null || m.v === undefined ? 'Sans avis' : OPTIONS.find((o) => o.v === m.v)?.t || ''; };
  const rows = qs.map((q) => {
    if (!c) return `<div class="qrow"><p class="qt">${esc(q.enonce)}</p><div class="qtags"><span class="tag me">${esc(myTxt(q))}</span></div></div>`;
    const p = posFor(q.id, c.id), mine = `<span class="tag me">Vous : ${esc(myTxt(q))}</span>`;
    const it = p.items[0], silence = it.niveau === 'silence';
    const [lab0, cls] = STANCE[String(Math.round(p.score))] || STANCE[0];
    const lab = silence ? (p.score > 0 ? 'Ne le remet pas en cause' : 'Ne le propose pas') : lab0;
    const media = silence ? 'Programme consulté' : (it.source.media || new URL(it.source.url).hostname.replace(/^www\./, ''));
    const body = silence ? `<p class="small">Position déduite : ce sujet n'apparaît nulle part dans son programme complet.</p>` : `<blockquote>« ${esc(it.citation)} »</blockquote>`;
    return `<details class="qrow"><summary><p class="qt">${esc(q.enonce)}</p><div class="qtags"><span class="tag ${cls}">${lab}</span>${mine}</div></summary>${body}<p class="src"><span class="lvl">${NIVEAU_LABEL[it.niveau]}</span><a href="${esc(it.source.url)}" target="_blank" rel="noopener noreferrer">${esc(media)}</a>, consultée le ${frDate(it.source.consulte)}${it.statut === 'valide' ? '' : ' · <i>lecture pas encore relue</i>'}</p></details>`;
  }).join('');
  return `<div class="pdet" role="region" aria-label="Réponses sur ${esc(a.nom)}"><div class="pdet-h"><b>${c ? esc(c.nom) : 'Vos réponses'}</b><span class="small muted"> · ${esc(a.nom)} · ${c ? `${qs.length} question${qs.length > 1 ? 's' : ''} avec position identifiée sur ${all.length}` : `${qs.length} question${qs.length > 1 ? 's' : ''}`}</span><button type="button" class="pdet-x" data-mark="close" aria-label="Fermer">✕</button></div>${c ? (qs.length ? '<p class="small muted">« Favorable » ou « opposé » se lit par rapport à chaque affirmation. Touchez une question pour la citation et sa source.</p>' : '<p class="small muted">Aucune position identifiée sur ce thème.</p>') : ''}${rows}</div>`;
}

function trackChart(prox) {
  const manual = resSel.length > 0;
  const styleSel = manual ? displayStyles(resSel) : null;
  const rows = globalRow(prox) + D.axes.map((a, ai) => {
    const nt = D.questions.filter((q) => q.axe === a.id).length, na = D.questions.filter((q) => q.axe === a.id && valued(q.id)).length;
    const u = userPos(a.id);
    const { pick, all } = u === null ? { pick: [], all: withData().map((c) => ({ c, v: candPos(a.id, c.id), n: candN(a.id, c.id) })).filter((x) => x.v !== null) } : nearestSides(a, u);
    const shown = manual ? resSel.map((id) => ({ c: byId(id), v: candPos(a.id, id), n: candN(a.id, id) })).filter((x) => x.v !== null) : pick;
    const st = manual ? styleSel : displayStyles(shown.map((x) => x.c.id)); // sélection manuelle : mêmes couleur et forme sur toutes les lignes, comme dans la légende
    const items = [];
    if (u !== null) items.push({ v: u, me: true, label: `Vous : ${na} réponse${na > 1 ? 's' : ''} sur ce thème` });
    for (const x of shown) items.push({ v: x.v, id: x.c.id, name: shortName(x.c), n: x.n, label: `${x.c.nom}${x.n < 2 ? ' (base étroite : 1 position)' : ''}` });
    items.sort((p, q) => p.v - q.v);
    for (const it of items) it.xp = (it.v + 1) * 50;
    const marks = items.map((it) => {
      const svg = it.me ? starSVG(24) : `<svg viewBox="0 0 20 20" width="14" height="14">${it.n < 2 ? marker(10, 10, st[it.id].shape, st[it.id].color, 6).replace(`fill="${st[it.id].color}"`, `fill="none" stroke="${st[it.id].color}" stroke-width="2.4"`) : marker(10, 10, st[it.id].shape, st[it.id].color, 7)}</svg>`;
      return `<span class="pmk${it.me ? ' me' : ''}${markSel && markSel.i === ai && markSel.who === (it.me ? 'me' : it.id) ? ' on' : ''}" data-who="${it.me ? 'me' : it.id}" data-i="${ai}" data-mark="${ai}|${it.me ? 'me' : it.id}" style="--x:${(it.xp / 100).toFixed(3)}" title="${esc(it.label)}" role="button" tabindex="0" aria-label="${esc(it.label)} : voir les réponses sur ce thème">${svg}</span>`;
    }).join('');
    const none = u === null ? '<span class="pnone">pas encore de réponse</span>' : '';
    // légende pleine largeur sous la piste (mêmes règles de noms abrégés que la ligne « Global ») ; l'étoile « Vous » n'est expliquée que sur la ligne « Global »
    const legendRow = manual || !items.some((it) => !it.me) ? '' : `<span class="plegend">${items.filter((it) => !it.me).map((it) => `<span>${legendMark(st[it.id].color, st[it.id].shape, it.n < 2)}<span class="nm" data-full="${esc(it.name)}" data-short="${esc(it.name.length > 5 ? it.name.slice(0, 5) + '…' : it.name)}">${esc(it.name)}</span></span>`).join('')}</span>`;
    const lean = u === null ? '' : Math.abs(u) < 0.15 ? 'équilibré' : `plutôt vers « ${esc(u < 0 ? a.poleA : a.poleB)} »`;
    const ranked = [...all].sort((p, q) => p.v - q.v).map((x) => `${esc(shortName(x.c))} ${fmtPos(x.v)}${x.n < 2 ? '*' : ''}`).join(' · ');
    const nd = manual ? resSel.filter((id) => candPos(a.id, id) === null).map((id) => byId(id).nom) : [];
    return `<details class="prow"${polesOpen ? ' open' : ''}>
      <summary><span class="plabel">${esc(a.court)}<span class="pchev">${ICON.chev}</span></span><span class="pband"><i class="pmid"></i>${marks}${none}</span>${legendRow}</summary>
      <div class="pmore"><div class="ppoles"><span>${esc(a.poleA)}</span><span>${esc(a.poleB)}</span></div>
      <p class="small muted"><b>${esc(a.nom)}</b> · ${na}/${nt} réponse${na > 1 ? 's' : ''}${na === 1 ? ' (indicatif)' : ''}${u === null ? ' · vous : aucune réponse' : ` · vous : ${fmtPos(u)}, ${lean}`}${nd.length ? ` · pas de position identifiée : ${nd.map(esc).join(', ')}` : ''}</p>
      ${all.length ? `<p class="small muted">Candidats sur ce thème, d'un pôle à l'autre : ${ranked}${all.some((x) => x.n < 2) ? '<br>* une seule position identifiée.' : ''}</p>` : ''}</div>
    </details>`;
  }).join('');
  const hint = manual ? 'Candidats cochés affichés sur chaque ligne. ' : '';
  return `<div class="pistes-head"><div class="ph-text"><p class="small muted">${hint}Gauche : pôle habituellement associé à la gauche ; droite : l'autre ; trait du milieu : neutralité ; marqueur creux : une seule position. Touchez une ligne pour le détail.</p>${manual ? `<label class="tick"><input type="checkbox" data-lines ${showLines ? 'checked' : ''}><span>Relier les positions par une ligne</span></label>` : ''}</div><button type="button" class="sortbtn solo" data-act="poles" aria-pressed="${polesOpen}">${polesOpen ? 'Tout replier' : 'Tout déplier'}</button></div><div class="pistes"${manual ? ' data-manual="1"' : ''}${manual && showLines ? ' data-lines="1"' : ''}>${rows}</div>${markSel && D.axes[markSel.i] ? `<div class="mdl" role="dialog" aria-modal="true"><div class="mdl-bg" data-mark="close"></div><div class="mdl-box">${markPanel(D.axes[markSel.i], markSel.who)}</div></div>` : ''}`;
}

// ---------- vues ----------
function viewHome() {
  const tot = D.questions.length, done = countAnswered(), nxt = firstUnanswered();
  let cta = `<a class="btn primary block" href="#/quiz/1">Commencer</a>`;
  if (done > 0 && done < tot) cta = `<a class="btn primary block" href="#/quiz/${nxt}">Reprendre · question ${nxt} sur ${tot}</a>${unlocked() ? '<a class="btn block" href="#/resultats">Voir mon graphe</a>' : ''}<button class="btn quiet block" data-act="reset">Recommencer</button>`;
  if (done === tot) cta = `<a class="btn primary block" href="#/resultats">Voir mon résultat</a><button class="btn quiet block" data-act="reset">Recommencer</button>`;
  return `<p class="eyebrow" style="margin-top:8px">Présidentielle 2027</p>
  <h1>Situez-vous face aux candidats déclarés</h1>
  <p class="lead">Réagissez à des affirmations, puis voyez thème par thème quels candidats sont les plus proches de vous. Chaque position s'appuie sur une citation sourcée.</p>
  <div class="stack" style="margin-top:18px">${cta}</div>
  <ol class="steps">
    <li><b>Répondez</b><span>D'accord, pas d'accord ou neutre, par séries d'une dizaine d'affirmations sur ${D.axes.length} thèmes. Vous pouvez vous arrêter et reprendre.</span></li>
    <li><b>Comparez</b><span>Dès ${MIN_RESULTS} réponses, vos positions s'affichent thème par thème, avec le candidat le plus proche de chaque côté.</span></li>
    <li><b>Vérifiez</b><span>Chaque position est une citation exacte, avec le lien vers sa source et la date de consultation.</span></li>
  </ol>
  <div class="stats">
    <div><b>${D.axes.length}</b><span>thèmes</span></div>
    <div><b>${tot}</b><span>affirmations</span></div>
    <div><b>~3</b><span>min pour un premier résultat</span></div>
  </div>
  <a class="link-under" href="#/methode">Méthodologie et sources</a>
  <a class="link-under" href="#/avertissement" style="margin-top:8px">Avertissement : ce n'est pas une consigne de vote</a>
  <div class="banner" style="margin-top:20px">Version de travail : les positions des candidats sont extraites de leurs textes et déclarations publiés, et attendent une validation humaine.</div>`;
}

function viewQuiz(n) {
  const tot = D.questions.length;
  n = Math.min(Math.max(n, 1), tot);
  const q = D.questions[n - 1], a = state.answers[q.id];
  const ai = D.axes.findIndex((x) => x.id === q.axe), axe = D.axes[ai];
  const serie = seriesOf(n);
  const nx = nextTodo(n), nextHref = !nx ? '#/resultats' : seriesOf(nx) !== serie && streak >= 8 ? '#/serie/' + serie : '#/quiz/' + nx;
  const opts = OPTIONS.map((o) => `<button class="opt${o.na ? ' na' : ''}" data-v="${o.v}" aria-pressed="${!!a && a.v === o.v}"><span class="dot"></span>${o.t}</button>`).join('');
  const imp = a && a.v !== null && a.v !== undefined ? (a.imp === true ? 'forte' : a.imp || 'moyenne') : null;
  return `
  <div class="topbar">
    <a class="iconbtn" href="${n > 1 ? '#/quiz/' + (n - 1) : '#/'}" aria-label="Question précédente">${ICON.back}</a>
    <span class="title">Question ${n} / ${tot}</span>
    <a class="textbtn" href="#/">Quitter</a>
  </div>
  <div class="track-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${n}" aria-label="Progression"><i style="width:${((n - 1) / tot) * 100}%"></i></div>
  <div class="theme">${miniRadar(ai)}<div><p class="eyebrow">${axe ? `Thème ${ai + 1} sur ${D.axes.length}` : q.actualite ? 'Actualité' : 'Hors graphe'} · série ${serie}/${nbSeries()}</p><b>${esc(axe ? axe.nom : q.theme)}</b></div></div>
  ${q.actualite ? `<div class="notice"><b>Dans l'actualité depuis le ${frDate(q.actualite.depuis)}.</b> ${esc(q.actualite.evenement)} <a href="${esc(q.actualite.source.url)}" target="_blank" rel="noopener noreferrer">${esc(q.actualite.source.titre)}</a><br><span class="small muted">Cette question compte dans la proximité avec les candidats, mais ne déplace pas vos pistes. Elle sera retirée quand le sujet ne fera plus l'actualité.</span></div>` : axe ? '' : '<p class="small muted" style="margin:-6px 0 12px">Cette question compte dans la proximité avec les candidats, mais ne déplace pas vos pistes : elle ne se range sur aucun des axes.</p>'}
  <div class="card affirm"><p class="eyebrow">Affirmation</p><p class="statement">« ${esc(q.enonce)} »</p><p class="context">${esc(q.contexte)}</p></div>
  <div class="opts" role="group" aria-label="Votre position">${opts}</div>
  ${imp ? `<div class="importance"><p>Importance de ce sujet pour vous</p><div class="seg" role="group" aria-label="Importance">${IMPORTANCE.map(([k, t]) => `<button data-imp="${k}" aria-pressed="${imp === k}">${t}</button>`).join('')}</div></div>` : ''}
  <div class="bottombar">
    <a class="btn" href="${nextHref}">Passer</a>
    <a class="btn primary" ${a ? `href="${nextHref}"` : 'aria-disabled="true" tabindex="-1"'}>${nextHref === '#/resultats' ? 'Mes résultats' : nextHref.startsWith('#/serie') ? 'Fin de série' : 'Suivant'}</a>
  </div>
  ${a ? `<div id="says">${saysBlock(q)}</div>` : `<div class="locked">Répondez pour voir ce qu'en disent les candidats. Leurs positions sont masquées avant votre réponse pour ne pas vous influencer.</div>`}`;
}

function saysBlock(q) {
  const has = [], none = [];
  for (const c of shuffled(D.candidats, Number(q.id.slice(1)) * 97)) { const p = posFor(q.id, c.id); (p ? has : none).push([c, p]); }
  const cards = has.map(([c, p]) => {
    const it = p.items[0], silence = it.niveau === 'silence';
    const [lab0, cls] = STANCE[String(Math.round(p.score))] || STANCE[0];
    const lab = silence ? (p.score > 0 ? 'Ne le remet pas en cause' : 'Ne le propose pas') : lab0;
    const media = silence ? 'Programme consulté' : (it.source.media || new URL(it.source.url).hostname.replace(/^www\./, ''));
    const rch = it.recherche;
    return `<details class="pos${silence ? ' deduit' : ''}" style="--c:${styleOf(c.id).color}">
      <summary><span class="who"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span></span><span class="tag ${cls}">${lab}</span></summary>
      <div class="body">
        ${silence ? `<p><b>Position déduite, pas citée.</b> ${rch.sujet ? `Le sujet (${esc(rch.sujet)})` : 'Ce sujet'} n'apparaît nulle part dans son programme complet : ${rch.fichiers} page${rch.fichiers > 1 ? 's' : ''}, environ ${Math.round(rch.caracteres / 1000)} 000 caractères parcourus. C'est un sujet déjà en place : ne pas en parler vaut accepter le statu quo, ${p.score > 0 ? 'sans le défendre explicitement' : 'sans s\'opposer explicitement au changement'}.</p>` : `<blockquote>« ${esc(it.citation)} »</blockquote>`}
        ${it.note && !silence ? `<p class="small muted">${esc(it.note)}</p>` : ''}
        <p class="src"><span class="lvl">${NIVEAU_LABEL[it.niveau]}</span><a href="${esc(it.source.url)}" target="_blank" rel="noopener noreferrer">${esc(media)}</a>, consultée le ${frDate(it.source.consulte)}${it.statut === 'valide' ? '' : ' · <i>lecture pas encore relue</i>'}</p>
        <a class="report" href="#/contact?q=${q.id}&c=${c.id}">Signaler une erreur sur cette position</a>
      </div></details>`;
  }).join('');
  return `<div class="says">
    <h2>Ce qu'en disent les candidats</h2>
    <p class="sub">Ordre tiré au sort. ${has.length} candidat${has.length > 1 ? 's' : ''} avec une position identifiée${has.filter(([, p]) => p.items[0].niveau === 'silence').length ? ` (dont ${has.filter(([, p]) => p.items[0].niveau === 'silence').length} déduite${has.filter(([, p]) => p.items[0].niveau === 'silence').length > 1 ? 's' : ''} de l'absence du sujet dans leur programme complet)` : ''}. « Favorable » ou « opposé » est une lecture de la citation par rapport à l'affirmation : touchez un nom pour lire l'extrait et sa source.</p>
    ${q.nature === 'actuel' ? '<p class="small muted" style="margin:0 0 10px">Sujet récent ou en débat : un candidat qui ne se prononce pas n\'exprime aucun avis, rien n\'est déduit de son silence.</p>' : ''}
    ${has.length && !countsInProximity(q.id) ? '<div class="notice">Cette question n\'entre pas dans le calcul de proximité : trop peu de candidats se sont exprimés, tous du même côté. Elle sert à vous situer sur le thème et à montrer ce qui est documenté.</div>' : ''}
    ${cards || '<p class="muted">Aucune position identifiée pour cette question.</p>'}
    <div class="none-list"><b>Pas de position publique identifiée dans les sources consultées (${none.length}) :</b> ${[...none].sort((x, y) => alpha(x[0], y[0])).map(([c]) => esc(c.nom)).join(', ')}.</div>
  </div>`;
}

function viewSeries(k) {
  const tot = D.questions.length, done = countAnswered(), val = countValued(), K = nbSeries();
  const nx = nextTodo(D.series[k - 1][1]);
  if (k >= K || !nx) { location.hash = '#/resultats'; return ''; }
  streak = 0;
  const ks = seriesOf(nx), news = D.questions.slice(D.series[ks - 1][0] - 1, D.series[ks - 1][1]).filter((q) => !answered(q.id)).length;
  const ok = unlocked();
  statsFlush(k);
  return `<div class="topbar"><a class="iconbtn" href="#/quiz/${D.series[k - 1][1]}" aria-label="Question précédente">${ICON.back}</a><span class="title">Série ${k} sur ${K}</span><a class="textbtn" href="#/">Quitter</a></div>
  <div class="track-progress"><i style="width:${(done / tot) * 100}%"></i></div>
  <p class="eyebrow or">Série terminée</p>
  <h1>${done} question${done > 1 ? 's' : ''} sur ${tot}</h1>
  <p class="lead">${ok ? `Votre graphe est disponible. Il repose sur ${val} réponse${val > 1 ? 's' : ''} avec un avis ; chaque série supplémentaire le rend plus précis.` : `Il faut au moins ${MIN_RESULTS} réponses avec un avis sur les thèmes du graphe pour afficher le graphe. Il vous en manque ${MIN_RESULTS - countRadar()}.`}</p>
  <div class="stack">
    ${ok ? '<a class="btn primary block" href="#/resultats">Voir mon graphe</a>' : ''}
    <a class="btn ${ok ? '' : 'primary'} block" href="#/quiz/${nx}">Continuer : série ${ks} (${news} nouvelle${news > 1 ? 's' : ''} question${news > 1 ? 's' : ''})</a>
  </div>
  ${state.statsConsent === undefined || k === 1 ? consentBlock('serie') : ''}
  <p class="small muted">Vous pouvez vous arrêter ici : vos réponses sont gardées sur cet appareil.</p>`;
}

function viewResults() {
  const done = countAnswered(), tot = D.questions.length, back = `#/quiz/${Math.min(firstUnanswered(), tot)}`;
  const head = `<div class="topbar"><a class="iconbtn" href="${done < tot ? back : '#/'}" aria-label="Retour">${ICON.back}</a><span class="title">Votre position</span><button class="iconbtn" data-act="share" aria-label="Partager l'outil">${ICON.share}</button></div>`;
  if (!unlocked()) {
    const need = MIN_RESULTS - countRadar();
    return `${head}<p class="eyebrow">Résultat · ${D.axes.length} axes</p><h1>Graphe verrouillé</h1><p class="lead">Il faut au moins ${MIN_RESULTS} réponses avec un avis pour dessiner vos positions. Il vous en manque ${need}.</p><div class="stack"><a class="btn primary block" href="#/quiz/${firstUnanswered()}">${done ? 'Continuer le questionnaire' : 'Commencer'}</a></div>`;
  }
  counterBump();
  statsFlush();
  const prox = withData().map((c) => ({ c, ...proximity(c.id) })).filter((x) => x.pct !== null).sort((a, b) => b.pct - a.pct || b.n - a.n);
  if (!resSel) resSel = []; // vide = affichage automatique : le plus proche de chaque côté, thème par thème
  const ds = displayStyles(resSel);
  const solidC = prox.filter((x) => x.n >= MIN_COMMON).map((x) => x.c), thinC = prox.filter((x) => x.n < MIN_COMMON).map((x) => x.c);
  const noProx = withData().filter((c) => !prox.some((x) => x.c.id === c.id)).sort(alpha);
  const chipList = chipSort === 'prox' ? [...solidC, ...thinC, ...noProx] : [...withData()].sort(alpha);
  const sortBtn = (k, label) => `<button type="button" class="sortbtn" data-act="chipsort" data-sort="${k}" aria-pressed="${chipSort === k}">${label}</button>`;
  const chips = chipList.map((c) => { const t = styleOf(c.id); return `<button class="chip" style="--c:${t.color}" data-sel="${c.id}" aria-pressed="${resSel.includes(c.id)}"><span class="chip-mark">${legendMark(t.color, t.shape)}</span>${esc(c.nom)}</button>`; }).join('');
  const legendPistes = `<span>${starSVG(16)}Vous</span>` + resSel.map((id) => `<span>${legendMark(ds[id].color, ds[id].shape)}${esc(byId(id).nom)}${ds[id].adjusted ? ' <small class="muted">(couleur ajustée)</small>' : ''}</span>`).join('');
  const row = (x) => `<div class="prox-row" style="--c:${styleOf(x.c.id).color}"><span class="pdot"></span><b class="who">${legendMark(styleOf(x.c.id).color, styleOf(x.c.id).shape)}${esc(x.c.nom)}</b><span class="pct">${x.pct} %</span><span class="pbar"><i style="width:${x.pct}%"></i></span><span class="n">${esc(x.c.parti)} · ${x.n} question${x.n > 1 ? 's' : ''} comparable${x.n > 1 ? 's' : ''}</span><div class="det"><div class="info">${candDetails(x.c)}</div>${candBadge(x.c)}</div></div>`;
  const solid = prox.filter((x) => x.n >= MIN_COMMON), thin = prox.filter((x) => x.n < MIN_COMMON);
  const nodata = D.candidats.length - withData().length;
  return `${head}
  <p class="eyebrow">Résultat · ${D.axes.length} axes · ${countValued()} réponses</p>
  ${trackChart(prox)}${resSel.length ? `<div class="legend">${legendPistes}</div>` : ''}
  ${done < tot ? `<div class="card" style="margin-top:14px"><b>Il reste ${tot - done} question${tot - done > 1 ? 's' : ''}.</b><p class="small muted" style="margin:4px 0 12px">Chaque réponse affine la carte, surtout sur les thèmes où vous avez peu répondu.</p><a class="btn primary block" href="#/quiz/${firstUnanswered()}">Affiner mon graphe</a></div>` : ''}
  <div class="rowhead"><h2>Comparer avec</h2></div>
  <p class="small muted" style="margin:-6px 0 8px">Sans sélection, chaque thème affiche le candidat le plus proche de vous de chaque côté. Cochez jusqu'à ${MAX_SEL} candidats pour les comparer partout.</p>
  <div class="sortbar"><span class="lbl" id="sortlbl">Ordre</span><div class="sortgrp" role="group" aria-labelledby="sortlbl">${sortBtn('alpha', 'Alphabétique')}${sortBtn('prox', 'Proximité')}</div></div>
  <div class="chips">${chips}</div>
  <div class="rowhead"><h2>Proximité par candidat</h2></div>
  <p class="small muted">Écart moyen entre vos réponses et les positions documentées, pondéré par l'importance indiquée. Ce n'est pas une consigne de vote : un score élevé sur peu de questions dit peu de chose.</p>
  <div class="prox">${solid.map(row).join('') || '<p class="muted">Aucun candidat ne compte encore assez de questions comparables.</p>'}</div>
  ${thin.length ? `<h3 style="margin:18px 0 4px">Base trop étroite pour comparer</h3><p class="small muted">Moins de ${MIN_COMMON} questions comparables : pourcentages fragiles, non classés avec les autres.</p><div class="prox">${thin.sort((a, b) => alpha(a.c, b.c)).map(row).join('')}</div>` : ''}
  <p class="small muted" style="margin-top:12px">${nodata} autres candidats déclarés n'ont pas encore de position sourcée : <a href="#/candidats">voir la liste</a>.</p>
  <div class="duo" style="margin-top:20px"><a class="btn" href="#/methode">Méthodologie</a><button class="btn primary" data-act="share">Partager</button></div>
  <button class="btn quiet block" data-act="reset" style="margin-top:8px">Recommencer</button>
  ${consentBlock('results')}`;
}

// Mêmes informations que dans la liste des candidats déclarés : déclaration, lien vers le programme, nombre de questions documentées.
const candDetails = (c) => `${c.declaration ? `<span>${esc(c.declaration)}</span>` : ''}${c.programme ? `<span><a href="${esc(c.programme.url)}" target="_blank" rel="noopener noreferrer">${esc(c.programme.titre)}</a></span>` : ''}`;
const candBadge = (c) => { const k = candCount(c.id); return `<span class="badge ${k ? 'on' : ''}">${k ? `${k}/${D.questions.length}` : 'à documenter'}</span>`; };

function viewCandidates() {
  const items = [...D.candidats].sort(alpha).map((c) => {
    return `<div class="cand" style="--c:${styleOf(c.id).color}"><div class="info"><b>${esc(c.nom)}</b><span>${esc(c.parti)}</span>
      ${candDetails(c)}</div>
      ${candBadge(c)}</div>`;
  }).join('');
  return `<p class="eyebrow">Ordre alphabétique</p><h1>Candidats déclarés</h1>
  <p class="lead">${D.candidats.length} personnes ayant officiellement et publiquement annoncé leur candidature. La liste officielle sera arrêtée par le Conseil constitutionnel au plus tard le 26 mars 2027, après réception des 500 parrainages.</p>
  <p class="small muted">Liste établie d'après <a href="https://www.franceinfo.fr/elections/presidentielle/portraits-qui-sont-les-candidats-declares-a-l-election-presidentielle-de-2027_8208032.html" target="_blank" rel="noopener noreferrer">franceinfo</a> et <a href="https://fr.wikipedia.org/wiki/Candidatures_%C3%A0_l%27%C3%A9lection_pr%C3%A9sidentielle_fran%C3%A7aise_de_2027" target="_blank" rel="noopener noreferrer">Wikipédia</a>. Le liseré reprend la couleur usuelle du parti ; gris pour les candidats sans étiquette. Le nombre indique les questions où une position est documentée.</p>
  ${items}`;
}

function viewMethod() {
  const nd = D.candidats.filter((c) => !candCount(c.id));
  const hist = D.version.historique.map((h) => `<li><b>v${esc(h.version)}</b> · ${frDate(h.date)} : ${esc(h.resume)}</li>`).join('');
  const axes = D.axes.map((a) => `<tr><td>${esc(a.nom)}</td><td>${esc(a.poleA)}</td><td>${esc(a.poleB)}</td></tr>`).join('');
  return `<div class="prose"><p class="eyebrow">Méthodologie et sources</p><h1>Méthode</h1>
  <div class="banner">${esc(D.version.statut)}. Version ${esc(D.version.version)} du ${frDate(D.version.date)}.</div>
  <h2>Qui figure dans l'outil</h2>
  <p>Toute personne ayant officiellement et publiquement annoncé sa candidature, sans filtre de notoriété ni de sondage. Les personnes seulement pressenties ne sont pas incluses. Dès publication de la liste du Conseil constitutionnel, l'outil bascule sur cette liste. Quand l'ordre d'affichage pourrait suggérer une préférence (positions des candidats, choix des candidats à comparer), il est tiré au sort à chaque session ; les listes de référence sont alphabétiques. La liste « Comparer avec » s'ouvre par ordre alphabétique ; vous pouvez la trier par proximité avec vos réponses.</p>
  <h2>Comment les questions sont rédigées</h2>
  <ul><li>Une affirmation neutre, formulée dans le même sens pour tous, accompagnée d'un court rappel factuel.</li>
  <li>Les réponses possibles sont identiques pour toutes les questions : « neutre » compte comme une position médiane, « sans avis » n'est pas pris en compte.</li>
  <li>Les positions des candidats ne sont visibles qu'après votre réponse.</li></ul>
  <h2>Les ${D.axes.length} axes</h2>
  <p>Sur chaque axe, le pôle de gauche est celui que le débat public associe habituellement à la gauche, le pôle de droite l'autre. C'est une convention, discutable pour l'Europe, la défense et les institutions : la sortie de l'Union européenne ou le non-alignement sont défendus à gauche comme à droite, la démocratie directe par la gauche comme par le Rassemblement national. Elle ne dit rien de la position réelle des candidats, qui est toujours donnée par leurs citations.</p>
  <div class="tablewrap"><table><thead><tr><th>Axe</th><th>Pôle de gauche</th><th>Pôle de droite</th></tr></thead><tbody>${axes}</tbody></table></div>
  <p class="small muted">Les deux pôles décrivent des positions, pas un jugement. Il n'y a pas de « bon » côté.</p>
  <h2>Questions d'actualité</h2>
  <p>Quelques questions portent sur un événement récent qui a fait réagir plusieurs candidats (prix des carburants, aide à l'Ukraine, violences lors de mouvements sociaux…). Règles : un sujet n'est retenu que si au moins deux candidats de camps différents ont réagi publiquement ; l'affirmation est reformulée de façon neutre, avec l'événement et une source datée ; la question est hors graphe (elle compte dans la proximité, sans déplacer vos pistes) ; elle est retirée dès que le sujet ne fait plus l'actualité, ou au plus tard à la date indiquée dans le code. Il y en a toujours quelques-unes, dont deux dans la première série. Les sujets très clivants (peine de mort, sortie de l'Union européenne, fin de vie…) sont posés même quand peu de candidats se sont prononcés : sans position identifiée, un candidat est simplement absent du calcul de proximité sur cette question. Questions d'actualité en ce moment : ${D.questions.filter((q) => q.actualite).length}.</p>
  <h2>Questions hors graphe</h2>
  <p>Certaines questions ne se rangent sur aucun axe sans fausser son sens : le choix du nucléaire (on peut être pro-nucléaire et très exigeant sur le climat), l'organisation territoriale, la protection des enfants face aux écrans, certains sujets internationaux, la laïcité (une laïcité stricte peut viser l'État, comme l'abrogation du Concordat, ou les individus, comme l'interdiction du voile : ces deux exigences se compenseraient sur l'axe Société). Elles restent posées et comptent dans la proximité avec les candidats, mais ne déplacent pas vos pistes. Thèmes concernés : ${[...new Set(D.questions.filter((q) => !q.axe).map((q) => q.theme))].join(', ')}.</p>
  <h2>Comment une position est établie</h2>
  <ul><li>Chaque position repose sur une citation exacte, vérifiée mot pour mot dans le document source, avec lien et date de consultation.</li>
  <li>Hiérarchie des sources : un programme publié pèse plus qu'une déclaration du candidat, qui pèse plus que celle d'un proche. Si plusieurs sources existent, la plus haute est retenue.</li>
  <li>Le passage de la citation à une note de -2 à +2 est une lecture d'analyste, affichée à côté de la citation. Chaque position est relue une à une par un humain : tant qu'elle porte la mention « lecture pas encore relue », seule la citation et sa source font foi, et la note est une proposition.</li>
  <li>Quand aucune source ne traite le sujet, l'outil l'écrit : cela signifie « non trouvé dans les sources consultées ».</li></ul>
  <h2>Séries et précision du graphe</h2>
  <p>Les questions sont groupées en séries d'une dizaine : chacune comporte une question par axe, plus une question hors graphe tant qu'il en reste. Quel que soit le nombre de réponses, les ${D.axes.length} axes restent équilibrés. L'ordre est tiré au sort pour chaque appareil, dans l'ordre des thèmes comme dans le choix des questions ; dans chaque thème, le choix des questions est un tirage pondéré : une question documentée pour beaucoup de candidats a plus de chances de sortir tôt, sans que ce soit systématique. Recommencer produit une nouvelle succession ; sans recommencer, l'ordre reste le même sur votre appareil pour que vous puissiez reprendre là où vous en étiez. Le graphe s'affiche à partir de ${MIN_RESULTS} réponses avec un avis sur les thèmes du graphe. Un thème où vous n'avez répondu qu'à une question est signalé comme indicatif.</p>
  <h2>Calcul de la proximité</h2>
  <p>Pour chaque candidat, on compare uniquement les questions où vous avez répondu et où une position est documentée. L'écart moyen est converti en pourcentage ; l'importance indiquée pondère chaque question (faible ×0,5, moyenne ×1, forte ×2). Deux sortes de sujets. Les sujets déjà en place (l'IVG, la peine de mort, l'euro, l'OTAN, le 49.3…) : un candidat dont le programme complet n'en parle jamais valide le statu quo, donc s'oppose au changement demandé (position déduite « ne le propose pas », plutôt opposé, jamais « opposé »), ou approuve ce que l'affirmation défend (« ne le remet pas en cause »). Les sujets récents ou en débat (la règle d'or budgétaire, l'actualité…) : se taire n'exprime aucun avis, rien n'est déduit. Une position déduite est signalée comme telle, avec le nombre de pages parcourues ; elle n'est utilisée que pour des candidats dont le programme est complet et lorsque le thème général est bien couvert par les textes lus. Une question dont une ou deux positions seulement sont documentées, toutes du même côté, n'entre pas dans ce calcul : elle ne pourrait que pénaliser les candidats qui se sont exprimés. Elle reste posée, et vos réponses comptent pour vos positions par thème. Le nombre de questions comparables est toujours indiqué. En dessous de ${MIN_COMMON}, le résultat est signalé comme indicatif. Les candidats sont classés par proximité ; ceux qui ont trop peu de questions comparables sont présentés à part, sans classement. Toucher le marqueur d'un candidat (ou votre étoile) sur un thème ouvre ses réponses aux questions de ce thème, avec la citation et la source. Quand vous cochez des candidats, une ligne fine relie leurs positions d'un thème au suivant, ainsi que les vôtres ; un trait en pointillés saute un thème où le candidat n'a pas de position. Ces lignes servent à comparer des profils : elles ne mesurent rien et leur pente n'a pas de sens en soi. Sur toute la page de résultats, chaque candidat garde la même forme et la même couleur ; la couleur de son parti est remplacée quand elle se confondrait avec le fond ou avec un autre candidat de même forme. Votre position est toujours l'étoile blanche. La première ligne des pistes, « Global », résume la proximité de chaque candidat avec vos réponses sur l'ensemble des questions : de 0 % (éloigné) à 100 % (proche), avec par défaut les deux candidats les plus proches sur une base suffisante. Ce n'est pas un thème de plus : l'échelle n'est pas un axe entre deux pôles. Sur les pistes, chaque thème montre par défaut votre position et, sur ce thème précis, le candidat le plus proche de chaque côté (un classement thème par thème, distinct du classement général). Si vous cochez des candidats dans « Comparer avec », ce sont eux qui sont affichés. Les valeurs de chaque thème, de −1 à +1, sont visibles en touchant le thème.</p>
  <h2>Limites de cette version</h2>
  <ul><li>Les programmes complets sont rares à ce stade. Les textes utilisés sont ceux publiés par les candidats ou leur parti, complétés par des déclarations rapportées par la presse.</li>
  <li>Le programme du Rassemblement national utilisé est celui des législatives de 2024.</li>
  <li>Le programme des Écologistes n'a pas pu être lu automatiquement : les positions de Marine Tondelier viennent de la presse.</li>
  <li>${nd.length} candidats déclarés n'ont pas encore de position sourcée : ${nd.map((c) => esc(c.nom)).join(', ')}.</li></ul>
  <h2>Mises à jour</h2>
  <p>Questions, candidats et positions sont revus régulièrement. Une veille automatisée propose des ajouts, qu'un humain relit ensuite ; la relecture est en cours et les positions pas encore relues sont publiées avec une mention explicite. Chaque version est datée.</p>
  <ul>${hist}</ul>
  <h2>Vos données</h2>
  <p>Il n'y a ni compte ni suivi. Vos réponses sont enregistrées uniquement dans le navigateur de cet appareil et ne sont envoyées nulle part. Seul un compteur global du nombre de simulations peut exister, sans aucune information sur les réponses.</p></div>`;
}


// ---------- pages d'information ----------
function viewDisclaimer() {
  return `<div class="prose"><p class="eyebrow">À lire avant d'utiliser l'outil</p><h1>Avertissement</h1>
  <div class="notice">Élysée 2027 est un outil d'information indépendant. Il ne donne aucune consigne de vote et ne remplace ni la lecture des programmes, ni le débat.</div>
  <h2>Indépendance</h2>
  <p>L'outil n'est lié à aucun parti, candidat, équipe de campagne, média, institution publique ou entreprise de sondage. Il ne reçoit aucun financement politique. Il ne contient ni publicité ni traceur.</p>
  <h2>Ce que mesure l'outil, et ce qu'il ne mesure pas</h2>
  <ul>
    <li>Le graphe et les pourcentages de proximité reflètent uniquement les questions posées et les positions qu'il a été possible de documenter. Ils simplifient des positions politiques souvent plus nuancées.</li>
    <li>Un candidat sans position documentée sur un sujet n'est pas « neutre » sur ce sujet : il ne s'est simplement pas exprimé, ou l'outil n'a pas trouvé la source.</li>
    <li>La proximité avec un candidat n'est pas une recommandation. Un score élevé sur peu de questions dit peu de chose ; l'outil l'indique.</li>
    <li>Ce n'est pas un sondage. Aucun résultat agrégé n'est publié. Seuls les utilisateurs qui l'acceptent explicitement partagent des compteurs anonymes et brouillés, utilisés uniquement pour améliorer les questions.</li>
  </ul>
  <h2>Sources et lecture des positions</h2>
  <ul>
    <li>Chaque position repose sur une citation exacte d'un programme, d'un site officiel ou d'un article de presse, avec le lien et la date de consultation. Les citations sont courtes et reproduites à des fins d'information, conformément au droit de courte citation.</li>
    <li>Le classement d'une citation (« favorable », « opposé »…) est une lecture d'analyste. Il peut être discuté : la citation et sa source sont toujours affichées pour que chacun juge par lui-même.</li>
    <li>Les programmes évoluent pendant la campagne. Une position peut être dépassée entre deux mises à jour ; la date de chaque version est indiquée.</li>
  </ul>
  <h2>Erreurs et droit de réponse</h2>
  <p>Malgré le soin apporté, des erreurs sont possibles. Tout candidat, toute équipe de campagne et tout utilisateur peut signaler une citation erronée, mal attribuée, dépassée ou mal classée via le <a href="#/contact">formulaire de contact</a>. Les demandes fondées sont corrigées dans la version suivante, avec mention dans l'historique.</p>
  <h2>Responsabilité</h2>
  <p>L'outil est fourni en l'état, à titre informatif. L'éditeur ne saurait être tenu responsable de l'usage qui en est fait ni des décisions prises sur son fondement. Les liens vers des sites tiers sont fournis pour vérification ; leur contenu relève de leurs éditeurs.</p></div>`;
}

function viewLegal() {
  return `<div class="prose"><p class="eyebrow">Informations légales</p><h1>Mentions légales et confidentialité</h1>
  <h2>Éditeur</h2>
  <p>Ce site est édité à titre non professionnel par un particulier, qui a choisi de ne pas rendre public son nom, comme le permet l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique. Ses éléments d'identification ont été communiqués à l'hébergeur. Pour toute demande, utilisez le <a href="#/contact">formulaire de contact</a>.</p>
  <h2>Hébergeur</h2>
  <p>${esc(CFG.HOST_INFO || "GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis — https://github.com")}</p>
  <h2>Données personnelles</h2>
  <ul>
    <li><b>Questionnaire :</b> aucune donnée n'est envoyée. Vos réponses, l'ordre des questions et vos préférences sont enregistrés uniquement dans le stockage local de votre navigateur. Vous pouvez les effacer à tout moment avec le bouton « Recommencer » ou en vidant les données du site dans votre navigateur.</li>
    <li><b>Cookies et traceurs :</b> aucun. Ni mesure d'audience nominative, ni publicité, ni réseau social intégré. Les polices de caractères sont hébergées sur le site lui-même.</li>
    <li><b>Statistiques anonymes${CFG.STATS_URL ? '' : ' (non activées)'} :</b> uniquement si vous cochez la case prévue (désactivée par défaut, modifiable à tout moment ci-dessous). Le navigateur envoie alors, pour chaque question répondue, un simple incrément « question, réponse » : ni identifiant, ni ensemble de vos réponses, ni score de proximité avec les candidats. Une réponse sur quatre environ est remplacée au hasard avant l'envoi, si bien qu'aucune réponse reçue ne peut être tenue pour certaine, et qu'aucune n'est rattachée à une personne : le service ne conserve aucun identifiant qui permettrait de regrouper les réponses d'un même utilisateur. Ces totaux servent uniquement à améliorer les questions (questions incomprises, souvent passées, peu discriminantes) ; ils ne sont jamais publiés ni communiqués, et ne constituent pas un sondage.${consentBlock('legal')}</li>
    <li><b>Adresses IP :</b> le service qui reçoit les statistiques et les messages ne les enregistre pas et ne tient aucun journal de requêtes. Les requêtes transitent par Cloudflare, qui assure la liaison sécurisée avec le serveur de l'éditeur et voit donc l'adresse du visiteur le temps du transit, selon sa propre politique de confidentialité. Pour limiter les abus (envois en rafale), une empreinte salée de l'adresse est gardée en mémoire vive quelques minutes, jamais écrite sur disque, avec un sel renouvelé chaque jour.</li>
    <li><b>Compteur de simulations${CFG.COUNTER_URL ? '' : ' (non activé)'} :</b> s'il est activé, il n'enregistre qu'un nombre total, sans aucune réponse ni identifiant.</li>
    <li><b>Signalements :</b> ${CFG.CONTACT_URL ? '' : CFG.ISSUES_URL ? 'les signalements passent par les tickets publics GitHub : le texte est public et associé à votre compte GitHub (compte gratuit nécessaire). Ne mettez aucune donnée personnelle dans le texte. GitHub traite vos données selon sa propre politique de confidentialité ; le site lui-même ne reçoit rien. ' : 'aucun canal de contact n\'est activé pour le moment. '}</li>
    ${CFG.CONTACT_EMAIL ? `<li><b>Courriel :</b> si vous écrivez à l'adresse indiquée sur la page Contact, votre message et votre adresse sont reçus et conservés par le fournisseur de messagerie de l'éditeur, uniquement pour traiter votre demande, et supprimés une fois celle-ci traitée.</li>` : ''}
    ${CFG.CONTACT_URL ? `<li><b>Formulaire de contact :</b> le message, l'objet et, si vous la donnez, votre adresse électronique sont transmis au serveur de l'éditeur${CFG.CONTACT_SERVICE ? ' (' + esc(CFG.CONTACT_SERVICE) + ')' : ''}, uniquement pour traiter votre demande. Ils sont conservés au plus douze mois puis supprimés automatiquement. L'adresse électronique est facultative : sans elle, aucune réponse ne peut vous être apportée.</li>` : ''}
    <li><b>Vos droits :</b> vous pouvez demander l'accès, la rectification ou l'effacement des données transmises via le formulaire, et introduire une réclamation auprès de la CNIL (www.cnil.fr).</li>
  </ul>
  <h2>Propriété intellectuelle</h2>
  <p>Les citations restent la propriété de leurs auteurs et sont reproduites au titre du droit de courte citation, avec leur source. Le code et la méthode de l'outil sont publiés ${CFG.LICENCE ? 'sous licence ' + esc(CFG.LICENCE) : 'sur le dépôt du projet'}${CFG.SOURCE_URL ? ' : <a href="' + esc(CFG.SOURCE_URL) + '" target="_blank" rel="noopener noreferrer">code source</a>' : ''}.</p></div>`;
}

const CONTACT_OBJETS = ["Signaler une erreur sur une position", "Droit de réponse d'un candidat ou de son équipe", "Proposer une question ou une source", "Autre"];
function viewContact(params) {
  const q = params.get('q'), c = params.get('c');
  const question = q ? D.baseQuestions.find((x) => x.id === q) : null, cand = c ? byId(c) : null;
  const pre = question ? `${question.id} · « ${question.enonce} »${cand ? ' · ' + cand.nom : ''}` : '';
  const viaIssues = !CFG.CONTACT_URL && !!CFG.ISSUES_URL;
  const active = !!CFG.CONTACT_URL || viaIssues;
  return `<div class="prose"><p class="eyebrow">Contact</p><h1>Écrire à l'éditeur</h1>
  <p class="lead">Une citation erronée, une position dépassée, un droit de réponse, une suggestion : chaque message est lu.</p>
  ${CFG.CONTACT_EMAIL ? `<div class="notice"><b>Message confidentiel, droit de réponse :</b> écrivez par e-mail à <span class="mailtxt">${esc(CFG.CONTACT_EMAIL)}</span> <button type="button" class="sortbtn solo" data-act="mail" style="margin-top:8px">Ouvrir mon application de messagerie</button><br><span class="small muted">Votre message et votre adresse sont reçus par le fournisseur de messagerie de l'éditeur ; ne joignez aucune donnée sensible.</span></div>` : ''}
  ${viaIssues ? '<div class="notice"><b>Signalement public.</b> Le bouton ouvre un ticket sur GitHub, prérempli avec votre texte. Il sera visible de tous et associé à votre compte GitHub (gratuit, nécessaire pour publier). Ne mettez aucune donnée personnelle.</div>' : active ? '' : '<div class="notice">Aucun canal de contact n\'est activé pour le moment : le formulaire ne peut pas être envoyé.</div>'}
  <form class="form" id="contact-form" novalidate>
    <label>Objet<select name="objet" required>${CONTACT_OBJETS.map((o, i) => `<option${(q && i === 0) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
    <label>Question ou candidat concerné (facultatif)<input name="question" maxlength="300" value="${esc(pre)}" placeholder="Par exemple : question sur le SMIC, Marine Tondelier"></label>
    <label>Message<textarea name="message" required maxlength="3000" placeholder="Décrivez le problème. Pour une correction, indiquez si possible la source exacte (lien, date)."></textarea></label>
    ${viaIssues ? '' : '<label>Votre adresse électronique (facultative, seulement si vous souhaitez une réponse)<input name="email" type="email" maxlength="200" autocomplete="email"></label>\n    <div class="hp" aria-hidden="true"><label>Ne pas remplir<input name="site_web" tabindex="-1" autocomplete="off"></label></div>'}
    <p class="small muted">${viaIssues ? 'Rien n\'est envoyé par ce site : vous publiez vous-même le ticket sur GitHub.' : 'Les données envoyées servent uniquement à traiter votre message et sont supprimées au plus tard douze mois après.'} Voir <a href="#/mentions">confidentialité</a>.</p>
    <button class="btn primary block" type="submit" ${active ? '' : 'disabled aria-disabled="true"'}>${viaIssues ? 'Ouvrir sur GitHub' : 'Envoyer'}</button>
    <p class="small muted" id="contact-status" role="status" aria-live="polite"></p>
  </form></div>`;
}
async function sendContact(form) {
  const st = document.getElementById('contact-status');
  const f = new FormData(form);
  if (f.get('site_web')) { st.textContent = 'Message envoyé. Merci.'; form.reset(); return; } // robot
  const message = String(f.get('message') || '').trim();
  if (message.length < 10) { st.textContent = 'Le message est trop court.'; return; }
  if (!CFG.CONTACT_URL && CFG.ISSUES_URL) {
    const objet = String(f.get('objet') || ''), qq = String(f.get('question') || '').trim();
    const title = `[${objet}] ${qq || message.slice(0, 60)}`.slice(0, 120);
    const body = `${qq ? `**Concerne :** ${qq}\n\n` : ''}${message}\n\n---\nÉlysée 2027 v${D.version.version}`;
    window.open(`${CFG.ISSUES_URL.replace(/\/$/, '')}/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    st.textContent = 'Le ticket est prêt sur GitHub : relisez-le puis validez-le là-bas.';
    return;
  }
  const email = String(f.get('email') || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = "L'adresse électronique semble incorrecte."; return; }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; st.textContent = 'Envoi en cours…';
  try {
    const r = await fetch(CFG.CONTACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ objet: f.get('objet'), question: f.get('question'), message, email: email || undefined, page: 'Élysée 2027 v' + D.version.version }) });
    if (!r.ok) throw new Error(r.status);
    st.textContent = 'Message envoyé. Merci.'; form.reset();
  } catch { st.textContent = "L'envoi a échoué. Réessayez plus tard."; }
  btn.disabled = false;
}

// ---------- routeur ----------
let ready = false; // données chargées : un changement d'adresse pendant le chargement ne doit rien afficher
function route() {
  if (!ready) return;
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const [p, arg] = path.split('/');
  const params = new URLSearchParams(query || '');
  let html;
  if (p === 'quiz') html = viewQuiz(parseInt(arg, 10) || 1);
  else if (p === 'serie') html = viewSeries(parseInt(arg, 10) || 1);
  else if (p === 'resultats') html = viewResults();
  else if (p === 'candidats') html = viewCandidates();
  else if (p === 'methode') html = viewMethod();
  else if (p === 'avertissement') html = viewDisclaimer();
  else if (p === 'mentions') html = viewLegal();
  else if (p === 'contact') html = viewContact(params);
  else html = viewHome();
  document.body.classList.toggle('focus', ['quiz', 'serie', 'resultats'].includes(p));
  $app.innerHTML = html;
  layoutPistes();
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#/' + p));
  window.scrollTo(0, 0);
}
const rerender = (fn) => { const y = window.scrollY; $app.innerHTML = fn(); layoutPistes(); window.scrollTo(0, y); };
window.addEventListener('resize', () => layoutPistes());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && markSel) { markSel = null; rerender(viewResults); return; } if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pmk[data-mark]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('prow')) layoutPistes(); }, true); // une ligne dépliée change les hauteurs : on retrace les lignes
const quizN = () => parseInt(location.hash.split('/')[2], 10) || 1;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); }

async function share() {
  const url = location.href.split('#')[0];
  const data = { title: 'Élysée 2027', text: 'Situez-vous face aux candidats déclarés à la présidentielle 2027.', url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(url); toast('Lien copié. Vos réponses ne sont pas partagées.');
  } catch { /* partage annulé */ }
}

document.addEventListener('click', (e) => {
  const mk = e.target.closest('[data-mark]');
  if (mk) { e.preventDefault(); const [i, who] = mk.dataset.mark.split('|'); markSel = mk.dataset.mark === 'close' || (markSel && markSel.i === +i && markSel.who === who) ? null : { i: +i, who }; rerender(viewResults); return; }
  const t = e.target.closest('[data-v],[data-imp],[data-sel],[data-act]'); if (!t) return;
  if (t.dataset.v !== undefined) {
    const q = D.questions[quizN() - 1], prev = state.answers[q.id];
    const v = t.dataset.v === 'null' ? null : Number(t.dataset.v);
    if (!prev) streak++;
    state.answers[q.id] = { v, imp: v === null ? 'moyenne' : (prev && prev.imp) || 'moyenne' }; save();
    rerender(() => viewQuiz(quizN()));
  } else if (t.dataset.imp) {
    const q = D.questions[quizN() - 1]; state.answers[q.id].imp = t.dataset.imp; save();
    rerender(() => viewQuiz(quizN()));
  } else if (t.dataset.sel) {
    const id = t.dataset.sel, i = resSel.indexOf(id);
    if (i >= 0) resSel.splice(i, 1); else { if (resSel.length >= MAX_SEL) resSel.shift(); resSel.push(id); }
    rerender(viewResults);
  } else if (t.dataset.act === 'poles') { polesOpen = !polesOpen; rerender(viewResults);
  } else if (t.dataset.act === 'chipsort') { chipSort = t.dataset.sort; rerender(viewResults); }
  else if (t.dataset.act === 'mail') { const addr = String(CFG.CONTACT_EMAIL).replace(/\s*\(at\)\s*/i, '@').replace(/\s*\(dot\)\s*/gi, '.').replace(/\s+/g, ''); location.href = 'mailto:' + addr + '?subject=' + encodeURIComponent('Élysée 2027 : ' + (new URLSearchParams(location.hash.split('?')[1] || '').get('q') || 'message')); }
  else if (t.dataset.act === 'share') share();
  else if (t.dataset.act === 'reset') {
    if (confirm('Effacer toutes vos réponses sur cet appareil ?')) { reset(); location.hash = '#/'; route(); }
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-lines]')) { showLines = e.target.checked; rerender(viewResults); return; }
  if (!e.target.matches('[data-consent]')) return;
  state.statsConsent = e.target.checked; save();
  if (state.statsConsent) statsFlush(); toast(state.statsConsent ? 'Partage anonyme activé. Merci.' : 'Partage anonyme désactivé.');
});
document.addEventListener('submit', (e) => { if (e.target.id === 'contact-form') { e.preventDefault(); sendContact(e.target); } });
window.addEventListener('hashchange', route);

(async function init() {
  try {
    const f = async (n) => (await fetch(`data/${n}.json`, { cache: 'no-cache' })).json();
    const [axes, questions, candidats, positions, version] = await Promise.all(['axes', 'questions', 'candidats', 'positions', 'version'].map(f));
    D = { axes, questions, candidats, positions, version };
  } catch {
    $app.innerHTML = '<p class="loading">Impossible de charger les données. Ouvrez le site depuis un serveur web (et non directement depuis un fichier).</p>'; return;
  }
  load();
  const today = CFG.TODAY || new Date().toISOString().slice(0, 10);
  D.questions = D.questions.filter((q) => !q.actualite || q.actualite.jusqu_au >= today); // questions d'actualité échues : retirées
  D.baseQuestions = D.questions;
  D.questions = orderQuestions(D.baseQuestions);
  document.getElementById('foot-version').textContent = `Version ${D.version.version} · ${frDate(D.version.date)}`;
  if (CFG.SOURCE_URL) { const n = document.querySelector('.footlinks'); if (n) n.insertAdjacentHTML('beforeend', `<a href="${esc(CFG.SOURCE_URL)}" target="_blank" rel="noopener noreferrer">Code source</a>`); }
  counter('GET');
  ready = true;
  route();
})();
