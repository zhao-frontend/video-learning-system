
/* ============================================================
知影学堂 H5 视频学习平台
单文件实现：分类浏览 / 搜索 / 自定义播放器
进度记录 / 接续播放 / 已学未学 / 点赞收藏评论
============================================================ */




/* ============================================================
API 配置 —— 已按项目后端 request.post + 原生 SQL 模式对接
============================================================
- 查询走 mysql/getDataListBySql.jsp
- 增删改走 mysql/updateInfo.jsp
- 配置 { noVerify: true, noAuth: true } 与项目其他模块一致
- userid / username 从项目全局上下文读取

课程主表复用项目已有的 video_learn 表，字段：
id                主键（假设列名为 id，如不一致改下面 getCourses 即可）
video_title       标题
video_description 详情
updfiles_video    视频地址
video_banner      封面图
video_replays     播放量

互动相关的表（实际表名以用户确认为准）：

-- 学习进度
CREATE TABLE test_table_video_learn_progress (
user_id      VARCHAR(50)   NOT NULL,
video_id     VARCHAR(32)   NOT NULL,
cur_time     DECIMAL(10,2) DEFAULT 0,
duration     DECIMAL(10,2) DEFAULT 0,
completed    TINYINT       DEFAULT 0,
updated_at   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (user_id, video_id)
);

-- 点赞记录
CREATE TABLE test_table_video_learn_likes (
user_id   VARCHAR(50) NOT NULL,
video_id  VARCHAR(32) NOT NULL,
PRIMARY KEY (user_id, video_id)
);

-- 收藏记录
CREATE TABLE test_table_video_learn_favs (
user_id   VARCHAR(50) NOT NULL,
video_id  VARCHAR(32) NOT NULL,
PRIMARY KEY (user_id, video_id)
);

-- 评论（fav_id 存评论内容，平台自动添加 Id 主键列）
CREATE TABLE test_table_video_learn_comms (
user_id   VARCHAR(50)   NOT NULL,
video_id  VARCHAR(32)   NOT NULL,
fav_id    VARCHAR(1000) NOT NULL
);

-- 评论点赞记录（comm_id 引用评论的 Id 主键）
CREATE TABLE test_table_video_learn_comms_likes (
user_id  VARCHAR(50) NOT NULL,
comm_id  VARCHAR(32) NOT NULL,
PRIMARY KEY (user_id, comm_id)
);
*/


// —— 工具：从全局获取当前用户身份 ——
function getUserId() {
  let param = new URLSearchParams(window.location.search);
  let userid = atob(param.get('userid'))
  if (typeof userid !== "undefined" && userid) return String(userid);
  if (typeof window !== "undefined" && window.userid)
    return String(window.userid);
  return "guest";
}

function getUserName() {
  if (typeof username !== "undefined" && username)
    return String(username);
  if (typeof window !== "undefined" && window.username)
    return String(window.username);
  return "匿名用户";
}

// SQL 字符串值转义（防止单引号断句 / 注入）
function sqlVal(s) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''");
}

// 知识点字段解析（数据库可存 JSON 字符串或逗号分隔）
function parseKp(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j;
  } catch (e) {
  }
  return String(s)
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// 相对时间格式化（评论时间用）
function timeAgo(s) {
  if (!s) return "刚刚";
  const t = new Date(String(s).replace(" ", "T")).getTime();
  if (isNaN(t)) return s;
  const diff = Date.now() - t;
  const m = 60 * 1000,
    h = 60 * m,
    d = 24 * h;
  if (diff < m) return "刚刚";
  if (diff < h) return Math.floor(diff / m) + " 分钟前";
  if (diff < d) return Math.floor(diff / h) + " 小时前";
  if (diff < 30 * d) return Math.floor(diff / d) + " 天前";
  return String(s).slice(0, 10);
}

