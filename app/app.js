// Leonida Trophy Guide: checklist + tracker for the 55 GTA VI trophies on PS5.
// Progress lives in localStorage only; export/import are plain JSON files.
// URL state (for sharing a view): ?view=checklist|roadmap|missable &grade= &kind=
// &missable=1 &spoiler=on|off &trophy=<id> &demo=1 (demo ticks 12 trophies in memory only).
const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const DEMO_EARNED_IDS = [2, 3, 4, 8, 15, 16, 21, 28, 31, 35, 42, 44];

const ROADMAP_STAGES = [
  { stage: 1, title: 'Stage 1 — Play the story', time: '60–80 hours', text: 'Finish the story first and enjoy it. All 12 story trophies pop on their own as chapters and missions end. Do the Chapter 1 balcony meditation for Positive Mental Attitude before Chapter 1 ends — the only trophy that may be missable. Scan vehicles and study animals as you go; that progress already counts toward 100%.' },
  { stage: 2, title: 'Stage 2 — Side questlines & activities', time: '20–30 hours', text: 'Work through the named quest givers — Andy, Kenton, Billy, Randy, Tyrone, Bret and Cal — plus the 8 Strangers & Freaks strands. Every one of these chains stays available after the story, so there is no rush, but doing them now teaches you the map. Finish an arcade game and try each activity type once.' },
  { stage: 3, title: 'Stage 3 — Collections, robberies & cleanup', time: '60–80 hours', text: 'The big free-roam sweep: 250 stunts, 100 WAiNK scans, 100 vehicles, card sets, 50 challenges, the shooting ranges and drone races, the robberies (bank vaults, armoured trucks, gang operations, jewellery stores) and the one-off feats — the tank, the plane, the UFO, the showroom Banshee and the rest.' },
  { stage: 4, title: 'Stage 4 — 100% checklist & the platinum', time: 'The last stretch', text: 'Open Progress > Stats > 100% Completion and finish the checklist — any 100 optional missions, 200 of 277 vehicles, 100 of 255 animals, 70 of 80 challenges, all robberies, ranges, races and Target Decks. When A Long Road pops, Vice Got a Price! follows at once.' },
];

const KIND_LABELS = { story: 'Story', side: 'Side quest', collection: 'Collection', activity: 'Activity', misc: 'Miscellaneous' };

let doc = null;
let earned = new Set();
let demoMode = false;

const params = new URLSearchParams(location.search);
demoMode = params.get('demo') === '1';

function loadTrophies() {
  return fetch('data/trophies.json').then((r) => r.json());
}

function readSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set((names || []).filter((n) => typeof n === 'string'));
  } catch {
    return new Set();
  }
}

function saveProgress() {
  if (demoMode) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }));
}

function applyDemoChecks() {
  if (!demoMode) return;
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));
  for (const id of DEMO_EARNED_IDS) {
    const t = byId.get(id);
    if (t) earned.add(t.name);
  }
}

function spoilerOn() {
  return document.getElementById('spoilerToggle').checked;
}

function trophyIsHidden(t) {
  return spoilerOn() && t.kind === 'story' && !earned.has(t.name);
}

function visibleTrophies() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const grade = document.getElementById('gradeFilter').value;
  const kind = document.getElementById('kindFilter').value;
  const missableOnly = document.getElementById('missableOnly').checked;
  return doc.trophies.filter((t) => {
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (missableOnly && !t.missable) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const total = doc.trophies.length;
  const n = earned.size;
  document.getElementById('earnedCount').textContent = n;
  document.getElementById('barFill').style.width = `${Math.round((n / total) * 100)}%`;
  document.getElementById('progressPct').textContent = n === total
    ? 'Platinum earned — Vice Got a Price!'
    : `${Math.round((n / total) * 100)}% to the platinum`;
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const all = doc.trophies.filter((t) => t.grade === g).length;
    const got = doc.trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    document.getElementById('count' + g[0].toUpperCase() + g.slice(1)).textContent = `${got} / ${all}`;
  }
}

