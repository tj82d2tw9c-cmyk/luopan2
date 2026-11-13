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
  names: '起名助手', tear: '拆文台', analyze: '审稿官', settings: '数据设置',
};

const VIEWS = {};
let curView = '';

function openApp(key) {
  curView = key;
  const v = VIEWS[key];
  // 标题查不到不要静默退成「罗盘」—— 上一版加了拆文台却忘了在 TITLES 里登记，
  // 结果窗口标题一直显示「罗盘」，看上去像是没实现，其实是漏了一个 key。
  $('#winTitle').textContent = TITLES[key] || (v ? '罗盘' : '罗盘（未知页面）');
  $('#winActions').innerHTML = '';
  const body = $('#winBody');
  body.innerHTML = '';
  body.scrollTop = 0;
  if (!v) {
    // 把 key 打出来，方便一眼看出是路由写错还是视图没注册
    body.innerHTML = `<div class="empty"><div class="empty-t">尚未实现</div>`
      + `<div class="empty-d">没有找到名为「${esc(key)}」的页面</div></div>`;
    if (window.console) console.warn('[openApp] 未注册的视图 key:', key, '已注册:', Object.keys(VIEWS).join(','));
  } else {
    body.appendChild(v());
  }
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
const SCENE_RE = /(房间|屋里|窗|门口|门|街|路|楼|车|办公室|厨房|客厅|卧室|电梯|走廊|阳台|医院|学校|银行|法院|物业|抽屉|桌上|椅子|柜台|楼梯|院子|车里|床上|沙发|桌子|床|雨|雪|风|阳光|灯|夜|墙)/g;
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
  // 另加一类：逼你签字、逼你认、逼你交东西 —— 家里人逼着办事，本身就是反常场面
  return /(敢|凭什么|滚|不许|闭嘴|离婚|分手|还回来|知道错|跪下|报警|告你|滚出去|别碰|放手|你疯了|谁让你|签啊|签字|快签|不签|认了|认吧|交出来|拿出来|别想|休想|骗我|撒谎|你骗|骗了|说清楚|讲清楚|算什么|凭什么)/.test(sent);
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
    // 概述：没有具体场面、没有对白、光在讲「我从小/我一直/后来我」。
    // 这种段落哪怕塞满「我觉得」「我知道」，也是在讲道理，不是在讲故事。
    const summarize = /(从小|一直以来|那段时间|后来我|这些年|总之|总的来说|可以说|应该说)/.test(p);
    const narrateTell = scene === 0 && verbs < 2 && dlgRatio < .1 && n > 40;
    // 空转：没动作、没新信息、没情绪，全在绕
    const empty = info < 3 && n > 45 && think === 0 && emo === 0;
    // 概述段：也算水，按半份计
    const vague = !empty && summarize && narrateTell && emo === 0;
    // 累积：有东西在往上走
    const accumulate = emo > 0 || verbs >= 3 || think >= 1;
    return { i, p, n, dlgRatio, verbs, think, scene, time, emo, info, empty, vague, summarize, accumulate };
  });
  const waterParas = paraInfo.filter(x => x.empty);
  const vagueParas = paraInfo.filter(x => x.vague);
  // 场景段：真的有现场。
  // 网文段落很短（十几二十字），不能按长文标准要求「一段三个动作」。
  // 判定：有人开口说话（对白）就算现场；或者有地点 + 至少一个动作。
  const sceneParas = paraInfo.filter(x => x.dlgRatio > .1 || (x.scene > 0 && x.verbs >= 1));
  const sceneRatio = paraInfo.length ? sceneParas.length / paraInfo.length : 0;
  // 纯对白段比例：全是「谁说了什么」，没有环境。也算现场，但不算好现场。
  const talkOnly = sceneParas.filter(x => x.scene === 0).length;
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
    Math.max(0, 10 - waterParas.length * 1.1 - vagueParas.length * .45) * .30
    + (holes.length === 0 ? 10 : Math.max(2, 10 - holes.length * 2.4)) * .22
    + Math.max(0, 10 - dupSec.length * 2.4) * .12
    + (headed ? 8.5 : 5.5) * .12
    // 场景密度：正文里有多少段是真在一个地方、有人在做动作
    + (sceneRatio >= .6 ? 10 : sceneRatio >= .4 ? 8.5 : sceneRatio >= .25 ? 6.5 : sceneRatio >= .1 ? 4 : 1) * .24);
  // 全篇没有一处现场 —— 这不是「稍微欠一点」，是文体不对，正文分不许超过 6
  const noScene = paraInfo.length >= 6 && sceneParas.length === 0;
  const readFinal = noScene ? Math.min(readScore, 6) : readScore;
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
    vagueParas, sceneParas, sceneRatio, talkOnly, noScene,
    curve, holes, overdraft, headPeaks, tailMax,
    people,
    cutIdx, cutHook, cutHasHook,
    promised, payoffs, delayed,
    lastSent, endScore,
    score: { lead: leadScore, read: readFinal, pay: payScore },
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

  /* 概述段：没有场面，只有交代 */
  if (r.vagueParas.length) {
    b += `<div class="sr-water">${r.vagueParas.slice(0, 4).map(x => `
      <div class="sr-water-row"><span class="sr-water-n">第 ${x.i + 1} 段</span>
        <span class="sr-water-t">${esc(x.p.slice(0, 48))}…</span>
        <em>交代</em></div>`).join('')}</div>`;
    b += `<p class="sr-red">这 ${r.vagueParas.length} 段是<b>在交代，不是在场</b>：没有地方、没有人在动手、没有一句话被说出来。概述句再多也不产生画面，读者记不住。改法只有一个 —— 挑其中一件事，把它<b>搬到一个具体的地方、让两个人开口</b>。</p>`;
  }

  /* 场景密度 */
  const sr = r.sceneRatio;
  if (r.noScene) {
    b += `<p class="sr-red">更严重的是：<b>全篇没有一处现场</b>。${r.paraInfo.length} 段里，没有一段发生在一个具体的地方、没有一句话是被人当面说出来的。这不是「写得平淡」，这是<b>文体不对</b> —— 写成了一篇自述，不是一篇小说。挂在哪里、谁先开的口、桌上放着什么，这些一个都没有。</p>`;
  } else if (sr < .25) {
    b += `<p class="sr-red">正文里能称得上「场景」的段落只占 <b>${Math.round(sr * 100)}%</b>（${r.sceneParas.length}/${r.paraInfo.length} 段）。交代和叙述挤掉了现场戏 —— 读者被讲了一路，但没有被放进任何一个房间里。</p>`;
  } else {
    b += `<p class="sr-dim">正文里能称得上「场景」的段落占 <b>${Math.round(sr * 100)}%</b>（${r.sceneParas.length}/${r.paraInfo.length} 段）。${sr >= .6 ? '这个比例是健康的 —— 大部分篇幅都在现场。' : '基本够用，但交代还可以再压一点。'}${r.talkOnly >= r.sceneParas.length * .6 && r.sceneParas.length >= 3 ? '<b>其中大部分是纯对白</b>：有人在说话，但没写清是在哪儿说的，画面还是虚的 —— 补一两句环境就能立住。' : ''}</p>`;
  }

  if (r.chars < 800) b += `<p class="sr-dim">全文不足 800 字，2-A / 2-B 的结论参考价值有限，重心应该全放在导语上。</p>`;
  const bLv = (r.waterParas.length >= 3 || r.vagueParas.length >= 4) ? 'bad'
    : (r.waterParas.length || r.vagueParas.length) ? 'warn' : 'good';
  o.push(srItem(2, '2-B', '节奏与水分', bLv, b));

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

  /* 全篇没有现场 —— 这条永远排第一，比改句子重要得多 */
  if (r.noScene) {
    const v = r.vagueParas[0] || r.paraInfo[Math.min(2, r.paraInfo.length - 1)];
    q('vague', '挑一段，把它写成一场戏', `全篇 ${r.paraInfo.length} 段，没有一处现场。现在这篇是「讲给读者听的」，要改成「让读者看见的」。只改一段就够，改完差别会很明显。`,
      v.p.slice(0, 44) + '…',
      '（改成：地点写死 —— 哪个屋、哪张桌子；让另一个人开口说原话；给一个手上的动作。三样齐了，这一段就活了）');
  }

  /* 概述段：不是删，是搬进现场 */
  else if (r.vagueParas.length >= 2 && r.waterParas.length < 2) {
    const v = r.vagueParas[0];
    q('vague', '把交代改成一场戏', `第 ${v.i + 1} 段在讲「事情是怎样的」，不是「当时发生了什么」。交代再多也不产生画面。挑一件事，把地点、人、那句话写出来。`,
      v.p.slice(0, 44) + '…',
      '（改成：写清楚是在哪个屋、哪张桌子前，谁先开的口，说了哪一句原话。一件具体的事顶十句概述）');
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
  } else if (r.endScore < 8) {
    q('last2', '把结尾最后一句收短', `现在是 ${r.lastSent.length} 字，句子把话说满了。留半句，读者才会替你说完。`, r.lastSent.slice(0, 40), `（删掉最后半句解释，只留动作或一句原话，让它停在没说出口的地方）`);
  }

  /* 三要素缺项 —— 比兜底句更具体，优先补 */
  r.threeEl.filter(e => !e.ok).forEach(e => {
    const hint = {
      id: `（在导语前三句内插一句身份：我今年多少岁、在哪儿、做什么、和对面这个人是什么关系）`,
      pres: `（把「你被什么压着」写成正在发生的事：不是「家里一直偏心」，而是「今天他把笔推到我面前」）`,
      goal: `（补一句「我必须做什么」：我要在明天之前把这件事弄清楚 / 我得把那张纸拿回来）`,
    }[e.key] || `（按「${e.hint}」补一句）`;
    q('three2', `补上「${e.name}」`, `${e.name}在导语里没有交代。${e.hint} —— 这一项缺了，读者代入就直接断了。`, `（导语里缺少「${e.name}」）`, hint);
  });

  /* 兜底：候选不够 3 条时，给一条通用的可执行改法，而不是少给 */
  if (cands.length < 3 && r.people.names.length <= 1) {
    q('name', '给对面那个人一个名字', '全篇只出现「我」，对面那个人的称呼是空的。读者恨不起来一个人，也记不住一个「他」。', '（通篇只有「我」，无人物名）', `（在导语第一次提到他时就给名字，之后每次冲突都叫这个名字）`);
  }
  if (cands.length < 3 && r.talkOnly >= 2) {
    q('env', '给对白补一句环境', '现在全靠对白在推进，读者听得到声音，看不到画面。在关键那几句对白前后各插一句环境。', `（第 ${(r.sceneParas[0] || r.paraInfo[0]).i + 1} 段附近）`, '（补一句：桌上放着什么、窗外是什么声音、他手上在做什么动作 —— 一句就够）');
  }
  if (cands.length < 3) {
    q('zip', '把重复的信息删一遍', '同一件事在文里说了两遍以上。留最靠前的那个位置，后面再出现就删 —— 读者不需要被提醒。', '（文中重复出现的同一件事实）', '（保留第一次出现，删掉后面的复述）');
  }
  if (cands.length < 3 && r.lastSent) {
    q('end2', '结尾加一句没答完的话', '结尾把事说完了，也把话关上了。留一个没有回答的问题，评论区才有地方站人。', r.lastSent.slice(0, 40), '（在最后加一句反问或一句没头没尾的原话，不要解释）');
  }

  /* 排序：先导语（最高优先级），再卡点，再正文 */
  const ORDER = { open: 0, three: 1, three2: 1.2, gap: 2, voice: 3, end: 4, cut: 5, over: 6,
    water: 7, vague: 7.5, name: 7.6, env: 7.7, zip: 7.8, last: 8, last2: 8.2, end2: 8.3 };
  cands.sort((a, b2) => ORDER[a.k] - ORDER[b2.k]);
  // 同一个标题只留一条，避免出现两条「补上 我是谁」
  const seen = new Set();
  const out = [];
  for (const c of cands) {
    if (seen.has(c.t)) continue;
    seen.add(c.t);
    out.push(c);
    if (out.length >= 3) break;
  }
  return out;
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
  // 正文层面：空转段落多，或者通篇在交代
  if (r.waterParas.length >= 2 || r.vagueParas.length >= 3) weak.push('2-B');
  // 场景密度过低 —— 这篇根本没有现场
  if (r.sceneRatio < .25 && r.paraInfo.length >= 6) weak.push('2-B');
  const uniq = [...new Set(weak)];
  const leadWeak = uniq.filter(x => x.startsWith('1-'));
  const firstFix = fix[0];
  const pointer = firstFix ? `先动 4-B 第一条（${firstFix.t}）` : '';
  const bodyOnly = r.sceneRatio < .2 && r.paraInfo.length >= 6 && leadWeak.length === 0;

  if (avg >= 8) return '能发。别自我怀疑了，把 4-B 那三条改完就送去投。';

  // 导语没问题、问题全在「正文没有现场」—— 这种情况最容易被误判成「写得还行」
  if (bodyOnly) {
    return `导语是好的，不用动。但这篇的问题是更大的：正文几乎没有现场，${r.paraInfo.length} 段里只有 ${r.sceneParas.length} 段真的把人放进了某个地方。概述撑不起一篇小说，读者读完记不住任何画面。先做 4-B 第一条，把其中一件事写成一场戏，别的先别改。`;
  }

  // 导语和正文都有问题，且正文是零场景 —— 别让作者以为只改开头就行
  if (r.noScene) {
    return `这篇不能投，而且是两处问题：开头没接住，正文也没有一处现场。${r.paraInfo.length} 段全在讲「事情是怎样的」，没有一段是「当时发生了什么」。别只改开头 —— 先挑正文里的一件事，改写成一场戏（4-B 第一条），有了这一场，开头该往哪儿写你自然就知道了。`;
  }

  if (avg >= 6.5) {
    // 导语过不过关，看的不是总分，而是导语内部有没有扣分项。
    // 导语 8 分但 1-A 掉分，说明第一句该换 —— 这时候说「导语别动」就是自相矛盾。
    if (s.lead >= 8 && leadWeak.length === 0) {
      return `导语这一关是过的（导语 ${s.lead}/10），不用再动 —— 再改容易改坏。真正掉分的是${uniq.length ? ' ' + uniq.join('、') + ' ' : '正文和卡点'}。${pointer}，其余别动。`;
    }
    if (leadWeak.length === 0) {
      return `导语没有明显硬伤，但整体还不够利。先动 ${uniq[0] || '3-A'}。${pointer}，改完再读一遍，剩下的问题你自己会看出来。`;
    }
    return `底子在，先改 ${leadWeak.slice(0, 2).join(' 和 ')}。${pointer}，改完再读一遍，剩下的问题你自己会看出来。`;
  }

  if (avg >= 5) return `这篇不能直接投。不是写得差，是${leadWeak.length ? '开头没接住 —— 先把第一句和三百字重写' : '整体还没立起来 —— 先从 4-B 第一条开始'}。`;
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

