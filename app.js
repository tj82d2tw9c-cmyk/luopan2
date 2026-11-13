/* ==========================================================
   罗盘 · 知乎短篇创作台
   数据：data/zhihu.json（由 scripts/fetch-zhihu.js 抓取）
   本地数据：localStorage（导语池 / 抽卡记录 / 设置）
   ========================================================== */

/* ================= 本地存储 ================= */
const KEY = 'luopan_desktop_v2';
/** 导入的榜单快照单独存一个 key，和用户数据分开，清用户数据时不会误删 */
const SNAP_KEY = 'luopan_snapshot_v1';

const DEFAULT = () => ({
  ver: 2,
  pool: [],
  cards: 0,
  cookie: '',
  theme: 'paper',
  signed: '',
  lastFetch: '',
});

const DB = {
  d: null,
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      this.d = raw && raw.ver === 2 ? raw : DEFAULT();
    } catch { this.d = DEFAULT(); }
    return this.d;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { toast('存储已满，导出备份后清理'); } },
};

/* ================= 工具 ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2000);
}

async function copyText(s) {
  try { await navigator.clipboard.writeText(s); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = s; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast('已复制');
}

function confirmBox(title, desc, okText, onOk, danger) {
  $('#modalBody').innerHTML = `<div class="m-t">${esc(title)}</div>${desc ? `<div class="m-d">${esc(desc)}</div>` : ''}`;
  const a = $('#modalActions'); a.innerHTML = '';
  const c = el('button', '', '取消'); c.onclick = closeModal;
  const o = el('button', 'strong' + (danger ? ' danger' : ''), esc(okText || '确定'));
  o.onclick = () => { closeModal(); onOk && onOk(); };
  a.append(c, o);
  $('#modalMask').classList.add('show');
}
function closeModal() { $('#modalMask').classList.remove('show'); }

const I = {
  search: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.2-1.8 4.6-3.2 6.2C7.2 10 6 11.8 6 14.2A6 6 0 0 0 18 14c0-3-1.7-5.2-3.2-7C13.4 5.4 12.2 4 12 2z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.5 5.5L20 6.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.8 6 6.2.8-4.6 4.4 1.2 6.3L12 17.4 6.4 20.5l1.2-6.3L3 9.8 9.2 9z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v13M6 11l6 6 6-6M4 21h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V7M6 13l6-6 6 6M4 3h16"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M3 12h18"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M8 11h8M8 15h5"/></svg>',
};

/* ================= 应用级状态 ================= */
let DATA = { lists: [], fetchedAt: '', source: '', viewer: '', stats: {} };
let activeList = 'salt_recommend';
let activeFilter = '0';
let searchKw = '';

/* ================= 数据加载 ================= */

/** 把一份 zhihu.json 的形状应用到全局 DATA。返回是否成功 */
function applyZhihu(j) {
  if (!j || !Array.isArray(j.lists) || !j.lists.length) return false;
  // 兼容旧结构：把 hot_all（全站热榜）过滤掉，那个不是短篇
  const lists = j.lists.filter(L => L.key !== 'hot' && L.type !== 'hot_all' && Array.isArray(L.items));
  if (!lists.length) return false;
  DATA = {
    lists,
    fetchedAt: j.fetchedAt || '',
    source: j.source || 'zhihu.com',
    viewer: j.viewer || '',
    stats: j.stats || {},
  };
  // 默认落在一个有数据的榜单上
  if (!DATA.lists.some(L => L.key === activeList) && DATA.lists.length) activeList = DATA.lists[0].key;
  return true;
}

/**
 * 加载榜单数据。优先级：
 *   1. localStorage 里导入过的快照（手机上更新数据用，不需要重新部署）
 *   2. 线上 data/zhihu.json（首次访问 / 清空缓存后）
 * 注意：快照只存榜单，不含 z_c0，体积约 200KB 量级。
 */
async function loadZhihu() {
  // 1) 先试本地导入的快照
  let fromCache = false;
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (raw) {
      const snap = JSON.parse(raw);
      if (applyZhihu(snap)) {
        fromCache = true;
        DB.d.lastFetch = snap.fetchedAt || '';
      }
    }
  } catch { /* 快照坏了就退回线上 */ }

  // 2) 线上文件（首次或没有快照时）
  if (!fromCache) {
    try {
      const r = await fetch('./data/zhihu.json', { cache: 'no-store' });
      if (!r.ok) throw 0;
      applyZhihu(await r.json());
      DB.d.lastFetch = DATA.fetchedAt;
    } catch {
      DATA = { lists: [], fetchedAt: '', source: '', viewer: '', stats: {} };
    }
  }

  DB.save();
  paintWidgets();
  return { fromCache };
}

/** 导入一份榜单 json（会覆盖旧快照） */
function importSnapshot(text) {
  let j;
  try { j = JSON.parse(text); }
  catch { return { ok: false, msg: '不是有效的 JSON 文件' }; }

  if (!j || !Array.isArray(j.lists)) {
    return { ok: false, msg: '缺少 lists 字段，可能选错了文件' };
  }
  const before = applyZhihu(j);
  if (!before) return { ok: false, msg: '榜单为空，检查文件是否完整' };

  const total = DATA.lists.reduce((s, L) => s + L.items.length, 0);
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(j));
  } catch (e) {
    // 超配额：数据还在内存里，只是不能持久化
    DB.d.lastFetch = DATA.fetchedAt;
    DB.save();
    return { ok: true, warn: true, msg: `已加载 ${total} 条，但体积超出浏览器上限，刷新后会恢复线上版本` };
  }
  DB.d.lastFetch = DATA.fetchedAt;
  DB.save();
  return { ok: true, msg: `已加载 ${DATA.lists.length} 个榜单 · ${total} 条` };
}

/** 清除导入的榜单快照，回到线上文件 */
function clearSnapshot() {
  try { localStorage.removeItem(SNAP_KEY); } catch { }
}

/** 本机是否存在导入的快照（读一次就够，设置页用） */
function hasSnap() {
  try { return !!localStorage.getItem(SNAP_KEY); } catch { return false; }
}

/** 设置页「快照来源」一行文案 */
function snapInfo() {
  if (!hasSnap()) return '线上 data/zhihu.json';
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    const s = JSON.parse(raw);
    // localStorage 按 UTF-16 计，实际字节数约 ×2，这里按 KB 粗估够用
    const kb = raw.length * 2 / 1024;
    const size = kb < 1024 ? kb.toFixed(0) + ' KB' : (kb / 1024).toFixed(1) + ' MB';
    const when = s.fetchedAt ? new Date(s.fetchedAt).toLocaleString('zh-CN') : '时间未知';
    return `本机导入 · ${size} · ${when}`;
  } catch { return '本机导入（快照已损坏）'; }
}

/** 官方五榜（推荐/热搜/热度/口碑/长篇），每榜 9 条，带简介 */
function officialLists() {
  return DATA.lists.filter(L => L.key.startsWith('salt_'));
}

/** 题材分榜（言情/纯爱/现实情感…），条数多，是主要浏览入口 */
function genreLists() {
  return DATA.lists.filter(L => L.type === 'genre').sort((a, b) => b.items.length - a.items.length);
}

function getList(key) {
  return DATA.lists.find(L => L.key === key) || null;
}

/** 按当前榜单 + 分类过滤 */
function listItems(L, filterKey) {
  if (!L) return [];
  const f = (filterKey == null ? activeFilter : filterKey);
  if (!f || f === '0' || !L.filters || !L.filters.length) return L.items.slice();
  const name = (L.filters.find(x => x.key === f) || {}).name;
  if (!name || name === '全部') return L.items.slice();
  // 一个条目可能带多个标签，任一命中即算
  return L.items.filter(it => {
    const labels = it.labels || [];
    const main = (it.label || '').trim();
    return main === name || labels.includes(name);
  });
}

function allItems() {
  const seen = new Set(); const out = [];
  DATA.lists.forEach(L => L.items.forEach(it => {
    if (seen.has(it.id)) return; seen.add(it.id); out.push(it);
  }));
  return out;
}

