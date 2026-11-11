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

/* ================= 6. 拆文助手 ================= */
const BEAT_TAGS = ['钩子', '身份', '冲突', '反转', '爽点', '情感', '高潮', '留白'];

VIEWS.analyze = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">拆文助手</div>
      <div class="pg-sub">粘贴全文，本地计算，不外传</div></div>
      <button class="btn btn-primary" id="anRun">${I.scan} 开始拆解</button></div>
    <div class="pg-body">
      <div class="analyze-grid">
        <div>
          <div class="section-label" style="margin-top:0">正文</div>
          <textarea class="ta" id="anText" placeholder="把小说全文粘进来…"></textarea>
        </div>
        <div id="anOut">
          <div class="empty">${I.empty}<div class="empty-t">还没有结果</div><div class="empty-d">粘贴正文后点击「开始拆解」</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    frag.querySelector('#anRun').onclick = () => {
      const t = frag.querySelector('#anText').value.trim();
      if (t.length < 50) { toast('至少 50 字才有得拆'); return; }
      renderReport(frag.querySelector('#anOut'), analyzeText(t));
    };
  }, 20);
  return frag;
};

function analyzeText(text) {
  const chars = text.replace(/\s/g, '').length;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const paras = lines.filter(l => l.length > 20);
  const sents = text.split(/[。！？!?…]/).map(s => s.trim()).filter(s => s.length > 4);
  const dialogN = (text.match(/[“"「].{1,80}?[”"」]/g) || []).length;
  const avg = sents.length ? Math.round(sents.reduce((a, s) => a + s.length, 0) / sents.length) : 0;
  const dRate = paras.length ? Math.round(dialogN / paras.length * 100) : 0;

  const chunk = Math.max(1, Math.ceil(paras.length / 8));
  const beats = BEAT_TAGS.map((tag, i) => {
    const seg = paras.slice(i * chunk, (i + 1) * chunk);
    return { tag, snippet: seg[0] ? seg[0].slice(0, 40) : '', wc: seg.join('').length };
  }).filter(b => b.wc > 0);

  // 高频词：按标点分句，2-4 字连续片段，过滤虚词
  const STOP = /[的了是在我你他她它们这那就也和与都还又很太更最一二三四五六七八九十上下里吗呢吧啊着过不没有说会能要可把被让给对从到]/;
  const cl = text.replace(/[^\u4e00-\u9fa5]/g, '|').split(/\|+/).filter(s => s.length >= 3);
  const freq = {};
  cl.forEach(c => {
    for (let n = 2; n <= 4; n++)
      for (let i = 0; i + n <= c.length; i++) {
        const w = c.slice(i, i + n);
        if (!STOP.test(w)) freq[w] = (freq[w] || 0) + 1;
      }
  });
  const cand = Object.entries(freq).sort((a, b) => b[1] * b[0].length - a[1] * a[0].length);
  const kw = [];
  for (const [w, c] of cand) {
    if (c < 2) continue;
    if (kw.some(k => k.includes(w) || w.includes(k))) continue;
    kw.push(w);
    if (kw.length >= 10) break;
  }
  return { chars, paras: paras.length, sents: sents.length, avg, dRate, beats, kw, hook: lines[0] ? lines[0].slice(0, 60) : '' };
}

function renderReport(box, r) {
  const mins = Math.max(1, Math.round(r.chars / 400));
  box.innerHTML = `
    <div class="hook-card"><div class="hl">开篇钩子</div><div class="hv">“${esc(r.hook)}”</div></div>
    <div class="stat-grid">
      <div class="stat-cell"><div class="sc-n">${r.chars.toLocaleString()}</div><div class="sc-l">总字数</div></div>
      <div class="stat-cell"><div class="sc-n">${mins} 分钟</div><div class="sc-l">阅读时长</div></div>
      <div class="stat-cell"><div class="sc-n">${r.paras}</div><div class="sc-l">有效段落</div></div>
      <div class="stat-cell"><div class="sc-n">${r.avg} 字</div><div class="sc-l">平均句长</div></div>
      <div class="stat-cell"><div class="sc-n">${r.dRate}%</div><div class="sc-l">对话密度</div></div>
      <div class="stat-cell"><div class="sc-n">${r.sents}</div><div class="sc-l">句子数</div></div>
    </div>
    <div class="section-label">高频词</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
      ${r.kw.map((k, i) => `<span class="tag ${i < 3 ? 'blue' : ''}">${esc(k)}</span>`).join('') || '<span class="tag">—</span>'}
    </div>
    <div class="section-label">结构节拍表</div>
    <div class="beat-list">
      ${r.beats.map((b, i) => `<div class="beat-item">
        <div class="beat-name">${b.tag}</div>
        <div class="beat-txt">${esc(b.snippet)}…
          <div class="beat-words">约 ${b.wc} 字 · 第 ${i + 1} 段</div>
        </div>
      </div>`).join('')}
    </div>
    <div class="section-label">节奏诊断</div>
    <div class="card-block" style="padding:16px;font-size:13px;line-height:1.8;color:var(--label-2)">${diagnose(r)}</div>
    <div style="text-align:center;font-size:11.5px;color:var(--label-3);padding:8px">本地规则计算，只作参考</div>`;
}

function diagnose(r) {
  const o = [];
  if (r.avg > 32) o.push('· 句子偏长（平均 ' + r.avg + ' 字），短篇读者耐性低，建议把长句拆成两拍。');
  else if (r.avg < 14) o.push('· 句子偏短（平均 ' + r.avg + ' 字），节奏快，适合爽点密集但要防碎。');
  else o.push('· 句子长度适中（平均 ' + r.avg + ' 字），阅读负担正常。');

  if (r.dRate > 45) o.push('· 对话密度偏高（' + r.dRate + '%），注意补足环境和心理描写。');
  else if (r.dRate < 12) o.push('· 对话偏少（' + r.dRate + '%），人物关系推进偏慢，可加交锋。');
  else o.push('· 对话密度 ' + r.dRate + '%，叙述与对白配比合理。');

  if (r.chars < 3000) o.push('· 全文 ' + r.chars + ' 字，属微型短篇，钩子必须在前 200 字内落地。');
  else if (r.chars > 12000) o.push('· 全文 ' + r.chars + ' 字，信息量大，注意分段留白。');
  return o.join('<br>');
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