function renderRoadmap() {
  const list = document.getElementById('roadmapList');
  list.replaceChildren();
  for (const s of ROADMAP_STAGES) {
    const items = doc.trophies.filter((t) => t.roadmap_stage === s.stage);
    const li = document.createElement('li');
    li.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = s.title + ' ';
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = `· ${s.time} · ${items.filter((t) => earned.has(t.name)).length}/${items.length} earned`;
    h.append(time);
    const p = document.createElement('p');
    p.textContent = s.text;
    const ul = document.createElement('ul');
    for (const t of items) {
      const row = document.createElement('li');
      if (earned.has(t.name)) row.className = 'done';
      row.textContent = `${earned.has(t.name) ? '✓ ' : ''}${t.name} — ${t.grade}`;
      ul.append(row);
    }
    li.append(h, p, ul);
    list.append(li);
  }
}

function renderMissableWatch() {
  const box = document.getElementById('missableList');
  box.replaceChildren();
  const flagged = doc.trophies.filter((t) => t.missable);
  for (const t of flagged) {
    const card = document.createElement('div');
    card.className = 'trophy-card';
    const body = document.createElement('div');
    body.className = 'trophy-body';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = `⚠ ${t.name}`;
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = t.description;
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    const gradeChip = document.createElement('span');
    gradeChip.className = `chip ${t.grade}`;
    gradeChip.textContent = t.grade;
    tags.append(gradeChip);
    const flag = document.createElement('span');
    flag.className = 'chip missable';
    flag.textContent = 'Possibly missable';
    tags.append(flag);
    if (t.target) {
      const target = document.createElement('span');
      target.className = 'target';
      target.textContent = t.target;
      tags.append(target);
    }
    const why = document.createElement('p');
    why.textContent = t.missable_reason || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'guide-btn';
    btn.textContent = 'Read the full guide';
    btn.addEventListener('click', () => openTrophyDetail(t));
    body.append(name, desc, tags, why, btn);
    card.append(body);
    box.append(card);
  }
  const note = document.createElement('p');
  note.className = 'section-lede';
  note.textContent = '54 of 55 trophies are confirmed not missable at launch. If you do the Chapter 1 meditation above, nothing in the list can lock you out of the platinum in a single playthrough.';
  box.append(note);
}

function renderTrophyList() {
  const list = document.getElementById('trophyList');
  const shown = visibleTrophies();
  list.replaceChildren();
  document.getElementById('resultHint').textContent =
    `Showing ${shown.length} of ${doc.trophies.length} trophies — ${shown.filter((t) => earned.has(t.name)).length} earned in this view. Click a trophy's guide to read how to earn it and where the facts come from.`;
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = `trophy-card grade-${t.grade}${earned.has(t.name) ? ' earned' : ''}${trophyIsHidden(t) ? ' spoiled' : ''}`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    body.className = 'trophy-body';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = trophyIsHidden(t) ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = trophyIsHidden(t) ? 'Name and description hidden until earned — turn off “Hide story spoilers” to reveal it.' : t.description;
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    const gradeChip = document.createElement('span');
    gradeChip.className = `chip ${t.grade}`;
    gradeChip.textContent = t.grade;
    tags.append(gradeChip);
    const kindChip = document.createElement('span');
    kindChip.className = 'chip kind';
    kindChip.textContent = KIND_LABELS[t.kind] || t.kind;
    tags.append(kindChip);
    if (t.target) {
      const target = document.createElement('span');
      target.className = 'target';
      target.textContent = t.target;
      tags.append(target);
    }
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'chip missable';
      flag.textContent = 'Possibly missable';
      tags.append(flag);
    }
    body.append(name, desc, tags);
    if (!trophyIsHidden(t)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'guide-btn';
      btn.textContent = 'Guide + sources';
      btn.addEventListener('click', () => openTrophyDetail(t));
      body.append(btn);
    }
    li.append(box, body);
    list.append(li);
  }
}