const API = {
  _idCol: null,        // video_learn 主键列名，首次查询后缓存
  _progressCols: null, // progress 表实际列名，getMyProgress 首次读到数据后缓存

  // 从行对象的 key 列表里找最像主键的列名
  _detectIdCol(row) {
    const keys = Object.keys(row);
    return keys.find(k => /^id$/i.test(k))
      || keys.find(k => /id$/i.test(k))
      || keys.find(k => /^id/i.test(k))
      || keys[0];
  },

  // 调用 request.post 之前确保 $ 指向 jQuery（防止被平台同名 $ 覆盖）
  _ensureJQuery() {
    if (typeof jQuery !== "undefined" && jQuery.ajax) {
      if (window.$ !== jQuery) window.$ = jQuery;
      return true;
    }
    return false;
  },
  // —— 底层：原生 SQL 查询/执行 ——
  _normSql(sql) {
    // wiidu JSP 不支持多行 SQL，折叠所有换行和多余空格
    return String(sql).replace(/\s+/g, ' ').trim();
  },
  async _query(sql) {
    if (!this._ensureJQuery()) {
      throw new Error(
        "jQuery 未加载（$.ajax 不可用）。请确认 CDN 是否可达，或换成项目内部的 jQuery 路径",
      );
    }
    const res = await request.post(
      "mysql/getDataListBySql.jsp",
      { sqlstring: [this._normSql(sql)] },
      { noVerify: true, noAuth: true },
    );
    // 检测 JSP 错误响应（code 非 0/"0"/"200" 且 data 不是数组时视为失败）
    if (res != null && !Array.isArray(res) && !Array.isArray(res?.data)) {
      const code = String(res?.code ?? "");
      const msg = res?.msg || res?.message || "";
      if (code && code !== "0" && code !== "200") {
        throw new Error(msg || "接口返回错误（code=" + code + "）");
      }
      if (msg && msg.includes("出错")) {
        throw new Error(msg);
      }
    }
    // 兼容多种返回形态：
    //   形态 A: res.data 直接是行数组      → [{...},{...}]
    //   形态 B: res.data 是结果集数组      → [[{...},{...}]]  （每条 SQL 一项）
    //   形态 C: res.data.data 是行数组
    if (Array.isArray(res?.data)) {
      if (res.data.length === 0) return [];
      return Array.isArray(res.data[0]) ? res.data[0] : res.data;
    }
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res)) return res;
    return [];
  },
  async _exec(sql) {
    if (!this._ensureJQuery()) {
      throw new Error(
        "jQuery 未加载（$.ajax 不可用）。请确认 CDN 是否可达，或换成项目内部的 jQuery 路径",
      );
    }
    const normSql = this._normSql(sql);
    const payload = JSON.stringify({ sqlstring: [normSql] });
    // text/plain 属于"简单请求"，浏览器直接发 POST，不触发 CORS 预检（OPTIONS）
    // mode:no-cors 让浏览器接受 opaque 响应而不抛 CORS 错误
    // 这样即使 updateInfo.jsp 没有 Access-Control-Allow-Origin 头也能正常写入
    try {
      await fetch("https://www.wiidu.com.cn/zx/datainf/mysql/updateInfo.jsp", {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        headers: { "Content-Type": "text/plain" },
        body: payload,
      });
      return null; // opaque 响应无法读取，视为已送达
    } catch (_) {
      // 网络完全中断时降级使用 request.post
      const res = await request.post(
        "mysql/updateInfo.jsp",
        { sqlstring: [normSql] },
        { noVerify: true, noAuth: true },
      );
      if (res != null && typeof res === "object") {
        const msg = String(res?.msg || res?.message || "");
        if (msg && msg.includes("出错")) throw new Error(msg);
      }
      return res;
    }
  },

  // ============ 课程列表 ============
  async getCourses() {
    // SELECT * 让数据库决定返回哪些列，避免因列名假设错误导致 SQL 失败
    // ORDER BY 1 = 按第一列排序，无需知道主键列名
    const rows = await this._query(
      `select *
                     from test_table_video_learn where isDel = 0
                     order by 1 desc`
    );
    if (!rows.length) return [];
    // 自动探测主键列名并缓存，后续 incrementPlay 复用
    this._idCol = this._detectIdCol(rows[0]);
    const wiiduFile = (val) => {
      if (!val) return '';
      const name = String(val).split(',').map(s => s.trim()).filter(Boolean)[0];
      if (!name) return '';
      if (/^https?:\/\//.test(name)) return name;
      return 'https://www.wiidu.com.cn/zx/fileuploaded/' + name;
    };
    return rows.map((r) => ({
      id: String(r[this._idCol]),
      title: r.video_title || "未命名视频",
      desc: r.video_description || "",
      src: wiiduFile(r.updfiles_video),
      poster: wiiduFile(r.video_banner),
      plays: Number(r.video_replays) || 0,
      cat: "",
      kp: r.video_tags.split(','),
      teacher: "",
      dur: "",
    }));
  },

  // ============ 播放量 +1 ============
  async incrementPlay(videoId) {
    const col = this._idCol || 'id';
    const id = sqlVal(videoId);
    await this._exec(
      `update test_table_video_learn
                     set video_replays = ifnull(video_replays, 0) + 1
                     where ${col} = '${id}' and isDel = 0`,
    );
  },

  // ============ 学习进度 ============
  async getMyProgress() {
    const uid = sqlVal(getUserId());
    const findCol = (row, ...cands) =>
      Object.keys(row).find((c) => cands.includes(c.toLowerCase())) || cands[0];

    // localStorage 兜底（应对 updateInfo.jsp CORS 限制）
    const lsMap = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("vlp_prog_")) {
          const id = k.slice(9);
          const d = JSON.parse(localStorage.getItem(k) || "null");
          if (d && id) lsMap[id] = d;
        }
      }
    } catch (_) {
    }

    // 尝试从数据库读取（可能因 CORS 失败）
    let dbMap = {};
    try {
      const rows = await this._query(
        `select *
                         from test_table_video_learn_progress
                         where user_id = '${uid}'
                           and (isDel is null or isDel = 0)`
      );
      if (rows.length) {
        const r0 = rows[0];
        this._progressCols = {
          vid: findCol(r0, "video_id"),
          time: findCol(r0, "cur_time", "curtime", "current_time"),
          dur: findCol(r0, "video_duration", "duration"),
          done: findCol(r0, "is_completed", "completed"),
        };
        rows.forEach((r) => {
          const { vid: vc, time: tc, dur: dc, done: fc } = this._progressCols;
          const vid = String(r[vc] || "");
          if (!vid) return;
          const mt = r.modifiedTime || r.modifiedtime;
          dbMap[vid] = {
            time: Number(r[tc]) || 0,
            duration: Number(r[dc]) || 0,
            completed: r[fc] == 1 || r[fc] === true,
            updatedAt: mt ? new Date(mt).getTime() : Date.now(),
          };
        });
      }
    } catch (e) {
      console.warn("[getMyProgress DB]", e);
    }

    // 合并：取 updatedAt 更新的那份
    const merged = { ...lsMap };
    Object.entries(dbMap).forEach(([id, p]) => {
      if (!merged[id] || (p.updatedAt || 0) > (merged[id].updatedAt || 0))
        merged[id] = p;
    });
    return merged;
  },
  async saveProgress(courseId, time, duration, completed) {
    const t = isFinite(Number(time)) ? Number(time) : 0;
    const d = isFinite(Number(duration)) ? Number(duration) : 0;

    // 始终写 localStorage（CORS 可靠兜底，本次刷新即生效）
    try {
      localStorage.setItem(
        `vlp_prog_${courseId}`,
        JSON.stringify({ time: t, duration: d, completed, updatedAt: Date.now() })
      );
    } catch (_) {
    }

    // 同时尝试写数据库（如 CORS 限制则静默失败，localStorage 已兜底）
    const uid = sqlVal(getUserId());
    const cid = sqlVal(courseId);
    const c = completed ? 1 : 0;
    const cols = this._progressCols || {
      vid: "video_id", time: "cur_time", dur: "video_duration", done: "is_completed",
    };
    await this._exec(
      `delete
                     from test_table_video_learn_progress
                     where user_id = '${uid}'
                       and ${cols.vid} = '${cid}' and isDel = 0`
    );
    await this._exec(
      `insert into test_table_video_learn_progress (user_id, ${cols.vid}, ${cols.time}, ${cols.dur}, ${cols.done})
                     values ('${uid}', '${cid}', ${t}, ${d}, ${c})`
    );
  },

  // ============ 点赞 / 收藏（含全量计数 + 当前用户状态）============
  async getStats() {
    const uid = sqlVal(getUserId());
    // 各表可能尚未建好，分别 catch 避免互相拖累
    const safeQuery = (sql) => this._query(sql).catch(e => {
      console.warn('[getStats] query failed:', e.message);
      return [];
    });
    const [lc, fc, ml, mf] = await Promise.all([
      safeQuery(`select video_id, count(*) as cnt
                           from test_table_video_learn_likes where isDel = 0
                           group by video_id`),
      safeQuery(`select video_id, count(*) as cnt
                           from test_table_video_learn_favs where isDel = 0
                           group by video_id`),
      safeQuery(`select video_id
                           from test_table_video_learn_likes
                           where user_id = '${uid}' and isDel = 0`),
      safeQuery(`select video_id
                           from test_table_video_learn_favs
                           where user_id = '${uid}' and isDel = 0`),
    ]);
    const likeCounts = {},
      favCounts = {},
      myLikes = {},
      myFavs = {};
    lc.forEach((r) => (likeCounts[r.video_id] = Number(r.cnt) || 0));
    fc.forEach((r) => (favCounts[r.video_id] = Number(r.cnt) || 0));
    ml.forEach((r) => (myLikes[r.video_id] = true));
    mf.forEach((r) => (myFavs[r.video_id] = true));
    return { likeCounts, favCounts, myLikes, myFavs };
  },
  async toggleLike(courseId, liked) {
    const uid = sqlVal(getUserId());
    const cid = sqlVal(courseId);
    if (liked) {
      await this._exec(
        `insert into test_table_video_learn_likes (user_id, video_id)
                         select '${uid}',
                                '${cid}' where not exists (select 1 from test_table_video_learn_likes where user_id='${uid}' and video_id='${cid}')`,
      );
    } else {
      await this._exec(
        `delete
                         from test_table_video_learn_likes
                         where user_id = '${uid}'
                           and video_id = '${cid}' and isDel = 0`,
      );
    }
  },
  async toggleFavorite(courseId, faved) {
    const uid = sqlVal(getUserId());
    const cid = sqlVal(courseId);
    if (faved) {
      await this._exec(
        `insert into test_table_video_learn_favs (user_id, video_id)
                         select '${uid}',
                                '${cid}' where not exists (select 1 from test_table_video_learn_favs where user_id='${uid}' and video_id='${cid}')`,
      );
    } else {
      await this._exec(
        `delete
                         from test_table_video_learn_favs
                         where user_id = '${uid}'
                           and video_id = '${cid}' and isDel = 0`,
      );
    }
  },

  // ============ 评论 ============
  async getComments(courseId) {
    const uid = sqlVal(getUserId());
    const cid = sqlVal(courseId);
    // isDel=0 过滤平台软删除记录
    const rows = await this._query(
      `select *
   from test_table_video_learn_comms
   where video_id = '${cid}'
     and (isDel is null or isDel = 0)
   order by 1 desc`,
    );
    if (!rows.length) return [];
    const idCol = this._detectIdCol(rows[0]);
    const ids = rows.map((r) => sqlVal(String(r[idCol]))).join("','");
    // comms_likes 表可能尚未建好，独立 catch 避免整体失败
    let likeCounts = [], myLikes = [];
    try {
      [likeCounts, myLikes] = await Promise.all([
        this._query(
          `select comm_id, count(*) as cnt
                             from test_table_video_learn_comms_likes
                             where comm_id in ('${ids}') and isDel = 0
                             group by comm_id`,
        ),
        this._query(
          `select comm_id
                             from test_table_video_learn_comms_likes
                             where user_id = '${uid}'
                               and comm_id in ('${ids}') and isDel = 0`,
        ),
      ]);
    } catch (e) {
      console.warn("[getComments] comms_likes 查询失败（表可能未建）", e.message);
    }
    const lcMap = {};
    likeCounts.forEach((r) => (lcMap[String(r.comm_id)] = Number(r.cnt) || 0));
    const likedSet = new Set(myLikes.map((r) => String(r.comm_id)));
    return rows.map((r) => ({
      id: String(r[idCol]),
      name: r.user_id || "匿名用户",
      text: r.fav_id || "",
      likes: lcMap[String(r[idCol])] || 0,
      liked: likedSet.has(String(r[idCol])),
      ago: timeAgo(r.createdTime || r.created_at || null),
      name_censored: r.username_censored
    }));
  },
  async postComment(courseId, text) {
    const uid = sqlVal(getUserId());
    const cid = sqlVal(courseId);
    const txt = sqlVal(text);
    let p_username = username_global[0] + '*' + (username_global.length - 1 >= 0 ? username_global[username_global.length - 1] : '')
    await this._exec(
      `insert into test_table_video_learn_comms (user_id, video_id, fav_id, user_name, username_censored)
                     values ('${uid}', '${cid}', '${txt}', '${username_global}', '${p_username}')`,
    );
  },
  async toggleCommentLike(commentId, liked, courseId) {
    const uid = sqlVal(getUserId());
    const cmid = sqlVal(commentId);
    if (liked) {
      await this._exec(
        `insert into test_table_video_learn_comms_likes (user_id, comm_id)
                         select '${uid}',
                                '${cmid}' where not exists (select 1 from test_table_video_learn_comms_likes where user_id='${uid}' and comm_id='${cmid} and isDel = 0')`,
      );
    } else {
      await this._exec(
        `delete
                         from test_table_video_learn_comms_likes
                         where user_id = '${uid}'
                           and comm_id = '${cmid}' and isDel = 0`,
      );
    }
  },
};

