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
  names: '起名助手', analyze: '拆文助手', settings: '数据设置',
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
    <div class="pg-head"><div><div class="pg-title">拆文助手</div>
      <div class="pg-sub">钩子 · 节拍 · 情绪曲线 · 人物 · 语言，全部本地计算</div></div>
      <button class="btn btn-primary" id="anRun">${I.scan} 开始拆解</button></div>
    <div class="pg-body">
      <button class="btn btn-sec" id="anBack" style="display:none;margin-bottom:14px">← 改正文</button>
      <div class="analyze-grid">
        <div class="an-input" id="anInput">
          <div class="section-label" style="margin-top:0">正文<span class="an-input-n" id="anCount">0 字</span></div>
          <textarea class="ta" id="anText" placeholder="把小说全文粘进来…&#10;&#10;建议一次拆一篇完整的，至少 300 字。段落之间空一行，结构分析会更准。"></textarea>
          <div class="an-input-bar">
            <button class="btn btn-sec" id="anClear">${I.trash} 清空</button>
            <button class="btn btn-sec" id="anLoad">${I.empty} 读示例</button>
          </div>
        </div>
        <div id="anOut">
          <div class="empty">${I.empty}<div class="empty-t">还没有结果</div><div class="empty-d">粘贴正文后点击「开始拆解」</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    const ta = frag.querySelector('#anText');
    const cnt = frag.querySelector('#anCount');
    const inputWrap = frag.querySelector('#anInput');
    const out = frag.querySelector('#anOut');
    const backBtn = frag.querySelector('#anBack');
    const upd = () => { cnt.textContent = (ta.value.replace(/\s/g, '').length || 0).toLocaleString() + ' 字'; };
    ta.addEventListener('input', upd);
    upd();

    const run = () => {
      const t = ta.value.trim();
      if (t.length < 50) { toast('至少 50 字才有得拆'); return; }
      const r = analyzeText(t);
      renderReport(out, r);
      // 手机上把输入区收起来直接看报告，桌面并排显示不用收
      if (window.innerWidth <= 560) {
        frag.querySelector('#anInput').classList.add('min');
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
        '<div class="empty">' + I.empty + '<div class="empty-t">还没有结果</div><div class="empty-d">粘贴正文后点击「开始拆解」</div></div>';
    };
    frag.querySelector('#anLoad').onclick = () => {
      ta.value = SAMPLE_TEXT; upd();
      toast('已载入示例，点「开始拆解」看看');
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

/* ================= 6. 拆文助手 =================
 *
 * 纯本地规则拆解，不联网。目标不是「算几个数字」，而是回答三个作者真关心的问题：
 *   ① 这篇的钩子立不立得住？
 *   ② 节拍是不是按读者预期在推进，哪里可能掉？
 *   ③ 语言有没有重复、有没有口水。
 *
 * 拆解分五块：
 *   开篇钩子   —— 100 字内有没有冲突/悬念/反常，分别打分
 *   结构节拍   —— 按功能给段落打标签（不是硬套 8 个动作名）
 *   情绪曲线   —— 逐段强度折线，找平淡区和塌陷
 *   人物与场景 —— 出场人物排序、场景切换密度
 *   语言体检   —— 句长分布、重复用词、口头禅、长句定位
 */

/* 钩子特征词。分组对应四种钩子类型，命中即加分 */
const HOOK_SIGNS = {
  conflict: {
    name: '冲突',
    words: ['吵', '骂', '打', '摔', '砸', '抢', '逼', '撕', '扇', '吼', '冷笑', '怒', '翻脸', '滚', '不要脸', '凭什么', '你敢'],
  },
  suspense: {
    name: '悬念',
    words: ['为什么', '直到', '才明白', '原来', '竟然', '没想到', '后来才', '如果', '秘密', '真相', '不知道', '谁', '怎么会', '可是'],
  },
  abnormal: {
    name: '反常',
    words: ['死', '婚礼', '葬礼', '离婚', '怀孕', '出轨', '失踪', '报警', '法院', '遗书', '绝症', '手术', '血', '尸体', '尸体', '第三个月', '第七天'],
  },
  emotion: {
    name: '情绪',
    words: ['哭', '眼泪', '疼', '恨', '怕', '发抖', '心口', '喘不过', '窒息', '笑', '崩溃', '跪', '求'],
  },
};

/* 段落功能标签 —— 按内容特征判定，而不是按顺序硬分配 */
const PARA_KINDS = [
  { key: 'dialog', name: '对话', cls: 'blue', test: (p, f) => f.dlgRatio > .42 },
  { key: 'action', name: '动作', cls: 'orange', test: (p, f) => f.verbRate > .085 && f.dlgRatio < .3 },
  { key: 'inner', name: '心理', cls: 'pink', test: (p, f) => f.thinkCount >= 2 },
  { key: 'scene', name: '场景', cls: 'green', test: (p, f) => f.sceneCount >= 2 && f.dlgRatio < .25 },
  { key: 'transition', name: '过渡', cls: 'warn', test: (p, f) => p.length < 42 || f.timeCount >= 1 },
];

const THINK_RE = /(觉得|以为|想着|心里|明白|意识到|忽然想起|记得|后悔|害怕|害怕|希望|知道|发现自己)/g;
const VERB_RE = /(走|跑|站|坐|推|拉|抓|握|扔|拿|放|转身|回头|低头|抬头|点头|摇头|伸手|开门|关门|冲|退|扑|撞|踢|踏|靠|躺|蹲|望|盯|看|听|说|问|答)/g;
const SCENE_RE = /(房间|屋里|窗|门|街|路|楼|车|办公室|厨房|客厅|卧室|电梯|走廊|阳台|医院|学校|雨|雪|风|阳光|灯|夜|天|墙|桌子|沙发|床)/g;
const TIME_RE = /(第二天|三天后|一周|半个月|一个月|半年|那年|小时候|后来|那天|当晚|半夜|清晨|傍晚|多年|之后|当时|此刻)/g;
const ENV_RE = /(雨|雪|风|阳光|夕阳|天亮|天黑|夜|灯|光|冷|热|雾|云|树|花|街|巷)/g;

/** 逐句拆，保留标点信息 */
function splitSents(text) {
  return text
    .replace(/\n+/g, '¶')
    .split(/(?<=[。！？!?…；;]|¶)/)
    .map(s => s.replace(/¶/g, '').trim())
    .filter(Boolean);
}

function splitParas(text) {
  const raw = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  // 只有一个大段（用户粘的是一整块没换行）时，按句号每 ~3 句切一刀，
  // 否则所有基于「逐段」的分析都退化成 1 个数据点，曲线和节奏条都是空的。
  if (raw.length === 1 && CN(raw[0]) > 300) {
    const ss = splitSents(raw[0]);
    const out = [];
    let buf = [];
    let n = 0;
    for (const s of ss) {
      buf.push(s);
      n += CN(s);
      if (n >= 90) { out.push(buf.join('')); buf = []; n = 0; }
    }
    if (buf.length) out.push(buf.join(''));
    return out;
  }
  return raw;
}

const CN = t => (t.match(/[\u4e00-\u9fa5]/g) || []).length;

/** 第 N 段开始的累计字数 */
function cumulative(arr, fn) {
  let acc = 0;
  return arr.map(x => (acc += fn(x)));
}

function analyzeText(text) {
  const chars = CN(text);
  const paras = splitParas(text);
  const sents = splitSents(text);

  /* ---------- 1. 基础指标 ---------- */
  const sentLens = sents.map(s => CN(s)).filter(n => n > 0);
  const avg = sentLens.length ? Math.round(sentLens.reduce((a, b) => a + b, 0) / sentLens.length) : 0;

  const dlgSents = sents.filter(s => /[“”"「」]/.test(s));
  const dlgChars = dlgSents.reduce((a, s) => a + CN(s), 0);
  const dRate = chars ? Math.round(dlgChars / chars * 100) : 0;

  // 句长分布
  const buckets = [
    { label: '≤10 字', min: 0, max: 10 },
    { label: '11–20', min: 11, max: 20 },
    { label: '21–35', min: 21, max: 35 },
    { label: '36–50', min: 36, max: 50 },
    { label: '>50 字', min: 51, max: 1e9 },
  ].map(b => ({
    ...b,
    n: sentLens.filter(n => n >= b.min && n <= b.max).length,
  }));
  const longSents = sents
    .map((s, i) => ({ s, n: CN(s), idx: i }))
    .filter(x => x.n > 50)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  /* ---------- 2. 开篇钩子 ---------- */
  const head = text.slice(0, 260);
  const headChars = CN(head);
  const hookLines = paras.slice(0, 2).join(' ');
  const hookHits = Object.entries(HOOK_SIGNS).map(([k, v]) => ({
    key: k,
    name: v.name,
    hits: v.words.filter(w => head.includes(w)),
  }));
  const hookScore = (() => {
    let s = 0;
    s += Math.min(40, hookHits.reduce((a, h) => a + h.hits.length, 0) * 14);
    // 开头句长：短句更有力
    const firstLen = CN(sents[0] || '');
    if (firstLen && firstLen <= 18) s += 22;
    else if (firstLen <= 30) s += 12;
    // 前 100 字内是否出现具体场景或人物动作
    if (/[我你他她]/.test(head.slice(0, 100))) s += 14;
    if (/[“「"]/.test(head.slice(0, 120))) s += 12;
    if (/[,，。]/.test(head.slice(0, 30))) s += 6;
    return Math.max(0, Math.min(100, s));
  })();

  /* ---------- 3. 逐段特征 + 节拍 ---------- */
  const paraInfo = paras.map((p, i) => {
    const n = CN(p);
    const dlgN = CN((p.match(/[“「"][^”」"]*[”」"]/g) || []).join(''));
    const f = {
      dlgRatio: n ? dlgN / n : 0,
      verbRate: n ? ((p.match(VERB_RE) || []).length) / n : 0,
      thinkCount: (p.match(THINK_RE) || []).length,
      sceneCount: (p.match(SCENE_RE) || []).length,
      timeCount: (p.match(TIME_RE) || []).length,
    };
    const kind = PARA_KINDS.find(k => k.test(p, f)) || { key: 'desc', name: '叙述', cls: '' };
    return { i, p, n, ...f, kind };
  });

  const totalChars = paraInfo.reduce((a, x) => a + x.n, 0) || 1;
  const cum = cumulative(paraInfo, x => x.n);
  const at = pct => cum.findIndex(c => c >= totalChars * pct) + 1 || paraInfo.length;

  /* ---------- 4. 情绪曲线 ---------- */
  const EMO_RE = {
    strong: /(哭|吼|骂|摔|砸|撕|扇|打|血|死|崩|疯|恨|痛|疼|尖叫|发抖|窒息|绝望|崩溃)/g,
    mid: /(笑|慌|急|怕|怒|气|惊|愣|沉默|红|湿|颤|咬|握紧|喘)/g,
    low: /(说|问|答|看|走|坐|站|听|想|觉得|知道)/g,
    neg: /(不|没|无|别|嘛|呢|吧)/g,
  };
  const intensity = paraInfo.map(x => {
    const s = (x.p.match(EMO_RE.strong) || []).length * 3
      + (x.p.match(EMO_RE.mid) || []).length * 1.6
      + (x.dlgRatio > .4 ? 2 : 0)
      + (/[！!]/.test(x.p) ? 1.5 : 0)
      + (/[？?]/.test(x.p) ? 1 : 0);
    return Math.min(10, s / Math.max(1, x.n / 60));
  });
  // 归一化到 0-100
  const mx = Math.max(...intensity, 1);
  const curve = intensity.map(v => Math.round(v / mx * 100));

  // 平淡区：连续 ≥3 段低于 35%
  const flat = [];
  for (let i = 0; i < curve.length; i++) {
    if (curve[i] < 35) {
      let j = i;
      while (j < curve.length && curve[j] < 35) j++;
      if (j - i >= 3) flat.push({ from: i + 1, to: j, wc: paraInfo.slice(i, j).reduce((a, x) => a + x.n, 0) });
      i = j;
    }
  }

  /* ---------- 5. 重复用词 ---------- */
  /* 中文没有空格，滑窗切出来的 2-4 字片段大多数不是词（「楼我穿」「着婚纱」）。
     硬用统计切词效果很差，所以换个思路：不追求切得准，而是要求「同一片段在
     不同句子里反复出现」——真词才可能这样，跨词的碎片不会。
     ① 片段必须跨越至少 2 个不同句子出现 ≥2 次
     ② 头尾不能是虚词
     ③ 整词命中空泛词表 → 丢
     ④ 长度优先，长的吞掉短的 */
  const FUNC = /[的了是在我你他她它们这那就也和与都还又很太更最一二三四五六七八九十上下里吗呢吧啊着过不没有说会能要可把被让给对从到个些什怎样因为所以但而却已只再更于其之以所而且并或]/;
  const BORING = /^(声音|出来|起来|下来|上去|过来|回来|进去|一个|一些|一点|一下|一阵|这样|那样|什么|怎么|这里|那里|时候|现在|已经|只是|还有|就是|不是|可以|觉得|知道|自己|我们|你们|他们|她们|的话|一样|一边|有点|好像|忽然|突然|然后|接着|于是|因为|所以|但是|而且|如果|虽然|不过|其实|真的|非常|一直|刚刚|马上|立刻|开始)$/;

  // 按句子粒度统计：每个片段记录它出现在哪些句子里
  const sentList = sents.filter(s => CN(s) >= 4);
  const where = new Map();   // 片段 -> Set(句子索引)
  const count = new Map();   // 片段 -> 出现次数
  sentList.forEach((s, si) => {
    const clean = s.replace(/[^\u4e00-\u9fa5]/g, '|').split(/\|+/).filter(x => x.length >= 2);
    for (const run of clean) {
      for (let n = 2; n <= 4; n++) {
        for (let i = 0; i + n <= run.length; i++) {
          const w = run.slice(i, i + n);
          if (FUNC.test(w) || BORING.test(w)) continue;
          if (FUNC.test(w[0]) || FUNC.test(w[w.length - 1])) continue;
          count.set(w, (count.get(w) || 0) + 1);
          if (!where.has(w)) where.set(w, new Set());
          where.get(w).add(si);
        }
      }
    }
  });

  const cand = [...count.entries()]
    // 同样出现 ≥2 次，且分散在 ≥2 个句子里（跨句才可能是词）
    .filter(([w, c]) => c >= 2 && (where.get(w) || new Set()).size >= 2)
    .filter(([w]) => w.length >= 2)
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length);
  const kw = [];
  for (const [w, c] of cand) {
    if (kw.some(k => k.includes(w) || w.includes(k))) continue;
    kw.push(w);
    if (kw.length >= 10) break;
  }

  /* ---------- 6. 人物 ---------- */
  /* 不用通用姓名规则（「酒店三楼」会被当成姓「酒」的人），改成三级证据：
     ① 称谓词：出现 ≥2 次就算
     ② 被引号/叙述动词修饰过的专名：X说 / X道 / 叫X / X愣 —— 只取动词前 2~3 字
     ③ 用户名回填：文中出现过「他叫陈默」「她叫小周」这类，直接认定为人物 */
  const nameHits = new Map();
  const bump = (w, n) => nameHits.set(w, (nameHits.get(w) || 0) + n);

  const titleList = ['妈妈', '爸爸', '母亲', '父亲', '老公', '老婆', '婆婆', '公公', '小三', '继母', '继父', '亲妈', '后妈', '姐姐', '妹妹', '哥哥', '弟弟', '闺蜜', '老板', '同事', '男友', '女友', '前夫', '前妻', '未婚夫', '未婚妻', '儿子', '女儿', '奶奶', '爷爷', '外婆', '外公', '舅舅', '姑姑', '姨妈', '阿姨', '叔叔', '婶婶', '嫂子', '大伯'];
  for (const t of titleList) {
    const n = (text.match(new RegExp(t, 'g')) || []).length;
    if (n >= 2) bump(t, n);
  }

  // ② 明确被指认的名字（破折号、引号、逗号都可能是边界）
  for (const m of text.matchAll(/(?:叫|名叫|叫做|名字是)\s*([\u4e00-\u9fa5]{2,3})/g)) {
    bump(m[1], Math.max(2, (text.match(new RegExp(m[1], 'g')) || []).length));
  }

  // ③ 叙述动词前后的专名
  const NAME_CTX = /([\u4e00-\u9fa5]{2,3})(?=(?:说|道|问|答|笑|哭|喊|吼|愣|点头|摇头|皱眉|看了我一眼|走过来|转身))/g;
  for (const m of text.matchAll(NAME_CTX)) {
    const w = m[1];
    // 去掉动词吃掉的一节：「陈默从里间出来，手还插」不会误伤
    if (w.length < 2) continue;
    // 排除以常见非姓氏字开头的词
    if (/^[的了她他它们这那就也和与都还又很太最一二三四五六七八九十上下里吗呢吧啊着过不没有把被让给对从到个些什怎样因为所以但而却已只再更酒店屋门窗声手眼口心时天日年月]/.test(w)) continue;
    const n = (text.match(new RegExp(w, 'g')) || []).length;
    if (n >= 2 && n <= Math.ceil(text.length / 60)) bump(w, n);
  }
  // 去掉互相包含的（「小周」和「周」同时存在时留长的）
  const people = [...nameHits.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .filter(([w], i, arr) => !arr.slice(0, i).some(([k]) => k.includes(w) || w.includes(k)))
    .slice(0, 8);

  /* ---------- 7. 场景切换 ---------- */
  const sceneShifts = [];
  for (let i = 1; i < paraInfo.length; i++) {
    if (paraInfo[i].timeCount || (paraInfo[i].sceneCount >= 3 && paraInfo[i - 1].sceneCount >= 3)) {
      if (paraInfo[i].timeCount) sceneShifts.push({ at: i + 1, word: (paraInfo[i].p.match(TIME_RE) || [])[0] });
    }
  }

  /* ---------- 8. 段落长度分布 ---------- */
  const paraLens = paraInfo.map(x => x.n);
  const avgPara = Math.round(paraLens.reduce((a, b) => a + b, 0) / Math.max(1, paraLens.length));
  const longParas = paraInfo.filter(x => x.n > avgPara * 2.2 && x.n > 90).slice(0, 3);

  return {
    raw: text,
    chars, paras: paraInfo.length, sents: sents.length, avg, dRate,
    mins: Math.max(1, Math.round(chars / 400)),
    buckets, longSents,
    hook: { text: hookLines.slice(0, 90), hits: hookHits, score: hookScore, headChars },
    paraInfo, cum, totalChars,
    curve, flat, sceneShifts, at,
    kw: kw.map(w => ({ w, n: count.get(w) })),
    people,
    avgPara, longParas,
  };
}

/* ---------- 评分换算 ---------- */
function grade(score) {
  if (score >= 76) return { label: '强', cls: 'good' };
  if (score >= 50) return { label: '中', cls: 'mid' };
  return { label: '弱', cls: 'bad' };
}

function curvePath(curve, w, h) {
  if (curve.length < 2) return '';
  const step = w / (curve.length - 1);
  const pts = curve.map((v, i) => [i * step, h - (v / 100) * h]);
  // 平滑曲线
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return { d, pts };
}

function renderReport(box, r) {
  const g = grade(r.hook.score);
  const hookRatio = Math.round(r.hook.headChars / Math.max(1, r.chars) * 100);

  /* 句长分布条形 —— 用 CSS 百分比宽度，不用 flex，避免被压缩看不见 */
  const maxBucket = Math.max(...r.buckets.map(b => b.n), 1);
  const totalSent = r.buckets.reduce((a, b) => a + b.n, 0) || 1;
  const bucketHtml = r.buckets.map(b => `
    <div class="an-bar-row">
      <div class="an-bar-l">${b.label}</div>
      <div class="an-bar-track"><div class="an-bar-fill" style="width:${Math.round(b.n / maxBucket * 100)}%"></div></div>
      <div class="an-bar-n">${b.n}<em>${Math.round(b.n / totalSent * 100)}%</em></div>
    </div>`).join('');

  /* 段落节奏条（按功能着色的色带）
     flex-grow 用权重而不是百分比，再多段也能铺满；
     段数超过 40 就不显示字数和标题了，免得挤成一团 */
  const dense = r.paraInfo.length > 40;
  const mapHtml = r.paraInfo.map((x, i) => {
    const w = Math.max(1, x.n);
    return `<span class="an-map-cell k-${x.kind.key}" style="flex:${w} 1 0"
              title="第 ${i + 1} 段 · ${x.kind.name} · ${x.n} 字">${!dense && x.n >= 40 ? x.n : ''}</span>`;
  }).join('');

  /* 情绪曲线 */
  const CW = 100, CH = 42;
  // 只有 1 个点时画不出线，直接给一条平直的占位，别留空白
  const path = r.curve.length >= 2
    ? curvePath(r.curve, CW, CH)
    : { d: `M0,${(CH - CH * (r.curve[0] || 0) / 100).toFixed(1)} L${CW},${(CH - CH * (r.curve[0] || 0) / 100).toFixed(1)}` };
  const flatZones = r.flat.map(f => {
    const x1 = (f.from - 1) / Math.max(1, r.curve.length - 1) * CW;
    const x2 = (f.to - 1) / Math.max(1, r.curve.length - 1) * CW;
    return `<rect x="${x1.toFixed(1)}" y="0" width="${Math.max(1.5, x2 - x1).toFixed(1)}" height="${CH}" fill="var(--sys-orange)" opacity=".14"/>`;
  }).join('');

  const kindLegend = PARA_KINDS.map(k => `<span class="an-legend k-${k.key}"><i></i>${k.name}</span>`).join('')
    + `<span class="an-legend k-desc"><i></i>叙述</span>`;

  box.innerHTML = `
    ${r.chars < 300 ? '<div class="an-warn">正文较短，统计意义有限，建议至少 300 字。</div>' : ''}

    <div class="an-hero">
      <div class="an-hero-top">
        <div>
          <div class="an-hero-l">开篇钩子</div>
          <div class="an-hero-q">“${esc(r.hook.text)}”</div>
        </div>
        <div class="an-score ${g.cls}">
          <b>${r.hook.score}</b><span>${g.label}</span>
        </div>
      </div>
      <div class="an-hero-chips">
        ${r.hook.hits.map(h => h.hits.length
          ? `<span class="an-chip on">${h.name} ${h.hits.length}</span>`
          : `<span class="an-chip">${h.name} 0</span>`).join('')}
      </div>
      <div class="an-hero-foot">前 100 字占全文 ${hookRatio}%${r.hook.hits.every(h => !h.hits.length) ? ' · 开篇没有明显冲突/悬念/反常信号' : ''}</div>
    </div>

    <div class="an-tiles">
      <div class="an-tile"><b>${r.chars.toLocaleString()}</b><span>总字数</span></div>
      <div class="an-tile"><b>${r.mins} 分</b><span>阅读时长</span></div>
      <div class="an-tile"><b>${r.paras}</b><span>段落</span></div>
      <div class="an-tile"><b>${r.avg}</b><span>平均句长</span></div>
      <div class="an-tile"><b>${r.dRate}%</b><span>对话占比</span></div>
      <div class="an-tile"><b>${r.avgPara}</b><span>平均段长</span></div>
    </div>

    <div class="an-sec">
      <div class="an-sec-h">情绪曲线<span class="an-sec-s">逐段强度，越高峰值越高</span></div>
      <div class="an-curve">
        <svg viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none">
          ${flatZones}
          <path d="${path.d}" fill="none" stroke="var(--sys-pink)" stroke-width="1.1" stroke-linecap="round"/>
          <path d="${path.d} L${CW},${CH} L0,${CH} Z" fill="var(--sys-pink)" opacity=".10"/>
        </svg>
      </div>
      <div class="an-curve-x"><span>开头</span><span>中段</span><span>结尾</span></div>
      ${r.flat.length
      ? `<div class="an-note">发现 ${r.flat.length} 处平淡区（橙色带）：${r.flat.map(f => `第 ${f.from}–${f.to} 段 · ${f.wc} 字`).join('，')}</div>`
      : '<div class="an-note ok">没有连续 3 段以上的低强度区，节奏保持得住</div>'}
    </div>

    <div class="an-sec">
      <div class="an-sec-h">段落节奏<span class="an-sec-s">按字数成比例，颜色是功能</span></div>
      <div class="an-map">${mapHtml}</div>
      <div class="an-legend-row">${kindLegend}</div>
      <div class="an-note">前 25% 落在第 ${r.at(.25)} 段，中点在第 ${r.at(.5)} 段，3/4 处在第 ${r.at(.75)} 段</div>
    </div>

    <div class="an-sec">
      <div class="an-sec-h">句长分布<span class="an-sec-s">短句提速，长句压气氛</span></div>
      ${bucketHtml}
      ${r.longSents.length ? `<div class="an-note">最长的 ${r.longSents.length} 句（超 50 字），可考虑拆开：<div class="an-long">${r.longSents.map(x => `<div>· ${esc(x.s.slice(0, 60))}…<i>${x.n} 字</em></div>`).join('')}</div></div>` : ''}
    </div>

    <div class="an-sec">
      <div class="an-sec-h">人物<span class="an-sec-s">按出现次数排</span></div>
      ${r.people.length
      ? `<div class="an-people">${r.people.map(([n, c], i) => `<span class="an-person${i === 0 ? ' lead' : ''}">${esc(n)}<i>${c}</i></span>`).join('')}</div>`
      : '<div class="an-note">没识别出反复出现的人物名，可能通篇用「我/你/他」，也可能是称呼多变。</div>'}
      <div class="an-note">场景/时间切换 ${r.sceneShifts.length} 处${r.sceneShifts.length ? '：' + r.sceneShifts.slice(0, 6).map(s => `第 ${s.at} 段「${esc(s.word)}」`).join('，') : ''}</div>
    </div>

    <div class="an-sec">
      <div class="an-sec-h">重复用词<span class="an-sec-s">点一下看上下文</span></div>
      <div class="an-kw">${r.kw.length ? r.kw.map(k => `<button class="an-kw-item" data-w="${esc(k.w)}">${esc(k.w)}<i>${k.n}</i></button>`).join('') : '<span class="an-note">没有明显重复</span>'}</div>
      <div class="an-kw-out" id="anKwOut"></div>
    </div>

    <div class="an-sec">
      <div class="an-sec-h">诊断</div>
      <div class="an-diag">${diagnose(r)}</div>
    </div>

    <div class="an-foot">全部本地计算 · 规则统计，不判断好坏，只看结构</div>`;

  // 重复词点开看上下文
  const out = box.querySelector('#anKwOut');
  box.querySelectorAll('.an-kw-item').forEach(b => {
    b.onclick = () => {
      const w = b.dataset.w;
      const ctx = [];
      const raw = r.raw || '';
      let idx = -1;
      while ((idx = raw.indexOf(w, idx + 1)) >= 0 && ctx.length < 4) {
        const from = Math.max(0, idx - 14), to = idx + w.length + 14;
        ctx.push({ pre: raw.slice(from, idx), hit: w, post: raw.slice(idx + w.length, to) });
      }
      out.innerHTML = ctx.length
        ? ctx.map(c => `<div class="an-ctx">…${esc(c.pre.replace(/\n/g, ' '))}<em>${esc(c.hit)}</em>${esc(c.post.replace(/\n/g, ' '))}…</div>`).join('')
        : '';
    };
  });
}

function diagnose(r) {
  const o = [];

  // 钩子
  if (r.hook.score >= 76) o.push(['good', '开篇信号充足，冲突/悬念/反常至少踩中两样，可以对标成稿的钩子写法。']);
  else if (r.hook.score >= 50) o.push(['mid', '开篇有信号但不集中。短篇前 300 字内就该让人知道「出事了」，可以再压一版开头。']);
  else o.push(['bad', '开篇偏平，没有冲突、悬念、反常中的任何一项。读者极可能在这里划走，建议直接砍掉前两段从事件写起。']);

  // 句长
  if (r.avg > 34) o.push(['warn', `平均句长 ${r.avg} 字，偏长。碎片化阅读下超过 35 字容易断注意力，试试把长句拆成一长一短。`]);
  else if (r.avg < 13) o.push(['warn', `平均句长 ${r.avg} 字，偏碎。短句能提速，但连续太多会失去承载力，注意穿插长句换气。`]);
  else o.push(['good', `平均句长 ${r.avg} 字，读起来负担正常。`]);

  // 对话
  if (r.dRate > 55) o.push(['warn', `对话占比 ${r.dRate}%，偏高。几乎全是说话，场景和心理被挤掉了，读者会不知道人在哪。`]);
  else if (r.dRate < 15) o.push(['warn', `对话占比只有 ${r.dRate}%，基本是叙述。人物关系推进偏慢，加几句交锋会活起来。`]);
  else if (r.dRate > 45) o.push(['mid', `对话占比 ${r.dRate}%，略多。检查一下是不是每段都在说话，中间缺了停顿。`]);
  else o.push(['good', `对话占比 ${r.dRate}%，叙述与对白配比合适。`]);

  // 节奏
  if (r.flat.length >= 2) o.push(['bad', `有 ${r.flat.length} 处连续多段的低强度区，总长约 ${r.flat.reduce((a, f) => a + f.wc, 0)} 字。这些地方最容易掉读者，考虑压缩或加一个小反转。`]);
  else if (r.flat.length === 1) o.push(['mid', `第 ${r.flat[0].from}–${r.flat[0].to} 段（${r.flat[0].wc} 字）强度偏低，可以看下这段是不是必要的铺垫。`]);
  else o.push(['good', '情绪曲线没有明显塌陷，节奏是撑得住的。']);

  // 长段
  if (r.longParas.length) o.push(['mid', `有 ${r.longParas.length} 段明显偏长（最长 ${Math.max(...r.longParas.map(p => p.n))} 字）。手机上一屏显示不下，建议在段中找一处对话或动作切断。`]);

  // 体量（知乎盐选短篇常见 3000–15000 字）
  if (r.chars < 800) o.push(['mid', `全文 ${r.chars} 字，比一般短篇短很多。这个体量没有铺垫空间，钩子必须在 100 字内落地。`]);
  else if (r.chars > 18000) o.push(['mid', `全文 ${r.chars} 字，体量偏大。检查一下中段有没有可以并入副线的部分。`]);

  // 重复
  const top = r.kw[0];
  if (top && top.n >= 6) o.push(['warn', `「${top.w}」出现 ${top.n} 次，密度偏高，容易让读者觉得作者词汇不够。可以换几种说法。`]);

  return o.map(([lv, txt]) => `<div class="an-diag-item lv-${lv}"><span></span><div>${esc(txt)}</div></div>`).join('');
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
