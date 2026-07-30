const lessons = [
  {
    id: "layout",
    index: 1,
    title: "响应式页面布局",
    description: "使用 Flex 与 Grid 组织多端学习页面。",
    duration: "12:30",
    progress: 100,
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg"
  },
  {
    id: "video-player",
    index: 2,
    title: "HTML5 Video 播放器封装",
    description: "实现播放控制、进度同步、倍速切换和断点续播。",
    duration: "15:10",
    progress: 42,
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg"
  },
  {
    id: "request-state",
    index: 3,
    title: "请求状态统一处理",
    description: "集中管理 loading、空数据与接口异常。",
    duration: "18:45",
    progress: 18,
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg"
  },
  {
    id: "optimistic-ui",
    index: 4,
    title: "乐观更新与失败回滚",
    description: "改善点赞、收藏等高频交互的即时反馈。",
    duration: "14:20",
    progress: 0,
    video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    poster: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg"
  }
];

const initialComments = [
  { id: "c1", author: "林同学", avatar: "L", content: "暂停和离开页面时补保存这个处理很实用。", createdAt: "12 分钟前" },
  { id: "c2", author: "周同学", avatar: "Z", content: "理解了为什么不能在 timeupdate 每次触发时都请求接口。", createdAt: "36 分钟前" },
  { id: "c3", author: "演示助教", avatar: "TA", content: "可以打开开发者工具观察三秒节流后的保存提示。", createdAt: "1 小时前" }
];

const quizQuestions = [
  {
    title: "播放进度适合在哪些时机立即保存？",
    options: ["仅在刷新页面时", "暂停、离开页面和播放结束前", "每一帧都保存", "只在点击收藏时"],
    answer: 1
  },
  {
    title: "乐观更新请求失败后应该如何处理？",
    options: ["保持错误状态", "刷新整个页面", "回滚 UI 并提示用户", "忽略异常"],
    answer: 2
  },
  {
    title: "匿名用户的学习进度可以优先保存在哪里？",
    options: ["localStorage", "Cookie 明文账号", "URL 查询参数", "DOM 属性"],
    answer: 0
  }
];

const state = {
  activeLesson: lessons[1],
  comments: [...initialComments],
  liked: false,
  favorite: false,
  likeCount: 128,
  saveTimer: null,
  pendingProgress: null,
  quizIndex: 0,
  quizAnswers: JSON.parse(localStorage.getItem("learning-quiz-answers") || "{}")
};

