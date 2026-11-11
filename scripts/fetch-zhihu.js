/**
 * 知乎短篇数据抓取
 *
 * 用法：
 *   ZHIHU_COOKIE="z_c0=你的值" node scripts/fetch-zhihu.js
 *   或先把 cookie 写进 scripts/.cookie（一行），再 node scripts/fetch-zhihu.js
 *
 * 输出：data/zhihu.json
 * 结构：{ source, fetchedAt, viewer, note, stats, lists[] }
 *   list：{ key, name, type, unit, filters[{key,name,count}], items[] }
 *   item：{ id, title, excerpt, url, heat, label, cover, space, badges[], tags[] }
 *
 * ─────────────────────────────────────────────────────────────
 * 数据源（均为知乎官方 Web 前端在用的接口）
 *
 * 1) 主体：今日必读  modules=today_read&channel=female|male
 *    - 每次返回 40 条，且**每次内容不同**（推荐流分页痕迹）
 *    - 多轮轮询累积去重 → 实测 16 次可得 300+ 条唯一
 *    - 字段：title / labels[] / like_count / artwork / space_type
 *    - 缺点：无简介
 *
 * 2) 简介补充：榜单 modules=billboard  +  进站必看 modules=must_see
 *    - billboard：推荐/热搜/热度/口碑/长篇 5 榜 × 9 条，**带 description**
 *    - must_see：5 条，带 description
 *    - 这两处按标题匹配回写到主体条目
 *
 * 3) 分榜：按 labels 把 today_read 的条目归类
 *    一个条目可能有多个标签，只取第一个做主标签（与知乎展示一致）
 *
 * ⚠️ 已移除「全站热榜」：那是问答/时事榜，不是短篇故事，混进来污染选题。
 * ─────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const OUT = path.join(__dirname, '..', 'data', 'zhihu.json');
const COOKIE_FILE = path.join(__dirname, '.cookie');

const COOKIE = (process.env.ZHIHU_COOKIE || (fs.existsSync(COOKIE_FILE) ? fs.readFileSync(COOKIE_FILE, 'utf8') : '')).trim();

/** 每轮拉取次数（female / male 各多少次）。16 轮 ≈ 300+ 条，约 25 秒 */
const ROUNDS = Number(process.env.ROUNDS || 8);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(url, referer = 'https://www.zhihu.com/fiore/h5/vip-web') {
  const res = await fetch(url, {
    headers: {
      'user-agent': UA,
      'cookie': COOKIE,
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'referer': referer,
    },
  });
  const text = await res.text();
  if (res.status !== 200) throw new Error(`HTTP ${res.status}\n${text.slice(0, 160)}`);
  try { return JSON.parse(text); } catch { throw new Error('非 JSON: ' + text.slice(0, 160)); }
}