/* ---------- 模拟数据（USE_MOCK=true 时使用，方便预览）---------- */
const VBASE =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/";
const PBASE =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/images/";
const MOCK_COURSES = [
  {
    id: "c1",
    title: "现代 CSS 布局：Flexbox 与 Grid 实战",
    cat: "前端开发",
    teacher: "林墨",
    kp: ["Flexbox", "Grid 网格", "响应式设计"],
    dur: "09:56",
    src: VBASE + "BigBuckBunny.mp4",
    poster: PBASE + "BigBuckBunny.jpg",
  },
  {
    id: "c2",
    title: "JavaScript 异步编程：Promise 与 async/await",
    cat: "前端开发",
    teacher: "林墨",
    kp: ["Promise", "async/await", "事件循环"],
    dur: "00:15",
    src: VBASE + "ForBiggerBlazes.mp4",
    poster: PBASE + "ForBiggerBlazes.jpg",
  },
  {
    id: "c3",
    title: "React Hooks 深入解析与最佳实践",
    cat: "前端开发",
    teacher: "沈川",
    kp: ["useState", "useEffect", "自定义 Hook"],
    dur: "00:15",
    src: VBASE + "ForBiggerEscapes.mp4",
    poster: PBASE + "ForBiggerEscapes.jpg",
  },
  {
    id: "c4",
    title: "二叉树的遍历与递归思想",
    cat: "算法与数据结构",
    teacher: "周衡",
    kp: ["二叉树", "递归", "深度优先遍历"],
    dur: "10:53",
    src: VBASE + "ElephantsDream.mp4",
    poster: PBASE + "ElephantsDream.jpg",
  },
  {
    id: "c5",
    title: "排序算法详解：快排与归并",
    cat: "算法与数据结构",
    teacher: "周衡",
    kp: ["快速排序", "归并排序", "时间复杂度"],
    dur: "00:15",
    src: VBASE + "ForBiggerJoyrides.mp4",
    poster: PBASE + "ForBiggerJoyrides.jpg",
  },
  {
    id: "c6",
    title: "动态规划入门：从状态转移到背包问题",
    cat: "算法与数据结构",
    teacher: "周衡",
    kp: ["动态规划", "状态转移", "背包问题"],
    dur: "12:14",
    src: VBASE + "TearsOfSteel.mp4",
    poster: PBASE + "TearsOfSteel.jpg",
  },
  {
    id: "c7",
    title: "Transformer 与注意力机制原理",
    cat: "人工智能",
    teacher: "苏明远",
    kp: ["注意力机制", "Transformer", "自注意力"],
    dur: "00:15",
    src: VBASE + "ForBiggerMeltdowns.mp4",
    poster: PBASE + "ForBiggerMeltdowns.jpg",
  },
  {
    id: "c8",
    title: "神经网络基础：从感知机到反向传播",
    cat: "人工智能",
    teacher: "苏明远",
    kp: ["感知机", "反向传播", "梯度下降"],
    dur: "00:15",
    src: VBASE + "ForBiggerFun.mp4",
    poster: PBASE + "ForBiggerFun.jpg",
  },
  {
    id: "c9",
    title: "交互设计原则与用户体验",
    cat: "UI/UX 设计",
    teacher: "安若",
    kp: ["交互设计", "可用性", "用户旅程"],
    dur: "14:48",
    src: VBASE + "Sintel.mp4",
    poster: PBASE + "Sintel.jpg",
  },
  {
    id: "c10",
    title: "色彩理论与界面配色方法",
    cat: "UI/UX 设计",
    teacher: "安若",
    kp: ["色彩理论", "对比度", "配色方案"],
    dur: "00:15",
    src: VBASE + "VolkswagenGTIReview.mp4",
    poster: PBASE + "VolkswagenGTIReview.jpg",
  },
  {
    id: "c11",
    title: "需求分析与用户画像构建",
    cat: "产品思维",
    teacher: "高远",
    kp: ["需求分析", "用户画像", "MVP"],
    dur: "00:15",
    src: VBASE + "SubaruOutbackOnStreetAndDirt.mp4",
    poster: PBASE + "SubaruOutbackOnStreetAndDirt.jpg",
  },
  {
    id: "c12",
    title: "数据驱动的产品决策",
    cat: "产品思维",
    teacher: "高远",
    kp: ["数据分析", "A/B 测试", "转化率"],
    dur: "00:15",
    src: VBASE + "WhatCarCanYouGetForAGrand.mp4",
    poster: PBASE + "WhatCarCanYouGetForAGrand.jpg",
  },
];