/* ================= 7. 拆文台 =================
   拆文和审稿是相反的方向：
   - 审稿是「这篇能不能投」，往坏处挑，用编辑标准
   - 拆文是「这篇有什么可学的」，往好处挖，用结构视角

   拆文的第一原则（skill 原文）：拆骨架，不抄桥段。
   所以这里所有输出都必须是「结构」和「公式」，不给「照这句写」。

   能力边界要说清楚：
   骨架表、篇幅公式、钩子类型、文风指纹 —— 这些是字面可算的，真算。
   底层动机、技法命名、伏笔的真实用途 —— 这些要理解「谁在演」，
   字面算不出来。这几项给「候选 + 提示 + 填空位」，不编造。
   ============================================================ */

/* ---------- 7.0 词表 ---------- */

// 功能定位必须是动词短语（skill 要求），不许用「铺垫」这种含糊词
// 一条规则 = 一个动作 + 一个可识别的信号
const TEAR_FUNC = [
  {
    key: 'start', name: '启动', hook: '启动',
    desc: '把读者按进一个已经开始的事件里，不给退路',
    test: (p, i, ctx) => i < ctx.n * .12 && /(^|[。！？\n])[^。！？\n]{0,10}(我|他|她)[^。！？\n]{0,6}(才知道|才知道|接到|收到|看见|听到|站在|跪在|发现)/.test(p),
  },
  {
    key: 'rule', name: '立规则', hook: '立规矩',
    desc: '把这个世界怎么运转摊开给读者，之后所有冲突都按这个规矩走',
    test: (p, i, ctx) => /(规矩|规矩|从来|一向|一直是|家里有个|我们家|不许|只能|必须|每次|按说)/.test(p) && i < ctx.n * .3,
  },
  {
    key: 'escalate', name: '加压', hook: '增压',
    desc: '对方把筹码往上抬，主角退无可退，读者开始替他算退路',
    test: p => /(又|再|还要|还得|不止|连同|而且|这一回|第二次|第三次|更狠|更绝)/.test(p) && /(说|问|让|逼|骂|摔|扔|推)/.test(p),
  },
  {
    key: 'clash', name: '撞车', hook: '正面对撞',
    desc: '两个人当面摊牌，谁都不肯让，读者的立场被迫选边',
    test: (p, i, ctx) => {
      const dlg = (p.match(/[“"「][^”」"]{2,}[”」"]/g) || []).length;
      return dlg >= 2 || (dlg >= 1 && /(说|问|答|吼|喊|骂)/.test(p) && p.length < 160);
    },
  },
  {
    key: 'reveal', name: '揭底', hook: '摊牌',
    desc: '把藏着的那件事翻出来，读者前面读到的意思全部改写',
    test: p => /(原来|其实|结果|没想到|真相|一直都是|根本就不是|从来没|一直瞒|这才知道|后来才知道|才明白|翻出来看|看了一遍|才发现|才发现那|签完合同|后来我才知道)/.test(p),
  },
  {
    key: 'flip', name: '反转', hook: '翻转',
    desc: '把读者的判断整个翻过来：以为的受害者其实是布局的人',
    test: p => /(可我|可实际上|反过来说|反倒是|谁知道|却不知道|恰恰|偏偏是|真正|才是那个)/.test(p),
  },
  {
    key: 'burst', name: '引爆', hook: '炸开',
    desc: '积压的情绪一次性倒出来，动作和短句顶到最满',
    test: (p, i, ctx) => {
      // 引爆是「积压之后的爆发」，前 15% 还没有积压，不判引爆
      if (i < Math.max(1, ctx.n * .15)) return false;
      // 只看「直接作用于人」的情绪词，像「痛子」「发痛」这种顺带提一句的不算
      const hard = (p.match(/(哭|吼|喊|骂|摔|砸|撕|扇|打|血|崩|疯|恨|尖叫|发抖|窒息|绝望|崩溃|滚|跪)/g) || []).length;
      // 爆发段的平均句长一定短
      const sents = trSents(p);
      const avgLen = sents.length ? sents.reduce((a, s) => a + s.length, 0) / sents.length : 999;
      const bangs = (p.match(/[！!]/g) || []).length;
      return (hard >= 3 && avgLen <= 26) || (hard >= 2 && avgLen <= 18) || (hard >= 2 && bangs >= 2);
    },
  },
  {
    key: 'cost', name: '付代价', hook: '代价落地',
    desc: '赢也付出了东西，读者松一口气的同时心里发沉',
    test: p => /(代价|失去了|再也没有|回不去|换来了|值得吗|后悔|一辈子|再也见不到|不能了)/.test(p),
  },
  {
    key: 'close', name: '收网', hook: '合上',
    desc: '把散着的人一个个安置好，留一句让读者替你说完的话',
    // 最后一节一定是收网；前面那一节只在明显是收束时才算
    test: (p, i, ctx) => i === ctx.n - 1 || (i === ctx.n - 2 && /(最终|判决|那套|判决给我|最后|再也没有|后来)/.test(p)),
  },
];

// 五种钩子，skill 规定只能这五种，指不出来就标「无钩子」
const TEAR_HOOK = [
  { key: 'suspense', name: '悬念', test: p => /[？?]\s*$/.test(p.trim()) || /(为什么|怎么回事|到底|是谁|怎么会|难道|我知道[他她]|我看见[他她]|被[他她]看见|察觉|发现了)/.test(p) },
  { key: 'flip', name: '反转', test: p => /(原来|其实|结果|没想到|却是|反倒是|真正|才是那个|根本不是)/.test(p) },
  { key: 'crisis', name: '危机', test: p => /(来不及|要出事|完了|糟了|马上|只剩|最后一|再不|快|危险|撑不住)/.test(p) },
  { key: 'identity', name: '身份', test: p => /(他是|她就是|竟然是|居然是|的身份|原来是他|原来是她|才知道他是|才知道她是)/.test(p) },
  { key: 'slap', name: '打脸', test: p => /(脸都|说不出话|哑口|傻|懵|不敢|低下头|脸色|一句话都|当场|闭嘴|没话可说)/.test(p) },
];

/* 留白式收尾：不算六种钩子里的一种，但也不能报「无钩子」。
   特征：全文最后一句极短（<=14 字）、没有情绪词、没有感叹号，
   却带一个具体的物件或动作（钥匙 / 留了一把 / 还放在抽屉）。
   网文里这是最常见的收法 —— 不点破，让读者自己去补最后那口气。 */
function trIsReserve(last, isFinal) {
  if (!isFinal) return false;
  const t = (last || '').trim();
  if (CN(t) > 14) return false;
  if (/[！!？?]/.test(t)) return false;
  // 注意括号：不写括号会被解析成 (A|B)[C]，等于白判
  const cue = /(钥匙|留下|留了|留着一把|放回|关上门|锁上|还在|一直|再也没|一个人|空着|安静)/.test(t);
  const bare = /[。，,]$/.test(t) && CN(t) >= 4 && CN(t) <= 10;
  return cue || bare;
}

// 角色功能：只能用一种（skill 要求），多合一 = 冗余角色信号
const TEAR_ROLE = [
  { key: 'lead', name: '主角', hint: '承受压力、做出选择的人' },
  { key: 'ant', name: '对抗者', hint: '把压力推过来的人' },
  { key: 'help', name: '助力者', hint: '替主角递信息、递台阶的人' },
  { key: 'wit', name: '见证者', hint: '在场但不动手，负责让读者有同伙' },
  { key: 'tool', name: '工具人', hint: '只出现一次，只提供一条信息' },
];

// 伏笔技法：skill 规定的六种
const TEAR_FORESHADOW = [
  { key: 'downplay', name: '降级陈述', test: (s) => /(顺口|随口|顺便|也就|不过|只是|没什么|不值得一提|谁也没在意)/.test(s) },
  { key: 'reverse', name: '反向真话', test: (s) => /[“"「][^”」"]{0,20}(我没|不是我|真的不|信不信|你爱信不信)[^”」"]{0,20}[”」"]/.test(s) },
  { key: 'reuse', name: '细节复用', test: () => false },  // 需要跨段比对，单独算
  { key: 'second', name: '二手信息', test: (s) => /(听说|据说|说是|转告|告诉我说|有人讲|传来)/.test(s) },
  { key: 'action', name: '动作即证据', test: (s) => /(手一抖|手停|指节|攥|捏|顿了一下|僵|退了半步|别过脸|不敢看)/.test(s) },
  { key: 'invert', name: '倒装伏笔', test: () => false },  // 需要时序判断，单独算
];

// 文风指纹：感官偏好（判断作者靠哪一路感官写现场）
const TEAR_SENSE = {
  sight: { name: '视觉', re: /(看见|看到|盯着|望着|看了|看了一遍|扫了一眼|目光|视线|红色|白色|黑色|亮|暗|光|影子|颜色|玻璃|屏幕|字|照片|一笔一划|放大)/g },
  sound: { name: '听觉', re: /(听见|听到|声音|响了|一响|响|安静|沉默|寂静|叫|喊|吼|哭|嗡|嘈杂|静得|电话那头)/g },
  touch: { name: '触觉', re: /(冷|热|烫|凉|湿|硬|软|疼|痛|抖|攥|捏|贴|碰到|摸着|粗糙|手心|出汗|发抖)/g },
};

// 小说腔（拆分时的负面信号，用于「最弱一环」）
const TEAR_SICK = {
  saybook: /(只见|此时此刻|就在这时|此时此地)/g,
  cliche: /(心中一紧|心如刀割|五味杂陈|百感交集|如遭雷击|犹如五雷轰顶|心情久久不能平静)/g,
  explain: /(因为我知道|我心里明白|我知道这意味着|我清楚地知道)/g,
  adverb: /(狠狠地|紧紧地|深深地|慢慢地|缓缓地|轻轻地|静静地)/g,
};

/* ---------- 7.1 文本切分（复用审稿官的分段/分句） ---------- */

function trParas(text) {
  return text.split(/\n+/).map(s => s.trim()).filter(Boolean);
}

function trSents(text) {
  // 保留结尾标点
  const out = [];
  const re = /[^。！？!?…\n]+[。！？!?…]*/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/* 按自然节切分：优先用原文小标题，否则按空行板块 + 字数比例 */
function trSections(paras) {
  const HEAD = /^(第[一二三四五六七八九十\d]+[章节]|[一二三四五六七八九十]+[、.]|\d+[、.]|【[^】]{1,12}】|#{1,3}\s)/;
  const hasHead = paras.some(p => HEAD.test(p) && p.length < 30);
  if (hasHead) {
    const secs = [];
    let cur = null;
    paras.forEach((p, i) => {
      if (HEAD.test(p) && p.length < 30) {
        cur = { title: p.replace(/^#+\s*/, ''), paras: [], start: i };
        secs.push(cur);
      } else if (cur) {
        cur.paras.push(p);
      } else {
        cur = { title: '开头', paras: [p], start: i };
        secs.push(cur);
      }
    });
    return secs.map((s, i) => ({ ...s, i }));
  }
  // 没有小标题：按「场景切换」切，而不是按段落数硬切。
  // 场景切换的信号：时间跳转 / 地点跳转 / 人称场景重置（从对白切到独白）
  const TIME_SW = /^(那天|第二天|第三天|第二天早上|晚上|后来|几天后|一周后|一个月后|开庭那天|那年|后来我|再后来|一直到|婚礼|葬礼|去年|三年前|十年后)/;
  const PLACE_SW = /^(酒店|医院|法院|派出所|家里|公司|车里|楼上|楼下|走廊|门口|庭上|那天晚上|那天下午)/;
  const secs = [];
  let cur = { title: '', paras: [], start: 0 };
  const minParas = Math.max(2, Math.round(paras.length / 8));   // 最少几段才成一节
  paras.forEach((p, i) => {
    const isScene = TIME_SW.test(p) || PLACE_SW.test(p);
    if (i > 0 && isScene && cur.paras.length >= minParas) {
      secs.push(cur);
      cur = { title: '', paras: [p], start: i };
    } else {
      cur.paras.push(p);
    }
  });
  if (cur.paras.length) secs.push(cur);

  // 节太少（少于 3 节）就按字数均分，保证骨架表有结构可言
  if (secs.length < 3 && paras.length >= 8) {
    secs.length = 0;
    const target = Math.ceil(paras.length / 4);
    for (let i = 0; i < paras.length; i += target) {
      secs.push({ title: '', paras: paras.slice(i, i + target), start: i });
    }
  }
  const total = paras.reduce((a, p) => a + p.length, 0);
  return secs.map((s, i) => ({ ...s, i, share: s.paras.join('').length / Math.max(1, total) }));
}

/* ---------- 7.2 功能定位 ---------- */

function trFuncOf(para, idx, ctx) {
  const hits = TEAR_FUNC.filter(f => {
    try { return f.test(para, idx, ctx); } catch { return false; }
  });
  const dlg = (para.match(/[“"「][^”」"]{2,}[”」"]/g) || []).length;
  const pos = ctx.n > 1 ? idx / (ctx.n - 1) : 0;   // 0 = 开头，1 = 结尾
  const pick = k => TEAR_FUNC.find(f => f.key === k);

  // 第 1 节永远是「启动」—— 这是结构事实，不靠信号判断。
  // 否则一节里只要出现「又说又扔」，就会被判成「加压」，开篇就没有开篇的样子了。
  // 只有一节时，它既是启动也是收网，优先按启动报（读者看到的首先是开场）。
  if (idx === 0) {
    return { ...pick('start') };
  }

  // —— 记分，而不是「谁先命中谁赢」——
  // 一节里出现「后来我才知道」不代表这一节就是揭底：如果这一节后面大半段
  // 都是当面顶（台词密集、有人让步），它的主动作其实是撞车，揭底只是开场的一句。
  const hitKey = new Set(hits.map(h => h.key));
  const scene = trSceneScore(para);   // 台词密度 / 短句密度 / 硬情绪密度
  const shot = {
    start: 0,
    rule: hitKey.has('rule') ? 1 : 0,
    escalate: hitKey.has('escalate') ? 1 : 0,
    clash: hitKey.has('clash') ? 1 : 0,
    reveal: hitKey.has('reveal') ? 1 : 0,
    flip: hitKey.has('flip') ? 1 : 0,
    burst: hitKey.has('burst') ? 1 : 0,
    cost: hitKey.has('cost') ? 1 : 0,
    close: hitKey.has('close') ? 1 : 0,
  };
  // 信号强度修正 —— 决定这一节的「主色」
  // 撞车不能只靠台词量：一节里只要有人说话就会被喂饱，三节连判撞车。
  // 撞车真正需要的是「来回」—— 有问有答、有人反驳、有人变脸。
  const exchange = trExchange(para);
  shot.clash += scene.talk * .7 + scene.turn * .5 + Math.min(3.2, exchange * .8);
  // 台词密度太低就是独白追踪，不可能是撞车 —— 这一条必须放在加分之后，
  // 否则「我请了假，跟了她一整天」这种纯叙述会被 exchange 硬拉成对峙
  if (scene.talk < .3) shot.clash = 0;
  else if (scene.talk < .45) shot.clash -= 1.2;
  // 封顶：撞车再强也只是撞车，不该因为对话多就压过揭底和反转。
  // 结构判断里「这一节揭示了什么」比「这一节吵得多凶」更高层。
  shot.clash = Math.min(shot.clash, 4.6);
  shot.burst += scene.hard * .8;
  shot.reveal += scene.newInfo * .7;
  // 强改写信号：出现「原来/其实/也就是说/根本就不是/才明白」这类词，
  // 说明这一节的作用是把前面读到的意思翻掉，不是吵架。
  // 这类词只要出现两次以上，就该盖过撞车 —— 吵架不会改写认知。
  const rewrite = (para.match(/(原来|其实|也就是说|换句话说|根本|从来没|一直|才明白|才知道|不是给|不是说|才想起)/g) || []).length;
  if (rewrite >= 2) shot.reveal += 2.2 + rewrite * .3;
  // 反转：把读者的判断整个翻过来。
  // 网文的反转经常只有一句话，「那是我哥」「其实是他」——
  // 靠的是「那/这/原来 + 是 + 一个具体身份」这个结构，不是形容词。
  //
  // 关键区别（这是拆文里最容易搞混的一处）：
  //   揭底 = 翻出一条新事实，前面没读过（「备注栏写的是借给我妈」）
  //   反转 = 先让读者认定 A，再把 A 推翻成 B（「你跟他多久了」→「那是我哥」）
  // 所以反转必须「先立后破」：本节前半要有一个被推翻的判断，后半才是答案。
  const flipSig = (para.match(/(那是我|那不是我|是我哥|是我姐|是我爸|是我妈|是我儿子|是我女儿|其实是我|竟是我|居然是我|根本就不是|才是那个|偏偏是|谁知道是)/g) || []).length;
  const flipIdx = para.search(/(那是我|那不是我|是我哥|是我姐|是我爸|是我妈|其实是我|竟是我|居然是我|根本就不是|才是那个)/);
  // 前半段要有「指控/猜测/以为」这类被推翻的判断
  const setup = /(你跟他|你是不是|我以为|我当是|我猜|难道|不会吧|是不是他|多久了)/;
  const hasSetup = flipIdx > 0 && setup.test(para.slice(0, flipIdx + 20));
  if (flipSig >= 1 && hasSetup) {
    shot.flip += 4.2 + flipSig * .6;
  } else if (flipSig >= 1 && /(愣|僵|安静|沉默|笑了)/.test(para)) {
    // 没有明确前置判断时，只给揭底级别的分 —— 它可能只是「翻出一条事实」
    shot.reveal += 1.6;
  }
  shot.escalate += (hitKey.has('escalate') ? 1 : 0) + scene.turn * .3;

  let top = null, topV = -1;
  ['reveal', 'flip', 'burst', 'clash', 'cost', 'escalate', 'rule', 'close'].forEach(k => {
    if (!shot[k]) return;
    // flip 与 reveal 分数接近时让 flip 胜出：揭底是把藏着的翻出来，
    // 反转是把读者的判断整个翻过去 —— 后者是更高一层的结构动作。
    const v = k === 'flip' ? shot[k] * 1.15 : shot[k];
    if (v > topV) { topV = v; top = pick(k); }
  });

  if (!top) {
    if (dlg >= 2) return { ...pick('clash'), soft: true };
    if (/(走|跑|推|拉|拿|放|转身|站|坐)/.test(para)) return { ...pick('escalate'), soft: true };
    top = pick('rule');
    return { ...top, soft: true, fallback: true };
  }

  // 「立规则」只在前 40%
  if (top.key === 'rule' && pos >= .4) {
    top = pos < .7 ? pick('escalate') : pick('close');
    return { ...top, soft: true };
  }
  // 「收网」只允许在后 25%
  if (top.key === 'close' && pos < .75) {
    top = hits.find(h => h.key !== 'close') || pick('escalate');
  }
  // 最后一节默认是「收网」—— 这是结构事实。唯一例外是它本身在引爆或反转：
  // 网文也常见「最后一节炸完就结束」，那种情况按引爆/反转报更准确。
  if (idx === ctx.n - 1 && !['burst', 'flip', 'reveal'].includes(top.key)) {
    return { ...pick('close'), soft: true };
  }
  return top;
}

/* 一节「像不像现场戏」：台词密度、短句、退让动作、硬信息量。
   拆文最忌讳用「命中了哪个词」定功能，得看这一节大部分字在干什么。 */
function trSceneScore(para) {
  const sents = trSents(para);
  const nSent = Math.max(1, sents.length);
  // 台词：带引号 + 「我说：」「他说，」这类转述都算
  const quoted = (para.match(/[“「"][^”」"]{2,}[”」"]/g) || []).length;
  const told = (para.match(/(我|他|她|妈|婆婆|爸|阿姨|小姑子|律师|法官)[^。！？\n]{0,4}(说|问|答|道|回|喊|吼|骂)[：:，,]?/g) || []).length;
  const talk = (quoted * 2 + told) / nSent;         // 每句有多少句是带台词的

  // 退让 / 变脸 / 动作结果：一场正面对峙总有人「让步」或「变脸」
  const turn = ((para.match(/(脸色|变脸|红了|白了|涨得通红|愣住|僵住|说不出|一句话都没说|没话|闭嘴|低下头|不敢|沉默|退了半|摔在|砸在|递过去|递给他|递给她)/g) || []).length);

  const hard = (para.match(/(哭|吼|喊|骂|摔|砸|撕|扇|打|血|崩|疯|恨|尖叫|发抖|窒息|绝望|崩溃|滚|跪|脸都)/g) || []).length;

  // 新信息：这一节里首次出现的凭据/数字/法律动作，粗略用「出现次数」估
  const newInfo = ((para.match(/(房产证|产权证|合同|协议|流水|账本|户口本|病历|诊断书|工资条|判决书|名单|截图|备注|转账|凭证|还款|签字|首付|贷款|\d+\s*[万千百块元天年月岁次条张页])/g) || []).length) / Math.max(1, nSent * .5);

  return { talk, turn, hard, newInfo };
}

/* 「来回」的次数：A 说 → B 答 → A 再说。
   一唱一和的对白是交代，一来一回的对白才是撞车。
   统计「说/问/答」这类说话动词后面跟着不同主语的切换次数 —— 切得越多，越像在吵。 */
function trExchange(para) {
  const SUBJ = /(我|他|她|妈|婆婆|爸|阿姨|小姑子|律师|法官|医生|陈砚|林晚)/g;
  const sents = trSents(para);
  let lastSubj = null, turns = 0;
  sents.forEach(s => {
    // 只看带说话动词的句子
    if (!/(说|问|答|道|回|喊|吼|骂|开口|接着)/.test(s)) return;
    const m = s.match(SUBJ);
    if (!m) return;
    const who = m[0];
    if (lastSubj && who !== lastSubj) turns++;
    lastSubj = who;
  });
  return turns;
}

/* 钩子：只看这一节最后 1~2 句 */
function trHookOf(section, isFinal) {
  const text = section.paras.slice(-2).join('');
  const last = (trSents(text).pop() || '').trim();
  if (!last) return { key: null, name: '无钩子', last: '' };
  const h = TEAR_HOOK.find(x => x.test(last));
  if (h) return { key: h.key, name: h.name, last };
  // 倒数第二句也算 —— 但只认「悬念/反转/身份」这三种需要铺垫的，
  // 「打脸」「危机」靠的是末句的即时冲击，往前挪一句就变成了别的事：
  // 比如「婆婆脸色沉下来」+「我说好，那我就不问了」，是主角让步，不是打脸。
  const sents = trSents(text);
  const second = sents[sents.length - 2] || '';
  const h2 = TEAR_HOOK.find(x => x.test(second) && ['suspense', 'flip', 'identity'].includes(x.key));
  if (h2) return { key: h2.key, name: h2.name, last: second, soft: true };
  // 全文最后一句的留白，是「收束」不是「无钩子」
  if (trIsReserve(last, isFinal)) return { key: 'reserve', name: '留白', last, soft: true };
  // 让步式节尾：主角吞下这一口，读者替他不甘 —— 这不是六种钩子里的任何一种，
  // 但网文大量这么收节（「我说好」「我没再说话」「我忍了」），报「无钩子」是误判
  if (/(我说好|我点头|我说行|我没再|我没说话|我没有说话|我没吭声|我忍|算了|随你|行吧|我没答应|我也没|我沉默|我不知道|我没问|我一次都没)/.test(last)) {
    return { key: 'yield', name: '让步', last, soft: true };
  }
  return { key: null, name: '无钩子', last };
}

/* ---------- 7.3 信息增量 ---------- */

// 信息增量 = 这一节新出现的「硬信息」：金额、证件、姓名、动作结果
// 只认「钱和量」的中文数字 —— 「三天」「一页」是时间副词，不是信息增量，
// 把它们列进表里只会把真正的凭据挤掉。
const CN_NUM = '[0-9零一二三四五六七八九十百千万两半]+';
const INFO_HARD = [
  { re: new RegExp(`${CN_NUM}\\s*(万|千|百|块|元|万元|万块|毛钱|块钱)`, 'g'), name: '金额' },
  { re: /(房产证|产权证|合同|协议|流水|账本|户口本|病历|诊断书|工资条|判决书|名单|截图|照片|短信|备注|转账|凭证|复印件)/g, name: '凭据' },
  { re: /(离婚|过户|报警|起诉|法院|派出所|分割|继承|放弃|按手|赔偿|取消婚礼)/g, name: '法律动作' },
  // 地点：网文的「跟进感」靠地点推进 —— 她去了银行、进了写字楼，都是读者在记账
  { re: /(银行|写字楼|中介|医院|法院|派出所|酒店|机场|车站|公司楼下|小区门口|马路对面|老家)/g, name: '地点' },
];

function trInfoGain(section, seen, allNames) {
  const text = section.paras.join('');
  const out = [];
  INFO_HARD.forEach(k => {
    const ms = text.match(k.re) || [];
    // 首次出现才叫「新增知情」，重复出现不算；但同一词在不同节重复出现要单独标出来
    const fresh = [...new Set(ms.filter(m => !seen.has(m)))];
    fresh.forEach(f => { seen.add(f); out.push({ type: k.name, v: f }); });
  });
  // 人物新出现：用全文的人名表来查，而不是对这一段单独再跑一次识别 ——
  // 开头一节只有一百多字，单段识别根本达不到门槛，角色永远上不了表。
  const names = (allNames && allNames.length) ? allNames.filter(n => text.includes(n)) : trFindNames(text);
  const freshNames = names.filter(n => !seen.has('@' + n));
  freshNames.forEach(n => { seen.add('@' + n); out.push({ type: '新人物', v: n }); });
  // 称谓角色（妈/婆婆/他）也算新人物，网文里这比名字常见得多
  if (allNames) {
    // 这一节里已经点名的具体称谓（婆婆/妈/小姑子…）
    const namedRoles = TEAR_ALIAS
      .filter(a => a.name !== '他' && a.name !== '她' && text.includes(a.name))
      .map(a => a.name);
    TEAR_ALIAS.forEach(a => {
      if (!new RegExp(a.re.source).test(text)) return;
      if (seen.has('@' + a.name)) return;
      if (a.name === '他' || a.name === '她') {
        // 已经有具体称谓了，代词指的就是那个人，不能再报一次
        if (namedRoles.length) return;
        // 全文已经认出了具名角色，代词多半是他/她 —— 也别报
        if (allNames.length) return;
        if (CN(text) < 40) return;
      } else if (!text.includes(a.name)) return;
      seen.add('@' + a.name);
      out.push({ type: '新人物', v: a.name });
    });
  }
  // 结局/后果：这一节交代了事情的结果，本身就是信息（不必有凭据）
  // 「结果」单用太泛 —— 「结果她没来」是转折，「结果出来了」才是结局，只认后者
  const ENDING = /(没办成|没结成|取消了|散了|结束了|离了|走了|再也没|最终|判了|分了|定下来了|散了场|人没了)/;
  if (ENDING.test(text)) {
    const m = text.match(/[^。！？\n]{0,10}(没办成|没结成|取消了|散了|结束了|离了|再也没|最终|判了|分了|定下来了|散了场|人没了)[^。！？\n]{0,10}/);
    if (m) out.push({ type: '结局', v: m[0].trim().slice(0, 16) });
  }
  // 兜底：这一节什么硬信息都没有，就描述它实际给了什么「软信息」
  if (!out.length) {
    const soft = [];
    // 反转句式也算认知改写 —— 「那是我哥」翻掉的是读者的判断，这就是信息
    if (/(原来|其实|结果|没想到|才明白|才知道|那是我|不是我|其实是我|根本就不是|才是那个)/.test(text)) {
      soft.push({ type: '认知', v: '读者的判断被推翻' });
    }
    if (/[？?]/.test(text)) soft.push({ type: '悬置', v: '抛出一个未答的问题' });
    if (/(从此|之后|再也不|再也|最后|终于)/.test(text)) soft.push({ type: '节点', v: '时间推进，局面变了' });
    if (!soft.length) {
      const sent = trSents(text)[0] || text;
      soft.push({ type: '无增量', v: sent.slice(0, 16) + (sent.length > 16 ? '…' : '') });
    }
    out.push(...soft.slice(0, 2));
  }
  // 一节最多报 4 条：凭据一多就变成罗列，读者看不出这一节的重点
  // 金额 > 法律动作 > 凭据 > 人物 > 结局，按这个优先级留
  const RANK = { 金额: 0, 法律动作: 1, 凭据: 2, 地点: 3, 结果: 4, 结局: 4, 新人物: 5 };
  return out
    .map((x, i) => ({ x, i, r: RANK[x.type] ?? 5 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, 4)
    .map(o => o.x);
}

/* 人名识别：中文姓名用「姓 + 1~2 字」+ 上下文动词，别误抓普通词 */
const SURNAME = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫经房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公';
const NOT_NAME = /^(时候|现在|以后|之前|地方|东西|事情|样子|问题|办法|原因|意思|感觉|眼睛|手上|门口|屋里|窗外|桌上|床上|男人|女人|孩子|同学|同事|朋友|医生|护士|警察|妈妈|爸爸|爷爷|奶奶|哥哥|姐姐|弟弟|妹妹|一个|这个|那个|什么|怎么|为什|是不|可以|都不|都是|都没|都|也|还|就|不|没|这|那|一|有|在|是|和|的|了|着|过|要|会|能|说|看|想|知|觉|问|答|走|来|去|回|给|让|把|被|从|到|对|向|于|为|以|因|所|但|却|而|又|再|很|太|更|最|只|才|已|正|刚|将|曾)/;

/* 「姓 + 名」里的姓在中文里也是常用名物字，如下词一旦命中必然不是人名。
   例：「房子」「房本」的「房」在百家姓里；用前缀匹配，因为后面常跟「的/里/上」 */
const NOT_PERSON = /^(房子|房屋|房门|房本|房产|婚前|婚事|婚房|婚姻|金额|金钱|金毛|白天|白色|石头|石阶|高处|高山|温和|和平|平时|平安|钱包|钱款|费用|马路|路上|江湖|沙子|林子|丁香|花盆|瓜子|米色|成功|成天|宁静|敌人|方向|向前|关爱|关怀|叶子|车站|车门|东西|左右|后代|简单|管家|包子|关系|关节|程序|颜色|童话|文学|文件|文本|资料|会议|家里|家人|家常|家长)[^\\u4e00-\\u9fa5]?$/;

/* 常见名字用字 —— 用来判断「姓后面跟的到底像不像名字」 */
const GIVEN = /^[伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超兰霞平刚桂香文华建国志红玉杰云鹏辉婷颖琳鑫浩宇轩然琪瑶嘉怡欣悦晨阳琳哲睿哲楠蕾薇萱蕊菲妍姿娇媛婉娴淑贞慧贤良德福禄寿喜财旺发富贵荣华龙凤鹤松柏梅兰竹菊荷莲萍蓉]/;

function trFindNames(text) {
  const cand = {};
  const re = new RegExp(`[${SURNAME}][\\u4e00-\\u9fa5]{1,2}`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const w = m[0];
    if (CN(w) < 2) continue;
    if (NOT_NAME.test(w)) continue;
    if (NOT_PERSON.test(w)) continue;                                 // 「房子」「婚前」不是人
    // 后面紧跟「的/里/上/们/子/们」的，是在用名词，不是在叫人
    const after = text.slice(m.index + w.length, m.index + w.length + 1);
    if (/[的里上们边面时后前]/.test(after)) continue;
    // 取 2 字版和 3 字版都记，最后按出现次数和「像不像名字」加权
    const w2 = w.slice(0, 2);
    cand[w2] = (cand[w2] || 0) + 1;
    if (w.length === 3) cand[w] = (cand[w] || 0) + 1;
  }

  // 「我叫 XXX」「我是 XXX」「XXX 说」—— 自我介绍是零成本的人名来源，
  // 网文开篇几乎必写一句「我叫陈砚，今年三十二」，靠次数门槛永远捞不到
  const selfRe = /(?:我叫|我是|名字叫|他们叫我)([\u4e00-\u9fa5]{2,3})(?=[，,。、\s]|今年|住在|在)/g;
  let sm;
  while ((sm = selfRe.exec(text))) {
    const w = sm[1];
    if (NOT_NAME.test(w) || NOT_PERSON.test(w)) continue;
    // 自我介绍的人是「我」，不是新角色 —— 记在 meNames 里，不进角色表
    cand['#' + w] = 99;
  }

  // 打分：出现次数 + 名字用字 + 「后面跟着说话/动作」的上下文
  const scored = Object.keys(cand).map(w => {
    let s = cand[w] * 2;
    if (w[0] === '#') return { w: w.slice(1), n: 99, s: 99, isMe: true };
    if (GIVEN.test(w.slice(1))) s += 3;
    // 上下文：名字后面紧跟「说/问/看/站/…」或「，」「：」
    const ctxRe = new RegExp(`${w}(说|问|答|道|笑|看|站|坐|走|把|从|，|：)`, 'g');
    const ctxN = (text.match(ctxRe) || []).length;
    s += ctxN * 2.5;
    // 名字前有「跟/对/和/让/叫/是」更可信
    const frontRe = new RegExp(`(跟|对|和|让|叫|是|着)${w}`, 'g');
    s += (text.match(frontRe) || []).length * 2;
    return { w, n: cand[w], s };
  });

  // 门槛：至少出现 2 次（自我介绍的直接放行），且分数 >= 7。
  // 只看分数不看次数会放进「陈砚」这种自我介绍里出现一次的名字 ——
  // 那是我，不是配角；而「林晚」出现四次却因为「晚」字不常见而落榜。
  let list = scored.filter(x => x.isMe || (x.n >= 2 && x.s >= 7)).sort((a, b) => b.s - a.s);
  const keep = [];
  list.forEach(x => {
    if (keep.some(k => k.length > x.w.length && k.startsWith(x.w.slice(0, 1)) && k.includes(x.w.slice(1, 2)))) return;
    if (keep.includes(x.w)) return;
    keep.push(x.w);
  });
  // 长名优先：若同时存在「林岚」和「林」类，只留长的
  // 自我介绍的人（「我叫陈砚」）从角色表里剔掉 —— 那是我本人，
  // 第一人称本来就有一行「我」，再列一遍就变成「陈砚是对抗者」这种荒谬结论
  return keep.filter(w => !scored.some(x => x.isMe && x.w === w)).slice(0, 8);
}

/* 从「我叫 XXX」「我是 XXX」里取出叙事者自己的名字。
   坑：「我是」后面接的是谓语时到处都是（「我是他妹妹」「我是来问的」），
   而且「把我叫到客厅」里的「叫到客」也会被误抓。所以：
   ① 只认「我叫」，不认「我是」——「我是」太泛；
   ② 后面必须是语句边界，或「今年/住在/在…做」。 */
function trMeName(text) {
  const m = text.match(/(?:^|[。！？\n，,])\s*(?:我叫|我的名字叫|我名字叫)([\u4e00-\u9fa5]{2,3})(?=[，,。、\s]|今年|住在|在[^，。]{0,6}(做|上班|工作))/);
  if (!m) return '';
  const w = m[1];
  if (NOT_NAME.test(w) || NOT_PERSON.test(w)) return '';
  // 名字里不该出现动词和方位词
  if (/(到|去|来|在|把|被|让|给|说|问|看|走|回|出|进)/.test(w)) return '';
  return w;
}

/* ---------- 7.4 情绪落点 ---------- */

/* 情绪落点 = 这一节把读者带到多高。
   关键在「落点」两个字：看的是这一节收在哪，不是整节的平均值。
   一整节在铺垫、最后一句炸开，读者的感受是「顶格」；
   一整节在吵架、最后一句散掉，读者反而泄气。所以节尾权重更高。 */
function trEmotion(section) {
  const all = section.paras.join('');
  const tail = section.paras.slice(-2).join('');   // 节尾两段 = 落点
  const n = Math.max(1, CN(all));

  const HARD = /(哭|吼|喊|骂|摔|砸|撕|扇|打|血|死|崩|疯|恨|痛|疼|尖叫|发抖|窒息|绝望|崩溃|滚|跪|喘|抖|脸都|红了|白了|涨得)/g;
  const SOFT = /(脸色|变脸|愣|僵|沉默|说不出话|一句话都没说|没话|低下头|不敢|咬牙|冷笑|声音很平|静了几秒|停了|看了很久|很久|一遍又一遍)/g;
  const TENSE = /(不是|而是|却|偏偏|竟然|居然|根本|从来|一直|原来|其实|也就是说|换句话说)/g;

  const cnt = (re, s) => (s.match(re) || []).length;
  const bangAll = cnt(/[！!]/g, all), askAll = cnt(/[？?]/g, all);
  const bangTail = cnt(/[！!]/g, tail), askTail = cnt(/[？?]/g, tail);

  // 整节：给一个底（这一节整体有多热）
  const body = cnt(HARD, all) * 2.2 + cnt(SOFT, all) * 1.5 + cnt(TENSE, all) * .9
    + bangAll * 1.2 + askAll * .7;
  // 节尾：给一个尖（这一节收在哪）
  const tailRaw = cnt(HARD, tail) * 3.4 + cnt(SOFT, tail) * 2.4 + cnt(TENSE, tail) * 1.3
    + bangTail * 2.2 + askTail * 1.2;

  // 节尾按「每百字」折算，避免长节尾天然占优；但设上限，防止两句话就封顶
  const tailScore = Math.min(14, tailRaw * Math.min(1.6, 120 / Math.max(20, CN(tail))));
  const bodyScore = body * Math.min(1.5, 160 / n);

  return { score: +(tailScore * 1.5 + bodyScore).toFixed(1), lv: 'mid', name: '上扬' };
}

/* ---------- 7.5 篇幅公式 ---------- */

function trShape(secs, paras) {
  const total = paras.reduce((a, p) => a + p.length, 0) || 1;
  return secs.map(s => ({
    ...s,
    chars: s.paras.join('').length,
    share: s.paras.join('').length / total,
  }));
}

/* ---------- 7.6 人物表里分离 ---------- */

/* 称谓与代称：网文里大多数人根本不给名字，用这个补。
   re 里刻意避开了「家人/家里人」—— 「都是一家人」是套话，不是角色 */
const TEAR_ALIAS = [
  { re: /(婆婆|丈母娘|公公|岳父|岳母)/g, name: '婆婆', role: 'ant', skip: /一家人|全家人/ },
  { re: /(我妈|妈妈|母亲|妈)/g, name: '妈', role: 'help' },
  { re: /(我爸|爸爸|父亲|爸)/g, name: '爸', role: 'help' },
  { re: /(前夫|老公|丈夫|未婚夫|男朋友|男友)/g, name: '他', role: 'ant' },
  { re: /(前妻|老婆|妻子|未婚妻|女朋友|女友)/g, name: '她', role: 'ant' },
  { re: /(哥哥|姐姐|弟弟|妹妹|我哥|我姐|她哥|她姐|他哥|他姐)/g, name: '哥/姐', role: 'help' },
  { re: /(律师|法官|医生|护士|警察|班主任|老板|经理)/g, name: '专业人士', role: 'help' },
  { re: /(伴娘|闺蜜|同学|同事)/g, name: '朋友', role: 'wit' },
];

function trPeople(paras, names) {
  const text = paras.join('\n');
  const rows = [];

  const positionsOf = needle => {
    const pos = [];
    paras.forEach((p, i) => { if (p.includes(needle)) pos.push(i); });
    return pos;
  };

  // 1) 主角：第一人称。开篇如果写了「我叫陈砚」，把这个真名挂到「我」上，
  //    否则读者会在人物表里找不到主角的名字，也会把它当成一个配角落。
  const meN = (text.match(/我/g) || []).length;
  const thirdN = (text.match(/[他她]/g) || []).length;
  const isFirstPerson = meN > thirdN * 1.2 && meN >= paras.length;
  const meName = trMeName(text);
  if (isFirstPerson) {
    rows.push({
      name: meName ? '我（' + meName + '）' : '我', cnt: meN, first: 1, last: paras.length, role: TEAR_ROLE[0],
      beh: ['承受压力', '做出选择'], dlg: [], isMe: true, multi: false,
    });
  } else if (meName) {
    // 第三人称但写了「我叫」的情况少见，仍然当作主角
    rows.push({
      name: meName, cnt: Math.max(1, (text.match(new RegExp(meName, 'g')) || []).length),
      first: 1, last: paras.length, role: TEAR_ROLE[0],
      beh: ['承受压力', '做出选择'], dlg: [], isMe: true, multi: false,
    });
  }

  // 2) 有名字的角色
  names.forEach(nm => {
    const pos = positionsOf(nm);
    if (!pos.length) return;
    rows.push({
      name: nm, cnt: pos.length, first: pos[0] + 1, last: pos[pos.length - 1] + 1,
      role: null, beh: [], dlg: [], multi: false,
    });
  });

  // 3) 用称谓补（只在没有名字时才用，避免同一个角色出现两次）
  //    阈值要高：一篇写婚礼的稿子里出现两次「爸」，不代表性爸是个角色
  if (rows.filter(r => !r.isMe).length < 3) {
    TEAR_ALIAS.forEach(a => {
      let hits = (text.match(a.re) || []).length;
      // 「一家人」「全家人」里的称谓不算 —— 那是套话不是人
      if (a.skip) hits -= ((text.match(a.skip) || []).length * 1);
      if (hits < Math.max(3, paras.length * .06)) return;
      if (rows.some(r => r.name === a.name)) return;
      const pos = positionsOf(a.name.split('/')[0]);
      if (!pos.length) return;
      rows.push({
        name: a.name, cnt: hits, first: pos[0] + 1, last: pos[pos.length - 1] + 1,
        role: TEAR_ROLE.find(r => r.key === a.role), beh: [], dlg: [], multi: false, alias: true,
      });
    });
  }

  // 4) 「他 / 她」当角色：只在「代词量明显盖过已知角色」时才补。
  //    不能只判断「有没有名字」—— 一篇写着婆婆的稿子里「她」指的就是婆婆，
  //    再多列一条「她」，人物表就变成同一个人占两行。
  const knownN = rows.filter(r => !r.isMe)
    .reduce((a, r) => a + (text.split(r.name).length - 1), 0);
  // 已经认出具体人（林晚/婆婆）时，「她」几乎必然指的是那个人 —— 网文一篇里
  // 很少同时有两个女性角色，代词合并比单列更接近事实。
  const hasNamedWoman = rows.some(r => !r.isMe && /林晚|她|婆婆|妈|姐姐|妹妹|小姑子/.test(r.name));
  const hasNamedMan = rows.some(r => !r.isMe && /他|前夫|老公|爸/.test(r.name));
  if (rows.filter(r => !r.isMe).length === 0 || knownN < 3) {
    ['他', '她'].forEach(t => {
      if (t === '她' && hasNamedWoman) return;
      if (t === '他' && hasNamedMan) return;
      const n = (text.match(new RegExp(t, 'g')) || []).length;
      // 有明显更多的代词才认，否则这几处「她」就是已经识别出来的那个人
      if (n < 4 || n <= knownN * 1.5) return;
      rows.push({ name: t, cnt: n, first: 1, last: paras.length, role: null, beh: [], dlg: [], multi: false });
    });
  }

  // 5) 补全：角色功能、表层行为、矛盾信号
  const nSec = Math.max(2, paras.length);
  rows.forEach(p => {
    if (!p.role) {
      const spread = (p.last - p.first) / nSec;
      if (p.cnt >= nSec * 1.6) p.role = TEAR_ROLE[0];
      else if (p.cnt >= 2 && spread >= .25) p.role = TEAR_ROLE[1];
      else if (p.cnt === 1 || (p.last - p.first) <= 1) p.role = TEAR_ROLE[4];
      else p.role = TEAR_ROLE.find(r => r.key === 'help');
    }
    // 表层行为：这个人的名字/代称后面紧跟的动词
    const beh = [];
    const vlist = VERB_RE.source.replace(/^\//, '').replace(/\/g$/, '');
    const re = new RegExp(`${p.name === '我' ? '我' : p.name}[^。！？\\n]{0,10}?(${vlist})`, 'g');
    let m;
    while ((m = re.exec(text))) {
      if (m[1] && !beh.includes(m[1])) beh.push(m[1]);
    }
    p.beh = (p.isMe ? ['承受压力', '做出选择'] : beh.slice(0, 4));
    // 矛盾：围绕这个人既有「给/让/护」又有「抢/瞒/逼」。
    // 必须按【每一处出现】的近场窗口判，不能把整篇里所有出现点拼起来 ——
    // 拼起来必然两部分都有，任何人都会被判成「有相反行为」。
    // 判据：同一处出现点附近同时有「给」和「抢」，才说明这个人做事前后不一致。
    let both = 0, giveN = 0, takeN = 0;
    let mi;
    const pRe = new RegExp(p.name === '我' ? '我' : p.name, 'g');
    while ((mi = pRe.exec(text))) {
      const win = text.slice(Math.max(0, mi.index - 14), mi.index + 20);
      const g = /(给|递|让|帮|护|挡|替|端|夹)/.test(win);
      const t = /(拿|抢|夺|占|瞒|骗|逼|推|扔|甩)/.test(win);
      if (g) giveN++;
      if (t) takeN++;
      if (g && t) both++;
    }
    // 至少要有两处「同一句里既给又抢」，才叫这个人身上有两种相反行为
    p.multi = both >= 2 && giveN >= 2 && takeN >= 2;
    p.contradictory = p.multi;
  });

  // 6) 排序：主角在最前，其余按出现次数
  rows.sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0) || b.cnt - a.cnt);

  // 代词归并：一篇里出现了「林晚」，那文中的「她」多半就是在说她。
  // 把代词的次数加到唯一那个同性角色上，并在名字后面标注 ——
  // 否则人物表里会出现「林晚」和「她」两行，看着像两个人在抢同一个人。
  const FEMALE = /(林晚|婆婆|妈|姐姐|妹妹|小姑子|女儿|妻子|老婆|前妻|闺蜜|伴娘)/;
  const MALE = /(前夫|老公|丈夫|爸|哥哥|弟弟|儿子|男友)/;
  const named = rows.filter(r => !r.isMe);
  if (named.length) {
    ['她', '他'].forEach(t => {
      const n = (text.match(new RegExp(t, 'g')) || []).length;
      if (n < 3) return;
      const pool = named.filter(r => (t === '她' ? FEMALE : MALE).test(r.name));
      if (pool.length !== 1) return;          // 有多个同性角色时，代词指谁不确定，不归并
      const host = pool[0];
      host.cnt += n;
      host.alias2 = t;                        // 渲染时显示成「林晚（她）」
      host.merged = n;
    });
  }

  return {
    list: rows.slice(0, 8),
    redundant: rows.filter(p => p.multi && !p.isMe).map(p => p.name),
    isFirstPerson,
  };
}

/* ---------- 7.7 伏笔与回收 ---------- */

function trForeshadow(paras) {
  const found = [];
  const used = new Set();

  // 1) 细节复用：同一个具体物件在前后两处出现，且第二次语义变了
  //    OBJ 里刻意剔掉了「门、窗、灯」这类到处都是的背景物 —— 它们出现的次数多、
  //    但从来不承载语义，报出来只会让作者以为自己在埋伏笔。
  const OBJ = /(钥匙|手机|病历|房产证|合同|戒指|照片|截图|流水|账本|信封|平安扣|抽屉|手表|项链|镜子|伞|外套|烟盒)/g;
  const objPos = {};
  paras.forEach((p, i) => {
    let m;
    const re = new RegExp(OBJ.source, 'g');
    while ((m = re.exec(p))) {
      const o = m[1];
      (objPos[o] = objPos[o] || []).push({ i, sent: trSents(p).find(s => s.includes(o)) || p.slice(0, 40) });
    }
  });
  Object.keys(objPos).forEach(o => {
    const list = objPos[o];
    if (list.length < 2) return;
    const a = list[0], b = list[list.length - 1];
    // 同一段里出现两次不算「复用」—— 那是一次性提到，没有间隔就没有伏笔
    if (b.i - a.i < 2) return;
    used.add(o);
    found.push({
      v: o, at: a.i + 1, back: b.i + 1,
      guess: '以为只是个随手提到的物件',
      real: '同一个东西在关键处改变了含义',
      type: '细节复用',
      a: a.sent.slice(0, 36), b: b.sent.slice(0, 36),
    });
  });

  // 2) 降级陈述 / 二手信息 / 反向真话 / 动作即证据
  paras.forEach((p, i) => {
    trSents(p).forEach(s => {
      if (s.length < 6 || s.length > 70) return;
      for (const t of TEAR_FORESHADOW) {
        if (t.key === 'reuse' || t.key === 'invert') continue;
        if (!t.test(s)) continue;
        // 已经归到细节复用的物件不再重复报
        if ([...used].some(o => s.includes(o))) return;
        const key = t.key + s.slice(0, 8);
        if (found.some(f => f.type === t.name && f.a === s.slice(0, 36))) continue;
        found.push({
          v: t.name, at: i + 1, back: null,
          guess: t.key === 'downplay' ? '真的只是个无关紧要的交代'
            : t.key === 'second' ? '只是个旁人的闲话'
              : t.key === 'reverse' ? '角色在狡辩'
                : '只是一个多余的小动作',
          real: t.key === 'downplay' ? '其实埋的是后面反转要用的关键事实'
            : t.key === 'second' ? '用第三人的嘴把真相提前说了，读者不信'
              : t.key === 'reverse' ? '说的是实话，但当时没人信'
                : '这个动作本身说明背后有一整件事',
          type: t.name, a: s.slice(0, 36), b: '',
        });
        break;
      }
    });
  });

  // 3) 倒装伏笔：中后段出现「回忆 / 那年 / 后来才知道」把之前的事补全
  paras.forEach((p, i) => {
    if (i < paras.length * .15) return;
    const m = p.match(/[^。！？\n]{0,20}(那年|那时候|多年前|以前|后来才知道|后来我才知道|事后|回想起来)[^。！？\n]{0,30}/);
    if (!m) return;
    if (found.some(f => f.type === '倒装伏笔' && f.a.slice(0, 8) === m[0].slice(0, 8))) return;
    found.push({
      v: '倒装伏笔', at: i + 1, back: null,
      guess: '一开始读不出这是在补前情',
      real: '回溯补述，把前面含糊的地方钉死',
      type: '倒装伏笔', a: m[0].slice(0, 36), b: '',
    });
  });

  // 4) 只埋不收：前 1/3 埋的凭据类物件，全文再没出现第二次
  const early = paras.slice(0, Math.max(2, Math.floor(paras.length / 3)));
  const CUE = /(合同|房产证|病历|流水|账本|判决书|名单|截图|转账|短信|备注)/g;
  early.forEach((p, i) => {
    let m;
    const re = new RegExp(CUE.source, 'g');
    while ((m = re.exec(p))) {
      const o = m[1];
      const total = (paras.join('').match(new RegExp(o, 'g')) || []).length;
      if (total === 1) {
        if (found.some(f => f.v === o)) continue;
        found.push({
          v: o, at: i + 1, back: null,
          guess: '以为后面会有用',
          real: '埋了没收 —— 这条线断了',
          type: '断线', a: trSents(p).find(s => s.includes(o))?.slice(0, 36) || '', b: '', broken: true,
        });
      }
    }
  });

  return found;
}

/* ---------- 7.8 文风指纹 ---------- */

function trStyle(text, paras) {
  const sents = trSents(text);
  const lens = sents.map(s => CN(s)).filter(n => n > 0);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const shortN = lens.filter(n => n <= 12).length;
  const shortRatio = lens.length ? shortN / lens.length : 0;
  const longN = lens.filter(n => n >= 40).length;

  // 高频词：先按标点和虚词把长串切开，再取 2~3 字的片段，
  // 否则会切出「我是在婚」这种跨词边界的东西
  const STOP = new Set(['的', '了', '我', '你', '他', '她', '是', '在', '不', '就', '和', '也', '都', '说', '着', '有', '这', '那', '一', '个', '上', '里', '到', '要', '会', '没', '还', '被', '把', '给', '对', '好', '又', '过', '得', '地', '很', '但是', '然后', '因为', '所以', '什么', '怎么', '一个', '这个', '那个', '我们', '你们', '他们', '自己', '时候', '现在', '知道', '觉得', '可以', '没有', '就是', '不是', '还是', '已经', '起来', '出来', '过来', '下来', '一样', '这样', '那样', '什么', '东西', '事情', '时候']);
  const STOP_CH = '的了是我你他她不在就也和都说着有这那个上里到要会没还被把给对好又过得地很但然因为所以什么怎一个我你们';
  const freq = {};
  const chunks = text.split(/[^\u4e00-\u9fa5]+/);
  chunks.forEach(ch => {
    if (ch.length < 2) return;
    for (let len = 3; len >= 2; len--) {
      for (let i = 0; i + len <= ch.length; i++) {
        const w = ch.slice(i, i + len);
        if (STOP.has(w)) continue;
        // 首尾是虚词就不算一个词
        if (STOP_CH.includes(w[0]) || STOP_CH.includes(w[w.length - 1])) continue;
        freq[w] = (freq[w] || 0) + 1;
      }
    }
  });
  // 只留出现 >= 3 次的，且更长的词优先（避免「房子」和「那套房子」同时上榜）
  const rawTop = Object.entries(freq).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  const top = [];
  rawTop.forEach(([w, n]) => {
    if (top.length >= 3) return;
    if (top.some(t => t.w.includes(w) || w.includes(t.w))) return;
    top.push({ w, n });
  });
  // 实在没有高频词，就取出现最多的 2 字词
  if (!top.length) {
    const any = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    any.forEach(([w, n]) => top.push({ w, n }));
  }

  // 视角
  const meN = (text.match(/我/g) || []).length;
  const thirdN = (text.match(/[他她][们]?/g) || []).length;
  const pov = meN > thirdN * 1.5 ? '第一人称' : thirdN > meN * 1.5 ? '第三人称' : '第一人称偏多';
  // 视角破例：第一人称里出现「他不知道 / 她心里想」这类上帝视角
  const breach = [];
  if (pov.startsWith('第一')) {
    const re = /[他她](心里|心想|暗自|偷偷地想|不知道|没意识到|并不知道)[^。！？\n]{0,18}/g;
    let m;
    while ((m = re.exec(text))) breach.push(m[0].slice(0, 22));
  }

  // 对话占比
  // 网文大量用「我说：xxx」「他说，xxx」这种不带引号的转述，也得算进去，
  // 否则一篇通篇对白的稿子会被算成「几乎不用对白」（实测 34% 被算成 2%）
  // 用「我/他/她/称谓 + 说」而不是 `[汉字]{2}` —— 后者会吃掉句首的「那天晚上我」
  const DLG_SUBJ = '(我|他|她|妈|我妈|爸|我爸|婆婆|阿姨|小姑子|律师|法官|医生|警察|班主任|老板|经理|老公|前夫|闺蜜|伴娘)';
  const quotedRe = /[“「"][^”」"]{2,}[”」"]/g;
  const toldRe = new RegExp(`${DLG_SUBJ}(说|问|答|道|回|喊|吼|骂)[：:，,]?[^。！？\\n]{2,40}`, 'g');
  const dlgChars = CN((text.match(quotedRe) || []).join(''));
  const toldChars = CN((text.match(toldRe) || []).join(''));
  const dlgTotal = dlgChars + toldChars;
  const dlgRatio = CN(text) ? dlgTotal / CN(text) : 0;
  // 说明占比里有多少是「带引号」的，用来区分对话形态
  const dlgQuoted = CN(text) ? dlgChars / CN(text) : 0;
  // 对话是在推进还是交代：带引号的行 + 转述里带对抗词的都算推进
  const dlgLines = (text.match(quotedRe) || []).slice(0, 200);
  const plusTold = (text.match(toldRe) || []);
  const allDlg = dlgLines.concat(plusTold);
  const pushN = allDlg.filter(s => /[？?]|(不|别|滚|敢|凭什么|签|走|离婚|分手|还|必须|给我|取消|还给我)/.test(s)).length;
  const dlgMode = dlgRatio < .08 ? '几乎不用对白'
    : pushN / Math.max(1, allDlg.length) > .45 ? '推进剧情' : '交代信息';

  // 感官
  const senses = Object.keys(TEAR_SENSE).map(k => {
    const n = (text.match(TEAR_SENSE[k].re) || []).length;
    const ex = (text.match(new RegExp(`[^。！？\\n]{0,14}${TEAR_SENSE[k].re.source.replace(/\/g$/, '')}[^。！？\\n]{0,14}`, 'g')) || [])[0] || '';
    return { key: k, name: TEAR_SENSE[k].name, n, ex: ex.slice(0, 30) };
  }).sort((a, b) => b.n - a.n);
  const senseTop = senses[0];
  const senseWin = senseTop && senseTop.n >= 3 ? senseTop.name : '不明显';

  // 句子节奏：短句多 = 快，长句多 = 慢
  // 阈值按网文标定 —— 网文平均句长 15 字左右，25 字以上就算拖。
  // 用「平均句长」和「短句占比」两个指标一起判，单看一个会误判
  // （这篇 avg 18.9 / 短句 23%，按旧阈值被判成「慢，长句多」，其实一句超长句都没有）
  const pace = avg <= 14 || shortRatio >= .5 ? '快，靠短句推'
    : avg >= 28 ? '慢，长句多'
      : shortRatio >= .3 ? '中速偏快，长短交错' : '中速，偏叙述';

  return { avg: +avg.toFixed(1), shortRatio: +shortRatio.toFixed(2), longN, top, pov, breach: breach.slice(0, 3), dlgRatio: +dlgRatio.toFixed(2), dlgQuoted: +dlgQuoted.toFixed(2), dlgMode, senses, senseTop: senseWin, pace, nSents: lens.length };
}

/* ---------- 7.9 平台标准 ---------- */

const TEAR_PLATFORM = {
  zhihu: {
    name: '知乎盐选',
    focus: '导语钩子 + 信息差',
    checks: ['前 300 字有没有把人钉住', '读者和主角之间的信息差在不在', '每节结尾有没有钩子'],
  },
  fanqie: {
    name: '番茄短篇',
    focus: '爽点密度 + 节奏',
    checks: ['多久出第一个爽点', '爽点之间的间隔有多长', '有没有连续两节不推进'],
  },
  jinjiang: {
    name: '晋江/长佩',
    focus: '人物弧光 + 情感浓度',
    checks: ['人物有没有变化', '情感浓度是不是一直在线', '配角是不是只服务于主角'],
  },
  wechat: {
    name: '公众号/散文',
    focus: '叙述视角 + 情绪落点',
    checks: ['第一句能不能立住', '情绪的落点在不在最后', '有没有从具体走到抽象'],
  },
  none: { name: '不确定', focus: '通用结构', checks: ['骨架成不成立', '每一节有没有功能', '结尾有没有留住人'] },
};

/* ---------- 7.10 主分析 ---------- */

function tearText(text, opt) {
  const paras = trParas(text);
  const n = paras.length;
  const chars = CN(text);
  const secs0 = trSections(paras);
  const secs = trShape(secs0, paras);
  // 功能判断看的是「第几节，共几节」，不是段落数 —— 传错会让「最后一节」永远判不出来
  const ctx = { n: secs.length, chars, nPara: n };
  // 人名先于骨架表算 —— 每一节的「新人物」都要靠全文人名表来核对
  const names = trFindNames(text);

  // —— 第 1 步：骨架表 ——
  const seenInfo = new Set();
  const skeleton = secs.map((s, i) => {
    const main = s.paras.join('');
    const f = trFuncOf(main, i, ctx);
    const hook = trHookOf(s, i === secs.length - 1);
    const info = trInfoGain(s, seenInfo, names);
    const emo = trEmotion(s);
    return {
      i: i + 1, title: s.title, chars: s.chars, share: s.share,
      func: f.name, funcKey: f.key, funcDesc: f.desc, soft: !!f.soft,
      info, emo, hook,
      first: s.paras[0].slice(0, 32),
    };
  });

  // 情绪落点改成全文内部排名：最高的那 1/3 是「顶格」，最低的 1/3 是「压低」。
  // 绝对阈值会让「一篇平缓的稿子」全部落在压低档，读者看不出哪一节最使劲。
  const emoSorted = [...skeleton].sort((a, b) => a.emo.score - b.emo.score);
  const nS = emoSorted.length;
  emoSorted.forEach((s, k) => {
    // 只有一节时按中性报，不硬分三档
    const lv = nS < 3 ? 'mid' : k >= nS * 2 / 3 ? 'high' : k < nS / 3 ? 'low' : 'mid';
    s.emo.lv = lv;
    s.emo.name = lv === 'high' ? '顶格' : lv === 'mid' ? '上扬' : '压低';
  });
  // 但「揭底 → 揭底」是网文最常见的递进结构：先揭一层（照片/合同），
  // 再揭更深一层（备注栏的字不一样）。这不叫重复，叫揭开洋葱。
  // 判据：两节揭的信息类型是否有重合 —— 完全同类才算撞车。
  const dupSec = [];
  for (let i = 1; i < skeleton.length; i++) {
    const a = skeleton[i - 1], b = skeleton[i];
    if (a.funcKey !== b.funcKey || a.funcKey === 'clash') continue;
    if (a.funcKey === 'reveal') {
      // 两节各自揭了哪些类别的凭据（数字/凭据/法律动作/新人物）
      const ta = new Set(a.info.map(x => x.type));
      const tb = new Set(b.info.map(x => x.type));
      const overlap = [...tb].filter(t => ta.has(t)).length;
      // 重叠不到一半，说明揭的是另一层东西 → 递进，不报
      if (tb.size && overlap / tb.size < .5) continue;
      // 完全没揭到新东西（两节都是软信息）→ 那才是真的原地打转
      if (!tb.size) continue;
    }
    dupSec.push({ a: a.i, b: b.i, func: b.func });
  }

  // 无钩子的节
  const noHook = skeleton.filter(s => !s.hook.key);

  // —— 篇幅公式 ——
  const formula = skeleton.map(s => `${Math.round(s.share * 100)}% ${s.func}`);

  // 段落号 → 节号。人物表和伏笔表都要用，所以放在前面定义。
  const paraToSec = p => {
    let acc = 0;
    for (let i = 0; i < secs.length; i++) {
      acc += secs[i].paras.length;
      if (p < acc) return i + 1;
    }
    return secs.length;
  };

  // —— 第 2 步：人物 ——
  // trPeople 算出来的是【段落号】，但报告里说的是【第几节】。
  // 不换算就会出现「第 1—44 节」这种全文只有 4 节的荒谬输出。
  const people0 = trPeople(paras, names);
  const people = {
    ...people0,
    list: people0.list.map(p => ({
      ...p,
      first: paraToSec(Math.max(0, p.first - 1)),
      last: paraToSec(Math.max(0, p.last - 1)),
    })),
  };

  // —— 第 3 步：伏笔 ——
  const fores = trForeshadow(paras).map(f => ({
    ...f,
    at: paraToSec(f.at - 1),
    back: f.back ? paraToSec(f.back - 1) : null,
    atPara: f.at, backPara: f.back,
  })).filter(f => {
    // 换算成节号之后，同节内部的两次出现不算伏笔 —— 伏笔靠的是间隔
    if (f.back && f.back === f.at) return false;
    return true;
  });

  // —— 第 5 步：文风 ——
  const style = trStyle(text, paras);

  // —— 第 0 步：值不值得拆 ——
  const weird = Object.keys(TEAR_SICK).reduce((a, k) => a + (text.match(TEAR_SICK[k]) || []).length, 0);
  const sceneCount = paras.filter(p => /[“「"]/.test(p) || (/(走|跑|推|拉|拿|站|坐|递|转身)/.test(p) && /(门|屋|桌|窗|街|院|床|椅|楼)/.test(p))).length;
  const sceneRatio = n ? sceneCount / n : 0;
  const hasMachine = skeleton.some(s => ['reveal', 'flip'].includes(s.funcKey));
  const hasBurst = skeleton.some(s => s.funcKey === 'burst');

  // 核心机关：按结构特征判定，不是猜剧情
  let machine;
  if (hasMachine && people.redundant.length) machine = '靠「有人一直在演」抓住读者 —— 读者比主角多知道一层';
  else if (hasMachine) machine = '靠一次揭底抓住读者 —— 前面读到的意思被整体改写';
  else if (hasBurst && skeleton.filter(s => s.funcKey === 'clash').length >= 2) machine = '靠连续正面对撞抓住读者 —— 冲突一场接一场，读者停不下来';
  else if (sceneRatio >= .5) machine = '靠现场感抓住读者 —— 每一段都发生在一个具体的地方';
  else machine = '没有明显的机关 —— 结构上是平的';

  // 最强一招：取最像「可迁移技法」的那一节
  let best = null, bestScore = -1;
  skeleton.forEach(s => {
    let sc = 0;
    if (s.hook.key === 'flip') sc += 3;
    if (s.hook.key === 'suspense') sc += 2;
    if (s.funcKey === 'reveal') sc += 2.5;
    if (s.funcKey === 'flip') sc += 3;
    if (s.hook.soft) sc -= 1;
    sc += s.emo.score * .15;
    if (sc > bestScore) { bestScore = sc; best = s; }
  });
  const bestMove = best ? {
    sec: best.i,
    name: best.funcKey === 'reveal' ? '揭底把前文整体改写'
      : best.funcKey === 'flip' ? '反转换掉读者的判断'
        : best.hook.key === 'flip' ? '用反转当钩子收节'
          : best.hook.key === 'suspense' ? '用悬念卡住节尾'
            : '用对撞把节推下去',
    why: best.funcDesc,
  } : null;

  // 最弱一环
  const weak = [];
  if (weird >= 2) weak.push({ k: '小说腔', d: `出现 ${weird} 处套话/说书腔，这些词是「写出来的」痕迹，别学` });
  if (dupSec.length) weak.push({ k: '原地打转', d: `第 ${dupSec[0].a} 节和第 ${dupSec[0].b} 节都在「${dupSec[0].func}」，功能重复` });
  if (noHook.length) weak.push({ k: '节尾没钩子', d: `第 ${noHook.slice(0, 3).map(s => s.i).join('、')} 节结尾是平的，读者容易在这一节离开` });
  const broken = fores.filter(f => f.broken);
  if (broken.length) weak.push({ k: '埋了不收', d: `「${broken.slice(0, 2).map(f => f.v).join('」「')}」埋下去再没出现，这条线断了` });
  if (style.breach.length) weak.push({ k: '视角破例', d: `第一人称里出现 ${style.breach.length} 处上帝视角，比如「${style.breach[0]}」` });
  if (people.redundant.length) weak.push({ k: '角色冗余', d: `「${people.redundant[0]}」身上同时有两种相反行为，可以拆成两个人，或者砍掉一个` });

  // 值不值得拆
  const worth = (hasMachine || hasBurst) ? 'worth' : sceneRatio < .2 && !hasMachine ? 'no' : 'partial';

  return {
    raw: text, chars, nParas: n, nSecs: skeleton.length,
    skeleton, formula, dupSec, noHook,
    people, fores,
    style,
    sceneRatio,
    machine, bestMove, weak,
    worth,
    platform: opt.platform || 'zhihu',
    depth: opt.depth || 'std',
    goal: opt.goal || '',
    weird,
  };
}

/* ---------- 7.11 技法库（给公式，不给句子） ---------- */

// 每条技法：名称 / 原文怎么用 / 公式 / 适用赛道
// 只用结构特征触发，不编造剧情
const TEAR_TECH = [
  {
    k: 'hookFlip', name: '节尾翻转当钩子',
    test: r => r.skeleton.filter(s => s.hook.key === 'flip').length >= 1,
    used: r => {
      const s = r.skeleton.find(x => x.hook.key === 'flip');
      return `第 ${s.i} 节收在「${s.hook.last.slice(0, 20)}」这种把话翻过来的句子上`;
    },
    formula: '让读者在这一节建立判断 → 在最后一句把判断的对象换掉（不是加新信息，是换主语/换动机）→ 不给解释就断节。读者必须往下读才能确认自己有没有被骗。',
    track: '悬疑、复仇、婚恋',
  },
  {
    k: 'infoHold', name: '信息差前置',
    test: r => r.skeleton.some(s => s.funcKey === 'reveal') && r.people.list.some(p => p.contradictory),
    used: () => '有一节专门用来「揭底」，而揭底前每个角色都在按另一套逻辑行事',
    formula: '先让 A 当着读者的面做一件不合理的事 → 读者以为 A 是坏的 → 中段揭示 A 做的每件事都有一个读者不知道的理由 → 重读一遍时会发现 A 从来没说过一句假话。',
    track: '知乎盐选、反套路、家庭伦理',
  },
  {
    k: 'objectReuse', name: '同一物件的语义反转',
    test: r => r.fores.some(f => f.type === '细节复用'),
    used: r => {
      const f = r.fores.find(x => x.type === '细节复用');
      return `「${f.v}」在第 ${f.at} 节是闲笔，第 ${f.back} 节变成关键证据`;
    },
    formula: '选一个日常物件，第一次出现时只作为背景（不给特写、不解释来源）→ 中间至少隔两节不再提 → 第二次出现时让它承载一个读者没想到的功能（证明/证伪/认人）→ 只写物件的状态变化，不写「我忽然明白了」。',
    track: '通吃',
  },
  {
    k: 'downplay', name: '降级陈述（把关键写成闲笔）',
    test: r => r.fores.some(f => f.type === '降级陈述'),
    used: r => {
      const f = r.fores.find(x => x.type === '降级陈述');
      return `第 ${f.at} 节用「${f.a}」这种口气把关键事实带过去`;
    },
    formula: '把最关键的一条事实，用「顺便说一句」「也就那样」「当时谁也没在意」的口气塞进一个不重要的场景里 → 关键句不能单独成段，必须挂在一个动作后面 → 回收时只字不提这是一句伏笔。',
    track: '悬疑、现实家庭',
  },
  {
    k: 'actionProof', name: '动作即证据',
    test: r => r.fores.some(f => f.type === '动作即证据'),
    used: () => '有人一句话没说，但手上的动作已经把答案给了',
    formula: '要表达「他心里有事」，不写心理，写一个不该出现的动作（手停在半空 / 先看了一眼门 / 把东西往里推了推）→ 动作必须是这个人「平时不会做」的 → 旁人可以注意到，但不要点破。',
    track: '通吃',
  },
  {
    k: 'secondHand', name: '二手信息埋线',
    test: r => r.fores.some(f => f.type === '二手信息'),
    used: () => '关键信息是从第三者嘴里说出来的，而不是当事人',
    formula: '让一个不重要的人在闲聊里说出一条真相 → 主角当时不信或不以为意 → 后段由当事人自己确认时，读者会回头翻那句闲话。第三者说完必须消失，不能返场解释。',
    track: '悬疑、复仇',
  },
  {
    k: 'shortBurst', name: '短句压强',
    test: r => r.style.shortRatio >= .45,
    used: r => `短句（≤12 字）占 ${Math.round(r.style.shortRatio * 100)}%，平均句长 ${r.style.avg} 字`,
    formula: '在情绪最高点，把这一段的句子长度砍到平时的一半 → 连续三句不超过 12 字 → 第四句再放开。短句不承载信息，只承载节奏；信息全放在长句里。',
    track: '番茄短篇、复仇',
  },
  {
    k: 'sensory', name: '单一感官锚定',
    test: r => r.style.senses[0] && r.style.senses[0].n >= 4,
    used: r => `全篇偏向${r.style.senseTop}，比如「${(r.style.senses[0].ex || '').slice(0, 18)}」`,
    formula: '一篇只锚定一种感官，反复出现同一种 → 换场时同一种感官再现，读者会自动接上「还是同一件事」→ 其他感官只在转折处出现一次，作为信号。',
    track: '公众号、散文',
  },
  {
    k: 'deadEnd', name: '先给绝路再给出口',
    test: r => r.skeleton.filter(s => s.funcKey === 'escalate' || s.funcKey === 'clash').length >= 2,
    used: () => '连续两节都在加压/对撞，逼到读者开始替主角算退路',
    formula: '连续两节只做一件事：把主角的选择一个个删掉 → 每删掉一个都要有一个具体的人或物（不是「情况越来越糟」这种抽象描述）→ 删到只剩一个读者认为「绝对不可能」的选项 → 主角选它。',
    track: '番茄短篇、复仇、婚恋',
  },
];


VIEWS.tear = () => {
  const frag = el('div', 'page');
  frag.innerHTML = `
    <div class="pg-head"><div><div class="pg-title">拆文台</div>
      <div class="pg-sub">拆骨架，不抄桥段 —— 把一篇爆款拆成能套到你自己题材上的结构</div></div>
      <button class="btn btn-primary" id="trRun">${I.scan} 开始拆解</button></div>
    <div class="pg-body">
      <button class="btn btn-sec" id="trBack" style="display:none;margin-bottom:14px">← 改原文</button>
      <div class="analyze-grid">
        <div class="an-input" id="trInput">
          <div class="section-label" style="margin-top:0">原文<span class="an-input-n" id="trCount">0 字</span></div>
          <textarea class="ta" id="trText" placeholder="把要拆的文章粘进来…&#10;&#10;短篇建议整篇贴。段落之间空一行，骨架表会按段落切节。&#10;有小标题的话，会按小标题切。"></textarea>
          <div class="an-opts">
            <label><span>平台</span>
              <select class="sel" id="trPlatform">
                <option value="zhihu">知乎盐选</option>
                <option value="fanqie">番茄短篇</option>
                <option value="jinjiang">晋江/长佩</option>
                <option value="wechat">公众号/散文</option>
                <option value="none">不确定</option>
              </select>
            </label>
            <label><span>深度</span>
              <select class="sel" id="trDepth">
                <option value="std">标准（推荐）</option>
                <option value="fast">速拆（只出骨架）</option>
                <option value="deep">精拆（多给仿写）</option>
              </select>
            </label>
          </div>
          <div class="an-opts">
            <label style="flex:1"><span>学习者目标</span>
              <input class="sel tr-goal-input" id="trGoal" placeholder="想写什么类型？填了会多给一份套用建议" />
            </label>
          </div>
          <div class="an-input-bar">
            <button class="btn btn-sec" id="trClear">${I.trash} 清空</button>
            <button class="btn btn-sec" id="trLoad">${I.empty} 读示例</button>
          </div>
        </div>
        <div id="trOut">
          <div class="empty">${I.empty}<div class="empty-t">还没有结果</div><div class="empty-d">粘贴文章后点击「开始拆解」</div></div>
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    const ta = frag.querySelector('#trText');
    const cnt = frag.querySelector('#trCount');
    const inputWrap = frag.querySelector('#trInput');
    const out = frag.querySelector('#trOut');
    const backBtn = frag.querySelector('#trBack');
    const pfSel = frag.querySelector('#trPlatform');
    const dpSel = frag.querySelector('#trDepth');
    const goalIn = frag.querySelector('#trGoal');
    const upd = () => { cnt.textContent = (CN(ta.value) || 0).toLocaleString() + ' 字'; };
    ta.addEventListener('input', upd);
    upd();

    const run = () => {
      const t = ta.value.trim();
      if (CN(t) < 200) { toast('至少 200 字才拆得出骨架'); return; }
      const r = tearText(t, { platform: pfSel.value, depth: dpSel.value, goal: goalIn.value.trim() });
      renderTear(out, r);
      if (window.innerWidth <= 560) {
        inputWrap.classList.add('min');
        backBtn.style.display = '';
        // 输入区已经折叠，顶部的「开始拆解」就没有对象了 —— 留着只会和「改原文」挤在一起
        const runBtn = document.querySelector('#trRun');
        if (runBtn) runBtn.style.display = 'none';
        const wb = $('#winBody');
        if (wb) wb.scrollTop = 0;
      } else {
        const wb = $('#winBody');
        if (wb) wb.scrollTop = 0;
      }
    };
    backBtn.onclick = () => {
      inputWrap.classList.remove('min');
      backBtn.style.display = 'none';
      const rb = frag.querySelector('#trRun');
      if (rb) rb.style.display = '';
      ta.focus();
    };
    frag.querySelector('#trRun').onclick = run;
    frag.querySelector('#trClear').onclick = () => {
      ta.value = ''; upd();
      inputWrap.classList.remove('min');
      backBtn.style.display = 'none';
      const rb = frag.querySelector('#trRun');
      if (rb) rb.style.display = '';
      out.innerHTML = '<div class="empty">' + I.empty + '<div class="empty-t">还没有结果</div><div class="empty-d">粘贴文章后点击「开始拆解」</div></div>';
    };
    frag.querySelector('#trLoad').onclick = () => {
      ta.value = TEAR_SAMPLE; upd();
      // 示例是内置的，读完直接拆 —— 让用户再点一次「开始拆解」是多余的一步
      run();
      toast('已载入示例并拆好了');
    };
  }, 20);
  return frag;
};


/* ---------- 7.13 页面 ---------- */

const TEAR_SAMPLE = `我是在婚礼前三个小时才知道，新郎那边还开着一桌。

酒店三楼，我穿着婚纱站在走廊尽头，听见婆婆的声音从包间里漏出来——"她那边的亲戚先别安排，等客人走了再说。"

我手里的捧花掉在地上，玫瑰砸在地毯上，一点声音都没有。

伴娘小周扯了扯我的袖子，说你别冲动。我说我不冲动，我就是想听清楚。

我推开门。满桌的人在看我，筷子悬在半空，酒还没倒。婆婆脸上那点笑僵住了，随即又活过来，说你怎么来了，快回去补妆。

我说阿姨，那一桌是谁。

她说不就是老家来的几个亲戚嘛，坐不下。

我说坐不下，所以让我爸妈先别进来。

她说你这孩子怎么这么不懂事，今天是你的好日子。

我说好日子，就是让我爸妈站在门外等着？

桌上有人开始劝，说都是一家人，别在这儿闹。我说一家人，那就把我爸妈叫进来一起吃。

婆婆的脸沉下来了，她把手里的酒杯往桌上一放，说你要是这样，这婚今天别结了。

我说行。

我转身回走廊，把裙摆提起来，走得很快。小周追上来，说你疯了吗，宾客都到了。

我说宾客是来看婚礼的，不是来看我爸妈被关在外面的。

我走到电梯口，看见我妈站在那儿。她穿着那件穿了十年的外套，手里拎着一袋糖。

她说她不敢进去，怕给我丢人。

我蹲下来，把她手里的袋子接过来，说妈，我们回家。

后来我在朋友圈看到她发的照片，婚礼照常举行了，只是新娘换了人。

照片上她笑得很开心，新郎站在旁边，手里拿着一把钥匙。

那把钥匙我认得，是那套房子的。

我从来没跟任何人说过，那套房子的首付，是我出的。

钱是我一分一分攒的，攒了四年。我对他说，首付我出，房本写我们俩的名字。

他说好。

房本上写的只有他一个人的名字。

这件事我是在签完合同三个月后才知道的。那天我去办居住证，需要房产证复印件，他把本子递给我的时候，我看见上面只有他一个名字。

我问他为什么。

他说，因为他出的是月供。

我说月供一个月两千四，首付八十万。

他说，那你要不要算一下，四年我付了多少。

我没算。我只是把本子还给他，说那这婚不结了。

他笑了，说你一个女孩子，钱都花了，还闹什么。

那天晚上我一个人坐在出租屋里，把那张合同翻出来看了一遍。合同最后一页的备注栏里，有一行很小的字：产权归出资方所有。

字是打印的，不是我签的。

我看了很久，才发现那行字用的字体，和前面不一样。

我给他打电话，问他那行字是谁加的。

他说，你签之前就有的。

我说我没看见。

他说，你自己不看，怪我？

我把电话挂了。

第二天我去找了律师。律师说，只要能证明首付是我出的，这行字就站不住。

我把四年的转账记录全打出来，三十七笔，一笔不落。

律师看完说，稳了。

开庭那天他来了，穿了西装，坐在对面。他看了我一眼，很平静。

法官问他，备注栏那行字是不是后加的。

他说不是。

法官把合同递给他，说请你仔细看这一页的字体。

他低头看了很久，然后笑了。

他说，是我加的。

庭上安静了几秒钟。

他抬起头，看着我，说你还记得吗，签合同那天你说你信我。

我说我记得。

他说，我也信过人。

一直到最后，他都没有看我第二眼。

那套房子判给了我。我拿到钥匙那天，站在门口，没有开门。

我把钥匙寄给了他。

信封里只放了一句话：钱我拿回来了，你留着吧。`;


/* ---------- 7.12 渲染 ---------- */

// 拆文报告用 tr- 前缀，和审稿官的 sr- 分开，样式互不干扰
function trLv(s) {
  return s >= 8 ? 'good' : s >= 5 ? 'mid' : s >= 3 ? 'warn' : 'bad';
}

function trCopyBtn(id, text) {
  return `<button class="tr-copy" data-copy="${id}">复制</button>`;
}

function renderTear(box, r) {
  const pf = TEAR_PLATFORM[r.platform] || TEAR_PLATFORM.zhihu;
  const S = r.skeleton;

  /* ── 第 0 步：值不值得拆 ── */
  const worthMap = {
    worth: { lv: 'good', t: '值得拆', d: '结构上有可迁移的机关，拆出来的公式能用在别的题材上。' },
    partial: { lv: 'mid', t: '可以拆，但只拆骨架', d: '结构不算精巧，骨架和文风还能学，技法库的价值有限。' },
    no: { lv: 'bad', t: '不建议拆', d: '结构不成立（没有机关、也没有现场），拆出来只有段落划分，学不到东西。' },
  };
  const W = worthMap[r.worth];

  /* ── 骨架表 ── */
  const skRows = S.map(s => {
    const info = s.info.length
      ? s.info.slice(0, 3).map(i => i.type === '无增量'
        ? `<span class="tr-inf-weak">${esc(i.v)}</span>`
        : `<em class="tr-inf-t">${esc(i.type)}</em>${esc(i.v)}`).join('　')
      : '<span class="tr-none">这一节没有硬信息</span>';
    const hook = s.hook.key
      ? `<span class="tr-hook tr-hook-${s.hook.key}">${esc(s.hook.name)}</span>`
      : `<span class="tr-hook tr-hook-none">无钩子</span>`;
    return `<tr>
      <td class="tr-pt">${s.i}${s.title ? `<span>${esc(s.title.slice(0, 8))}</span>` : ''}</td>
      <td><b class="tr-fn">${esc(s.func)}</b>${s.soft ? '<i class="tr-soft" title="信号弱，按结构推断">?</i>' : ''}</td>
      <td class="tr-desc">${esc(s.funcDesc)}</td>
      <td class="tr-inf">${info}</td>
      <td><span class="tr-emo tr-emo-${s.emo.lv}">${s.emo.name}</span></td>
      <td>${hook}</td>
    </tr>`;
  }).join('');

  /* ── 篇幅公式 ── */
  const totalShare = S.reduce((a, s) => a + s.share, 0) || 1;
  const barSegs = S.map((s, i) => `<i style="flex:${Math.max(1, s.share * 100)}" class="tr-seg tr-seg-${i % 6}" title="${esc(s.func)} ${Math.round(s.share * 100)}%"></i>`).join('');
  const formulaLine = S.map(s => `${Math.round(s.share * 100)}% ${s.func}`).join(' / ');

  /* ── 人物表 ── */
  const pplRows = r.people.list.slice(0, 8).map(p => {
    const beh = p.beh.length ? p.beh.join('、') : (p.isMe ? '承受、做出选择' : '说话');
    // 代词归并过的角色，名字后面挂一个「含 N 处『她』」的注，
    // 让作者知道表里的次数是怎么算出来的，不是凭空多出来的人
    const merge = p.merged ? `<i class="tr-merged" title="文中 ${p.merged} 处「${p.alias2}」计入此人">含${p.merged}处「${esc(p.alias2)}」</i>` : '';
    return `<tr>
      <td><b>${esc(p.name)}</b>${p.isMe ? '<i class="tr-me">我</i>' : ''}${merge}</td>
      <td><span class="tr-role">${esc(p.role.name)}</span></td>
      <td class="tr-desc">${esc(beh)}</td>
      <td><div class="tr-fill" data-fill="mot-${esc(p.name)}" contenteditable="true" data-ph="填：他真正想要什么"></div></td>
      <td>${p.cnt >= 2 ? `第 ${p.first}—${p.last} 节` : `第 ${p.first} 节`}</td>
    </tr>`;
  }).join('');

  /* ── 伏笔表 ── */
  const fsRows = r.fores.length ? r.fores.slice(0, 10).map(f => `<tr>
      <td class="tr-at"><b>${esc(f.v)}</b>${f.broken ? '<i class="tr-broken">断线</i>' : ''}</td>
      <td class="tr-at">第 ${f.at} 节</td>
      <td class="tr-at">${f.back ? `第 ${f.back} 节` : (f.broken ? '<span class="tr-none">未回收</span>' : '<span class="tr-none">自己填</span>')}</td>
      <td class="tr-desc">${esc(f.guess)}</td>
      <td class="tr-desc">${esc(f.real)}</td>
      <td><span class="tr-tech">${esc(f.type)}</span></td>
    </tr>`).join('') : `<tr><td colspan="6" class="tr-none" style="text-align:center;padding:18px">没找到明显的伏笔结构。这篇可能不是靠伏笔抓人的 —— 换一种机关去看（对撞、爽点、人物弧光）。</td></tr>`;

  /* ── 技法库 ── */
  const techs = TEAR_TECH.filter(t => {
    try { return t.test(r); } catch { return false; }
  }).slice(0, 7);
  const techHtml = techs.map((t, i) => `
    <div class="tr-tech-item">
      <div class="tr-tech-h"><span class="tr-tech-n">${String(i + 1).padStart(2, '0')}</span><b>${esc(t.name)}</b><span class="tr-track">${esc(t.track)}</span></div>
      <div class="tr-tech-r"><span>原文怎么用</span><p>${esc(t.used(r))}</p></div>
      <div class="tr-tech-f"><span>公式</span><p>${esc(t.formula)}</p></div>
    </div>`).join('');

  /* ── 文风指纹 ── */
  const st = r.style;
  const senseMax = Math.max(1, ...st.senses.map(s => s.n));

  /* ── 仿写（精拆才有） ── */
  const drill = r.depth === 'deep' ? `
    <div class="tr-step-h"><span>第六步</span>仿写任务<em>由浅到深，逐个做</em></div>
    <div class="tr-drill">
      <div class="tr-drill-item"><div class="tr-drill-lv">结构级</div>
        <p class="tr-drill-t">只套骨架，换成你的题材，写 800 字。</p>
        <p class="tr-drill-l"><b>限制</b>不许用这篇的人物关系、不许用它的场景、不许出现它任何一个关键物件。</p>
        <p class="tr-drill-l"><b>验收</b>写完后逐节对照：你这篇的每一节，功能定位和它是否能一一对上？有一个对不上，说明你其实没套住。</p></div>
      <div class="tr-drill-item"><div class="tr-drill-lv">技法级</div>
        <p class="tr-drill-t">只练一条技法（建议「${esc(techs[0] ? techs[0].name : '降级陈述')}」），在同一场景里写 3 个版本。</p>
        <p class="tr-drill-l"><b>限制</b>三个版本的场景、人物、事件必须完全一样，只改技法这一处。</p>
        <p class="tr-drill-l"><b>验收</b>把三个版本给一个没读过的人看，他能指出哪一版「最自然」，但说不出为什么 —— 就练成了。</p></div>
      <div class="tr-drill-item"><div class="tr-drill-lv">反写级</div>
        <p class="tr-drill-t">把这篇的核心机关反过来写一遍：读者以为 A，实际是反 A。</p>
        <p class="tr-drill-l"><b>限制</b>骨架不能动，只把「谁在演」换一个人。</p>
        <p class="tr-drill-l"><b>验收</b>换个位置之后，前面每一节的伏笔还能收得回来 —— 收不回来，说明原结构是硬凑的。</p></div>
    </div>` : '';

  /* ── 学习者目标（填了才出） ── */
  const goalHtml = r.goal ? `
    <div class="tr-step-h"><span>套用建议</span>为「${esc(r.goal)}」挑可用的部分<em>只在填了目标时给</em></div>
    <div class="tr-goal">
      <p><b>先拿这一条：</b>${esc(techs[0] ? techs[0].name : '节尾钩子')} —— 它不依赖这个题材，换赛道照样成立。</p>
      <p><b>别拿这一条：</b>${esc(r.weak[0] ? r.weak[0].k : '最后一节的收束方式')} —— ${esc(r.weak[0] ? r.weak[0].d : '这是这篇独有的处理方式，换题材就散')}。</p>
      <p><b>骨架怎么套：</b>把篇幅公式里的功能名当成格子，${esc(r.formula.slice(0, 3).join(' → '))} 这一串顺序固定，格子里的事件全换成你题材里的。比例不动，内容全动。</p>
    </div>` : '';

  box.innerHTML = `
    <div class="tr-badges">
      <span class="tr-badge">${esc(pf.name)}</span>
      <span class="tr-badge">${r.depth === 'fast' ? '速拆' : r.depth === 'deep' ? '精拆' : '标准'}</span>
      <span class="tr-badge">${r.nParas} 段 · ${r.nSecs} 节 · ${r.chars.toLocaleString()} 字</span>
    </div>

    <div class="tr-verdict-card lv-${W.lv}">
      <div class="tr-vc-l">${esc(W.t)}</div>
      <div class="tr-vc-t">${esc(W.d)}</div>
    </div>

    <div class="tr-step-h"><span>第 0 步</span>值不值得拆<em>三个判断，各一句</em></div>
    <div class="tr-zero">
      <div class="tr-zero-i"><span>核心机关</span><p>${esc(r.machine)}</p></div>
      <div class="tr-zero-i"><span>最强的一招</span><p>${r.bestMove ? `第 ${r.bestMove.sec} 节 —— ${esc(r.bestMove.name)}。${esc(r.bestMove.why)}` : '没有特别突出的一节'}</p></div>
      <div class="tr-zero-i warn"><span>最弱的一环</span><p>${r.weak.length ? r.weak.slice(0, 2).map(x => `<b>${esc(x.k)}</b>：${esc(x.d)}`).join('<br>') : '结构上没有明显短板'}</p></div>
    </div>

    <div class="tr-step-h"><span>第一步</span>骨架表<em>每节只回答一个问题：它承担什么功能</em></div>
    <div class="tr-table-wrap">
      <table class="tr-table">
        <thead><tr><th>节</th><th>功能定位</th><th>这一节干了什么</th><th>信息增量</th><th>情绪落点</th><th>结尾钩子</th></tr></thead>
        <tbody>${skRows}</tbody>
      </table>
    </div>
    <div class="tr-note">功能定位只用动词短语。写不出动词，就说明这一节是废话节 —— 这是判断「能不能删」最快的办法。</div>

    <div class="tr-step-h"><span>篇幅公式</span>比段落更可迁移的是比例<em>换题材时不动比例</em></div>
    <div class="tr-shape">
      <div class="tr-shape-bar">${barSegs}</div>
      <div class="tr-shape-line">${esc(formulaLine)}</div>
      <div class="tr-shape-hint">${r.dupSec.length ? `<b class="tr-warn">第 ${r.dupSec.map(d => `${d.a}/${d.b}`).join('、')} 节功能撞车</b> —— 这两节在做同一件事，可以合并，省下的字数给${S.find(s => s.funcKey === 'burst') ? '引爆' : '对撞'}那一节。` : `没有功能撞车的节，${r.nSecs} 节各司其职。`}</div>
    </div>

    ${r.depth === 'fast' ? '' : `
    <div class="tr-step-h"><span>第二步</span>人物动机图<em>看谁在演 —— 底层动机要你自己填</em></div>
    <div class="tr-table-wrap">
      <table class="tr-table">
        <thead><tr><th>人物</th><th>角色功能</th><th>表层行为</th><th>底层动机（点开填）</th><th>表里分离揭示点</th></tr></thead>
        <tbody>${pplRows}</tbody>
      </table>
    </div>
    <div class="tr-note">「底层动机」这一列字面算不出来，留给你填 —— 填的过程本身就是理解这篇的关键。${r.people.redundant.length ? `<br><b class="tr-warn">注意：</b>「${esc(r.people.redundant.join('」「'))}」身上同时出现了「给」和「抢」两种相反行为，这是<b>可以拆成两个角色</b>的信号。` : ''}</div>

    <div class="tr-step-h"><span>第三步</span>伏笔与回收<em>六种技法，只认结构不认剧情</em></div>
    <div class="tr-table-wrap">
      <table class="tr-table">
        <thead><tr><th>伏笔</th><th>埋设</th><th>回收</th><th>埋设时读者会以为是</th><th>实际用途</th><th>技法</th></tr></thead>
        <tbody>${fsRows}</tbody>
      </table>
    </div>

    <div class="tr-step-h"><span>第四步</span>技法库<em>只给公式，不给「照这句写」</em></div>
    <div class="tr-tech-list">${techHtml || '<div class="tr-none" style="padding:16px">这篇没有可抽象成公式的技法 —— 它的优点是桥段本身，不是结构。这种情况别抄。</div>'}</div>

    <div class="tr-step-h"><span>第五步</span>文风指纹<em>写作者最该拿走的部分</em></div>
    <div class="tr-style">
      <div class="tr-style-i"><span>句长</span><b>${st.avg} 字/句</b><em>${esc(st.pace)}</em></div>
      <div class="tr-style-i"><span>短句占比</span><b>${Math.round(st.shortRatio * 100)}%</b><em>≤12 字的句子</em></div>
      <div class="tr-style-i"><span>对话占比</span><b>${Math.round(st.dlgRatio * 100)}%</b><em>${esc(st.dlgMode)}</em></div>
      <div class="tr-style-i"><span>视角</span><b>${esc(st.pov)}</b><em>${st.breach.length ? `破例 ${st.breach.length} 处` : '纪律干净'}</em></div>
    </div>
    <div class="tr-words">
      <div class="tr-words-l">高频词</div>
      ${st.top.map(t => `<span class="tr-word">${esc(t.w)}<i>${t.n}</i></span>`).join('')}
      <div class="tr-words-h">这三个词反复出现，它们决定这篇的底色 —— 换题材时替换它们，不要替换比例。</div>
    </div>
    <div class="tr-sense">
      <div class="tr-sense-l">感官偏好 · ${esc(st.senseTop)}</div>
      ${st.senses.map(s => `<div class="tr-sense-row"><span>${esc(s.name)}</span><div class="tr-sense-bar"><i style="width:${Math.round(s.n / senseMax * 100)}%"></i></div><b>${s.n}</b></div>`).join('')}
      ${st.senses[0] && st.senses[0].ex ? `<div class="tr-sense-ex">例：${esc(st.senses[0].ex)}</div>` : ''}
    </div>
    ${drill}
    ${goalHtml}
    `}

    <div class="tr-final">
      <div class="tr-final-l">这篇最值得你偷的一样东西</div>
      <div class="tr-final-t">${esc(
        techs[0] ? techs[0].name + ' —— ' + techs[0].formula.split('→')[0].trim()
          : r.bestMove ? r.bestMove.name
            : '没有 —— 这篇结构是平的，学不到可迁移的东西'
      )}</div>
    </div>

    <div class="tr-foot">拆骨架，不抄桥段 · 结构可学，原句、人设、桥段不能搬 · 全部在本地算，不联网、不上传</div>`;
}

/* ================= 8. 数据设置 ================= */
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