function openTrophyDetail(t) {
  const panel = document.getElementById('detailPanel');
  document.getElementById('detailKicker').textContent = `${t.grade} · ${KIND_LABELS[t.kind] || t.kind}${t.target ? ` · ${t.target}` : ''}`;
  document.getElementById('detailName').textContent = t.name;
  document.getElementById('detailDesc').textContent = t.description;
  const meta = document.getElementById('detailMeta');
  meta.replaceChildren();
  const gradeChip = document.createElement('span');
  gradeChip.className = `chip ${t.grade}`;
  gradeChip.textContent = t.grade;
  meta.append(gradeChip);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'chip missable';
    flag.textContent = 'Possibly missable';
    meta.append(flag);
  }
  const miss = document.getElementById('detailMissable');
  if (t.missable && t.missable_reason) {
    miss.hidden = false;
    miss.textContent = t.missable_reason;
  } else {
    miss.hidden = true;
    miss.textContent = '';
  }
  document.getElementById('detailGuide').textContent = t.guide;
  const sources = document.getElementById('detailSources');
  sources.replaceChildren();
  for (const url of t.sources || []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = url.replace(/^https?:\/\/(www\.)?/, '');
    li.append(a);
    sources.append(li);
  }
  const earnedBox = document.getElementById('detailEarned');
  earnedBox.checked = earned.has(t.name);
  earnedBox.onchange = () => {
    if (earnedBox.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveProgress();
    renderAll();
  };
  panel.hidden = false;
}

function closeTrophyDetail() {
  document.getElementById('detailPanel').hidden = true;
}

function exportProgress() {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exported_at: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  file.text().then((text) => {
    const parsed = JSON.parse(text);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(doc.trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveProgress();
    renderAll();
  }).catch(() => {
    document.getElementById('resultHint').textContent = 'That file could not be imported — it must be a progress JSON file exported from this guide.';
  });
}

function resetProgress() {
  if (!window.confirm('Clear all earned trophies?')) return;
  earned = new Set();
  saveProgress();
  renderAll();
}

function switchView(view) {
  for (const v of ['checklist', 'roadmap', 'missable']) {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== view);
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
}

function applyUrlState() {
  const view = params.get('view');
  if (view && ['checklist', 'roadmap', 'missable'].includes(view)) switchView(view);
  const grade = params.get('grade');
  if (grade && ['platinum', 'gold', 'silver', 'bronze'].includes(grade)) document.getElementById('gradeFilter').value = grade;
  const kind = params.get('kind');
  if (kind && KIND_LABELS[kind]) document.getElementById('kindFilter').value = kind;
  if (params.get('missable') === '1') document.getElementById('missableOnly').checked = true;
  if (params.get('spoiler') === 'off') document.getElementById('spoilerToggle').checked = false;
  if (params.get('spoiler') === 'on') document.getElementById('spoilerToggle').checked = true;
  const trophyId = Number(params.get('trophy'));
  if (trophyId) {
    const t = doc.trophies.find((x) => x.id === trophyId);
    if (t) openTrophyDetail(t);
  }
}

function bindControls() {
  for (const id of ['search', 'gradeFilter', 'kindFilter', 'missableOnly', 'spoilerToggle']) {
    document.getElementById(id).addEventListener('input', renderTrophyList);
    document.getElementById(id).addEventListener('change', renderTrophyList);
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }
  for (const el of document.querySelectorAll('[data-view-link]')) {
    el.addEventListener('click', () => switchView(el.dataset.viewLink));
  }
  for (const el of document.querySelectorAll('[data-open-trophy]')) {
    el.addEventListener('click', () => {
      const t = doc.trophies.find((x) => x.id === Number(el.dataset.openTrophy));
      if (t) openTrophyDetail(t);
    });
  }
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (e) => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', resetProgress);
  document.getElementById('detailClose').addEventListener('click', closeTrophyDetail);
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderMissableWatch();
  renderTrophyList();
}

function init() {
  loadTrophies().then((loaded) => {
    doc = loaded;
    earned = readSavedProgress();
    applyDemoChecks();
    bindControls();
    renderAll();
    applyUrlState();
    renderTrophyList();
  }).catch(() => {
    document.getElementById('resultHint').textContent = 'Could not load data/trophies.json — serve app/ over HTTP (node serve.ts) rather than opening the file directly.';
  });
}

init();