/* ---------- 运行时数据（来自接口）---------- */
let COURSES = [];
let CATS = ["全部"];

const PALETTE = [
  "#BE4B2A",
  "#C98A1E",
  "#2F6B5E",
  "#3D5A80",
  "#7B4B66",
  "#5E6B2F",
];
const catColor = (cat) =>
  PALETTE[CATS.indexOf(cat) % PALETTE.length] || "#BE4B2A";

/* 预置评论 */
const SEED_COMMENTS = {
  c1: [
    {
      n: "前端小白",
      t: "老师讲的 Grid 部分太清楚了，终于搞懂 fr 单位了！",
      lk: 42,
      ago: "2天前",
    },
    {
      n: "Maggie",
      t: "建议补充一下 grid-template-areas 的例子～",
      lk: 11,
      ago: "5天前",
    },
  ],
  c4: [
    {
      n: "算法爱好者",
      t: "递归那段配合动画看一下就通了，赞👍",
      lk: 28,
      ago: "1天前",
    },
  ],
  c9: [
    {
      n: "设计师阿May",
      t: "用户旅程地图这块讲得非常实用，已收藏。",
      lk: 35,
      ago: "3天前",
    },
  ],
};
const SEED_LIKES = {
  c1: 128,
  c2: 64,
  c3: 96,
  c4: 210,
  c5: 41,
  c6: 158,
  c7: 302,
  c8: 187,
  c9: 143,
  c10: 72,
  c11: 55,
  c12: 88,
};
const SEED_FAVS = {
  c1: 56,
  c2: 23,
  c3: 48,
  c4: 91,
  c5: 18,
  c6: 73,
  c7: 140,
  c8: 88,
  c9: 67,
  c10: 31,
  c11: 24,
  c12: 39,
};
const AVATAR_COLORS = [
  "#BE4B2A",
  "#2F6B5E",
  "#3D5A80",
  "#C98A1E",
  "#7B4B66",
];

/* ---------- 运行时状态 ---------- */
let state = {
  progress: {},
  likes: {},
  favs: {},
  likeCounts: {},
  favCounts: {},
  comments: {},
};

/* ---------- 周报辅助 ---------- */
let expandedWeeks = {};
let weeklyGroupsOrdered = [];

function getWeekKey(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d - jan1) / 86400000) + 1;
  const jan1Day = jan1.getDay();
  const weekNum = Math.ceil((dayOfYear + jan1Day) / 7);
  const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const fmt = x => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return { key: `${year}年第${weekNum}周 (${fmt(ws)}~${fmt(we)})`, sort: year * 100 + weekNum };
}

function renderWeeklyLearning() {
  const wrap = qs('#videoList');
  qs('#resumeSlot').innerHTML = '';
  qs('#listTitle').textContent = '学习周报';
  qs('#listCount').textContent = '';
  qs('#chips').style.display = 'none';

  // 收集所有有进度的课程
  const entries = [];
  COURSES.forEach(c => {
    const p = state.progress[c.id];
    if (!p || p.time <= 0) return;
    const wk = getWeekKey(p.updatedAt);
    if (!wk) return;
    entries.push({ course: c, progress: p, weekKey: wk.key, weekSort: wk.sort });
  });

  if (!entries.length) {
    wrap.innerHTML = `<div class="empty text-center py-12 text-slate-400">暂无学习记录</div>`;
    return;
  }

  // 按周分组
  const weekMap = {};
  entries.forEach(e => {
    if (!weekMap[e.weekKey]) weekMap[e.weekKey] = { sort: e.weekSort, items: [] };
    weekMap[e.weekKey].items.push(e);
  });

  // 降序排列
  weeklyGroupsOrdered = Object.entries(weekMap).sort((a, b) => b[1].sort - a[1].sort);

  wrap.innerHTML = weeklyGroupsOrdered.map(([weekKey, group], idx) => {
    const completed = group.items.filter(e => e.progress.completed).length;
    const inProgress = group.items.length - completed;
    const totalSecs = Math.round(group.items.reduce((s, e) => s + (e.progress.time || 0), 0));
    const mm = Math.floor(totalSecs / 60), ss = totalSecs % 60;
    const timeStr = totalSecs > 0 ? `${mm}分${String(ss).padStart(2,'0')}秒` : '';
    const isOpen = !!expandedWeeks[weekKey];

    const itemsHtml = isOpen ? group.items.map(e => {
      const st = videoStatus(e.course.id);
      return `<div class="px-4 py-3 border-t border-neutral-200 flex items-center gap-3 cursor-pointer" onclick="openPlayer('${e.course.id}')">
        <div class="shrink-0 h-[56px] aspect-video rounded overflow-hidden bg-slate-200" style="background-image:url('${e.course.poster}');background-size:cover;background-position:center"></div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(e.course.title)}</div>
          <span class="text-xs ${st.cls === 'done' ? 'text-green-600' : 'text-blue-600'}">${st.label}</span>
        </div>
      </div>`;
    }).join('') : '';

    const summaryHtml = isOpen ? `<div class="px-4 pb-2 flex gap-4 text-xs text-slate-500">
      ${completed > 0 ? `<span class="text-green-600">已完成 ${completed} 个</span>` : ''}
      ${inProgress > 0 ? `<span class="text-blue-600">学习中 ${inProgress} 个</span>` : ''}
      ${timeStr ? `<span>共看 ${timeStr}</span>` : ''}
    </div>` : '';

    return `<div class="border-b border-neutral-300">
      <div class="p-4 flex items-center justify-between cursor-pointer" onclick="toggleWeekByIdx(${idx})">
        <div class="flex items-center gap-2 min-w-0">
          <span class="inline-block shrink-0 h-[14px] w-[3px] rounded-full bg-blue-400"></span>
          <span class="text-sm font-semibold text-slate-800 truncate">${weekKey}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0 ms-2">
          <span class="text-sm text-slate-500 bg-blue-50 px-2 py-0.5 rounded-full">${group.items.length}个视频</span>
          <iconify-icon icon="${isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'}" class="text-lg text-slate-400"></iconify-icon>
        </div>
      </div>
      ${summaryHtml}
      <div class="bg-slate-50">${itemsHtml}</div>
    </div>`;
  }).join('');
}

