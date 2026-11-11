# 罗盘 · 知乎短篇创作台

iPadOS 桌面风格的本地创作工具。数据来自知乎真实接口，界面铺满桌面，不套手机壳。**电脑、平板、手机都能用。**

---

## 打开

```bash
cd luopan
python -m http.server 8788
# 浏览器打开 http://127.0.0.1:8788
```

必须走 HTTP 服务（不能双击 index.html），因为要 `fetch` 本地 json。

---

## 手机上怎么看

三种方式，按「手机和电脑是不是同一台/同一网络」区分：

### A. 同一 WiFi → 局域网访问（最快，推荐）

电脑上启动服务时绑定 `0.0.0.0`：

```bash
python -m http.server 8788 --bind 0.0.0.0
```

查电脑局域网 IP：

```bash
# Windows
ipconfig | findstr IPv4
# macOS / Linux
ifconfig | grep "inet "
```

手机浏览器输入 `http://电脑IP:8788`（例如 `http://192.168.1.12:8788`）。
首次访问 Windows 会弹防火墙提示，要允许「专用网络」。

> 手机和电脑必须在同一个 WiFi；电脑关机或换网络就失效。

### B. 手机上直接用（不依赖电脑）

把整个 `luopan/` 文件夹拷进手机。但**必须用支持本地 HTTP 的应用**打开，因为 Safari/Chrome 直接打开 `file://` 会因跨域禁止 `fetch` json，榜单会空白。可选：

- iOS：用 **Documents by Readdle** 或 **a-Shell** 起个本地服务
- Android：用 **Termux** `python -m http.server`，或 **HTTP Server** 类 App

### C. 部署成公网链接（随时随地看）

**不要整个目录拖上去**，先跑导出脚本，只上传干净包：

```bash
node scripts/export-deploy.js
# → 输出到 ../luopan-deploy/，共 8 个文件约 1.2 MB
```

脚本是**白名单式**的，只搬线上运行必需的文件：

```
index.html        style.css        app.js        README.md
data/zhihu.json
assets/icon.svg   assets/wallpaper-wide.jpg   assets/wallpaper-portrait.jpg
```

拷完会自检一遍，确认包里没有 `.cookie`、调试截图（`real-*.png`、`w-*.png`）、探测快照（`.ch-*.json`、`.pool*.json`）。**有就报错退出**，不会静默放过。

然后：

- **Vercel**：`vercel` 命令，或把 `luopan-deploy` 文件夹拖进网页
- **Netlify**：直接拖 `luopan-deploy` 文件夹到 app.netlify.com/drop
- **Cloudflare Pages / GitHub Pages**：连仓库，构建命令留空，输出目录填 `luopan-deploy`

部署后手机直接打开链接。`data/zhihu.json` 会变成公开文件，里面只有标题/简介/热度这类公开信息，不含 cookie 和正文。

---

## 更新榜单：不用重新部署

线上版和本地都是同一套逻辑 —— **榜单可以导入**，存在浏览器 localStorage，不动服务器文件。

### 流程

```bash
# 1. 电脑上抓一次（会写到 data/zhihu.json）
ZHIHU_COOKIE="z_c0=..." node scripts/fetch-zhihu.js

# 2. 把 data/zhihu.json 传到手机
#    iMessage / 微信文件传输助手 / QQ / 网盘，任选

# 3. 手机上打开站点 → 数据设置 → 更新榜单 → 导入榜单 json
```

导入时会先校验，再弹确认框告诉你「当前 11 个榜单 · 336 条，导入后会被替换为 X 个榜单 · Y 条」，确认后才覆盖。

**校验的三道关**：

| 检查 | 不通过时 |
|---|---|
| JSON 能否解析 | 「不是有效的 JSON 文件」 |
| 有没有 `lists` 字段 | 「缺少 lists 字段，可能选错了文件」 |
| 过滤掉 `hot_all` 后还有没有条目 | 「榜单为空，检查文件是否完整」 |

### 什么时候还是要重新部署

| 改了什么 | 要重新部署吗 |
|---|---|
| 榜单数据 | 否，手机上导入即可 |
| HTML / CSS / JS | 要 |
| 壁纸 | 要 |

换设备、换浏览器、清缓存后会回到服务器上的 `data/zhihu.json` —— 想回到线上版本，点「回到线上版本」按钮清掉快照即可。

> 快照单独存一个 key（`luopan_snapshot_v1`），和你的导语池、抽卡记录完全分开。「清空所有数据」不会误删快照，反之亦然。体积约 200 KB，远低于 localStorage 的 5 MB 上限。