const elements = {
  video: document.querySelector("#video"),
  player: document.querySelector("#player"),
  centerPlay: document.querySelector("#centerPlay"),
  playButton: document.querySelector("#playButton"),
  timeline: document.querySelector("#timeline"),
  currentTime: document.querySelector("#currentTime"),
  duration: document.querySelector("#duration"),
  volume: document.querySelector("#volume"),
  volumeButton: document.querySelector("#volumeButton"),
  playbackRate: document.querySelector("#playbackRate"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  saveIndicator: document.querySelector("#saveIndicator"),
  resumeBanner: document.querySelector("#resumeBanner"),
  resumeTime: document.querySelector("#resumeTime"),
  lessonTag: document.querySelector("#lessonTag"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonDescription: document.querySelector("#lessonDescription"),
  courseList: document.querySelector("#courseList"),
  likeButton: document.querySelector("#likeButton"),
  favoriteButton: document.querySelector("#favoriteButton"),
  likeCount: document.querySelector("#likeCount"),
  commentInput: document.querySelector("#commentInput"),
  commentLength: document.querySelector("#commentLength"),
  commentList: document.querySelector("#commentList"),
  commentCount: document.querySelector("#commentCount"),
  toast: document.querySelector("#toast")
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function showToast(message, tone = "default") {
  elements.toast.textContent = message;
  elements.toast.dataset.tone = tone;
  elements.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function renderLessons() {
  elements.courseList.innerHTML = lessons.map((lesson) => `
    <button class="course-item ${lesson.id === state.activeLesson.id ? "active" : ""}" data-lesson-id="${lesson.id}">
      <span class="lesson-index">${lesson.progress === 100 ? '<i data-lucide="check"></i>' : lesson.index}</span>
      <span class="lesson-copy">
        <strong>${lesson.title}</strong>
        <small>${lesson.duration} · ${lesson.progress}%</small>
        <span class="mini-progress"><i style="width:${lesson.progress}%"></i></span>
      </span>
    </button>
  `).join("");
  lucide.createIcons();
}

function renderComments() {
  elements.commentList.innerHTML = state.comments.map((comment) => `
    <article class="comment">
      <span class="comment-avatar">${comment.avatar}</span>
      <div>
        <div class="comment-meta"><strong>${comment.author}</strong><time>${comment.createdAt}</time></div>
        <p>${comment.content}</p>
      </div>
    </article>
  `).join("");
  elements.commentCount.textContent = `${state.comments.length} 条`;
}

function loadLesson(lessonId) {
  flushProgress();
  const nextLesson = lessons.find((lesson) => lesson.id === lessonId);
  if (!nextLesson) return;
  state.activeLesson = nextLesson;
  elements.video.pause();
  elements.video.src = nextLesson.video;
  elements.video.poster = nextLesson.poster;
  elements.video.load();
  elements.lessonTag.textContent = `第 ${nextLesson.index} 节`;
  elements.lessonTitle.textContent = nextLesson.title;
  elements.lessonDescription.textContent = nextLesson.description;
  elements.timeline.value = 0;
  elements.currentTime.textContent = "00:00";
  elements.duration.textContent = nextLesson.duration;
  elements.resumeBanner.hidden = true;
  renderLessons();
  checkSavedProgress();
  addRecord(`进入课程「${nextLesson.title}」`);
}

function setPlayIcon(playing) {
  elements.playButton.innerHTML = `<i data-lucide="${playing ? "pause" : "play"}"></i>`;
  elements.centerPlay.hidden = playing;
  lucide.createIcons();
}

function togglePlay() {
  if (elements.video.paused) {
    elements.video.play().catch(() => showToast("视频资源暂时无法播放", "error"));
  } else {
    elements.video.pause();
  }
}

function scheduleProgressSave() {
  state.pendingProgress = {
    lessonId: state.activeLesson.id,
    currentTime: elements.video.currentTime,
    duration: elements.video.duration,
    percent: elements.video.duration ? Math.round(elements.video.currentTime / elements.video.duration * 100) : 0,
    updatedAt: Date.now()
  };
  if (state.saveTimer) return;
  elements.saveIndicator.classList.add("saving");
  elements.saveIndicator.innerHTML = '<i data-lucide="loader-circle"></i>保存中';
  lucide.createIcons();
  state.saveTimer = setTimeout(flushProgress, 3000);
}

async function flushProgress() {
  if (!state.pendingProgress) return;
  clearTimeout(state.saveTimer);
  state.saveTimer = null;
  const payload = state.pendingProgress;
  state.pendingProgress = null;
  await MockLearningApi.saveProgress(payload);
  const lesson = lessons.find((item) => item.id === payload.lessonId);
  if (lesson) lesson.progress = Math.max(lesson.progress, payload.percent);
  elements.saveIndicator.classList.remove("saving");
  elements.saveIndicator.innerHTML = '<i data-lucide="check"></i>进度已保存';
  renderLessons();
}

function checkSavedProgress() {
  const saved = JSON.parse(localStorage.getItem(`learning-progress:${state.activeLesson.id}`) || "null");
  if (!saved || saved.currentTime < 2 || saved.percent >= 95) return;
  elements.resumeTime.textContent = formatTime(saved.currentTime);
  elements.resumeBanner.dataset.time = saved.currentTime;
  elements.resumeBanner.hidden = false;
}

async function toggleInteraction(type) {
  const key = type === "like" ? "liked" : "favorite";
  const button = type === "like" ? elements.likeButton : elements.favoriteButton;
  const previous = state[key];
  state[key] = !previous;
  if (type === "like") {
    state.likeCount += state[key] ? 1 : -1;
    elements.likeCount.textContent = state.likeCount;
  }
  button.classList.toggle("active", state[key]);
  button.setAttribute("aria-pressed", state[key]);

  try {
    await MockLearningApi.toggleInteraction(type, state[key]);
    showToast(state[key] ? "操作成功" : "已取消");
  } catch {
    state[key] = previous;
    if (type === "like") {
      state.likeCount += state[key] ? 1 : -1;
      elements.likeCount.textContent = state.likeCount;
    }
    button.classList.toggle("active", state[key]);
    button.setAttribute("aria-pressed", state[key]);
    showToast("模拟接口失败，状态已自动回滚", "error");
  }
}

function addRecord(content) {
  const records = JSON.parse(localStorage.getItem("learning-records") || "[]");
  records.unshift({ id: Date.now(), content, time: new Date().toLocaleString("zh-CN", { hour12: false }) });
  localStorage.setItem("learning-records", JSON.stringify(records.slice(0, 12)));
}

function renderRecords() {
  const records = JSON.parse(localStorage.getItem("learning-records") || "[]");
  const fallback = [
    { content: "完成每日一练 2/3", time: "今天 09:20" },
    { content: "继续观看「HTML5 Video 播放器封装」", time: "昨天 18:42" },
    { content: "收藏课程「请求状态统一处理」", time: "07-28 20:16" }
  ];
  document.querySelector("#recordList").innerHTML = (records.length ? records : fallback).map((record) => `
    <article class="record-item">
      <span><i data-lucide="activity"></i></span>
      <div><strong>${record.content}</strong><time>${record.time}</time></div>
    </article>
  `).join("");
  lucide.createIcons();
}

function renderQuiz() {
  const question = quizQuestions[state.quizIndex];
  const selected = state.quizAnswers[state.quizIndex];
  const completed = Object.keys(state.quizAnswers).length;
  document.querySelector("#quizCard").innerHTML = `
    <div class="quiz-progress">
      <span>第 ${state.quizIndex + 1} / ${quizQuestions.length} 题</span>
      <strong>${Math.round(completed / quizQuestions.length * 100)}%</strong>
    </div>
    <div class="progress-track"><span style="width:${completed / quizQuestions.length * 100}%"></span></div>
    <h3>${question.title}</h3>
    <div class="quiz-options">
      ${question.options.map((option, index) => `
        <button class="${selected === index ? "selected" : ""}" data-option="${index}">
          <span>${String.fromCharCode(65 + index)}</span>${option}
        </button>
      `).join("")}
    </div>
    <div class="quiz-footer">
      <button class="secondary-button" data-quiz-action="prev" ${state.quizIndex === 0 ? "disabled" : ""}>
        <i data-lucide="arrow-left"></i>上一题
      </button>
      <span>${completed === quizQuestions.length ? "练习已完成" : "答案会自动缓存"}</span>
      <button class="primary-button" data-quiz-action="next">
        ${state.quizIndex === quizQuestions.length - 1 ? "查看结果" : "下一题"}<i data-lucide="arrow-right"></i>
      </button>
    </div>
  `;
  lucide.createIcons();
}

elements.video.addEventListener("loadedmetadata", () => {
  elements.duration.textContent = formatTime(elements.video.duration);
  checkSavedProgress();
});
elements.video.addEventListener("play", () => {
  setPlayIcon(true);
  addRecord(`开始观看「${state.activeLesson.title}」`);
});
elements.video.addEventListener("pause", () => {
  setPlayIcon(false);
  flushProgress();
});
elements.video.addEventListener("timeupdate", () => {
  if (!elements.video.duration) return;
  elements.timeline.value = elements.video.currentTime / elements.video.duration * 100;
  elements.currentTime.textContent = formatTime(elements.video.currentTime);
  scheduleProgressSave();
});
elements.video.addEventListener("ended", () => {
  localStorage.removeItem(`learning-progress:${state.activeLesson.id}`);
  state.activeLesson.progress = 100;
  renderLessons();
  showToast("本节学习完成");
});

elements.playButton.addEventListener("click", togglePlay);
elements.centerPlay.addEventListener("click", togglePlay);
elements.video.addEventListener("click", togglePlay);
elements.timeline.addEventListener("input", (event) => {
  elements.video.currentTime = elements.video.duration * Number(event.target.value) / 100;
});
elements.volume.addEventListener("input", (event) => {
  elements.video.volume = Number(event.target.value);
  elements.video.muted = false;
});
elements.volumeButton.addEventListener("click", () => {
  elements.video.muted = !elements.video.muted;
  elements.volumeButton.innerHTML = `<i data-lucide="${elements.video.muted ? "volume-x" : "volume-2"}"></i>`;
  lucide.createIcons();
});
elements.playbackRate.addEventListener("change", (event) => {
  elements.video.playbackRate = Number(event.target.value);
});
elements.fullscreenButton.addEventListener("click", () => elements.player.requestFullscreen?.());
elements.likeButton.addEventListener("click", () => toggleInteraction("like"));
elements.favoriteButton.addEventListener("click", () => toggleInteraction("favorite"));

document.querySelector("#resumeButton").addEventListener("click", () => {
  elements.video.currentTime = Number(elements.resumeBanner.dataset.time);
  elements.resumeBanner.hidden = true;
  elements.video.play();
});
document.querySelector("#restartButton").addEventListener("click", () => {
  elements.video.currentTime = 0;
  elements.resumeBanner.hidden = true;
});

elements.courseList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-lesson-id]");
  if (item) loadLesson(item.dataset.lessonId);
});

elements.commentInput.addEventListener("input", () => {
  elements.commentLength.textContent = elements.commentInput.value.length;
});
document.querySelector("#commentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = elements.commentInput.value.trim();
  if (!content) return showToast("评论内容不能为空", "error");
  const comment = await MockLearningApi.createComment(content);
  state.comments.unshift(comment);
  elements.commentInput.value = "";
  elements.commentLength.textContent = "0";
  renderComments();
  showToast("评论已发布");
});