/* ================= 桌面小组件 ================= */
function paintWidgets() {
  const total = allItems().length;
  const pool = DB.d.pool;
  const doneN = pool.filter(p => p.done).length;
  const gl = genreLists();

  $('#wCount').textContent = total;
  $('#stPool').textContent = pool.length;
  $('#stDone').textContent = doneN;
  $('#stCards').textContent = DB.d.cards;
  // 进度条按 500 条封顶，大于 200 条就基本满了
  const pct = Math.min(100, total ? Math.round(total / 400 * 100) : 0);
  $('#wBar').style.width = pct + '%';

  const upd = DATA.fetchedAt
    ? '同步于 ' + new Date(DATA.fetchedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '尚未同步知乎数据';
  $('#wUpdated').textContent = upd;
  $('#wTime').textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  // 趋势小组件：默认取条数最多的题材榜（言情），点进去也是那里
  const src = gl[0] || officialLists()[0] || DATA.lists[0];
  const box = $('#wTrend');
  // 条数按视口给：手机 3 条；矮屏（如 1024×768）也压到 3 条，否则图标会被 Dock 压住；其余 5 条
  const narrow = window.matchMedia('(max-width: 560px)').matches;
  const shortViewport = window.matchMedia('(max-height: 840px)').matches;
  const rowLimit = narrow ? 3 : (shortViewport ? 3 : 5);
  const top = src ? src.items.slice(0, rowLimit) : [];
  const head = $('#wTrendHead');
  if (head) head.textContent = src ? `${src.name} · ${src.items.length} 条` : '知乎短篇';
  if (!top.length) {
    box.innerHTML = `<div style="font-size:12px;color:var(--label-3);line-height:1.6;padding:6px 0">暂无数据<br>运行 scripts/fetch-zhihu.js 后刷新</div>`;
  } else {
    box.innerHTML = top.map((it, i) => `
      <div class="w-row" data-item="${esc(it.id)}">
        <span class="w-idx ${i < 3 ? 'top' : ''}">${i + 1}</span>
        <div style="min-width:0">
          <div class="w-row-t">${esc(it.title)}</div>
          <div class="w-row-h">${esc(it.heat || '—')}${it.labels && it.labels.length > 1 ? ' · ' + esc(it.labels.slice(1, 3).join(' ')) : ''}</div>
        </div>
      </div>`).join('');
    $$('.w-row', box).forEach(n => n.onclick = () => {
      const it = allItems().find(x => x.id === n.dataset.item);
      if (it) openItem(it, null);
    });
  }
}

/* ================= 窗口框架 ================= */
const TITLES = {
  rank: '短篇榜单', cards: '随机抽卡', pool: '导语池', studio: '制图工坊',
  names: '起名助手', analyze: '审稿官', settings: '数据设置',
};

const VIEWS = {};
let curView = '';

function openApp(key) {
  curView = key;
  $('#winTitle').textContent = TITLES[key] || '罗盘';
  $('#winActions').innerHTML = '';
  const body = $('#winBody');
  body.innerHTML = '';
  body.scrollTop = 0;
  const v = VIEWS[key];
  if (!v) { body.innerHTML = '<div class="empty"><div class="empty-t">尚未实现</div></div>'; }
  else body.appendChild(v());
  $('#stage').classList.add('show');
  document.body.classList.add('win-open');
}

function closeApp() {
  $('#stage').classList.remove('show');
  document.body.classList.remove('win-open');
  curView = '';
  paintWidgets();
}

function appBtn(html, cls, onClick, title) {
  const b = el('button', 'btn ' + (cls || 'btn-sec'), html);
  if (title) b.title = title;
  b.onclick = onClick;
  return b;
}

/* ================= 1. 短篇榜单 ================= */
VIEWS.rank = () => {
  const frag = el('div', 'page');
  const pg = el('div');
  pg.innerHTML = `
    <div class="pg-head">
      <div>
        <div class="pg-title">知乎短篇榜单</div>
        <div class="pg-sub" id="rankSub"></div>
      </div>
      <div style="display:flex;gap:10px;align-items:center" id="rankTools"></div>
    </div>
    <div class="pg-body">
      <div class="toolbar">
        <div class="segmented" id="listSeg"></div>
        <div class="grow"></div>
        <div class="search-box" style="width:250px">
          ${I.search}<input id="rankQ" placeholder="搜标题 / 简介">
        </div>
      </div>
      <div class="filter-bar" id="filterBar"></div>
      <div class="rank-table" id="rankTable"></div>
    </div>`;
  frag.appendChild(pg);

  /* 榜单切换：官方五榜 + 题材分榜，两组分开 */
  const seg = pg.querySelector('#listSeg');
  const off = officialLists();
  const gen = genreLists();
  if (!DATA.lists.length) {
    seg.style.display = 'none';
  } else {
    const group = (title, arr) => arr.length
      ? `<div class="seg-group"><span class="seg-cap">${esc(title)}</span>${
          arr.map(L => `<button class="${L.key === activeList ? 'on' : ''}" data-k="${esc(L.key)}">${esc(L.name)}<i>${L.items.length}</i></button>`).join('')
        }</div>`
      : '';
    seg.innerHTML = group('官方榜', off) + group('题材榜', gen);
    $$('button', seg).forEach(b => b.onclick = () => {
      activeList = b.dataset.k;
      activeFilter = '0';   // 切榜单时重置分类
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      drawFilters();
      drawTable();
    });
  }

  const sub = pg.querySelector('#rankSub');
  const st = DATA.stats || {};
  sub.textContent = DATA.fetchedAt
    ? `${allItems().length} 条短篇 · ${gen.length} 个题材 · 抓取于 ${new Date(DATA.fetchedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : '还没有数据，先跑一次 scripts/fetch-zhihu.js';

  const tools = pg.querySelector('#rankTools');
  tools.append(
    appBtn(I.down + ' 导出', 'btn-sec', exportRank),
    appBtn(I.link + ' 知乎故事页', 'btn-sec', () => window.open('https://www.zhihu.com/fiore/h5/vip-web', '_blank'))
  );

  /* 二级分类筛选（仅官方五榜有） */
  const drawFilters = () => {
    const bar = pg.querySelector('#filterBar');
    const L = getList(activeList);
    if (!L || !L.filters || L.filters.length <= 1) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
    bar.style.display = '';
    bar.innerHTML = L.filters.map(f => {
      const n = listItems(L, f.key).length;
      return `<button class="fchip ${activeFilter === f.key ? 'on' : ''}" data-f="${esc(f.key)}" ${n ? '' : 'disabled'}>${esc(f.name)}<i>${n}</i></button>`;
    }).join('');
    $$('.fchip', bar).forEach(b => b.onclick = () => {
      activeFilter = b.dataset.f;
      drawFilters(); drawTable();
    });
  };

  const drawTable = () => {
    const table = pg.querySelector('#rankTable');
    const L = getList(activeList);
    let items = listItems(L);
    const kw = (pg.querySelector('#rankQ').value || '').trim();
    if (kw) items = items.filter(it => (it.title + (it.excerpt || '') + (it.labels || []).join('')).includes(kw));

    if (!items.length) {
      const isFiltered = activeFilter !== '0' && L && L.filters.length > 1;
      table.innerHTML = `<div class="empty">${I.empty}<div class="empty-t">${DATA.lists.length ? (isFiltered ? '这个分类下没有条目' : '没有匹配的结果') : '还没有知乎数据'}</div><div class="empty-d">${DATA.lists.length ? '换个分类或关键词试试' : '运行 scripts/fetch-zhihu.js 生成 data/zhihu.json'}</div></div>`;
      return;
    }
    table.innerHTML = items.map((it, i) => `
      <div class="rank-row" data-id="${esc(it.id)}">
        <div class="rk-no ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${i + 1}</div>
        ${it.cover ? `<div class="rk-cover"><img src="${esc(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.style.display='none'"></div>` : ''}
        <div class="rk-main">
          <div class="rk-title">${esc(it.title)}</div>
          ${it.excerpt ? `<div class="rk-lead">${esc(it.excerpt)}</div>` : ''}
          <div class="rk-meta">
            ${it.label ? `<span class="tag orange">${esc(it.label)}</span>` : ''}
            ${(it.labels || []).filter(t => t !== it.label).slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            ${it.space === 'LongSpace' ? '<span class="tag">长篇</span>' : (it.space ? '<span class="tag blue">短篇</span>' : '')}
            ${(it.badges || []).map(b => `<span class="tag green">${esc(b)}</span>`).join('')}
          </div>
        </div>
        <div class="rk-right">
          ${it.heat ? `<div class="rk-heat">${I.fire}${esc(it.heat)}</div>` : ''}
          <button class="iconbtn rk-save" data-save="${esc(it.id)}" title="存入导语池">${I.bookmark}</button>
        </div>
      </div>`).join('');

    $$('.rank-row', table).forEach(n => {
      n.onclick = e => {
        if (e.target.closest('[data-save]')) return;
        const it = items.find(x => x.id === n.dataset.id);
        if (it) openItem(it, drawTable);
      };
    });
    $$('[data-save]', table).forEach(b => b.onclick = e => {
      e.stopPropagation();
      const it = items.find(x => x.id === b.dataset.save);
      if (it) saveToPool(it);
    });
  };

  pg.querySelector('#rankQ').oninput = drawTable;
  setTimeout(() => { drawFilters(); drawTable(); }, 0);

  // 窗口很窄时右侧「导出/打开知乎」两个按钮改短标签，避免挤出横向滚动
  if (window.innerWidth <= 560) {
    const btns = $$('#rankTools .btn');
    if (btns[0]) btns[0].innerHTML = I.down + ' 导出';
    if (btns[1]) btns[1].innerHTML = I.link + ' 知乎';
  }
  return frag;
};

function exportRank() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `知乎榜单_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('已导出');
}

function saveToPool(it) {
  if (DB.d.pool.some(p => p.sourceId === it.id)) { toast('这条已在导语池'); return; }
  const tags = [it.label, ...(it.tags || [])].filter(Boolean);
  DB.d.pool.unshift({
    id: uid(), text: (it.excerpt || it.title).slice(0, 300),
    title: it.title, url: it.url, tags: [...new Set(tags)],
    sourceId: it.id, source: '知乎·' + (it.heat || '盐选'), done: false, star: false, ts: Date.now(),
  });
  DB.save(); toast('已存入导语池'); paintWidgets();
}

/* 条目详情（窗口内展开） */
function openItem(it, back) {
  const body = $('#winBody');
  const prevTitle = $('#winTitle').textContent;
  $('#winTitle').textContent = '条目详情';
  $('#winActions').innerHTML = '';
  $('#winActions').append(appBtn('← 返回', 'btn-ghost', () => {
    $('#winTitle').textContent = prevTitle;
    if (back) openApp(curView); else openApp(curView);
  }));

  const spaceTxt = it.space === 'LongSpace' ? '长篇' : it.space === 'ShortSpace' ? '短篇' : '—';
  body.innerHTML = `<div class="page">
    <div class="pg-head" style="display:flex;gap:18px;align-items:flex-start">
      ${it.cover ? `<img class="detail-cover" src="${esc(it.cover)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
      <div style="min-width:0">
        <div class="pg-title" style="font-size:22px;line-height:1.45">${esc(it.title)}</div>
        <div class="pg-sub">${esc(it.heat || '')}${it.label ? ' · ' + esc(it.label) : ''}${it.space ? ' · ' + spaceTxt : ''}</div>
      </div>
    </div>
    <div class="pg-body">
      <div class="detail-grid">
        <div class="detail-main">${esc(it.excerpt || '（该条目在知乎上无简介，点右侧「去知乎阅读」查看）')}</div>
        <div class="detail-side">
          <div class="side-card">
            <div class="side-label">操作</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-primary" id="itOpen" style="justify-content:center">${I.link} 去知乎阅读</button>
              <button class="btn btn-sec" id="itSave" style="justify-content:center">${I.bookmark} 存入导语池</button>
              <button class="btn btn-sec" id="itCopy" style="justify-content:center">${I.copy} 复制标题</button>
            </div>
          </div>
          <div class="side-card">
            <div class="side-label">数据</div>
            <div class="side-kv"><span>热度 / 赞</span><span>${esc(it.heat || '—')}</span></div>
            <div class="side-kv"><span>题材</span><span>${esc(it.label || '—')}</span></div>
            <div class="side-kv"><span>篇幅</span><span>${spaceTxt}</span></div>
            <div class="side-kv"><span>标签</span><span>${esc((it.badges || []).join(' / ') || '—')}</span></div>
          </div>
          <div class="side-card">
            <div class="side-label">注明</div>
            <div style="font-size:12px;line-height:1.65;color:var(--label-2)">此处仅展示标题、简介与热度作选题参考，正文请到知乎阅读，不镜像付费内容。</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  $('#itOpen').onclick = () => it.url ? window.open(it.url, '_blank') : toast('缺少链接');
  $('#itSave').onclick = () => { saveToPool(it); };
  $('#itCopy').onclick = () => copyText(it.title);
}

/* ================= 2. 导语池 ================= */
let poolFilter = 'all';
VIEWS.pool = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head">
      <div><div class="pg-title">导语池</div><div class="pg-sub" id="poolSub"></div></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-sec" id="poolExport">${I.down} 导出</button>
        <button class="btn btn-primary" id="poolNew">${I.plus} 新建导语</button>
      </div>
    </div>
    <div class="pg-body">
      <div class="pool-tools" id="poolPills"></div>
      <div class="pool-grid" id="poolGrid"></div>
    </div>`;
  frag.querySelector('#poolExport').onclick = () => {
    const blob = new Blob([JSON.stringify(DB.d.pool, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `导语池_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); toast('已导出');
  };
  frag.querySelector('#poolNew').onclick = () => openPoolEditor(null, draw);
  setTimeout(() => { drawPills(); draw(); }, 0);

  function drawPills() {
    const tags = [...new Set(DB.d.pool.flatMap(p => p.tags || []))].slice(0, 8);
    const el2 = frag.querySelector('#poolPills');
    const opts = [['all', '全部'], ['todo', '待用'], ['done', '已用'], ...tags.map(t => [t, t])];
    el2.innerHTML = opts.map(([k, n]) => `<button class="pill ${poolFilter === k ? 'on' : ''}" data-k="${esc(k)}">${esc(n)}</button>`).join('');
    $$('.pill', el2).forEach(b => b.onclick = () => { poolFilter = b.dataset.k; drawPills(); draw(); });
  }

  function draw() {
    const sub = frag.querySelector('#poolSub');
    sub.textContent = `共 ${DB.d.pool.length} 条 · ${DB.d.pool.filter(p => !p.done).length} 条待用`;
    let arr = DB.d.pool.slice().sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || b.ts - a.ts);
    if (poolFilter === 'todo') arr = arr.filter(p => !p.done);
    else if (poolFilter === 'done') arr = arr.filter(p => p.done);
    else if (poolFilter !== 'all') arr = arr.filter(p => (p.tags || []).includes(poolFilter));

    const grid = frag.querySelector('#poolGrid');
    if (!arr.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${I.empty}<div class="empty-t">池子是空的</div><div class="empty-d">从榜单里收藏，或点右上角「新建导语」</div></div>`;
      return;
    }
    grid.innerHTML = arr.map(p => `
      <div class="pool-card ${p.done ? 'done' : ''}" data-id="${p.id}">
        <div class="pool-text">${esc(p.text)}</div>
        <div class="pool-foot">
          ${p.star ? `<span class="tag orange">★ 重点</span>` : ''}
          ${(p.tags || []).map(t => `<span class="tag blue">${esc(t)}</span>`).join('')}
          ${p.source ? `<span class="tag">${esc(p.source)}</span>` : ''}
          <div class="pool-acts">
            <button class="iconbtn ${p.done ? 'on' : ''}" data-act="done" title="标记已用">${I.check}</button>
            <button class="iconbtn" data-act="copy" title="复制">${I.copy}</button>
            <button class="iconbtn" data-act="del" title="删除">${I.trash}</button>
          </div>
        </div>
      </div>`).join('');

    $$('.pool-card', grid).forEach(card => {
      const p = DB.d.pool.find(x => x.id === card.dataset.id);
      card.querySelector('[data-act=done]').onclick = e => { e.stopPropagation(); p.done = !p.done; DB.save(); draw(); paintWidgets(); };
      card.querySelector('[data-act=copy]').onclick = e => { e.stopPropagation(); copyText(p.text); };
      card.querySelector('[data-act=del]').onclick = e => {
        e.stopPropagation();
        confirmBox('删除这条导语？', '删除后不可恢复', '删除', () => {
          DB.d.pool = DB.d.pool.filter(x => x.id !== p.id); DB.save(); draw(); drawPills(); paintWidgets();
        }, true);
      };
      card.onclick = () => openPoolEditor(p, () => { draw(); drawPills(); paintWidgets(); });
    });
  }
  return frag;
};

function openPoolEditor(p, cb) {
  const isNew = !p;
  const body = $('#winBody');
  body.innerHTML = `<div class="page">
    <div class="pg-head"><div><div class="pg-title">${isNew ? '新建导语' : '编辑导语'}</div>
      <div class="pg-sub">导语是开篇第一口气</div></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-sec" id="peCancel">取消</button>
        <button class="btn btn-primary" id="peSave">保存</button>
      </div>
    </div>
    <div class="pg-body" style="max-width:760px">
      <div class="section-label">正文</div>
      <textarea class="ta" id="peText" style="min-height:180px" placeholder="粘贴或手写一条开篇导语…">${esc(p ? p.text : '')}</textarea>
      <div class="section-label">标签（用、或空格分隔）</div>
      <input class="form-input" style="width:100%" id="peTags" placeholder="虐恋、反转、悬疑" value="${esc(p ? (p.tags || []).join('、') : '')}">
      <div class="section-label">来源 / 书名</div>
      <input class="form-input" style="width:100%" id="peSrc" placeholder="可空" value="${esc(p ? (p.title || p.source || '') : '')}">
      ${p && p.url ? `<div class="form-hint">原链接：<a href="${esc(p.url)}" target="_blank" style="color:var(--sys-blue)">${esc(p.url.slice(0, 60))}…</a></div>` : ''}
    </div>
  </div>`;
  const ta = $('#peText'); ta.focus();
  $('#peCancel').onclick = () => openApp('pool');
  $('#peSave').onclick = () => {
    const text = ta.value.trim();
    if (!text) { toast('导语不能为空'); return; }
    const tags = $('#peTags').value.split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
    const src = $('#peSrc').value.trim();
    if (isNew) {
      DB.d.pool.unshift({ id: uid(), text, tags, title: src, source: '手动', done: false, star: false, ts: Date.now() });
    } else {
      Object.assign(p, { text, tags, title: src });
    }
    DB.save(); toast(isNew ? '已保存' : '已更新');
    openApp('pool');
    cb && cb();
  };
}

/* ================= 3. 随机抽卡 ================= */
let deck = [], dIdx = 0, animating = false;
function buildDeck() {
  const arr = [];
  DB.d.pool.forEach(p => arr.push({ title: p.title || '我的导语', by: p.source || '导语池', lv: '私人卡片', text: p.text, tag: (p.tags || [])[0] || '灵感' }));
  allItems().forEach(x => arr.push({
    title: x.title,
    by: x.label || '知乎盐选',
    lv: x.heat || '盐选',
    text: x.excerpt || x.title,
    tag: (x.label || '').split('·')[0].trim() || '盐选',
  }));
  return arr;
}
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

VIEWS.cards = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">随机抽卡</div><div class="pg-sub">卡壳时抽一张，从别人的开头里找自己的</div></div></div>
    <div class="pg-body">
      <div class="gacha-wrap">
        <div class="gacha-stack" id="stack"></div>
        <div class="gacha-side">
          <div class="section-label" style="margin-top:0">怎么用</div>
          <div style="font-size:13px;line-height:1.8;color:var(--label-2);margin-bottom:20px">
            抽卡池 = 你的导语池 + 知乎榜单条目。<br>
            抽到有感觉的句子，直接「存进导语池」留作素材。<br>
            只抽开篇与标题，不代写你的内容。
          </div>
          <div class="gacha-acts">
            <button class="btn btn-sec" id="gSave">${I.bookmark} 收藏</button>
            <button class="btn btn-sec" id="gCopy">${I.copy} 复制</button>
            <button class="btn btn-primary" id="gDraw">${I.shuffle} 抽一张</button>
          </div>
          <div class="section-label" style="margin-top:24px">本轮已抽</div>
          <div style="font-size:30px;font-weight:750;letter-spacing:-1px" id="gNum">0</div>
        </div>
      </div>
    </div>`;

  const draw = (animate = true) => {
    const stack = frag.querySelector('#stack');
    if (animating) return;
    if (!deck.length) deck = shuffle(buildDeck());
    if (!deck.length) {
      stack.innerHTML = `<div class="empty" style="padding:120px 20px;width:100%">${I.empty}<div class="empty-t">抽卡池是空的</div><div class="empty-d">先有数据或导语再来抽</div></div>`;
      return;
    }
    if (dIdx >= deck.length) { deck = shuffle(buildDeck()); dIdx = 0; }

    const render = () => {
      stack.innerHTML = '';
      for (let k = 2; k >= 1; k--) {
        const b = el('div', 'gcard');
        b.style.cssText = `transform:translateY(${k * -9}px) scale(${1 - k * 0.032});opacity:${1 - k * 0.2};pointer-events:none;z-index:1;padding:0;background:#F4F2EE`;
        stack.appendChild(b);
      }
      const c = deck[dIdx];
      const card = el('div', 'gcard');
      card.style.zIndex = 5;
      card.innerHTML = `
        <div class="gcard-lv"><span>${esc(c.tag)}</span><b>${esc(c.lv)}</b></div>
        <div class="gcard-title">${esc(c.title)}</div>
        <div class="gcard-by">${esc(c.by)}</div>
        <div class="gcard-lead">${esc(c.text)}</div>
        <div class="gcard-foot">
          <span class="tag">${c.text.length} 字</span>
          <span class="tag">约 ${Math.max(1, Math.round(c.text.length / 400))} 分钟</span>
        </div>`;
      stack.appendChild(card);
      DB.d.cards++; DB.save();
      const n = frag.querySelector('#gNum'); if (n) n.textContent = dIdx + 1;
    };

    if (!animate) { render(); return; }
    animating = true;
    const old = stack.querySelector('.gcard:last-child');
    if (old) { old.style.transform = 'translateX(115%) rotate(8deg)'; old.style.opacity = '0'; }
    setTimeout(() => { dIdx++; render(); animating = false; }, 250);
  };

  setTimeout(() => { deck = shuffle(buildDeck()); dIdx = 0; draw(false); }, 20);
  setTimeout(() => {
    frag.querySelector('#gDraw').onclick = () => draw(true);
    frag.querySelector('#gCopy').onclick = () => { const c = deck[dIdx]; if (c) copyText(c.text); };
    frag.querySelector('#gSave').onclick = () => {
      const c = deck[dIdx]; if (!c) return;
      if (DB.d.pool.some(p => p.text === c.text)) { toast('已在导语池'); return; }
      DB.d.pool.unshift({ id: uid(), text: c.text, title: c.title, tags: [c.tag], source: c.by, done: false, star: false, ts: Date.now() });
      DB.save(); toast('已存入导语池'); paintWidgets();
    };
  }, 60);
  return frag;
};