---

## 壁纸：怎么做的

原素材是一张 **720×1547 竖版**手绘插画（樱花庭院 + 池塘 + 两只小动物）。竖图直接铺 16:9 桌面，无论 `cover` 还是 `contain` 都不成立：

- `cover`：按宽度取景会放大到 3094px 高，纵向裁掉 71%，只剩树干
- `contain`：中间一条 670px 竖带，两侧全空

**所以是用脚本重新合成的**，不是 CSS 能解决的：

```bash
python scripts/make-wallpaper.py
```

产出两张：
- `assets/wallpaper-wide.jpg` — 2560×1440，桌面/平板用
- `assets/wallpaper-portrait.jpg` — 1170×2532，手机用（`@media (max-aspect-ratio: 3/4)` 自动切换）

### 横版构图（局部纹理放大方案）

不追求完整还原插画，只把花枝 / 池水 / 草地局部放大成**氛围纹理**，让界面成为主角：

```
┌──────────────────────────────────────┐
│  樱花花枝（原图顶部放大）  薄雾空地    │  ← 左上压角，中间留白给图标
│                                      │
│                                      │
│                          池塘+小动物  │  ← 右下焦点，画面唯一清晰处
└──────────────────────────────────────┘
```

三条硬规则（都是踩坑换来的，脚本里已注释）：

1. **任何层都等比缩放，绝不拉伸** —— 池塘曾被压成扁椭圆
2. **任何层都不能有矩形边界** —— 蒙版必须四角严格归零
3. **放大后必须降噪**（缩到 55% 再放回）—— 否则纸张颗粒被放大成沙粒

### 关键教训：蒙版

`ImageDraw.ellipse()` + `GaussianBlur()` **做不出真正归零的蒙版**，边缘会留残余 alpha，贴到画布上就露出裁切矩形的硬边。改用 numpy 按椭圆距离直接算，四角必然是 0：

```python
def radial_mask(size, power=0.85, cx=0.5, cy=0.5, rx=0.5, ry=0.5):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx / (w - 1) - cx) / rx
    ny = (yy / (h - 1) - cy) / ry
    a = np.clip(1.0 - np.sqrt(nx*nx + ny*ny), 0.0, 1.0) ** power
    return Image.fromarray((a * 255).astype(np.uint8), "L")
```

另外两种蒙版：`directional_mask()`（上实下虚 + 右缘渐隐，用于占角的樱花层，不会留下圆形弧线）。

### 配色：全部取自原图实测值

界面配色不是凭感觉调的，是从原图采样出来的：

| 区域 | 实测色 | 用在 |
|---|---|---|
| 花瓣 | `#DBB9B3` | Hero 卡片渐变、名次强调 |
| 池水 | `#CAE0E1` | 「起名助手」图标、点缀色 |
| 草地 | `#D6D6C1` | 「导语池」图标、Dock |
| 树干 | `#BFB6A2` | 「拆文助手」图标 |
| 空地 | `#DADCC9` | 页面底色 |

原图饱和度极低（约 8~14%），图标用时统一提到 26~34% 再压暗做渐变深端，保证「同源但不糊成一片」。

重新采样当前壁纸：

```bash
python -c "
from PIL import Image
src = Image.open('assets/wallpaper.jpg').convert('RGB')
iw, ih = src.size; px = src.load()
def s(name, x0,x1,y0,y1, c=None):
    r=g=b=n=0
    for y in range(int(ih*y0), int(ih*y1), 2):
        for x in range(int(iw*x0), int(iw*x1), 2):
            R,G,B = px[x,y]
            if c and not c(R,G,B): continue
            r+=R; g+=G; b+=B; n+=1
    print(name, '#%02X%02X%02X' % (r//n, g//n, b//n))
s('池水', .2,.8,.70,.80, lambda r,g,b: b-r>15)
s('草地', .15,.85,.88,.94)
"
```

---

## 手机端适配说明

- 断点 `≤560px`：小组件纵向排成一列，App 网格 4 列，Dock 收到 50px
- 榜单窗口**全屏铺满**（不再是浮窗），底部安全区 `env(safe-area-inset-bottom)` 自动避让
- 榜单行隐藏封面缩略图，省出宽度给标题
- 刘海/挖孔屏顶部用 `env(safe-area-inset-top)` 让位
- 趋势卡在手机上只显示 3 条（桌面 5 条），确保 7 个 App 入口一屏放下
- 图标区加一层柔白渐隐，避免壁纸里的池塘透过图标缝隙干扰阅读
- 实测 390×844（iPhone 14）：无横向溢出、无 JS 报错、7 个 App 全可见、**Dock 不遮挡**