document.querySelector(".top-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${button.dataset.view}View`).classList.add("active");
  if (button.dataset.view === "practice") renderQuiz();
  if (button.dataset.view === "records") renderRecords();
});

document.querySelector("#practiceView").addEventListener("click", (event) => {
  const option = event.target.closest("[data-option]");
  if (option) {
    state.quizAnswers[state.quizIndex] = Number(option.dataset.option);
    localStorage.setItem("learning-quiz-answers", JSON.stringify(state.quizAnswers));
    renderQuiz();
    return;
  }
  const action = event.target.closest("[data-quiz-action]")?.dataset.quizAction;
  if (action === "prev") state.quizIndex = Math.max(0, state.quizIndex - 1);
  if (action === "next") {
    if (state.quizAnswers[state.quizIndex] === undefined) return showToast("请先选择答案", "error");
    if (state.quizIndex === quizQuestions.length - 1) {
      const score = quizQuestions.filter((question, index) => state.quizAnswers[index] === question.answer).length;
      showToast(`练习完成，答对 ${score}/${quizQuestions.length} 题`);
      addRecord(`完成每日一练 ${score}/${quizQuestions.length}`);
    } else {
      state.quizIndex += 1;
    }
  }
  renderQuiz();
});

document.querySelector("#clearRecords").addEventListener("click", () => {
  localStorage.removeItem("learning-records");
  renderRecords();
  showToast("演示记录已清空");
});

window.addEventListener("beforeunload", () => {
  if (state.pendingProgress) {
    localStorage.setItem(`learning-progress:${state.pendingProgress.lessonId}`, JSON.stringify(state.pendingProgress));
  }
});

elements.video.volume = 0.8;
renderLessons();
renderComments();
renderQuiz();
lucide.createIcons();