/* ================= 4. 制图工坊 ================= */
let posterState = { theme: 'paper', density: 'normal', title: '', body: '', signed: '' };
VIEWS.studio = () => {
  const frag = el('div', 'page');
  const themes = [['paper', '素纸'], ['ink', '墨黑'], ['cream', '米黄'], ['blue', '深蓝']];
  const dens = [['loose', '疏'], ['normal', '中'], ['tight', '密']];

  // 默认内容取导语池第一条
  if (!posterState.title && !posterState.body) {
    const p = DB.d.pool[0];
    posterState.title = p ? (p.title || '未命名') : '在此输入标题';
    posterState.body = p ? p.text : '在此输入正文，做成 3:4 的推文卡片。';
  }
  if (!posterState.signed) posterState.signed = DB.d.signed || '';

  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">制图工坊</div><div class="pg-sub">3:4 推文卡片 · 导出 PNG</div></div>
      <button class="btn btn-primary" id="pExport">${I.down} 导出 PNG</button></div>
    <div class="pg-body">
      <div class="studio-grid">
        <div>
          <div class="poster theme-${posterState.theme} density-${posterState.density}" id="poster">
            <div class="poster-top"><span>STORY</span><span>03</span></div>
            <div class="poster-title"></div>
            <div class="poster-body"></div>
            <div class="poster-foot"><span class="pf-sign"></span><span>罗盘</span></div>
          </div>
        </div>
        <div>
          <div class="section-label" style="margin-top:0">主题</div>
          <div style="display:flex;gap:8px;margin-bottom:18px" id="themeRow">
            ${themes.map(([k, n]) => `<button class="pill ${posterState.theme === k ? 'on' : ''}" data-k="${k}">${n}</button>`).join('')}
          </div>
          <div class="section-label">字数密度</div>
          <div style="display:flex;gap:8px;margin-bottom:18px" id="densRow">
            ${dens.map(([k, n]) => `<button class="pill ${posterState.density === k ? 'on' : ''}" data-k="${k}">${n}</button>`).join('')}
          </div>
          <div class="section-label">标题</div>
          <input class="form-input" style="width:100%;margin-bottom:14px" id="pTitle" value="${esc(posterState.title)}">
          <div class="section-label">正文</div>
          <textarea class="ta" style="min-height:130px" id="pBody">${esc(posterState.body)}</textarea>
          <div class="section-label">署名</div>
          <input class="form-input" style="width:100%" id="pSign" value="${esc(posterState.signed)}" placeholder="你的笔名">
        </div>
      </div>
    </div>`;

  const P = () => frag.querySelector('#poster');
  const paint = () => {
    const p = P();
    p.className = `poster theme-${posterState.theme} density-${posterState.density}`;
    p.querySelector('.poster-title').textContent = posterState.title;
    p.querySelector('.poster-body').textContent = posterState.body;
    p.querySelector('.pf-sign').textContent = posterState.signed;
    DB.d.signed = posterState.signed; DB.save();
  };

  setTimeout(() => {
    paint();
    $$('#themeRow .pill', frag).forEach(b => b.onclick = () => {
      posterState.theme = b.dataset.k;
      $$('#themeRow .pill', frag).forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
    $$('#densRow .pill', frag).forEach(b => b.onclick = () => {
      posterState.density = b.dataset.k;
      $$('#densRow .pill', frag).forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
    frag.querySelector('#pTitle').oninput = e => { posterState.title = e.target.value; paint(); };
    frag.querySelector('#pBody').oninput = e => { posterState.body = e.target.value; paint(); };
    frag.querySelector('#pSign').oninput = e => { posterState.signed = e.target.value; paint(); };
    frag.querySelector('#pExport').onclick = () => exportPoster();
  }, 20);
  return frag;
};

function exportPoster() {
  const W = 900, H = 1200;
  const themes = {
    paper: { bg: '#FBFAF7', fg: '#1F1D1A' },
    ink: { bg: '#1C1B19', fg: '#F4F1E8' },
    cream: { bg: '#FBF3E4', fg: '#3A3227' },
    blue: { bg: '#0050A8', fg: '#FFFFFF' },
  };
  const t = themes[posterState.theme] || themes.paper;
  const lh = { loose: 2.4, normal: 1.95, tight: 1.66 }[posterState.density] || 1.95;
  const fs = posterState.density === 'tight' ? 36 : posterState.density === 'loose' ? 32 : 34;

  const bodyEsc = esc(posterState.body).replace(/\n/g, '<br>');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>${posterState.theme === 'blue' ? `<linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#0A84FF"/><stop offset="1" stop-color="#004A9E"/></linearGradient>` : ''}</defs>
    <rect width="${W}" height="${H}" fill="${posterState.theme === 'blue' ? 'url(#g)' : t.bg}"/>
    <foreignObject x="0" y="0" width="${W}" height="${H}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;box-sizing:border-box;padding:100px 90px;display:flex;flex-direction:column;color:${t.fg};font-family:'Source Han Sans SC','Noto Sans SC',sans-serif;">
        <div style="display:flex;justify-content:space-between;font-size:21px;opacity:.48;letter-spacing:2.4px;margin-bottom:48px"><span>STORY</span><span>03</span></div>
        <div style="font-size:${posterState.density === 'tight' ? 54 : 62}px;font-weight:700;line-height:1.36;letter-spacing:-1px;margin-bottom:34px">${esc(posterState.title)}</div>
        <div style="font-size:${fs}px;line-height:${lh};font-family:'Source Han Serif SC','Noto Serif SC',Georgia,serif;flex:1;overflow:hidden">${bodyEsc}</div>
        <div style="display:flex;justify-content:space-between;font-size:21px;opacity:.48;padding-top:24px;border-top:1px solid currentColor"><span>${esc(posterState.signed)}</span><span>罗盘</span></div>
      </div>
    </foreignObject>
  </svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = posterState.theme === 'blue' ? '#0050A8' : t.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    cv.toBlob(b => {
      if (!b) { toast('导出失败，换浏览器试试'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `罗盘卡片_${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast('已导出 PNG');
    }, 'image/png');
  };
  img.onerror = () => { toast('导出失败'); URL.revokeObjectURL(url); };
  img.src = url;
}

/* ================= 5. 起名助手 ================= */
const NAMES = {
  modern: [
    ['沈知意', 'shěn zhī yì', '清冷 · 女主'], ['陆时砚', 'lù shí yàn', '腹黑 · 男主'],
    ['温言', 'wēn yán', '温柔 · 女配'], ['江迟', 'jiāng chí', '病娇 · 男主'],
    ['宋亦澄', 'sòng yì chéng', '少年感'], ['林见鹿', 'lín jiàn lù', '灵动 · 女主'],
    ['周聿', 'zhōu yù', '禁欲 · 霸总'], ['苏晚', 'sū wǎn', '意难平 · 女主'],
    ['顾屿', 'gù yǔ', '孤傲 · 男二'], ['叶笙', 'yè shēng', '隐忍 · 女主'],
    ['程野', 'chéng yě', '痞帅 · 男主'], ['许清欢', 'xǔ qīng huān', '明媚 · 女主'],
  ],
  ancient: [
    ['谢云舟', 'xiè yún zhōu', '世家公子'], ['姜辞', 'jiāng cí', '权臣 · 女主'],
    ['萧珩', 'xiāo héng', '摄政王'], ['裴沅', 'péi yuán', '将门孤女'],
    ['沈砚清', 'shěn yàn qīng', '寒门状元'], ['顾南枝', 'gù nán zhī', '将门贵女'],
    ['容珩', 'róng héng', '少年将军'], ['卫无双', 'wèi wú shuāng', '女将军'],
    ['陆沉舟', 'lù chén zhōu', '江湖客'], ['温砚', 'wēn yàn', '太傅之女'],
    ['贺兰烬', 'hè lán jìn', '异族王子'], ['苏折枝', 'sū zhé zhī', '花楼女娘'],
  ],
};
let nameMode = 'modern';
VIEWS.names = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">起名助手</div><div class="pg-sub">点一下即复制</div></div>
      <button class="btn btn-sec" id="nameMore">${I.shuffle} 换一批</button></div>
    <div class="pg-body">
      <div class="segmented" style="margin-bottom:18px" id="nameSeg">
        <button class="${nameMode === 'modern' ? 'on' : ''}" data-m="modern">现代</button>
        <button class="${nameMode === 'ancient' ? 'on' : ''}" data-m="ancient">古代</button>
      </div>
      <div class="name-grid" id="nameGrid"></div>
    </div>`;
  const draw = () => {
    const src = shuffle(NAMES[nameMode]).slice(0, 12);
    const g = frag.querySelector('#nameGrid');
    g.innerHTML = src.map(([cn, pin, tag]) => `
      <button class="name-card" data-cn="${esc(cn)}">
        <div class="nc-cn">${esc(cn)}</div>
        <div class="nc-pin">${esc(pin)}</div>
        <div class="nc-tag">${esc(tag)}</div>
      </button>`).join('');
    $$('.name-card', g).forEach(b => b.onclick = () => copyText(b.dataset.cn));
  };
  setTimeout(() => {
    draw();
    $$('#nameSeg button', frag).forEach(b => b.onclick = () => {
      nameMode = b.dataset.m;
      $$('#nameSeg button', frag).forEach(x => x.classList.toggle('on', x === b));
      draw();
    });
    frag.querySelector('#nameMore').onclick = draw;
  }, 20);
  return frag;
};


const BEAT_TAGS = ['钩子', '身份', '冲突', '反转', '爽点', '情感', '高潮', '留白'];

VIEWS.analyze = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">审稿官</div>
      <div class="pg-sub">按知乎盐选的编辑标准审：先审导语，再审正文，最后给三条改法</div></div>
      <button class="btn btn-primary" id="anRun">${I.scan} 开始审稿</button></div>
    <div class="pg-body">
      <button class="btn btn-sec" id="anBack" style="display:none;margin-bottom:14px">← 改正文</button>
      <div class="analyze-grid">
        <div class="an-input" id="anInput">
          <div class="section-label" style="margin-top:0">稿件<span class="an-input-n" id="anCount">0 字</span></div>
          <textarea class="ta" id="anText" placeholder="把小说全文粘进来…&#10;&#10;至少 300 字。前 300 字会被当成导语单独审。&#10;段落之间空一行，结构判断会更准。"></textarea>
          <div class="an-opts">
            <label><span>审核模式</span>
              <select class="sel" id="anMode">
                <option value="auto">自动判断</option>
                <option value="lead">只审导语</option>
                <option value="body">只审正文</option>
                <option value="all">全篇都审</option>
              </select>
            </label>
            <label><span>题材</span>
              <select class="sel" id="anGenre">
                <option value="none">不确定</option>
                <option value="suspense">悬疑民俗志怪</option>
                <option value="romance">婚恋追妻火葬场</option>
                <option value="revenge">复仇爽文</option>
                <option value="family">现实家庭</option>
                <option value="xianxia">古言仙侠</option>
              </select>
            </label>
          </div>
          <div class="an-input-bar">
            <button class="btn btn-sec" id="anClear">${I.trash} 清空</button>
            <button class="btn btn-sec" id="anLoad">${I.empty} 读示例</button>
          </div>
        </div>
        <div id="anOut">
          <div class="empty">${I.empty}<div class="empty-t">还没有结果</div><div class="empty-d">粘贴稿件后点击「开始审稿」</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    const ta = frag.querySelector('#anText');
    const cnt = frag.querySelector('#anCount');
    const inputWrap = frag.querySelector('#anInput');
    const out = frag.querySelector('#anOut');
    const backBtn = frag.querySelector('#anBack');
    const modeSel = frag.querySelector('#anMode');
    const genreSel = frag.querySelector('#anGenre');
    const upd = () => { cnt.textContent = (CN(ta.value) || 0).toLocaleString() + ' 字'; };
    ta.addEventListener('input', upd);
    upd();

    const run = () => {
      const t = ta.value.trim();
      if (CN(t) < 50) { toast('至少 50 字才有得审'); return; }
      const r = analyzeText(t);
      r.mode = modeSel.value;
      r.genre = genreSel.value;
      renderReview(out, r);
      // 手机上把输入区收起来直接看报告，桌面并排显示不用收
      if (window.innerWidth <= 560) {
        inputWrap.classList.add('min');
        backBtn.style.display = '';
        // 滚动容器在页面外，得从 document 拿
        const wb = $('#winBody');
        if (wb) wb.scrollTop = 0;
      }
    };
    backBtn.onclick = () => {
      inputWrap.classList.remove('min');
      backBtn.style.display = 'none';
      ta.focus();
    };

    frag.querySelector('#anRun').onclick = run;
    frag.querySelector('#anClear').onclick = () => {
      ta.value = ''; upd();
      inputWrap.classList.remove('min');
      backBtn.style.display = 'none';
      out.innerHTML =
        '<div class="empty">' + I.empty + '<div class="empty-t">还没有结果</div><div class="empty-d">粘贴稿件后点击「开始审稿」</div></div>';
    };
    frag.querySelector('#anLoad').onclick = () => {
      ta.value = SAMPLE_TEXT; upd();
      toast('已载入示例，点「开始审稿」看看');
    };
  }, 20);
  return frag;
};

/** 示例文本（原创，只用于演示拆解效果） */
const SAMPLE_TEXT = `我是在婚礼前三个小时才知道，新郎那边还开着一桌。

酒店三楼，我穿着婚纱站在走廊尽头，听见婆婆的声音从包间里漏出来——"她那边的亲戚先别安排，等客人走了再说。"

我手里的捧花掉在地上，玫瑰砸在地毯上，一点声音都没有。

伴娘小周扯了扯我的袖子，说你别冲动。我说我不冲动，我就是想听清楚。

我推开门。满桌的人在看我，筷子悬在半空，酒还没倒。婆婆脸上那点笑僵住了，随即又活过来，说你怎么来了，快回去补妆。

我说阿姨，那一桌是谁。

她说不就是老家来的几个亲戚嘛，坐不下。

我说坐不下，所以让我爸妈先别进来。

包间里的空气好像被抽干了。新郎——他叫陈默——从里间出来，手还插在西装口袋里，看见我，先愣了一下，然后说你别听我妈瞎讲。

我笑了一下。这个笑不是我准备的，它自己跑出来的。

我说陈默，我们谈了四年。四年里我见过你妈三次，每一次她都夸我懂事。

他说你这是干什么，今天这么多人在。

我说我干什么？我连我爸妈坐哪都不知道，你问我干什么。

婆婆这时候站起来了，声音也大了，说这是我家的事，你一个还没进门的女孩子管这么宽。

我说阿姨，您这句话说得对。我还没进门。

我把戒指摘下来，放在转盘上。那枚戒指转了两圈，停在一盘没动过的鱼面前。

走廊里很安静。我脱了高跟鞋，光脚往前走。

电梯门开的时候，我听见身后有椅子倒地的声音，还有人在喊我的名字。

我没有回头。`;

/* ================= 6. 审稿官 =================
 *
 * 按知乎盐选资深编辑的审稿顺序做，不是统计面板。
 * 审稿是有先后顺序的：导语不行，后面写得再好也没人看见，所以先审导语再审正文。
 *
 *   一、导语审查（前 300 字，最高优先级）
 *       1A 第一句测试 / 1B 三百字身份报告 / 1C 信息差检查 / 1D 可信感检查 / 1E 导语结尾
 *   二、正文审查
 *       2A 章节功能 / 2B 节奏与水分 / 2C 人物可信度 / 2D 情绪曲线
 *   三、三个硬指标
 *       3A 付费卡点前有没有钩子 / 3B 标题与导语的一致性 / 3C 结尾可讨论度
 *   四、总评
 *       4A 三维评分 / 4B 优先修改清单（只列 3 条，每条给可直接替换的句子）/ 4C 一句话总评
 *
 * 每条判断都要能指回原文的具体字句。统计数据只是辅助，
 * 不能代替「这句话删了会不会更好」这种判断。
 */

const CN = t => (t.match(/[\u4e00-\u9fa5]/g) || []).length;
const POS_G = /[\u4e00-\u9fa5]{1,6}?的/g;

/* 动作 / 心理 / 场景 / 时间 词表 —— 只用来判断「这一段在干嘛」，不参与打分 */
const THINK_RE = /(觉得|以为|想着|心里|明白|意识到|忽然想起|记得|后悔|害怕|希望|知道|发现|感觉|想要)/g;
const VERB_RE = /(走|跑|站|坐|推|拉|抓|握|扔|拿|放|转身|回头|低头|抬头|点头|摇头|伸手|开门|关门|冲|退|扑|撞|踢|踏|靠|躺|蹲|望|盯|看|听|说|问|答|递|接|挂|拨|翻|撕|摔|砸|塞|掏|摸|拍|抱)/g;
const SCENE_RE = /(房间|屋里|窗|门|街|路|楼|车|办公室|厨房|客厅|卧室|电梯|走廊|阳台|医院|学校|银行|法院|物业|雨|雪|风|阳光|灯|夜|墙|桌子|沙发|床)/g;
const TIME_RE = /(第二天|三天后|一周|半个月|一个月|半年|那年|小时候|后来|那天|当晚|半夜|清晨|傍晚|多年|之后|当时|此刻|下午|早上)/g;

/* ---------- 6.0 文本切分 ---------- */
function srSplitSents(text) {
  return text
    .replace(/\n+/g, '¶')
    .split(/(?<=[。！？!?…；;]|¶)/)
    .map(s => s.replace(/¶/g, '').trim())
    .filter(Boolean);
}

function srSplitParas(text) {
  const raw = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  // 用户粘一整块不换行的文本时，逐段分析会退化成 1 个数据点，曲线和色带全空。
  // 超过 300 字就按句号每 ~90 字切一刀。
  if (raw.length === 1 && CN(raw[0]) > 300) {
    const ss = srSplitSents(raw[0]);
    const out = [];
    let buf = [], n = 0;
    for (const s of ss) {
      buf.push(s); n += CN(s);
      if (n >= 90) { out.push(buf.join('')); buf = []; n = 0; }
    }
    if (buf.length) out.push(buf.join(''));
    return out;
  }
  return raw;
}

/* 按「第X节 / 一、 / 1. / 小标题」切章节；切不开按 ~800 字粗分（仅用于定位） */
function srSplitSections(text) {
  const re = /^[\s　]*(第[一二三四五六七八九十百\d]+[节章]|[一二三四五六七八九十]+[、.．]|\d+[、.．]|#{1,3}\s+|【[^】]{2,12}】)/gm;
  const heads = [...text.matchAll(re)];
  if (heads.length >= 2) {
    const out = [];
    for (let i = 0; i < heads.length; i++) {
      const from = heads[i].index;
      const to = i + 1 < heads.length ? heads[i + 1].index : text.length;
      const body = text.slice(from, to).trim();
      if (CN(body) >= 30) out.push({ title: (heads[i][1] || '').replace(/^#+\s*/, '').trim(), body });
    }
    if (out.length >= 2) return { sections: out, headed: true };
  }
  const paras = srSplitParas(text);
  const out = [];
  let buf = [], n = 0, idx = 1;
  for (const p of paras) {
    buf.push(p); n += CN(p);
    if (n >= 800) { out.push({ title: '第 ' + idx + ' 块', body: buf.join('\n') }); buf = []; n = 0; idx++; }
  }
  if (buf.length) out.push({ title: '第 ' + idx + ' 块', body: buf.join('\n') });
  return { sections: out, headed: false };
}

/* ---------- 6.1 词表 ---------- */

/* 1A 六种开场，按抓力排序（skill 原文顺序）
   两个注意点：
   ① test 的顺序即优先级，数字要真的像数字，不能命中「一个」「两个」这种量词，
      否则「那是一个阴天」会被误判成具体数字开场。
   ② 对话开场单列为 5 分，但 skill 写了「除非对话本身反常」——
      所以对话里如果带对抗性/威胁性的词，要抬到和反常动作同级。 */
const OPEN_KINDS = [
  { key: 'result', name: '结果先行', score: 9, desc: '先给结局，把过程藏起来', test: t => /(才知道|后来才|等到|最后|结果|从那天起|那天早上|我死了|我已经|直到)/.test(t) },
  { key: 'abnormal', name: '反常动作', score: 9, desc: '做了一件不合理的事', test: t => /(脱|扔|撕|砸|跪|报警|举报|拉黑|删了|摔|光脚|没回头|反手|掉头|退了)/.test(t) },
  {
    key: 'number', name: '具体数字', score: 8, desc: '有信源感，最像真事', test: t =>
      // 阿拉伯数字，或「三百二十万 / 十七笔 / 三十一岁」这类中文数字 + 真量词（不含「个」）
      /\d/.test(t) || /[一二两三四五六七八九十百千]+\s*(天|年|月|小时|分钟|次|岁|万|千|百|块|元|笔|条|张|页|口人|点)/.test(t)
  },
  { key: 'dialog', name: '对话开场', score: 5, desc: '最容易失效，除非对话本身反常', test: t => /^[“"「]/.test(t) },
  { key: 'question', name: '疑问句开场', score: 4, desc: '容易失效', test: t => /[？?]/.test(t) },
  { key: 'backdrop', name: '背景铺垫', score: 2, desc: '交代时间地点身份，直接判死', test: () => true },
];

/* 判「这句对话本身反不反常」。反常的对话开场是好开场，不是弱的。 */
function srDialogStrong(sent) {
  if (!/^[“"「]/.test(sent)) return false;
  // 对抗、威胁、驱逐、指控类 —— 一开口就在冲突里
  return /(敢|凭什么|滚|不许|闭嘴|离婚|分手|还回来|知道错|跪下|报警|告你|滚出去|别碰|放手|你疯了|谁让你)/.test(sent);
}

/* 1D 小说腔 */
const NOVEL_VOICE = [
  { re: /(不禁|不由得|忍不住|不由自主)/g, name: '副词代替动作', why: '「不禁/忍不住」是把动作替读者总结了一遍，应该直接写做了什么' },
  { re: /(五味杂陈|百感交集|说不出的|无法形容|难以言喻|说不清)/g, name: '抽象情绪直给', why: '直接说出感受等于没写，读者没有可感的画面' },
  { re: /(如同|宛如|仿佛|好似)/g, name: '比喻腔', why: '短篇里比喻多是装饰，除非它本身提供信息，否则是刹车' },
  { re: /(眼眶|鼻子一酸|泪如雨下|泪水|眼泪)/g, name: '套路生理反应', why: '用滥了，读者已经免疫，写了也带不出情绪' },
  { re: /(深深地|狠狠地|紧紧地|轻轻地|默默地|静静地)/g, name: '叠字副词', why: '删掉不影响意思，只让句子变软' },
  { re: /(只见|此时此刻|就在这时|此时此地)/g, name: '说书腔', why: '转折全靠这几个词，说明场景本身没跟上' },
  { re: /(脸色一变|面色|神色|神情)/g, name: '脸色描摹', why: '「脸色一变」不构成信息，读者不知道他看到了什么' },
  { re: /(心口一紧|心脏|心里一沉|一种.{2,6}的感觉)/g, name: '心理形容词堆叠', why: '把身体反应当情绪用，一次可以，三次就假' },
];

/* 1D 真事感 */
const REAL_SIGNALS = [
  { re: /(\d+\s*(元|块|万|千)|三块五|五毛)/g, name: '具体金额' },
  { re: /(微信|支付宝|钉钉|美团|淘宝|拼多多|高德|大众点评|抖音)/g, name: '具体 App' },
  { re: /([一二三四五六七八九十百]{1,3}(区|路|街|巷|弄|号|楼|室|层)|[A-Z]\s*座)/g, name: '地址碎片' },
  { re: /(护士|医生|保安|前台|客服|人事|财务|中介|快递|外卖|片警|物业)/g, name: '职业动作' },
  { re: /(周[一二三四五六日天]|早上|下午|晚上|凌晨|点半|\d+\s*分钟)/g, name: '具体时间点' },
  { re: /(合同|发票|流水|诊断书|短信|录音|截图|判决书|转账|余额|工牌)/g, name: '可触摸的物件' },
];

/* 1B 三要素探测 */
const ID_PAT = /(我(今年|是|叫|在|刚|已经|这个)|我这个|作为|当妈的|当爹的|做媳妇|当过|干(了|过).{0,4}年|毕业|读大[一二三四]|在公司|在单位|在银行|在医院|开店|打工|带娃|离婚|结婚|彩礼|月薪|工资)/;
const PRESSURE_PAT = /(逼|骂|吵|摔|砸|抢|撕|骗|瞒|拦|堵|赶|撵|催|欠|赔|退|告|报警|威胁|不许|凭什么|你敢|最后一次|滚出去|离婚|分手|开除|辞退|不给我|压着|盯着)/;
const GOAL_PAT = /(我要|我必须|我决定|我不能|我得|非.{0,6}不可|一定要|明天|今天|今晚|月底|下周|截止|之前|马上|三个小时|来不及)/;

/* 2A 章节功能 —— 不硬套动作名，只看这一节主要在干嘛 */
function srSecMain(body) {
  const n = CN(body) || 1;
  const dlg = (body.match(/[“「"][^”」"]{2,}[”」"]/g) || []).length;
  const dlgChars = CN((body.match(/[“「"][^”」"]{2,}[”」"]/g) || []).join(''));
  const acts = (body.match(VERB_RE) || []).length;
  const thinks = (body.match(THINK_RE) || []).length;
  const emo = (body.match(/(哭|吼|骂|摔|砸|撕|扇|打|血|死|崩|疯|恨|痛|疼|尖叫|发抖|窒息|绝望|崩溃)/g) || []).length;
  const sig = {
    对话: dlgChars / n * 100 * 1.6,
    动作: acts / n * 100 * 2.4,
    心理: thinks / n * 100 * 4.2,
    冲突: emo / n * 100 * 5,
  };
  const arr = Object.entries(sig).sort((a, b) => b[1] - a[1]);
  const total = arr.reduce((a, x) => a + x[1], 0) || 1;
  const focus = Math.round(arr[0][1] / total * 100);
  // 主导度不到 45% 就是杂糅，说明这一节没想清楚要干嘛
  return { main: focus >= 45 ? arr[0][0] : '杂糅', focus, sig };
}

/* ---------- 6.2 主分析 ---------- */

function analyzeText(text) {
  const chars = CN(text);
  const paras = srSplitParas(text);
  const sents = srSplitSents(text);
  const { sections, headed } = srSplitSections(text);

  /* ── 导语 = 前 300 字 ── */
  const leadChars = Math.min(300, chars);
  let leadEnd = text.length, acc = 0;
  for (let i = 0; i < text.length; i++) {
    if (i % 3 === 0) { acc = CN(text.slice(0, i)); }
    if (i === text.length - 1) acc = chars;
    if (CN(text.slice(0, i)) >= leadChars) { leadEnd = i; break; }
  }
  const lead = text.slice(0, leadEnd).trim();
  const leadParas = srSplitParas(lead);
  const isLeadOnly = chars < 800;
  // 导语的「最后一句」如果被 300 字硬切开，引原文会很别扭（「群里安静了十」）。
  // 这种情况往下借到最近的句号为止，只用于引用展示，不影响其他指标。
  const leadFull = (() => {
    if (leadEnd >= text.length) return lead;
    const rest = text.slice(leadEnd);
    const m = rest.match(/^[^。！？!?…]{0,30}[。！？!?…]/);
    return m ? (lead + m[0]).trim() : lead;
  })();

  /* ── 1A 第一句 ── */
  const firstSent = (sents[0] || '').trim();
  const firstKind = OPEN_KINDS.find(k => k.test(firstSent)) || OPEN_KINDS[5];
  // 对话开场 / 疑问句开场要单独判「本身反不反常」，反常就不该按 5 分、4 分算
  const dlgStrong = srDialogStrong(firstSent);
  let stop = dlgStrong ? 8 : firstKind.score;
  if (CN(firstSent) <= 20) stop += 0.5;
  if (/\d/.test(firstSent)) stop += 0.5;
  if (/我/.test(firstSent)) stop += 0.5;
  stop = Math.max(1, Math.min(10, Math.round(stop)));

  // 第二句自己能不能立成钩子 —— 如果能，第一句就是可以删的
  const secondSent = (sents[1] || '').trim();
  const secondStrong = secondSent.length > 0 && (
    OPEN_KINDS.slice(0, 3).some(k => k.test(secondSent)) || PRESSURE_PAT.test(secondSent)
  );

  /* ── 1B 三百字身份报告 ── */
  const posOf = re => {
    const m = lead.match(re);
    if (!m || m.index == null) return -1;
    return CN(lead.slice(0, m.index));
  };
  const idAt = posOf(ID_PAT), presAt = posOf(PRESSURE_PAT), goalAt = posOf(GOAL_PAT);
  const threeEl = [
    { key: 'id', name: '我是谁', hint: '身份 / 处境，具体到能被看见', at: idAt, ok: idAt >= 0 },
    { key: 'pres', name: '我在被什么压着', hint: '冲突最好是正在发生的，不是回忆', at: presAt, ok: presAt >= 0 },
    { key: 'goal', name: '我必须做什么', hint: '有目标，带截止时间更好', at: goalAt, ok: goalAt >= 0 },
  ];
  const threeScore = threeEl.filter(e => e.ok).length;

  /* ── 1C 信息差 ── */
  const known = [];
  for (const p of leadParas) {
    if (CN(p) < 8) continue;
    if (PRESSURE_PAT.test(p) || /\d/.test(p) || /[“「"]/.test(p)) {
      known.push(p.replace(/\s+/g, '').slice(0, 40));
      if (known.length >= 3) break;
    }
  }
  const unknown = [];
  const pushU = s => { s = s.trim().replace(/\s+/g, '').slice(0, 40); if (CN(s) >= 6 && !unknown.includes(s)) unknown.push(s); };
  (lead.match(/[^。！？\n]{6,36}[？?]/g) || []).forEach(pushU);
  for (const m of lead.matchAll(/[^。！？\n]{2,28}?(?:为什么|怎么会|到底|竟然|原来|直到|可是|没想到|谁知道)[^。！？\n]{0,22}/g)) pushU(m[0]);
  for (const m of lead.matchAll(/[^。！？\n]{0,14}(?:那个人|那件事|那次|那个男人|那个女人|这一切|他是谁)[^。！？\n]{0,14}/g)) pushU(m[0]);
  const mustKnow = unknown.length > 0;
  // 信息差方向：导语给了新信息却没悬置 = 只报到不勾人
  const infoGap = known.length > 0 && unknown.length === 0 ? 'report'
    : known.length === 0 && unknown.length > 0 ? 'vague'
      : known.length === 0 && unknown.length === 0 ? 'none' : 'good';

  /* ── 1D 可信感 ── */
  // 注意：这里每个正则都带 g，直接复用会带上一次 matchAll 的 lastIndex，
  // 造成同一条特征被重复收录，所以统一用 new RegExp(source) 无 g 版本。
  const noG = re => new RegExp(re.source);
  const novelHits = [];
  NOVEL_VOICE.forEach(v => {
    const ms = [...lead.matchAll(new RegExp(v.re.source, 'g'))];
    if (ms.length) novelHits.push({ name: v.name, why: v.why, n: ms.length, sample: ms[0][0] });
  });
  const realHits = [];
  REAL_SIGNALS.forEach(v => {
    const ms = [...lead.matchAll(new RegExp(v.re.source, 'g'))];
    if (ms.length) realHits.push({ name: v.name, n: ms.length, sample: ms[0][0] });
  });
  const novelDensity = leadChars ? novelHits.reduce((a, x) => a + x.n, 0) / leadChars * 300 : 0;

  /* ── 1E 导语结尾 ── */
  const leadSents = srSplitSents(leadFull);
  const leadLast = (leadSents[leadSents.length - 1] || '').trim();
  let leadEndT = 0; // 0 平 1 悬置 2 回收
  if (/[？?]/.test(leadLast)) leadEndT = 1;
  if (/(可是|但是|然而|直到|才发现|没想到|原来|谁知道)/.test(leadLast)) leadEndT = 1;
  if (/(就这样|再也没有|再也没|后来他|后来我)/.test(leadLast)) leadEndT = 2;
  if (CN(leadLast) > 55) leadEndT = Math.max(0, leadEndT - 1);
  const leadEndScore = Math.max(1, Math.min(10, 4 + (leadEndT === 1 ? 4 : leadEndT === 2 ? 2 : 0) + (CN(leadLast) <= 18 ? 2 : 0)));

  /* ── 2A 章节功能 ── */
  const secInfo = sections.map((s, i) => {
    const n = CN(s.body);
    const { main, focus, sig } = srSecMain(s.body);
    return { title: s.title, body: s.body, i, n, main, focus, sig };
  });
  const dupSec = [];
  for (let i = 1; i < secInfo.length; i++) {
    const a = secInfo[i - 1], b = secInfo[i];
    if (b.main !== '杂糅' && b.main === a.main && b.n > 100) {
      dupSec.push({ a: a.title, b: b.title, kind: b.main });
    }
  }

  /* ── 2B 水分 ── */
  const paraInfo = paras.map((p, i) => {
    const n = CN(p);
    const dlgN = CN((p.match(/[“「"][^”」"]{2,}[”」"]/g) || []).join(''));
    const dlgRatio = n ? dlgN / n : 0;
    const verbs = (p.match(VERB_RE) || []).length;
    const think = (p.match(THINK_RE) || []).length;
    const scene = (p.match(SCENE_RE) || []).length;
    const time = (p.match(TIME_RE) || []).length;
    const emo = (p.match(/(哭|吼|骂|摔|砸|撕|扇|打|血|死|崩|疯|恨|痛|疼|尖叫|发抖|窒息|绝望|崩溃)/g) || []).length;
    const info = verbs + think * 2 + scene * .5 + emo * 2 + (dlgRatio > .3 ? 3 : 0);
    // 空转：没动作、没新信息、没情绪，全在绕
    const empty = info < 3 && n > 45 && think === 0 && emo === 0;
    // 累积：有东西在往上走
    const accumulate = emo > 0 || verbs >= 3 || think >= 1;
    return { i, p, n, dlgRatio, verbs, think, scene, time, emo, info, empty, accumulate };
  });
  const waterParas = paraInfo.filter(x => x.empty);
  const waterChars = waterParas.reduce((a, x) => a + x.n, 0);
  const effectiveChars = Math.max(0, chars - waterChars);

  /* ── 2D 情绪曲线 ── */
  const intensity = paraInfo.map(x => {
    const s = x.emo * 3 + x.think * 1.2 + (x.dlgRatio > .4 ? 2 : 0)
      + (/[！!]/.test(x.p) ? 1.5 : 0) + (/[？?]/.test(x.p) ? 1 : 0);
    return s / Math.max(1, x.n / 60);
  });
  const mx = Math.max(...intensity, 1);
  const curve = intensity.map(v => Math.round(Math.min(1, v / mx) * 100));
  const headEnd = Math.max(1, Math.floor(curve.length * 0.3));
  const headPeaks = curve.slice(0, headEnd).filter(v => v >= 88).length;
  const tailMax = curve.length > headEnd ? Math.max(...curve.slice(headEnd)) : 0;
  const overdraft = headPeaks >= 2 && tailMax < 88;
  const holes = [];
  for (let i = 0; i < curve.length; i++) {
    if (curve[i] < 35) {
      let j = i;
      while (j < curve.length && curve[j] < 35) j++;
      if (j - i >= 3) holes.push({ from: i + 1, to: j, wc: paraInfo.slice(i, j).reduce((a, x) => a + x.n, 0) });
      i = j;
    }
  }

  /* ── 2C 人物可信度 ── */
  const people = srFindPeople(text);

  /* ── 3A 付费卡点 ── */
  const cutIdx = headed ? Math.min(secInfo.length - 1, 3) : Math.max(1, Math.floor(paras.length * 0.3));
  const beforeCut = headed
    ? secInfo.slice(0, cutIdx + 1).map(s => s.body).join('\n')
    : paras.slice(0, cutIdx).join('\n');
  const cutHook = [...beforeCut.matchAll(/[^。！？\n]{2,34}?(?:为什么|怎么会|到底|竟然|原来|直到|可是|没想到|不知道|谁)[^。！？\n]{0,24}/g)]
    .map(m => m[0].trim().replace(/\s+/g, '').slice(0, 46))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);
  const cutHasHook = cutHook.length > 0;

  /* ── 3B 题材兑现 ── */
  // 承诺词在导语里出现只代表「提了一嘴」，要看它在正文里有没有真的发生。
  // 找首次出现位置；如果只在导语出现、后面再不出现，那就是「说完就不管了」。
  const PROMISE = /(离婚|出轨|小三|婆婆|彩礼|复仇|报复|身世|遗产|豪门|重生|穿越|杀|失踪|报警|打脸|反转|背叛|私生|认亲|葬礼|婚礼|遗书)/g;
  const promised = [...new Set(lead.match(PROMISE) || [])];
  const payoffs = promised.map(w => {
    // 全文里所有出现位置，排除落在导语内的（导语里提到不算兑现）
    const hits = [];
    let idx = -1;
    while ((idx = text.indexOf(w, idx + 1)) >= 0) hits.push(idx);
    const bodyHits = hits.filter(i => i >= leadEnd);
    const first = bodyHits.length ? bodyHits[0] : -1;
    const paraIdx = first < 0 ? -1 : paraInfo.findIndex(x => x.p.includes(w));
    // 只在导语出现 → 承诺了没兑现
    const onlyLead = hits.length > 0 && bodyHits.length === 0;
    return { w, at: first, paraIdx, onlyLead, total: hits.length, early: paraIdx >= 0 && paraIdx < Math.max(3, paras.length * 0.25) };
  });
  const delayed = payoffs.filter(p => p.paraIdx < 0 || !p.early);

  /* ── 3C 结尾 ── */
  const lastParas = paras.slice(-2).join('');
  const lastSent = (srSplitSents(lastParas).pop() || '').trim();
  let endScore = 4;
  if (/[？?]/.test(lastSent)) endScore += 2;
  if (CN(lastSent) <= 18) endScore += 2;
  if (/(没有回头|没有再说|不知道|后来|再也|再没|终于|就这样|才明白|原来)/.test(lastSent)) endScore += 3;
  if (CN(lastSent) > 50) endScore -= 2;
  endScore = Math.max(1, Math.min(10, endScore));

  /* ── 4A 三维评分 ── */
  const clamp10 = v => Math.max(1, Math.min(10, Math.round(v)));
  const leadScore = clamp10(stop * .34 + (threeScore / 3 * 10) * .26
    + (infoGap === 'good' ? 10 : infoGap === 'report' ? 5 : infoGap === 'vague' ? 4 : 2) * .18
    + (novelDensity <= 1 ? 9 : novelDensity <= 3 ? 6 : novelDensity <= 6 ? 3 : 1) * .12
    + leadEndScore * .10);
  const readScore = clamp10(
    Math.max(0, 10 - waterParas.length * 1.1) * .40
    + (holes.length === 0 ? 10 : Math.max(2, 10 - holes.length * 2.4)) * .28
    + Math.max(0, 10 - dupSec.length * 2.4) * .16
    + (headed ? 8.5 : 5.5) * .16);
  const payScore = clamp10(
    (cutHasHook ? 8.5 : 3) * .38
    + Math.max(0, 10 - delayed.length * 2.6) * .33
    + endScore * .29);

  return {
    raw: text, chars, nParas: paraInfo.length, nSents: sents.length,
    isLeadOnly, lead, leadChars,
    sections: secInfo, headed,
    first: { text: firstSent, kind: firstKind, stop, secondSent, secondStrong, dlgStrong },
    threeEl, threeScore,
    known, unknown, mustKnow, infoGap,
    novelHits, realHits, novelDensity,
    leadLast, leadEndT, leadEndScore,
    dupSec,
    paraInfo, waterParas, waterChars, effectiveChars,
    curve, holes, overdraft, headPeaks, tailMax,
    people,
    cutIdx, cutHook, cutHasHook,
    promised, payoffs, delayed,
    lastSent, endScore,
    score: { lead: leadScore, read: readScore, pay: payScore },
  };
}

/* ---------- 6.3 人物识别（三级证据） ---------- */
function srFindPeople(text) {
  const found = new Map(); // name -> {n, firstAt, titles:Set}
  const bump = (name, at, title) => {
    if (!name || CN(name) < 2) return;
    const cur = found.get(name) || { n: 0, firstAt: at, titles: new Set() };
    cur.n++; if (title) cur.titles.add(title);
    found.set(name, cur);
  };

  const TITLES = ['妈', '妈', '爸', '爸', '婆婆', '公公', '老公', '老婆', '未婚夫', '男朋友', '女朋友',
    '姐姐', '妹妹', '哥哥', '弟弟', '小姑子', '小叔子', '大姑姐', '姨妈', '姑姑', '舅舅',
    '领导', '老板', '经理', '主管', '同事', '闺蜜', '房东', '中介', '医生', '护士', '老师', '班长'];
  // 第一级：称谓白名单
  TITLES.forEach(t => {
    const re = new RegExp(t, 'g');
    let m, c = 0;
    while ((m = re.exec(text)) && c < 60) { bump(t, m.index, t); c++; }
  });

  // 第二级：「叫 / 名叫 / 名字是」后面的名字
  for (const m of text.matchAll(/(?:叫|名叫|名字是|名字叫|叫作|自称)[「“"]?([\u4e00-\u9fa5]{2,3})/g)) {
    const nm = m[1];
    const stop = ['了一', '了声', '我', '你', '他', '她', '什么', '这个', '那个', '一声', '起来'];
    if (stop.some(s => nm.startsWith(s))) continue;
    bump(nm, m.index, '');
  }

  // 第三级：叙述动词前 2 字（「陈默说」），要求像姓氏开头
  const SURNAME = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章苏潘葛范彭鲁韦马苗方俞任袁柳唐罗薛雷贺倪汤殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉钮龚程嵇邵邢裴陆荣翁荀羊甄曲封芮储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公';
  for (const m of text.matchAll(/([\u4e00-\u9fa5]{2,3})(?=(?:说|问|答|笑|看|走|站|推|拉|抬手|回头|低头|点头|摇头|叹气|沉默|伸手|接|拿|转过身|皱眉|抬头))/g)) {
    const nm = m[1];
    if (!SURNAME.includes(nm[0])) continue;
    if (nm.length === 2 && !SURNAME.includes(nm[1]) && !/[\u4e00-\u9fa5]/.test(nm[1])) continue;
    bump(nm, m.index, '');
  }

  const out = [...found.entries()]
    .map(([name, v]) => ({ name, n: v.n, firstAt: v.firstAt, title: [...v.titles][0] || '' }))
    .filter(x => x.n >= 2 || x.title)
    .sort((a, b) => b.n - a.n);

  // 主线人物 = 最早出现 + 出现较多；配角是只出现 2 次的
  const lead = out.filter(x => x.n >= 3).slice(0, 4);
  const minor = out.filter(x => x.n === 2).slice(0, 6);
  // 只有称谓没名字 —— 人物是「功能位」不是人
  const onlyTitle = out.filter(x => !x.title && x.n >= 3).length;
  return { all: out.slice(0, 8), lead, minor, onlyTitle };
}

/* ---------- 6.4 渲染工具 ---------- */
function srCurvePath(curve, w, h) {
  if (!curve.length) return '';
  if (curve.length === 1) {
    const y = h - (curve[0] / 100) * h;
    return `M0,${y.toFixed(1)} L${w},${y.toFixed(1)}`;
  }
  const step = w / (curve.length - 1);
  const pts = curve.map((v, i) => [i * step, h - (v / 100) * h]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

const srLv = s => (s >= 8 ? 'good' : s >= 6 ? 'mid' : s >= 4 ? 'warn' : 'bad');
const srLvName = s => (s >= 8 ? '过关' : s >= 6 ? '及格' : s >= 4 ? '需改' : '不过关');

/* ---------- 6.5 四步报告渲染 ---------- */

/* 通用小零件 */
const srQ = s => `<span class="sr-q">“${esc(s)}”</span>`;
const srAt = n => (n == null || n < 0 ? '—' : `第 ${n} 字`);

function srItem(step, code, title, lv, body) {
  return `<div class="sr-item lv-${lv}">
    <div class="sr-item-h"><span class="sr-code">${code}</span><span>${title}</span></div>
    <div class="sr-item-b">${body}</div>
  </div>`;
}

function srLeadCheck(r) {
  const o = [];
  const f = r.first;

  /* ── 1-A ── */
  let a;
  if (f.dlgStrong) {
    // 对话开场本来是弱类型，但这一句一开口就在冲突里，属于 skill 说的「除非对话本身反常」
    a = `<p>第一句是<b>对话开场</b>。这类开场最容易失效，但这一句是例外 —— <b>它一开口就在冲突里</b>，不是问候也不是寒暄，而是指控。停手指 ${f.stop}/10。</p>`;
  } else if (f.stop >= 8) {
    a = `<p>第一句是<b>${f.kind.name}</b>，${f.kind.desc}。停手指 ${f.stop}/10，抓得住。</p>`;
  } else if (f.stop >= 5) {
    a = `<p>第一句是<b>${f.kind.name}</b>，${f.kind.desc}。停手指 ${f.stop}/10 —— 不算差，但它<b>不制造问题</b>。读者读完不会想知道后面，只会想「哦」。</p>`;
  } else {
    a = `<p>第一句是<b>${f.kind.name}</b>，${f.kind.desc}。<b>停手指 ${f.stop}/10，这就是判死的类型。</b>读者在知乎刷到这一段，手指已经在往上滑了。</p>`;
  }
  a += `<p class="sr-snip">${srQ(f.text)}</p>`;
  if (f.secondStrong) {
    a += `<p class="sr-red">第二句<u>自己就能立成钩子</u>（${srQ(f.secondSent.slice(0, 40))}）。也就是说，第一句是<b>可以删的</b>——删了从第二句起，反而更快。</p>`;
  } else if (f.dlgStrong) {
    a += `<p class="sr-dim">第二句接的是<b>动作反应</b>（砸东西、摔门、还手），这是对的 —— 一句狠话配一个具体动作，比再补一句对白有力。别在这两句之间插解释。</p>`;
  } else {
    a += `<p class="sr-dim">第二句接的是补充说明，不是新钩子。现在这版是「一句话开场 + 解释」，节奏是对的，问题只在第一句本身不够反常。</p>`;
  }
  o.push(srItem(1, '1-A', '第一句测试', srLv(f.stop), a));

  /* ── 1-B ── */
  const hit = r.threeScore;
  let b = `<p>前 ${r.leadChars} 字里，三件事各占多少：</p><div class="sr-3el">`;
  r.threeEl.forEach(e => {
    b += `<div class="sr-3row ${e.ok ? 'on' : 'off'}">
      <i>${e.ok ? '✓' : '✕'}</i>
      <div><b>${e.name}</b><span>${e.hint}</span></div>
      <em>${e.ok ? srAt(e.at) : '没出现'}</em>
    </div>`;
  });
  b += `</div>`;
  if (hit === 3) b += `<p class="sr-green">三样齐了。这是能过审的导语骨架。</p>`;
  else if (hit === 2) {
    const miss = r.threeEl.find(e => !e.ok);
    b += `<p class="sr-red">缺「<b>${miss.name}</b>」—— ${miss.hint}。三百字里读者还没搞清楚这件事，他不会往下翻。</p>`;
  } else if (hit === 1) {
    const miss = r.threeEl.filter(e => !e.ok).map(e => e.name);
    b += `<p class="sr-red">只中一样。缺 ${miss.join('、')}。现在这三百字更像一段<b>气氛描写</b>，不是一个「有人在扛某事」的开头。</p>`;
  } else {
    b += `<p class="sr-red"><b>三样全缺。</b>这不是导语，这是垫场。三百字读完，读者说不出主角是谁、被什么压着、要干什么。</p>`;
  }
  o.push(srItem(1, '1-B', '三百字身份报告', hit === 3 ? 'good' : hit === 2 ? 'mid' : hit <= 1 ? 'bad' : 'warn', b));

  /* ── 1-C ── */
  let c = `<div class="sr-gap">`;
  c += `<div class="sr-gap-col"><div class="sr-gap-h up">读者已经知道</div>${
    r.known.length ? r.known.map(x => `<div class="sr-gap-l">${esc(x)}</div>`).join('') : '<div class="sr-gap-l dim">（没有给到任何可确认的事实）</div>'
  }</div>`;
  c += `<div class="sr-gap-col"><div class="sr-gap-h down">读者还不知道</div>${
    r.unknown.length ? r.unknown.map(x => `<div class="sr-gap-l">${esc(x)}</div>`).join('') : '<div class="sr-gap-l dim">（没有悬置任何问题）</div>'
  }</div>`;
  c += `</div>`;
  if (r.infoGap === 'good') c += `<p class="sr-green">两边都有。这就是信息差：<b>已经发生的坏事是确定的，为什么发生是不确定的。</b>读者为了补上右边那栏，会往下读。</p>`;
  else if (r.infoGap === 'report') c += `<p class="sr-red">左边满、右边空 —— <b>只报到，不勾人。</b>把事说完了，但没留任何「我得知道」的口子。加一句悬置（反问一句就够了）比再写五十字细节管用。</p>`;
  else if (r.infoGap === 'vague') c += `<p class="sr-red">右边有悬念，左边几乎没事实。<b>读者不知道在悬什么。</b>悬念必须挂在一件具体的事上，否则就是空转。</p>`;
  else c += `<p class="sr-red"><b>两边都是空的。</b>这三百字既没交代事实，也没埋问题 —— 读者读完什么都没得到。</p>`;
  o.push(srItem(1, '1-C', '信息差检查', r.infoGap === 'good' ? 'good' : r.infoGap === 'none' ? 'bad' : 'warn', c));

  /* ── 1-D ── */
  const nDense = r.novelDensity;
  let d = `<div class="sr-two">`;
  d += `<div class="sr-two-col"><div class="sr-gap-h down">小说腔 ${r.novelHits.length ? r.novelHits.reduce((a, x) => a + x.n, 0) : 0} 处</div>${
    r.novelHits.length
      ? r.novelHits.map(x => `<div class="sr-tag-row"><span class="sr-tag bad">${esc(x.sample)}</span><span>${esc(x.name)}</span></div>`).join('')
      : '<div class="sr-gap-l dim">没有明显的小说腔，很好</div>'
  }</div>`;
  d += `<div class="sr-two-col"><div class="sr-gap-h up">真事感 ${r.realHits.reduce((a, x) => a + x.n, 0)} 处</div>${
    r.realHits.length
      ? r.realHits.map(x => `<div class="sr-tag-row"><span class="sr-tag good">${esc(x.sample)}</span><span>${esc(x.name)}</span></div>`).join('')
      : '<div class="sr-gap-l dim">没有任何具体的东西 —— 没有金额、没有 App、没有职业、没有时间点</div>'
  }</div>`;
  d += `</div>`;
  if (r.novelHits.length) {
    const top = r.novelHits[0];
    d += `<p class="sr-red">最高频的是「${esc(top.name)}」：${esc(top.why)}。</p>`;
  }
  if (nDense <= 1 && r.realHits.length >= 2) d += `<p class="sr-green">密度合格。导语里有能摸到的东西，读者会信。</p>`;
  else if (nDense <= 1) d += `<p class="sr-dim">小说腔不多，但<b>真事感也薄</b>。建议加两个具体物：一个金额、一个时间点、一个能看到的物件，任选。</p>`;
  else d += `<p class="sr-red">每 300 字有 ${nDense.toFixed(1)} 处小说腔。这个密度下，读者读到第三句就开始「这是编的」了 —— 知乎最怕的就是这个。</p>`;
  o.push(srItem(1, '1-D', '可信感检查', nDense <= 1 && r.realHits.length >= 2 ? 'good' : nDense > 3 || !r.realHits.length ? 'bad' : 'warn', d));

  /* ── 1-E ── */
  let e = `<p>导语最后一句：</p><p class="sr-snip">${srQ(r.leadLast)}</p>`;
  if (r.leadEndT === 1) e += `<p class="sr-green"><b>是悬置式收尾。</b>停在这里读者会想「然后呢」，这是对的写法 —— 别往后补解释了。</p>`;
  else if (r.leadEndT === 2) e += `<p class="sr-dim">是回收式收尾，句子收得住，但它<b>把话说完了</b>。回收式适合放在小节末尾，不适合放在导语末尾。</p>`;
  else e += `<p class="sr-red"><b>平收。</b>最后一句只是把前面的话说完，没有往上抬。改法：删掉这一句，或者换成一句反问。</p>`;
  o.push(srItem(1, '1-E', '导语结尾', r.leadEndScore >= 8 ? 'good' : r.leadEndScore >= 6 ? 'mid' : 'warn', e));

  return o.join('');
}

function srBodyCheck(r) {
  const o = [];

  /* ── 2-A ── */
  let a = `<p>全文按 ${r.sections.length} ${r.headed ? '节' : '块'} 切，每节主导功能：</p><div class="sr-secs">`;
  r.sections.forEach((s, i) => {
    a += `<div class="sr-sec-row"><span class="sr-sec-n">${i + 1}</span>
      <div class="sr-sec-b"><b>${esc(s.title || '（无标题）')}</b><span>${s.n} 字</span></div>
      <span class="sr-sec-f f-${s.main === '杂糅' ? 'mix' : s.main}">${s.main}</span>
      <em>${s.focus}%</em></div>`;
  });
  a += `</div>`;
  if (r.dupSec.length) {
    a += `<p class="sr-red">连续两节功能相同：${r.dupSec.map(x => `「${esc(x.a)}」→「${esc(x.b)}」都是${x.kind}`).join('；')}。<b>读者会觉得在原地打转</b> —— 一节只该干一件事，连着两节干同一件事就等于一节。</p>`;
  } else if (!r.headed) {
    a += `<p class="sr-dim">原文没有小标题，是按字数粗切的，功能判断只能看走向。<b>建议加小节标题</b>：盐选的分节本身就是节奏器，读者靠它决定要不要继续。</p>`;
  } else {
    a += `<p class="sr-green">没有连续两节功能撞车，节拍在推进。</p>`;
  }
  o.push(srItem(2, '2-A', '章节功能检查', r.dupSec.length ? 'bad' : r.headed ? 'good' : 'mid', a));

  /* ── 2-B ── */
  let b = `<p>全文 ${r.chars.toLocaleString()} 字，<b>有效字数 ${r.effectiveChars.toLocaleString()} 字</b>（含水 ${r.waterChars} 字，占 ${r.chars ? Math.round(r.waterChars / r.chars * 100) : 0}%）。</p>`;
  if (r.waterParas.length) {
    b += `<div class="sr-water">${r.waterParas.slice(0, 5).map(x => `
      <div class="sr-water-row"><span class="sr-water-n">第 ${x.i + 1} 段</span>
        <span class="sr-water-t">${esc(x.p.slice(0, 48))}…</span>
        <em>${x.n} 字</em></div>`).join('')}</div>`;
    b += `<p class="sr-red">这几段<b>没有动作、没有新信息、没有情绪</b>，只是把前面说过的话换个说法。知乎允许慢，但<b>不允许空</b>。慢是有东西在累积，空是「一句话说完还在说」。直接删，或者往里面塞一个具体动作。</p>`;
  } else {
    b += `<p class="sr-green">没找到明显空转的段落 —— 每一段都在给新东西。</p>`;
  }
  if (r.chars < 800) b += `<p class="sr-dim">全文不足 800 字，2-A / 2-B 的结论参考价值有限，重心应该全放在导语上。</p>`;
  o.push(srItem(2, '2-B', '节奏与水分', r.waterParas.length >= 3 ? 'bad' : r.waterParas.length ? 'warn' : 'good', b));

  /* ── 2-C ── */
  const p = r.people;
  let c = '';
  if (!p.all.length) {
    c = `<p class="sr-red">没识别出反复出现的人物。如果不是通篇只写「我」，那说明<b>对面那个人是虚的</b> —— 读者恨不起来，也记不住。</p>`;
  } else {
    c = `<div class="sr-people">${p.all.map((x, i) => `<span class="sr-person${i < 4 ? ' lead' : ''}">${esc(x.name)}<i>${x.n}</i></span>`).join('')}</div>`;
    if (p.lead.length) {
      c += `<p>主线人物 ${p.lead.length} 个：${p.lead.map(x => `<b>${esc(x.name)}</b>`).join('、')}。</p>`;
    }
    if (p.lead.length > 4) c += `<p class="sr-red">主线人物超过 4 个。短篇里读者能记住的名字上限差不多就是 3–4 个，<b>多出来的要么合并要么降级成称谓</b>（「那个中介」「前台姑娘」），别给名字。</p>`;
    else if (p.lead.length <= 2 && r.chars > 3000) c += `<p class="sr-dim">主线人物只有 ${p.lead.length} 个，对 ${r.chars} 字来说偏少。如果不是故意的独角戏，加一个「制造阻力的人」会让冲突有出口。</p>`;
    else c += `<p class="sr-green">人物数量合适，主次分得开。</p>`;
    if (p.onlyTitle >= 3) c += `<p class="sr-dim">配角基本靠称谓出现（婆婆 / 领导 / 中介），这是对的 —— <b>配角不需要名字，只需要一个能让人恨或怕的动作</b>。</p>`;
  }
  o.push(srItem(2, '2-C', '人物可信度', !p.all.length ? 'bad' : p.lead.length > 4 ? 'warn' : 'good', c));

  /* ── 2-D ── */
  const CW = 100, CH = 40;
  const d = srCurvePath(r.curve, CW, CH);
  const area = d ? `${d} L${CW},${CH} L0,${CH} Z` : '';
  const holeBands = r.holes.map(h => {
    const x1 = (h.from - 1) / Math.max(1, r.curve.length - 1) * CW;
    const x2 = (h.to - 1) / Math.max(1, r.curve.length - 1) * CW;
    return `<rect x="${x1.toFixed(1)}" y="0" width="${Math.max(2, x2 - x1).toFixed(1)}" height="${CH}" fill="var(--sys-orange)" opacity=".16"/>`;
  }).join('');
  let dd = `<div class="sr-curve"><svg viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none">
      ${holeBands}
      <path d="${d}" fill="none" stroke="var(--sys-pink)" stroke-width="1.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      ${area ? `<path d="${area}" fill="var(--sys-pink)" opacity=".08"/>` : ''}
    </svg><div class="sr-curve-x"><span>开头</span><span>付费卡点</span><span>结尾</span></div></div>`;
  if (r.overdraft) {
    dd += `<p class="sr-red"><b>早期情绪透支：</b>前 30% 就出现 ${r.headPeaks} 个峰值，后面最高只到 ${r.tailMax}。<br>开头把情绪写满，后面<b>没法升级了</b> —— 读者会觉得「后面没前面好看」，然后走。改法：把开头的第二个高潮往后挪，中段留一个相对平的段落做铺垫。</p>`;
  } else if (r.holes.length) {
    dd += `<p class="sr-red">${r.holes.length} 处连续低强度区（橙带），共 ${r.holes.reduce((a, h) => a + h.wc, 0)} 字：${r.holes.map(h => `第 ${h.from}–${h.to} 段`).join('，')}。<br>这些地方最容易掉读者。不需要加高潮，<b>哪怕塞一句对话就能把线抬起来</b>。</p>`;
  } else {
    dd += `<p class="sr-green">情绪曲线没有大塌陷，也没有提前透支。线是往上走的。</p>`;
  }
  if (r.curve.length < 4) dd += `<p class="sr-dim">段落太少（${r.curve.length} 段），曲线的判断力有限。</p>`;
  o.push(srItem(2, '2-D', '情绪曲线', r.overdraft || r.holes.length >= 2 ? 'bad' : r.holes.length ? 'warn' : 'good', dd));

  return o.join('');
}

function srHardCheck(r) {
  const o = [];

  /* ── 3-A ── */
  let a = `<p>按${r.headed ? `第 ${r.cutIdx + 1} 节末` : `全文 30% 处（第 ${r.cutIdx} 段）`}估算付费卡点，卡点之前的悬置句：</p>`;
  if (r.cutHasHook) {
    a += `<div class="sr-hooks">${r.cutHook.map(x => `<div class="sr-hook">${esc(x)}</div>`).join('')}</div>`;
    a += `<p class="sr-green">有钩子。<b>但要看钩子的位置</b> —— 如果它出现在卡点前最后 200 字，那是好位置；如果出现在第一节，到卡点早凉了。</p>`;
  } else {
    a += `<p class="sr-red"><b>卡点前没有钩子。</b>读者读到这里，没有任何「我必须知道答案」的理由 —— 他会直接退出，而不是付费。<br>这是付费转化最贵的一处漏洞，比导语写不好还亏，因为前面的字已经花掉了。</p>`;
  }
  o.push(srItem(3, '3-A', '付费卡点前有没有钩子', r.cutHasHook ? 'good' : 'bad', a));

  /* ── 3-B ── */
  let b = '';
  if (!r.promised.length) {
    b = `<p class="sr-dim">导语里没有出现明确的题材承诺词（离婚 / 出轨 / 复仇 / 身世…）。这既不是坏事也不是好事 —— 说明你这篇靠的是<b>处境</b>而不是<b>标签</b>，那导语就必须自己把调子给准。</p>`;
    b += `<p>现在导语给的调子：${srQ(r.lead.slice(0, 40))}…</p>`;
  } else {
    b = `<p>导语承诺了：${r.promised.map(w => `<span class="sr-tag mid">${esc(w)}</span>`).join('')}</p>`;
    b += `<div class="sr-pay">${r.payoffs.map(x => `
      <div class="sr-pay-row ${x.onlyLead ? 'miss' : x.paraIdx >= 0 ? (x.early ? 'on' : 'late') : 'miss'}">
        <span>${esc(x.w)}<i>${x.total} 次</i></span>
        <em>${x.onlyLead ? '只在导语提过一次，正文没兑现' : x.paraIdx < 0 ? '正文里找不到' : x.early ? `第 ${x.paraIdx + 1} 段兑现` : `拖到第 ${x.paraIdx + 1} 段才兑现`}</em>
      </div>`).join('')}</div>`;
    if (r.delayed.length) {
      const onlyLead = r.delayed.filter(x => x.onlyLead);
      if (onlyLead.length) {
        b += `<p class="sr-red"><b>${onlyLead.map(x => `「${x.w}」`).join('、')} 只在导语出现了一次，正文里再也没提。</b><br>这是最常见的坑：用一个强词把人骗进来，然后写别的事。读者是冲着这个词点开的，你后面不给，他就觉得被骗了 —— 比导语平淡更伤。<br>要么让这件事<b>真的发生</b>，要么把它从导语里换掉。</p>`;
      } else {
        b += `<p class="sr-red"><b>${r.delayed.map(x => `「${x.w}」`).join('、')} </b>承诺得太晚。读者是冲着这个词点进来的，你让他等太久，他就去找下一篇了。<br>盐选的容错大概是<b>前三节内</b>必须让承诺的词真的发生。</p>`;
      }
    } else {
      b += `<p class="sr-green">导语承诺的每一件都兑现了，而且兑现得早。这一项很关键，很多人挂在上面。</p>`;
    }
  }
  o.push(srItem(3, '3-B', '标题与导语的一致性', !r.promised.length ? 'mid' : r.delayed.length ? 'bad' : 'good', b));

  /* ── 3-C ── */
  let c = `<p>结尾最后一句：</p><p class="sr-snip">${srQ(r.lastSent)}</p>`;
  if (r.endScore >= 8) c += `<p class="sr-green">收得住，而且<b>留了口子</b> —— 这种结尾会有人写「所以后来呢」，评论区就活了。</p>`;
  else if (r.endScore >= 6) c += `<p class="sr-dim">收得住，但<b>没什么可讨论的</b>。可讨论度来自「读者想站队」或「读者想知道后续」 —— 现在两样都不太够。</p>`;
  else c += `<p class="sr-red"><b>结尾是平的。</b>既没留悬置，也没留情绪余温。知乎的尾部流量很大一部分来自评论区，结尾不给话题，等于放弃这块。</p>`;
  o.push(srItem(3, '3-C', '结尾可讨论度', r.endScore >= 8 ? 'good' : r.endScore >= 6 ? 'mid' : 'warn', c));

  return o.join('');
}

/* ---------- 4-B 优先修改清单：只列 3 条，每条给可直接替换的句子 ---------- */
function srFixList(r) {
  const cands = [];

  const q = (k, t, d, before, after) => cands.push({ k, t, d, before, after });

  /* 第一句 */
  const f = r.first;
  if (f.stop < 8) {
    const firstLine = srSplitSents(f.text)[0] || f.text;
    // 兜底句必须是从原文里取出来的、语法上说得通的句子。
    // 做法：找导语里最像「事件」的那一句，把它前置成结果，再接一句悬置。
    const evt = (r.lead.match(/[^。！？\n]{6,34}(?:才知道|才发现|才明白|告诉我|跟我说|看见|看到|收到|接到)[^。！？\n]{0,20}/) || [])[0];
    const objBit = (r.lead.match(/(合同|协议|请柬|手机|截图|录音|转账|工牌|诊断书|照片|钥匙|流水|账本|房产证)/) || [])[1] || '';
    const numBit = (r.lead.match(/(\d+|[一二两三四五六七八九十百千]+)\s*(天|年|月|小时|分钟|笔|次|岁|万|块|元)/) || [])[0] || '';
    let alt;
    if (evt) {
      // 已经有一句结果句了，直接把它提到最前面
      alt = `${evt.replace(/^我(是|在)?/, '我是').replace(/[，,]?\s*$/, '')}。`;
      if (alt.length < 10) alt = evt + '。';
    } else if (numBit && objBit) {
      alt = `${numBit}之后我才知道，那个${objBit}上写的不是我的名字。`;
    } else if (objBit) {
      alt = `我把${objBit}翻到最后一页，才看见那个签名。`;
    } else {
      alt = `那件事发生之后，我再没回过那个家。`;
    }
    q('open', '换掉第一句', `现在是「${f.kind.name}」，停手指 ${f.stop}/10。换成结果先行或反常动作，六种开场里这两种抓力最高 —— 核心是「先给后果，把原因藏起来」。`, firstLine.slice(0, 40), alt);
  }

  /* 三要素缺项 */
  const miss = r.threeEl.filter(e => !e.ok);
  if (miss.length) {
    const m = miss[0];
    // 从原文捞素材，别给一句和稿件无关的通用句
    const obj = (r.lead.match(/(合同|协议|请柬|手机|截图|录音|转账|工牌|诊断书|照片|钥匙|流水|账本|房产证|户口本)/) || [])[1] || '';
    const who = (r.lead.match(/(他|她|我妈|我爸|婆婆|领导|老板|小姑子|前夫|男友)/) || [])[1] || '他';
    let add;
    if (m.key === 'id') {
      add = obj
        ? `我在一家小公司做会计，干了六年，那份${obj}是我经手的。`
        : `我今年三十一，在一家小公司做会计，干了六年。`;
    } else if (m.key === 'pres') {
      add = obj
        ? `${who}把那份${obj}拍在桌上，说这次不许再让。`
        : `${who}把话撂在这儿，说这次不许我再让一步。`;
    } else {
      add = obj
        ? `我必须在明天之前弄清楚，那份${obj}到底是谁签的字。`
        : `我必须在明天之前把这件事弄清楚，不然就来不及了。`;
    }
    q('three', `补上「${m.name}」`, `三百字里没有这一项，读者不知道${m.key === 'id' ? '你是谁' : m.key === 'pres' ? '你被什么压着' : '你要干什么'}。一句话就够，但必须是具体的。`, '（缺少，建议插在导语第三句后）', add);
  }

  /* 信息差 */
  if (r.infoGap === 'report') {
    // 兜底句必须从原文里取素材，否则会出现「他为什么要坐在那一桌」这种跟稿件无关的句子。
    const who = (r.lead.match(/(他|她|我妈|我爸|婆婆|领导|老板|小姑子)/) || [])[1] || '他';
    const thing = (r.lead.match(/(房子|合同|协议|请柬|手机|照片|钥匙|流水|账本|户口本|病历|诊断书|车|卡)/) || [])[1] || '';
    const gapLine = thing
      ? `可我一直没想通，${thing}上的那个名字，是什么时候写上去的。`
      : `可我一直没想通，${who}为什么要在这个时候告诉我。`;
    q('gap', '加一句悬置', '左边（读者已知）满了，右边（未知）是空的 —— 只报到，不勾人。在导语末尾加一句反问，把口子打开。', r.leadLast.slice(0, 40), gapLine);
  } else if (r.infoGap === 'vague') {
    q('gap', '把悬念挂到具体的事上', '有悬念但没事实，读者不知道在悬什么。用一句带具体物件或数字的事实把悬念钉住。', r.known[0] || '（没有具体事实）', `请柬上是我的名字，日子是下个月十六，可新郎那一栏我从来没见过。`);
  }

  /* 小说腔 */
  if (r.novelHits.length >= 2) {
    const top = r.novelHits[0];
    q('voice', `删掉「${top.name}」`, `${esc(top.why)}。这是导语里出现最多的毛病，改一处，整体可信度就上来一截。`, top.sample, `（直接删掉「${top.sample}」，把后面的动作提到前面）`);
  }

  /* 导语结尾：兜底句要跟着原文的事走，不能一律写「婚礼」 */
  if (r.leadEndT === 0) {
    // 锚点必须是「上面能写字」的东西，否则会拼出「在钥匙上看见那个名字」这种病句。
    // 能承载字迹的一类：证/书/表/单/记录/合同/协议/请柬/账本…
    const DOC = /(房产证|产权证|合同|协议|请柬|请帖|流水|账本|户口本|病历|诊断书|工资条|车本|判决书|记录|名单|登记表|截图|照片|短信|备注)/;
    const HOLD = /(钥匙|手机|车|戒指|包|卡|杯子)/;
    const docWord = (r.lead.match(DOC) || [])[0]
      || (r.known.slice(0, 3).join('').match(DOC) || [])[0]
      || '';
    const holdWord = (r.lead.match(HOLD) || [])[0] || '';
    let tail;
    if (docWord) {
      tail = `直到那天我在${docWord}上看见那个名字，才知道自己从头到尾都被算在里面。`;
    } else if (holdWord) {
      // 拿在手里的东西不能「写字」，换成「摸着它才反应过来」
      tail = `直到那天我攥着那把${holdWord}，才反应过来自己从头到尾都被算在里面。`;
    } else {
      tail = `直到那天我才明白，这件事从一开始就没打算让我知道。`;
    }
    q('end', '换掉导语的最后一句', '现在是平收，句子把话说完了，没有往上抬。换成一句「直到…」的转折，把读者钉在下一段。', r.leadLast.slice(0, 40), tail);
  }

  /* 水分 */
  if (r.waterParas.length >= 2) {
    const w = r.waterParas[0];
    q('water', '删掉空转的段落', `第 ${w.i + 1} 段 ${w.n} 字没有动作、没有新信息、没有情绪。一句话说完还在说，就是空。`, w.p.slice(0, 44) + '…', '（整段删除，直接接下一段）');
  }

  /* 情绪透支 */
  if (r.overdraft) {
    q('over', '把开头的第二个高潮往后挪', '前 30% 就有两个峰值，后面接不上。开头留一个就够，第二个放到第二节末，读者才有得爬。', '（前 30% 的第二个高强段落）', '（与此处交换位置：把中段一段相对平的铺垫移到前面）');
  }

  /* 卡点钩子 */
  if (!r.cutHasHook) {
    q('cut', '在卡点前下钩子', '这是最贵的漏洞：读者读到卡点没有任何「必须知道答案」的理由，直接退出。在卡点前 200 字内埋一句悬置。', `（第 ${r.cutIdx} 段附近，当前无悬置）`, `她说完那句就走了。我当时没听懂，直到三天后警察上门。`);
  }

  /* 结尾 */
  if (r.endScore < 6) {
    q('last', '换结尾', '结尾是平的，没有留话题。可讨论度来自「读者想站队」或「想知道后续」。', r.lastSent.slice(0, 40), `后来我再没见过他。只是每年清明，那束花都有人替我送过。`);
  }

  /* 排序：先导语（最高优先级），再卡点，再正文 */
  const ORDER = { open: 0, three: 1, gap: 2, voice: 3, end: 4, cut: 5, over: 6, water: 7, last: 8 };
  cands.sort((a, b2) => ORDER[a.k] - ORDER[b2.k]);
  return cands.slice(0, 3);
}

function srVerdict(r, fix) {
  const s = r.score;
  const avg = (s.lead * 2 + s.read + s.pay * 1.5) / 4.5;

  // 不要硬说「先改 1-A」—— 如果第一句本来就是 9 分，那句话就是在瞎指。
  // 找出真正没过关的项，用它们的编号说话。
  const CODE = { open: '1-A', three: '1-B', gap: '1-C', voice: '1-D', end: '1-E',
    cut: '3-A', over: '2-D', water: '2-B', last: '3-C' };
  const weak = [];
  if (r.first.stop < 8 && !r.first.dlgStrong) weak.push('1-A');
  if (r.threeScore < 3) weak.push('1-B');
  if (r.infoGap !== 'good') weak.push('1-C');
  if (r.novelDensity > 1) weak.push('1-D');
  if (r.leadEndT === 0) weak.push('1-E');
  if (!r.cutHasHook) weak.push('3-A');
  if (r.endScore < 8) weak.push('3-C');
  const leadWeak = weak.filter(x => x.startsWith('1-'));
  const firstFix = fix[0];
  const pointer = firstFix ? `先动 4-B 第一条（${firstFix.t}）` : '';

  if (avg >= 8) return '能发。别自我怀疑了，把 4-B 那三条改完就送去投。';

  if (avg >= 6.5) {
    // 导语分高、失分全在正文/卡点 —— 这稿的导语已经可以了，别让它去改导语
    if (s.lead >= 8) {
      return `导语这一关是过的（导语 ${s.lead}/10），不用再动 —— 再改容易改坏。真正掉分的是${weak.length ? ' ' + weak.join('、') + ' ' : '正文和卡点'}。${pointer}，其余别动。`;
    }
    if (leadWeak.length === 0) {
      return `导语没有明显硬伤，但整体还不够利。先动 ${weak[0] || '3-A'}。${pointer}，改完再读一遍，剩下的问题你自己会看出来。`;
    }
    return `底子在，先改 ${leadWeak.slice(0, 2).join(' 和 ')}。${pointer}，改完再读一遍，剩下的问题你自己会看出来。`;
  }

  if (avg >= 5) return '这篇不能直接投。不是写得差，是开头没接住 —— 先把第一句和三百字重写，正文暂时别动。';
  if (avg >= 3.5) return '结构有，可信感没有。读者看完三百字会觉得「这是编的」，然后走。问题不在文笔，在有没有具体的东西。';
  return '这篇现在是一个练习稿，不是投稿稿。别改字了，先想清楚：谁在扛什么事，扛不住会怎样。想清楚了重写导语。';
}

function renderReview(box, r) {
  const s = r.score;
  const fix = srFixList(r);
  const total = Math.round((s.lead * 2 + s.read + s.pay * 1.5) / 4.5 * 10) / 10;

  box.innerHTML = `
    ${r.isLeadOnly ? '<div class="sr-warn">全文不足 800 字，只能当导语审。正文相关的 2、3 两项参考价值有限。</div>' : ''}

    <div class="sr-score">
      <div class="sr-score-main">
        <div class="sr-score-l">综合</div>
        <div class="sr-score-v lv-${srLv(total)}">${total.toFixed(1)}</div>
        <div class="sr-score-d">导语权重 ×2 · 卡点 ×1.5</div>
      </div>
      <div class="sr-score-3">
        <div class="sr-s3 lv-${srLv(s.lead)}"><span>导语</span><b>${s.lead}</b><div class="sr-s3-bar"><i style="width:${s.lead * 10}%"></i></div><em>决定点击</em></div>
        <div class="sr-s3 lv-${srLv(s.read)}"><span>正文</span><b>${s.read}</b><div class="sr-s3-bar"><i style="width:${s.read * 10}%"></i></div><em>决定完读</em></div>
        <div class="sr-s3 lv-${srLv(s.pay)}"><span>卡点</span><b>${s.pay}</b><div class="sr-s3-bar"><i style="width:${s.pay * 10}%"></i></div><em>决定付费</em></div>
      </div>
    </div>

    <div class="sr-step-h"><span>第一步</span>导语审查<em>前 ${r.leadChars} 字 · 决定点击率</em></div>
    ${srLeadCheck(r)}

    <div class="sr-step-h"><span>第二步</span>正文审查<em>决定完读率</em></div>
    ${srBodyCheck(r)}

    <div class="sr-step-h"><span>第三步</span>三个硬指标<em>决定付费与扩散</em></div>
    ${srHardCheck(r)}

    <div class="sr-step-h"><span>第四步</span>总评与修改清单<em>只列 3 条，按优先级</em></div>

    <div class="sr-fix">
      ${fix.map((x, i) => `
        <div class="sr-fix-item">
          <div class="sr-fix-n">${i + 1}</div>
          <div class="sr-fix-b">
            <div class="sr-fix-t">${esc(x.t)}</div>
            <div class="sr-fix-d">${x.d}</div>
            <div class="sr-fix-ba">
              <div class="sr-fix-before"><span>原句</span><div>${esc(x.before)}</div></div>
              <div class="sr-fix-after"><span>换成</span><div>${esc(x.after)}</div></div>
            </div>
          </div>
        </div>`).join('')}
      ${!fix.length ? '<div class="sr-green" style="padding:14px 0">没有需要改的地方 —— 这篇在规则范围内挑不出硬伤。剩下的只能靠人读了。</div>' : ''}
    </div>

    <div class="sr-verdict">
      <div class="sr-verdict-l">一句话总评</div>
      <div class="sr-verdict-t">${esc(srVerdict(r, fix))}</div>
    </div>

    <div class="sr-foot">本地规则审查 · 判断依据是知乎盐选的编辑标准，不联网、不上传。批评是给稿子的，不是给你的。</div>`;
}

/* ================= 7. 数据设置 ================= */
VIEWS.settings = () => {
  const frag = el('div', 'page');
  const d = DB.d;
  const sizes = new Blob([JSON.stringify(d)]).size;

  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">数据设置</div>
      <div class="pg-sub">知乎数据来源 · 本地备份 · 存储占用 ${(sizes / 1024).toFixed(1)} KB</div></div></div>
    <div class="pg-body" style="max-width:820px">

      <div class="section-label">知乎登录态</div>
      <div class="card-block">
        <div class="form-row">
          <div class="form-label">z_c0</div>
          <input class="form-input" id="setCookie" type="password" placeholder="粘贴 z_c0 的值" value="${esc(d.cookie)}">
        </div>
        <div class="form-row" style="display:block">
          <div class="form-hint" style="margin:0 0 10px">
            获取方式：浏览器登录知乎 → F12 → Application → Cookies → https://www.zhihu.com → 复制 <b>z_c0</b> 的 Value。<br>
            只用于本地抓取你可见的榜单摘要，不上传、不写回知乎。明文存在本机 localStorage，建议只在个人电脑使用。
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="setSave">${I.check} 保存</button>
            <button class="btn btn-sec" id="setGen">生成抓取命令</button>
            <span style="font-size:12px;color:var(--label-3)" id="setState">${d.cookie ? '已保存' : '未设置'}</span>
          </div>
        </div>
      </div>

      <div class="section-label">当前数据</div>
      <div class="card-block">
        <div class="form-row"><div class="form-label">数据来源</div><div class="form-input" style="background:transparent">${esc(DATA.source || '未加载')}</div></div>
        <div class="form-row"><div class="form-label">榜单数</div><div class="form-input" style="background:transparent">${DATA.lists.length} 个</div></div>
        <div class="form-row"><div class="form-label">条目数</div><div class="form-input" style="background:transparent">${allItems().length} 条</div></div>
        <div class="form-row"><div class="form-label">抓取时间</div><div class="form-input" style="background:transparent">${DATA.fetchedAt ? new Date(DATA.fetchedAt).toLocaleString('zh-CN') : '—'}</div></div>
        <div class="form-row"><div class="form-label">快照来源</div><div class="form-input" style="background:transparent">${snapInfo()}</div></div>
      </div>

      <div class="section-label">更新榜单</div>
      <div class="card-block">
        <div class="form-row" style="display:block">
          <div class="form-hint" style="margin:0 0 10px">
            在电脑上跑一遍抓取脚本，把生成的 <b>data/zhihu.json</b> 传到手机，在这里导入即可。<br>
            数据存在本机 localStorage，<b>不会改动服务器上的文件，也不需要重新部署</b>。换设备或清缓存后会回到线上版本。
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="setSnapImport">${I.up} 导入榜单 json</button>
            <button class="btn btn-sec" id="setSnapClear"${hasSnap() ? '' : ' disabled style="opacity:.45"'}>${I.trash} 回到线上版本</button>
          </div>
        </div>
      </div>

      <div class="section-label">备份</div>
      <div class="card-block">
        <div class="form-row">
          <div class="form-label">导出</div>
          <button class="btn btn-sec" id="setExport">${I.down} 导出全部数据</button>
          <div style="flex:1"></div>
          <button class="btn btn-sec" id="setImport">${I.up} 导入</button>
        </div>
        <div class="form-row">
          <div class="form-label" style="color:var(--sys-red)">清空</div>
          <button class="btn btn-sec" id="setClear" style="color:var(--sys-red)">${I.trash} 清空所有数据</button>
        </div>
      </div>

      <div class="section-label">免责</div>
      <div class="card-block" style="padding:16px;font-size:12.5px;line-height:1.75;color:var(--label-2)">
        本工具只用于个人选题参考：展示标题、摘要与公开热度，不镜像知乎正文与付费内容，不代替任何阅读授权。<br>
        请遵守知乎用户协议，合理控制抓取频率。数据版权归原作者与知乎所有。
      </div>
    </div>`;

  setTimeout(() => {
    const inp = frag.querySelector('#setCookie');
    frag.querySelector('#setSave').onclick = () => {
      DB.d.cookie = inp.value.trim(); DB.save();
      frag.querySelector('#setState').textContent = DB.d.cookie ? '已保存' : '未设置';
      toast('已保存到本机');
    };
    frag.querySelector('#setGen').onclick = () => {
      const c = inp.value.trim() || DB.d.cookie;
      if (!c) { toast('先填 z_c0'); return; }
      const cmd = `ZHIHU_COOKIE="z_c0=${c}" node scripts/fetch-zhihu.js`;
      copyText(cmd);
    };
    frag.querySelector('#setExport').onclick = () => {
      const blob = new Blob([JSON.stringify(DB.d, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `罗盘备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); toast('已导出');
    };
    frag.querySelector('#setImport').onclick = () => {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json';
      f.onchange = () => {
        const file = f.files[0]; if (!file) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const o = JSON.parse(rd.result);
            if (!Array.isArray(o.pool)) throw 0;
            confirmBox('覆盖现有数据？', '当前 ' + DB.d.pool.length + ' 条导语会被替换', '确认导入', () => {
              o.ver = 2; DB.d = o; DB.save(); openApp('settings'); paintWidgets(); toast('导入成功');
            }, true);
          } catch { toast('文件格式不对'); }
        };
        rd.readAsText(file);
      };
      f.click();
    };
    frag.querySelector('#setSnapImport').onclick = () => {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json';
      f.onchange = () => {
        const file = f.files[0]; if (!file) return;
        const rd = new FileReader();
        rd.onload = () => {
          // 先解析校验一遍，没问题再问要不要覆盖
          let j; try { j = JSON.parse(rd.result); }
          catch { toast('不是有效的 JSON 文件'); return; }
          if (!j || !Array.isArray(j.lists)) { toast('缺少 lists 字段，可能选错了文件'); return; }
          const usable = j.lists.filter(L => L.key !== 'hot' && L.type !== 'hot_all' && Array.isArray(L.items) && L.items.length);
          if (!usable.length) { toast('榜单为空，检查文件是否完整'); return; }
          const nItem = usable.reduce((s, L) => s + L.items.length, 0);
          const when = j.fetchedAt ? new Date(j.fetchedAt).toLocaleString('zh-CN') : '未知时间';
          const old = DATA.lists.length ? `当前 ${DATA.lists.length} 个榜单 · ${allItems().length} 条` : '当前没有数据';
          confirmBox(
            '导入这份榜单？',
            `${old}，导入后会被替换为 ${usable.length} 个榜单 · ${nItem} 条（抓取于 ${when}）`,
            '确认导入',
            () => {
              const r = importSnapshot(rd.result);
              if (!r.ok) { toast(r.msg); return; }
              if (curView === 'rank') openApp('rank'); else openApp('settings');
              toast(r.msg);
              if (r.warn) setTimeout(() => alert(r.msg), 300);
            },
            true
          );
        };
        rd.readAsText(file);
      };
      f.click();
    };
    const clr = frag.querySelector('#setSnapClear');
    if (clr) clr.onclick = () => {
      confirmBox('回到线上版本？', '会清除本机导入的榜单快照，刷新后显示服务器上的 data/zhihu.json', '清除快照', async () => {
        clearSnapshot();
        await loadZhihu();
        openApp('settings');
        toast('已回到线上版本');
      }, true);
    };
    frag.querySelector('#setClear').onclick = () => {
      confirmBox('清空所有数据？', '导语池、抽卡记录会全部删除，不可恢复', '清空', () => {
        localStorage.removeItem(KEY); DB.load(); openApp('settings'); paintWidgets(); toast('已清空');
      }, true);
    };
  }, 20);
  return frag;
};

/* ================= 启动 & 全局事件 ================= */
function tickClock() {
  const n = new Date();
  $('#tbTime').textContent = n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][n.getDay()];
  $('#tbDate').textContent = `${n.getMonth() + 1}月${n.getDate()}日 ${wd}`;
  const w = $('#wTime'); if (w && curView === '') w.textContent = n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-open]');
  if (t) openApp(t.dataset.open);
});

$('#modalMask').onclick = e => { if (e.target.id === 'modalMask') closeModal(); };
$('.t-close').onclick = closeApp;
$('.t-min').onclick = closeApp;
$('.t-max').onclick = () => {
  const w = $('#win');
  w.style.transition = 'none';
  w.style.width = w.style.width === '100vw' ? '' : '100vw';
  w.style.height = w.style.height === '100vh' ? '' : '100vh';
  setTimeout(() => { w.style.transition = ''; }, 60);
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#modalMask').classList.contains('show')) closeModal(); else closeApp(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); $('#globalSearchInput').focus();
  }
});

// 全局搜索：跳到榜单并按关键词过滤
$('#globalSearchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    searchKw = e.target.value.trim();
    openApp('rank');
    setTimeout(() => {
      const q = $('#rankQ');
      if (q) { q.value = searchKw; q.dispatchEvent(new Event('input')); }
    }, 30);
  }
});

$('#refreshAll').onclick = async e => {
  const b = e.currentTarget;
  b.classList.add('spin'); b.disabled = true;
  await loadZhihu();
  if (curView === 'rank') openApp('rank');
  b.classList.remove('spin'); b.disabled = false;
  toast(DATA.lists.length
    ? `已载入 ${allItems().length} 条 · ${genreLists().length} 个题材`
    : '没有读到数据，检查 data/zhihu.json');
};

/* 启动 */
DB.load();
paintWidgets();
tickClock();
setInterval(tickClock, 20000);
loadZhihu();