function toggleWeekByIdx(idx) {
  const [key] = weeklyGroupsOrdered[idx];
  expandedWeeks[key] = !expandedWeeks[key];
  renderWeeklyLearning();
}
let activeCat = "全部",
  searchQ = "",
  currentTab = "home",
  current = null;

/* ---------- 工具 ---------- */
const qs = (s) => document.querySelector(s);
const fmt = (sec) => {
  if (!isFinite(sec)) return "0:00";
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60),
    s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
};

function toast(msg) {
  const t = qs("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 1800);
}

function videoStatus(id) {
  const p = state.progress[id];
  if (!p) return { label: "未学", cls: "new", pct: 0 };
  if (p.completed) return { label: "已学完", cls: "done", pct: 100 };
  const pct = p.duration
    ? Math.min(99, Math.round((p.time / p.duration) * 100))
    : 0;
  return { label: "学习中 " + pct + "%", cls: "doing", pct };
}

/* ---------- 渲染：分类 chips ---------- */
function renderChips() {
  qs("#chips").innerHTML = CATS.map(
    (c, index) =>
      `<div class="chip text-base cursor-pointer shrink-0 ${index == 0 ? 'ms-4' : index + 1 == CATS.length ? 'me-4' : ''} ${c === activeCat ? "text-blue-600 font-semibold" : ""}" data-cat="${c}">${c}</div>`,
  ).join("");
  document.querySelectorAll("#chips .chip").forEach((el) => {
    el.onclick = () => {
      activeCat = el.dataset.cat;
      renderChips();
      renderList();
    };
  });
}

/* ---------- 渲染：续学卡片 ---------- */
function renderResume() {
  const slot = qs("#resumeSlot");
  slot.innerHTML = "";
  if (currentTab !== "home") {
    return;
  }
  // 找最近一次未学完的进度
  let last = null,
    lastT = 0;
  for (const id in state.progress) {
    const p = state.progress[id];
    if (!p.completed && p.time > 3 && p.updatedAt > lastT) {
      lastT = p.updatedAt;
      last = id;
    }
  }
  if (!last) return;
  const c = COURSES.find((x) => x.id === last);
  if (!c) return;
  const st = videoStatus(c.id);
  const div = document.createElement("div");
  div.className = "resume";
  div.innerHTML = `
    <div class="label text-lg font-semibold py-2">继续学习</div>
    <div class="resume-body flex items-center gap-2">
      <div class="rthumb aspect-video h-[80px] shrink-0 w-auto rounded-md" style="background-color:${catColor(c.cat)};background-image:url('${c.poster}')">
        <div class="pp size-full flex items-center justify-center"><span class="w-12 h-12 bg-[rgba(255,255,255,0.3)] rounded-full flex items-center justify-center"><iconify-icon class="text-2xl text-white" icon="mdi:play"></iconify-icon></span></div>
      </div>
      <div class="rinfo flex-1">
        <h4 class="text-base font-semibold">${c.title}</h4>
        <p class="text-sm text-slate-600 mt-1">上次看到 ${fmt(state.progress[c.id].time)} · 还剩 ${100 - st.pct}%</p>
        <div class="rbar overflow-hidden bg-slate-100 w-full h-[8px] mt-2 rounded-full"><span style="width:${st.pct}%" class="h-full block bg-green-600"></span></div>
      </div>
    </div>`;
  div.onclick = () => openPlayer(c.id);
  slot.appendChild(div);
}

/* ---------- 渲染：视频列表 ---------- */
function filteredCourses() {
  let arr = COURSES.slice();
  if (currentTab === "fav") arr = arr.filter((c) => state.favs[c.id]);
  if (currentTab === "learning")
    arr = arr.filter((c) => {
      const p = state.progress[c.id];
      return p && !p.completed && p.time > 1;
    });
  if (currentTab === "home" && activeCat !== "全部")
    arr = arr.filter((c) => (c.kp || []).includes(activeCat));
  if (searchQ) {
    const q = searchQ.toLowerCase();
    arr = arr.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.desc || "").toLowerCase().includes(q) ||
        (c.kp || []).some((k) => k.toLowerCase().includes(q)) ||
        (c.cat || "").toLowerCase().includes(q) ||
        (c.teacher || "").includes(q),
    );
  }
  return arr;
}