### 手机布局的三个坑

**1. `.desktop` 的 flex 子项会被压缩**

`.desktop` 是 `body`（`display:flex; flex-direction:column`）的子项。在 flex 列布局里，子项默认会被**压缩**以适配容器，导致 `scrollHeight === clientHeight`，永远滚不动。必须给子项显式 `flex: 0 0 auto`：

```css
@media (max-width: 1080px) {
  .appgrid-wrap, .widgets { flex: 0 0 auto; }   /* 不加这行，页面滚不动 */
}
```

**2. Dock 占位不能用 `.desktop` 的 `padding-bottom`**

Dock 是 `position: fixed` 覆盖层。给 `.desktop` 加 `padding-bottom` 会被 flex 子项的实际高度吃掉（实测 `scrollHeight` 完全不变）。正确做法是加在最后一个子项 `.appgrid-wrap` 上。

**3. Dock 图标必须按视口宽度算尺寸**

7 个图标固定 50px + 12px 间距 = 内宽约 458px，**所有手机宽度都会溢出**（320px 溢出 152px，连 430px 宽屏机也差 42px）。而且溢出后 `left:50% + translateX(-50%)` 的居中也会跑偏。改用 `clamp()`：

```css
.dock .app-ico {
  width: clamp(32px, calc((100vw - 76px) / 7), 50px);
  height: clamp(32px, calc((100vw - 76px) / 7), 50px);
}
```

`76px` = 两侧留白 16 + 内边距 20 + 6 个间隙（约 40）。320px 算出 32px（下限），430px 约 47px，全程不溢出且始终居中。验证脚本：`scripts/audit-dock.js`（遍历 320~430 六个宽度，输出 Dock 宽/需要宽/溢出/左右边距）。

**4. 表单行和海报不能固定宽度**

`.form-row` 是 `标签 130px + 内容` 的横向布局，手机上「导出 / 导入」两个按钮并排必然把「导入」挤出卡片（390px 屏溢出约 40px）。`.poster` 固定 420px，在 320px 屏上溢出 116px。手机断点里各改一次：

```css
@media (max-width: 560px) {
  .form-row { flex-wrap: wrap; }              /* 标签独占一行，按钮换行排 */
  .form-label { width: 100%; }
  .form-row > div[style*="flex:1"] { display: none; }  /* 中间的撑杆换行后变空白，收起 */

  .studio-grid { grid-template-columns: 1fr; }
  .poster { width: 100%; max-width: 420px; margin: 0 auto; padding: 24px 22px; }
  .poster-title { font-size: 21px; }
  .poster-body { font-size: 12.5px; line-height: 1.85; }
}
```

验证脚本：`scripts/audit-views.js`（7 个视图 × 9 档尺寸，检查横向溢出和元素跑出右边界）。

### 关于 `env(safe-area-inset-*)`

**必须配 `<meta name="viewport" content="..., viewport-fit=cover">`**，否则 `env(safe-area-inset-top)` 恒为 `0`，刘海屏的状态栏会直接盖住顶栏内容。加了兜底 `padding-top: max(8px, env(...))`，没有安全区信息时也留 8px。

---

## 知乎数据：怎么来、怎么更新

### 现状（真实接口，已跑通）

数据分两层抓，最终 **345 条 / 11 个榜单**：

| 榜单 | 来源模块 | 条数 | 说明 |
|---|---|---|---|
| 推荐榜 / 热搜榜 / 热度榜 / 口碑榜 / 长篇榜 | `billboard` | 各 9 | 官方榜，固定首屏，带简介 |
| 言情 / 纯爱 / 现实情感 / 悬疑 / 脑洞 / 权谋 | `today_read` 多轮累积 | 201 / 59 / 43 / 20 / 6 / 5 | 按 `labels` 主题材归类，只保留 ≥3 条的 |

**关键发现：`billboard` 不支持分页。** `offset` / `limit` / `page` / `page_index` / `paging` / `size` / `count` / `is_first=false` / `session_id` 全部无效，永远返回 9 条。所以「条数不够」不能靠翻页解决。

**解法：改用 `today_read` 推荐流多轮累积。**
- 每次请求返回 **40 条且内容不同**，无分页参数，但多次请求会不断给新内容
- `channel=female` / `channel=male` 是两个不同的池，两池重合仅 4/40
- 默认男女频各轮询 8 次（共 16 次，间隔 700ms），实测可得 **313 条唯一**
- 单次抓取耗时约 **20 秒**，可用 `ROUNDS=12 node scripts/fetch-zhihu.js` 加大轮数