function clean(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const BASE = 'https://api.zhihu.com/km-vip-zhihu-web/vip_tab/svip_story';

/** 万 / 亿 数字格式化 */
function fmtCount(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + ' 亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + ' 万';
  return String(n);
}

/* ─────────────────── 1. 主体：today_read 多轮累积 ─────────────────── */

/** 统一成内部条目 */
function normalizeToday(x, channel) {
  const labels = (x.labels || []).map(clean).filter(Boolean);
  return {
    id: String(x.business_id || x.url || ''),
    title: clean(x.title),
    excerpt: clean(x.description) || '',
    url: String(x.url || ''),
    heat: x.like_count ? fmtCount(x.like_count) + ' 赞' : '',
    label: labels[0] || '',
    labels,
    cover: String(x.artwork || ''),
    space: x.space_type || '',
    badges: [],
    tags: labels,
    likeCount: Number(x.like_count) || 0,
    channel,
  };
}

async function fetchTodayPool(rounds) {
  const map = new Map();
  let drew = 0;   // 总抽出次数（含重复）

  for (const ch of ['female', 'male']) {
    for (let i = 0; i < rounds; i++) {
      try {
        const j = await api(`${BASE}?modules=today_read&channel=${ch}`);
        const w = (j.data || []).find(x => x.module_type === 'today_read');
        const list = (((w || {}).module_data || {}).data || {}).content_list || [];
        drew += list.length;
        let nw = 0;
        for (const raw of list) {
          const it = normalizeToday(raw, ch);
          if (!it.id || !it.title) continue;
          if (map.has(it.id)) continue;
          map.set(it.id, it); nw++;
        }
        console.log(`  today_read ${ch} #${i + 1}  返回 ${String(list.length).padStart(2)}  新增 ${String(nw).padStart(2)}  累计 ${map.size}`);
      } catch (e) {
        console.log(`  today_read ${ch} #${i + 1}  失败: ${e.message.split('\n')[0]}`);
      }
      await sleep(700);
    }
  }
  return { items: [...map.values()], drew };
}

/* ─────────────────── 2. 榜单（带简介 + 分类骨架） ─────────────────── */

function storyFromBillboard(it) {
  const labels = clean(it.label_text).split(/[·、\/]/).map(s => s.trim()).filter(Boolean);
  return {
    id: String(it.business_id || it.url || ''),
    title: clean(it.title),
    excerpt: clean(it.description).slice(0, 300),
    url: String(it.url || ''),
    heat: clean(it.subtitle),      // 「13 万赞」「980 万热度」
    label: labels[0] || '',
    labels,
    cover: String(it.artwork || ''),
    space: it.space_type || '',
    badges: (it.sell_labels || []).map(b => clean(typeof b === 'string' ? b : b.name || b.text)).filter(Boolean),
    tags: labels,
    likeCount: 0,
  };
}

async function fetchBillboards() {
  const j = await api(`${BASE}?modules=billboard`);
  const wrap = (j.data || []).find(x => x.module_type === 'billboard');
  const blocks = (((wrap || {}).module_data || {}).data || {}).data || [];
  return blocks.map((b, n) => {
    const head = b.head || {};
    const items = (b.content_list || []).map(storyFromBillboard).filter(x => x.title);
    return {
      key: `salt_${head.type || n}`,
      name: clean(head.title) || `榜单${n + 1}`,
      type: head.type || `salt_${n}`,
      unit: (() => {
        const s = (items[0] || {}).heat || '';
        const m = s.match(/[\d.]+\s*(万|亿)?\s*(.+)$/);
        return m ? (m[1] ? m[1] + m[2] : m[2]) : '';
      })(),
      filters: (head.filters || []).map(f => ({ key: String(f.key), name: clean(f.name) })),
      items,
    };
  }).filter(l => l.items.length);
}

async function fetchMustSee() {
  const out = [];
  for (const ch of ['female', 'male']) {
    try {
      const j = await api(`${BASE}?modules=must_see&channel=${ch}`);
      const w = (j.data || []).find(x => x.module_type === 'must_see');
      const list = (((w || {}).module_data || {}).data || {}).content_list || [];
      list.forEach(x => {
        const it = storyFromBillboard(x);
        if (it.title) out.push(it);
      });
    } catch (e) {
      console.log(`  must_see ${ch} 失败: ${e.message.split('\n')[0]}`);
    }
    await sleep(700);
  }
  return out;
}

/* ─────────────────── 3. 合并：简介回写 + 分榜 ─────────────────── */

/** 生成标题指纹，用于跨源匹配（去掉标点空格） */
const fp = t => String(t || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

function mergeRich(pool, rich) {
  // 标题 → 富数据
  const byTitle = new Map();
  rich.forEach(r => { const k = fp(r.title); if (k) byTitle.set(k, r); });

  let filled = 0, added = 0;
  const seen = new Set(pool.map(x => x.id));
  const seenTitle = new Set(pool.map(x => fp(x.title)));

  for (const it of pool) {
    const r = byTitle.get(fp(it.title));
    if (!r) continue;
    let hit = false;
    if (!it.excerpt && r.excerpt) { it.excerpt = r.excerpt; hit = true; }
    if (!it.heat && r.heat) { it.heat = r.heat; hit = true; }
    if (!it.badges.length && r.badges.length) { it.badges = r.badges; hit = true; }
    if (!it.label && r.label) { it.label = r.label; }
    if (!it.labels.length && r.labels.length) { it.labels = r.labels; it.tags = r.labels; }
    if (!it.cover && r.cover) it.cover = r.cover;
    if (hit) filled++;
  }

  // 富数据里有、主体池里没有的，直接补进来
  for (const r of rich) {
    if (seen.has(r.id) || seenTitle.has(fp(r.title))) continue;
    if (!r.excerpt) continue;              // 没简介的不要，主体池已经够多
    pool.push(r); added++;
    seen.add(r.id); seenTitle.add(fp(r.title));
  }
  return { filled, added };
}

/** 题材分榜：按 label 归类，只保留条数够看的 */
function buildGenreLists(pool) {
  const g = new Map();
  for (const it of pool) {
    const k = it.label;
    if (!k) continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(it);
  }
  const arr = [...g.entries()]
    .filter(([, v]) => v.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  const total = arr.reduce((a, b) => a + b[1].length, 0);
  return {
    total,
    lists: arr.map(([name, items]) => ({
      key: 'genre_' + fp(name),
      name,
      type: 'genre',
      unit: '赞',
      filters: [],
      items: items.sort((x, y) => y.likeCount - x.likeCount),
    })),
  };
}

/* ─────────────────── main ─────────────────── */

(async () => {
  if (!COOKIE) {
    console.error('缺少登录态。两种方式任选：\n  1) ZHIHU_COOKIE="z_c0=xxx" node scripts/fetch-zhihu.js\n  2) 把 cookie 写进 scripts/.cookie 后直接 node scripts/fetch-zhihu.js');
    process.exit(1);
  }

  const t0 = Date.now();
  console.log('开始抓取知乎短篇数据…\n');

  console.log('[1/4] 主体数据 · 今日必读（多轮累积）');
  const { items: pool, drew } = await fetchTodayPool(ROUNDS);

  console.log('\n[2/4] 榜单 · 五榜九条（带简介）');
  let billboards = [];
  try {
    billboards = await fetchBillboards();
    billboards.forEach(l => console.log(`  ${l.name.padEnd(4, '　')} ${String(l.items.length).padStart(2)} 条  分类 ${l.filters.length} 个`));
  } catch (e) { console.log('  失败:', e.message.split('\n')[0]); }
  await sleep(700);

  console.log('\n[3/4] 进站必看（补简介）');
  const mustSee = await fetchMustSee();
  console.log(`  ${mustSee.length} 条`);

  console.log('\n[4/4] 合并去重');
  const rich = [...billboards.flatMap(l => l.items), ...mustSee];
  const { filled, added } = mergeRich(pool, rich);
  console.log(`  回写简介 ${filled} 条 · 补充新条目 ${added} 条 · 合计 ${pool.length} 条`);

  // 排序：有简介的优先，其次按点赞数
  pool.sort((a, b) => {
    const da = a.excerpt ? 1 : 0, db = b.excerpt ? 1 : 0;
    if (da !== db) return db - da;
    return (b.likeCount || 0) - (a.likeCount || 0);
  });

  // 题材分榜
  const genres = buildGenreLists(pool);
  console.log(`  题材分榜 ${genres.lists.length} 个（覆盖 ${genres.total} 条）`);

  // 给榜单的分类加上实际条数
  billboards.forEach(L => {
    L.filters = L.filters.map(f => ({
      ...f,
      count: f.key === '0' || f.name === '全部'
        ? L.items.length
        : L.items.filter(it => {
            const main = (it.label || '').trim();
            return main === f.name || (it.labels || []).includes(f.name);
          }).length,
    }));
  });

  const lists = [...billboards, ...genres.lists];
  const withDesc = pool.filter(x => x.excerpt).length;

  const out = {
    source: 'zhihu.com',
    fetchedAt: new Date().toISOString(),
    viewer: '',
    note: '标题/简介/赞数仅作选题参考，正文请回知乎阅读。',
    stats: {
      total: pool.length,
      withExcerpt: withDesc,
      drewRound: drew,
      billboards: billboards.length,
      genres: genres.lists.length,
      elapsedMs: Date.now() - t0,
    },
    lists,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\n${'─'.repeat(46)}`);
  console.log(`已写入 ${OUT}`);
  console.log(`条目   ${pool.length} 条（${withDesc} 条带简介）`);
  console.log(`榜单   ${lists.length} 个`);
  console.log(`耗时   ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch(e => { console.error('\n抓取中断：', e); process.exit(1); });