function formatPlays(n) {
  n = Number(n) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function renderList() {
  if (currentTab === 'weekly') {
    renderWeeklyLearning();
    return;
  }
  renderResume();
  const arr = filteredCourses();
  const titleMap = {
    home: activeCat === "全部" ? "全部课程" : activeCat,
    learning: "正在学习",
    fav: "我的收藏",
  };
  qs("#listTitle").textContent = searchQ
    ? `搜索“${searchQ}”`
    : titleMap[currentTab];
  qs("#listCount").textContent = arr.length ? `${arr.length} 个视频` : "";
  // 仅当存在多个分类时才显示分类条
  const hasCats = CATS.length > 1;
  qs("#chips").style.display =
    hasCats && currentTab === "home" && !searchQ ? "flex" : "none";

  const wrap = qs("#videoList");
  if (!arr.length) {
    wrap.innerHTML = `<div class="empty text-center text-xl"><div class="big text-4xl pb-2">🔍</div>
      ${searchQ ? "没有找到相关视频，换个关键词试试" : currentTab === "fav" ? "还没有收藏的视频" : "这里暂时还没有内容"}</div>`;
    return;
  }
  wrap.innerHTML = arr
    .map((c) => {
      const st = videoStatus(c.id);
      // —— 元信息行：根据可用字段动态拼装 ——
      const metaParts = [];
      // if (c.teacher) metaParts.push(`<span>${escapeHtml(c.teacher)} 老师</span>`);
      // if (c.kp && c.kp.length)
      //     metaParts.push(`<span class="kp">${escapeHtml(c.kp[0])}</span>`);
      if (!c.teacher && c.plays != null)
        metaParts.push(`<span>${formatPlays(c.plays)} 次播放</span>`);
      return `<div class="card flex items-center gap-2 cursor-pointer" data-id="${c.id}">
      <div class="thumb aspect-video relative h-[80px] shrink-0 w-auto rounded-md overflow-hidden" style="background:${catColor(c.cat || "")}">
        ${c.cat ? `<div class="ph">${escapeHtml(c.cat)}</div>` : ""}
        ${c.poster ? `<img class="size-full object-cover" src="${c.poster}" alt="" onerror="this.style.display='none'">` : ""}
        <div class="play-ic absolute top-0 left-0 size-full flex items-center justify-center"><span class="w-12 h-12 bg-[rgba(255,255,255,0.3)] rounded-full flex items-center justify-center"><iconify-icon class="text-2xl text-white" icon="mdi:play"></iconify-icon></span></div>
        ${c.dur ? `<span class="dur">${escapeHtml(c.dur)}</span>` : ""}
        ${st.pct > 0 ? `<div class="cbar"><i style="width:${st.pct}%"></i></div>` : ""}
      </div>
      <div class="cinfo flex-1">

        <h4 class="text-base mb-1 font-semibold">${escapeHtml(c.title)}</h4>
        <div class="ctop" style="padding: 4px 0">
          ${c.cat ? `<span class="badge cat">${escapeHtml(c.cat)}</span>` : ""}
          <span class="status text-xs py-1 px-1.5 rounded-sm font-semibold ${st.cls == 'new' ? 'bg-slate-100 text-slate-600' : st.cls == 'done' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}">${st.label}</span>
        </div>
        <div class="meta text-sm mt-1.5 ps-1">${metaParts.join("")}</div>
      </div>
    </div>`;
    })
    .join("");
  wrap
    .querySelectorAll(".card")
    .forEach((el) => (el.onclick = () => openPlayer(el.dataset.id)));
}

/* ============================================================
播放器
============================================================ */
const video = qs("#video"),
  wrap = qs("#playerWrap");
const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
let saveTick = 0,
  lastSavedSec = -9,
  hideTimer = null,
  dragging = false,
  playCounted = false;

async function openPlayer(id) {
  current = COURSES.find((c) => c.id === id);
  if (!current) return;
  playCounted = false; // 每次打开重置「已计数」标志
  // 信息
  qs("#pCat").textContent = current.cat || "";
  qs("#pCat").style.display = current.cat ? "inline-block" : "none";
  qs("#pTitle").textContent = current.title || "";
  // 元信息行：动态拼装可见字段
  const metaParts = [];
  if (current.teacher) metaParts.push(`<span>${escapeHtml(current.teacher)} 老师</span>`);
  if (current.dur) metaParts.push(`<span>时长 ${escapeHtml(current.dur)}</span>`);
  if (current.plays != null)
    metaParts.push(`<span>${formatPlays(current.plays)} 次播放</span>`);
  qs("#pMeta").innerHTML = metaParts.join("");
  // 知识点
  console.log(current.kp)
  if (current.kp.length > 0 && !(current.kp.length === 1 && !current.kp[0])) {
    qs("#pKps").innerHTML = (current.kp || [])
      .map((k) => `<span class="kp text-xs py-1 px-2 rounded-sm text-slate-600 bg-neutral-100 flex items-center"><span class=" w-2 h-2 rounded-full bg-blue-600 me-2"></span> <span>${escapeHtml(k)}</span></span>`)
      .join("");
  }

  qs("#pKps").style.display = current.kp && current.kp.length && !(current.kp.length === 1 && !current.kp[0]) ? "flex" : "none";
  // 详情（来自 video_description）
  let pDesc = qs("#pDesc");
  if (!pDesc) {
    pDesc = document.createElement("div");
    pDesc.id = "pDesc";
    pDesc.className = "pdesc p-2 mt-2 bg-neutral-100 rounded-md text-sm text-neutral-950";
    qs("#pKps").after(pDesc);
  }
  pDesc.textContent = current.desc || "";
  pDesc.style.display = current.desc ? "block" : "none";
  // 互动状态：点赞/收藏已在全局拉取
  renderActions();
  // 评论：先清空再异步加载
  state.comments[current.id] = [];
  renderComments();
  // 加载视频
  wrap.classList.remove("playing");
  video.poster = current.poster || "";
  video.src = current.src;
  video.playbackRate = 1;
  qs("#speedBtn").textContent = "1.0×";
  video.load();
  // 视图切换
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  qs("#player").classList.add("active");
  qs("#playerScroll").scrollTop = 0;
  qs("#resumeToast").classList.remove("show");
  // 异步拉取评论（不阻塞视图）
  const targetId = current.id;
  try {
    const comments = await API.getComments(targetId);
    // 用户可能已切到其他视频，避免覆盖
    if (current && current.id === targetId) {
      state.comments[targetId] = comments;
      renderComments();
    }
  } catch (e) {
    console.warn("[getComments]", e);
  }
}

function closePlayer() {
  saveProgress(true);
  video.pause();
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  qs("#list").classList.add("active");
  renderList();
}

/* 元数据就绪：接续上次播放位置 */
video.addEventListener("loadedmetadata", () => {
  const p = state.progress[current.id];
  if (p && p.time > 3 && !p.completed && p.time < video.duration - 2) {
    video.currentTime = p.time;
    const t = qs("#resumeToast");
    t.innerHTML = `已为你定位到上次观看位置 <b>${fmt(p.time)}</b>`;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
  }
  updateProgressUI();
});

/* 播放控制 */
function togglePlay() {
  video.paused ? video.play() : video.pause();
}

video.addEventListener("play", () => {
  wrap.classList.add("playing");
  setPlayIcon(true);
  scheduleHide();
  // 首次播放本视频：上报播放量 +1
  if (current && !playCounted) {
    playCounted = true;
    const id = current.id;
    API.incrementPlay(id)
      .then(() => {
        const c = COURSES.find((x) => x.id === id);
        if (c) c.plays = (c.plays || 0) + 1;
      })
      .catch((e) => console.warn("[incrementPlay]", e));
  }
});
video.addEventListener("pause", () => {
  wrap.classList.remove("playing");
  setPlayIcon(false);
  showControls();
  saveProgress(true);
});
video.addEventListener("waiting", () =>
  qs("#loading").classList.add("show"),
);
video.addEventListener("playing", () =>
  qs("#loading").classList.remove("show"),
);
video.addEventListener("canplay", () =>
  qs("#loading").classList.remove("show"),
);

function setPlayIcon(playing) {
  qs("#playPause").innerHTML = playing
    ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
    : '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
}

qs("#playPause").onclick = togglePlay;
qs("#bigPlay").onclick = togglePlay;

/* 进度更新 + 自动记录 */
video.addEventListener("timeupdate", () => {
  if (!dragging) updateProgressUI();
  // 节流保存：每 3 秒
  const sec = Math.floor(video.currentTime);
  if (Math.abs(sec - lastSavedSec) >= 3) {
    lastSavedSec = sec;
    saveProgress(false);
  }
});
video.addEventListener("ended", () => {
  if (current) {
    markCompleted(current.id);
    toast("🎉 本节已学完");
    renderActions();
  }
});

function updateProgressUI() {
  const d = video.duration || 0,
    t = video.currentTime || 0;
  const pct = d ? (t / d) * 100 : 0;
  qs("#played").style.width = pct + "%";
  qs("#thumbDot").style.left = pct + "%";
  qs("#timeLabel").textContent = fmt(t) + " / " + fmt(d);
  if (video.buffered.length) {
    const b = video.buffered.end(video.buffered.length - 1);
    qs("#buffered").style.width = (d ? (b / d) * 100 : 0) + "%";
  }
  // 达到 90% 视为学完
  if (
    d &&
    t / d >= 0.9 &&
    current &&
    !(state.progress[current.id] || {}).completed
  ) {
    markCompleted(current.id);
  }
}

function saveProgress(force) {
  if (!current || !video.duration) return;
  const id = current.id,
    prev = state.progress[id] || {};
  const completed =
    prev.completed || video.currentTime / video.duration >= 0.9;
  state.progress[id] = {
    time: video.currentTime,
    duration: video.duration,
    completed,
    updatedAt: Date.now(),
  };
  // 实际写入后端：force=true 立即写，否则 600ms 防抖合并
  const doSave = () => {
    API.saveProgress(id, video.currentTime, video.duration, completed)
      .catch((e) => console.warn("[saveProgress]", e));
  };
  if (force) {
    clearTimeout(saveTick);
    doSave();
  } else {
    clearTimeout(saveTick);
    saveTick = setTimeout(doSave, 600);
  }
}

function markCompleted(id) {
  const p = state.progress[id] || {};
  const time = video.currentTime || p.time || 0;
  const duration = video.duration || p.duration || 0;
  state.progress[id] = {
    ...p,
    completed: true,
    time,
    duration,
    updatedAt: Date.now(),
  };
  API.saveProgress(id, time, duration, true).catch((e) =>
    console.warn("[markCompleted]", e),
  );
}

/* 进度条拖动 / 点击跳转 */
const progressEl = qs("#progress");

function seekFromEvent(e) {
  const rect = progressEl.querySelector(".track").getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  let r = Math.max(0, Math.min(1, x / rect.width));
  if (video.duration) {
    video.currentTime = r * video.duration;
    qs("#played").style.width = r * 100 + "%";
    qs("#thumbDot").style.left = r * 100 + "%";
    qs("#timeLabel").textContent =
      fmt(video.currentTime) + " / " + fmt(video.duration);
  }
}

progressEl.addEventListener("pointerdown", (e) => {
  dragging = true;
  progressEl.setPointerCapture(e.pointerId);
  seekFromEvent(e);
  showControls();
});
progressEl.addEventListener("pointermove", (e) => {
  if (dragging) seekFromEvent(e);
});
progressEl.addEventListener("pointerup", (e) => {
  if (dragging) {
    dragging = false;
    saveProgress(true);
    scheduleHide();
  }
});
progressEl.addEventListener("pointercancel", () => {
  dragging = false;
});

/* 倍速 */
const speedMenu = qs("#speedMenu");

function renderSpeedMenu() {
  speedMenu.innerHTML = SPEEDS.map(
    (s) =>
      `<button class="${video.playbackRate === s ? "on" : ""}" data-s="${s}">${s.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0")}×</button>`,
  ).join("");
  speedMenu.querySelectorAll("button").forEach(
    (b) =>
    (b.onclick = () => {
      const s = parseFloat(b.dataset.s);
      video.playbackRate = s;
      if (s == '1.25') {
        qs("#speedBtn").textContent = s.toFixed(2) + "×";
      }
      else {
        qs("#speedBtn").textContent = s.toFixed(1) + "×";
      }
      speedMenu.classList.remove("show");
      renderSpeedMenu();
      toast("倍速 " + s + "×");
    }),
  );
}

qs("#speedBtn").onclick = (e) => {
  e.stopPropagation();
  renderSpeedMenu();
  speedMenu.classList.toggle("show");
  showControls();
};
document.addEventListener("click", (e) => {
  if (!speedMenu.contains(e.target) && e.target.id !== "speedBtn")
    speedMenu.classList.remove("show");
});

/* 全屏 */
qs("#fsBtn").onclick = () => {
  const el = wrap;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen)
      document.webkitExitFullscreen();
  }
};
document.addEventListener("fullscreenchange", () => {
  wrap.classList.toggle("fs-active", !!document.fullscreenElement);
});