**注意：`modules` 参数不能逗号拼接。** `modules=billboard,today_read,feed_card` 会让 `today_read` 返回 0 条，必须**单独请求**每个模块。

**简介的局限**：`today_read` 的 `description` 全部为空，`description_list` 为 `null`（试过 `api.zhihu.com/market/paid_column/section/{id}` 等端点，均 404）。目前用 `billboard`(45) + `must_see`(10) 的简介按**标题指纹**（去掉标点空格后比对）回写，345 条里 47 条带简介。列表里不再逐条标注「无简介」——那是普遍情况，标了反而全是噪声。

**全站热榜已移除**：`hot_all` 是知乎的问答/时事榜，不是短篇内容，混进选题池会干扰判断。前端 `loadZhihu()` 里还留了一道兼容过滤，防止旧 json 带进来。

### 抓取（带登录态）

1. 浏览器登录知乎 → F12 → Application → Cookies → `https://www.zhihu.com` → 复制 **`z_c0`** 的 Value
2. 二选一：
   - 写进 `scripts/.cookie`（一行，纯 cookie 字符串），然后 `node scripts/fetch-zhihu.js`
   - 或用环境变量：

```bash
# macOS / Linux / Git Bash
ZHIHU_COOKIE="z_c0=你的值" node scripts/fetch-zhihu.js

# Windows PowerShell
$env:ZHIHU_COOKIE="z_c0=你的值"; node scripts/fetch-zhihu.js
```

3. 生成 `data/zhihu.json`，页面点右上角「刷新」即可载入

> `z_c0` 约 30 天过期，榜单抓不到就重新取一次。

### 抓取原则

- 只取**标题、简介、赞数/热度、题材分类、封面、链接**
- **不抓正文**，不镜像付费内容，正文一律回到知乎阅读
- 请求间隔 700ms，避免风控
- 端点不通时自动跳过，不中断

---

## 七个模块

| 模块 | 说明 |
|---|---|
| 短篇榜单 | 双分组切换（**官方榜 5 × 9 条** + **题材榜 6 个**，各带条目数）+ 二级题材筛选 + 关键词搜索 + 一键存导语池 + 导出 JSON |
| 导语池 | 增删改查、多标签、重点标记、已用/待用、按标签筛选、复制、导出 |
| 随机抽卡 | 抽卡池 = 导语池 + 知乎榜单，抽到好句子可直接收藏 |
| 制图工坊 | 3:4 卡片，四主题（素纸/墨黑/米黄/深蓝），三档密度，导出 PNG |
| 起名助手 | 现代/古代各 12 个角色名，点一下复制 |
| 拆文助手 | 本地算字数/阅读时长/句长/对话密度/结构节拍/高频词/节奏诊断 |
| 数据设置 | 存 z_c0、生成抓取命令、备份导入导出、清空 |

---

## 界面

- 参考 **iPadOS 桌面**：左侧小组件列（2×2 大卡 + 状态条）+ 右侧 App 图标网格 + 底部 Dock
- 点图标 → 窗口层淡入，桌面背景模糊后退
- 窗口左上角红黄绿三键（关闭 / 收起 / 全屏）
- 毛玻璃顶栏、⌘K 全局搜索、系统色、连续曲率圆角
- `⌘K` 搜索，`Esc` 关窗口
- 手机上窗口自动转为全屏，桌面转单列

---

## 数据存储

- 本地：`localStorage`，键 `luopan_desktop_v2`（导语池、抽卡数、z_c0、署名）
- 远端：`data/zhihu.json`（榜单快照）
- 「数据设置」可导出/导入全部本地数据

> `z_c0` 明文存在本机 localStorage，仅个人使用。

---

## 素材与字体

- 字体：思源黑体 / 思源宋体（SIL OFL 可商用），系统栈调用
- 图标：全部手写 SVG，无第三方图标库
- 封面图：知乎官方 CDN 直链（`referrerpolicy="no-referrer"`，不下载不外传）
- 壁纸：用户自有手绘插画（`assets/wallpaper.jpg`），由 `scripts/make-wallpaper.py` 合成为横/竖两版
- 无外部图片、无 Freepik / Flaticon、无未授权中文字体

---

## 免责

本工具仅供个人选题参考。展示的标题、简介、热度、封面版权归原作者与知乎所有；不镜像正文、不绕过付费墙、不代替阅读授权。请遵守知乎用户协议并合理控制抓取频率。

---

罗盘 · 知乎短篇创作台 v2