/* 控制栏自动隐藏 */
function showControls() {
  wrap.classList.remove("hide-ui");
  scheduleHide();
}

function scheduleHide() {
  clearTimeout(hideTimer);
  if (!video.paused)
    hideTimer = setTimeout(() => {
      if (!dragging) wrap.classList.add("hide-ui");
    }, 2800);
}

wrap.addEventListener("pointermove", showControls);
wrap.addEventListener("pointerdown", showControls);

/* 键盘快捷键（桌面） */
document.addEventListener("keydown", (e) => {
  if (!qs("#player").classList.contains("active")) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")
    return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowRight") {
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
    showControls();
  } else if (e.code === "ArrowLeft") {
    video.currentTime = Math.max(0, video.currentTime - 5);
    showControls();
  } else if (e.key === "f" || e.key === "F") {
    qs("#fsBtn").click();
  }
});

qs("#backBtn").onclick = closePlayer;

/* ============================================================
互动：点赞 / 收藏 / 评论
============================================================ */
function renderActions() {
  const id = current.id;
  qs("#likeCount").textContent = state.likeCounts[id] || 0;
  qs("#favCount").textContent = state.favCounts[id] || 0;
  qs("#likeBtn").classList.toggle("on", !!state.likes[id]);
  qs("#favBtn").classList.toggle("on", !!state.favs[id]);
}

qs("#likeBtn").onclick = async () => {
  if (!current) return;
  const id = current.id;
  const target = !state.likes[id];
  // 乐观更新
  state.likes[id] = target;
  state.likeCounts[id] = Math.max(
    0,
    (state.likeCounts[id] || 0) + (target ? 1 : -1),
  );
  renderActions();
  const b = qs("#likeBtn");
  b.classList.remove("pop");
  void b.offsetWidth;
  b.classList.add("pop");
  try {
    await API.toggleLike(id, target);
    toast(target ? "已点赞 👍" : "已取消点赞");
  } catch (e) {
    // 失败回滚
    state.likes[id] = !target;
    state.likeCounts[id] = Math.max(
      0,
      (state.likeCounts[id] || 0) + (target ? -1 : 1),
    );
    renderActions();
    toast("操作失败，请稍后重试");
    console.warn("[toggleLike]", e);
  }
};
qs("#favBtn").onclick = async () => {
  if (!current) return;
  const id = current.id;
  const target = !state.favs[id];
  state.favs[id] = target;
  state.favCounts[id] = Math.max(
    0,
    (state.favCounts[id] || 0) + (target ? 1 : -1),
  );
  renderActions();
  const b = qs("#favBtn");
  b.classList.remove("pop");
  void b.offsetWidth;
  b.classList.add("pop");
  try {
    await API.toggleFavorite(id, target);
    toast(target ? "已收藏 ⭐ 可在「收藏」查看" : "已取消收藏");
  } catch (e) {
    state.favs[id] = !target;
    state.favCounts[id] = Math.max(
      0,
      (state.favCounts[id] || 0) + (target ? -1 : 1),
    );
    renderActions();
    toast("操作失败，请稍后重试");
    console.warn("[toggleFavorite]", e);
  }
};
qs("#shareBtn").onclick = () => toast("已复制分享链接（演示）");

/* 评论 */
function renderComments() {
  const id = current.id;
  const list = state.comments[id] || [];
  qs("#commentCount").textContent = list.length ? list.length + " 条" : "";
  const el = qs("#commentList");
  if (!list.length) {
    el.innerHTML = `<div class="empty text-base text-center" style="color:rgba(247,242,231,.4)">还没有评论，来抢沙发～</div>`;
    return;
  }
  console.log(list[0].ago)
  el.innerHTML = list
    .map((c) => {
      const color =
        AVATAR_COLORS[c.name.charCodeAt(0) % AVATAR_COLORS.length];
      return `<div class="citem flex">
      <div class="av w-10 h-10 flex text-lg font-semibold items-center justify-center rounded-full me-2" style="background:${color}">${c.name_censored[0] || '匿'}</div>
      <div class="cbody flex-1">
        <div class="cname font-semibold flex items-center text-base">${c.name_censored || '匿名'}<span class="ctime text-sm ms-2 font-normal text-slate-600">${c.ago.year + 1900}-${c.ago.month + 1}-${c.ago.date} ${c.ago.hours}:${c.ago.minutes}:${c.ago.seconds}</span></div>
        <div class="ctext text-base">${escapeHtml(c.text)}</div>
        <button class="clike flex items-center text-sm ${c.liked ? "on" : ""}" data-cid="${c.id}">
          <iconify-icon icon="mdi:like" class="text-sm pe-1"></iconify-icon>
          ${c.likes || 0}
        </button>
      </div>
    </div>`;
    })
    .join("");
  el.querySelectorAll(".clike").forEach(
    (b) => (b.onclick = () => toggleCommentLike(id, b.dataset.cid)),
  );
}

async function toggleCommentLike(vid, cid) {
  const list = state.comments[vid] || [];
  const c = list.find((x) => x.id === cid);
  if (!c) return;
  const target = !c.liked;
  // 乐观更新
  c.liked = target;
  c.likes = Math.max(0, (c.likes || 0) + (target ? 1 : -1));
  renderComments();
  try {
    await API.toggleCommentLike(cid, target, vid);
  } catch (e) {
    // 回滚
    c.liked = !target;
    c.likes = Math.max(0, (c.likes || 0) + (target ? -1 : 1));
    renderComments();
    toast("操作失败");
    console.warn("[toggleCommentLike]", e);
  }
}

const cInput = qs("#commentInput"),
  cSend = qs("#commentSend");
cInput.addEventListener("input", () => {
  cSend.disabled = !cInput.value.trim();
  cInput.style.height = "auto";
  cInput.style.height = Math.min(90, cInput.scrollHeight) + "px";
});
cSend.onclick = async () => {
  const txt = cInput.value.trim();
  if (!txt || !current) return;
  const id = current.id;
  cSend.disabled = true;
  try {
    await API.postComment(id, txt);
    // 重新拉取，拿到服务端生成的 comment_id 和时间
    state.comments[id] = await API.getComments(id);
    cInput.value = "";
    cInput.style.height = "auto";
    renderComments();
    toast("评论已发布");
  } catch (e) {
    toast("发布失败，请重试");
    console.warn("[postComment]", e);
    cSend.disabled = false;
  }
};

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

/* ============================================================
底部导航 + 搜索
============================================================ */
qs("#nav")
  .querySelectorAll("button")
  .forEach((btn) => {
    btn.onclick = () => {
      currentTab = btn.dataset.tab;
      qs("#nav")
        .querySelectorAll("button")
        .forEach((b) => b.classList.toggle("on", b === btn));
      // 确保在列表视图
      document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.remove("active"));
      qs("#list").classList.add("active");
      searchQ = "";
      qs("#search").value = "";
      qs("#clearSearch").style.display = "none";
      if (currentTab !== "home") activeCat = "全部";
      renderChips();
      renderList();
      qs("#listScroll").scrollTop = 0;
    };
  });
const searchEl = qs("#search");
searchEl.addEventListener("input", () => {
  searchQ = searchEl.value.trim();
  qs("#clearSearch").style.display = searchQ ? "block" : "none";
  renderList();
});
qs("#clearSearch").onclick = () => {
  searchEl.value = "";
  searchQ = "";
  qs("#clearSearch").style.display = "none";
  renderList();
};

/* 离开页面时保存 */
window.addEventListener("beforeunload", () => saveProgress(true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveProgress(true);
});

/* ============================================================
加载态 / 错误态
============================================================ */
function renderLoading() {
  qs("#chips").style.display = "none";
  qs("#resumeSlot").innerHTML = "";
  qs("#listTitle").textContent = "加载中…";
  qs("#listCount").textContent = "";
  const skel = Array.from(
    { length: 5 },
    () =>
      `<div class="skel-card">
       <div class="skel-thumb"></div>
       <div class="skel-info">
         <div class="skel-line w40"></div>
         <div class="skel-line"></div>
         <div class="skel-line w60"></div>
       </div>
     </div>`,
  ).join("");
  qs("#videoList").innerHTML = skel;
}

function renderError(msg) {
  qs("#chips").style.display = "none";
  qs("#resumeSlot").innerHTML = "";
  qs("#listTitle").textContent = "加载失败";
  qs("#listCount").textContent = "";
  qs("#videoList").innerHTML = `
    <div class="empty error-state text-center">
      <div class="big text-4xl">⚠️</div>
      <p class="text-xl">${escapeHtml(msg || "无法加载课程")}</p>
      <button class="retry-btn bg-blue-600 p-2 text-base" id="retryBtn">重新加载</button>
    </div>`;
  qs("#retryBtn").onclick = reload;
}

/* ============================================================
启动 & 拉取数据
============================================================ */
async function reload() {
  renderLoading();
  try {
    // 并行拉取：课程列表 / 我的进度 / 点赞收藏统计
    const [courses, progress, stats] = await Promise.all([
      API.getCourses(),
      API.getMyProgress().catch((e) => {
        console.warn("[getMyProgress]", e);
        return {};
      }),
      API.getStats().catch((e) => {
        console.warn("[getStats]", e);
        return { likeCounts: {}, favCounts: {}, myLikes: {}, myFavs: {} };
      }),
    ]);
    if (!Array.isArray(courses))
      throw new Error("课程列表格式错误，请联系管理员");
    if (!courses.length) {
      COURSES = [];
      CATS = ["全部"];
      renderChips();
      renderList();
      return;
    }
    let uid = getUserId()
    console.log(uid)
    $('#backToQuizBtn').on('click', function () {
      window.location.replace(`https://www.wiidu.com.cn/zx/customForm/mp.html?a=1&tblname=custom_quiz_site&R=36707.02288477307&userid=${btoa(uid)}`)
    })
    COURSES = courses;
    state.progress = progress;
    state.likes = stats.myLikes;
    state.favs = stats.myFavs;
    state.likeCounts = stats.likeCounts;
    state.favCounts = stats.favCounts;

    // 分类条由所有视频的标签聚合而成（任一标签都可作为筛选项）
    const set = new Set();
    COURSES.forEach((c) => {
      (c.kp || []).forEach((t) => t && set.add(t));
    });
    CATS = ["全部", ...set];
    if (!CATS.includes(activeCat)) activeCat = "全部";

    renderChips();
    renderList();
  } catch (e) {
    console.error("[reload]", e);
    renderError(
      e.message ? "加载失败：" + e.message : "加载失败，请稍后重试",
    );
  }
}

let username_global = '';
(async function init() {
  let param = new URLSearchParams(window.location.search);
  console.log(param)
  username_global = decodeURI(atob(param.get('username')))
  await reload();
})();
