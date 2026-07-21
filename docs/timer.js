(() => {
  const STUDY_MS = 35 * 60 * 1000;
  const BREAK_MS = 5 * 60 * 1000;
  const STORAGE_KEY = "pomodoro-35-5-state-v1";
  const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const EXTEND_CONFIG = {
    study: { presets: [5, 10], maxCustom: 20, label: "学习" },
    break: { presets: [2, 5, 10], maxCustom: 15, label: "休息" }
  };
  const THEME_VALUES = ["blue", "green", "lavender", "sand", "mist", "midnight", "dark"];

const els = {
    modeLabel: document.getElementById("modeLabel"),
    timeDisplay: document.getElementById("timeDisplay"),
    pomodoroCount: document.getElementById("pomodoroCount"),
    dailyFocus: document.getElementById("dailyFocus"),
    calendarYear: document.getElementById("calendarYear"),
    monthSelect: document.getElementById("monthSelect"),
    viewModeSelect: document.getElementById("viewModeSelect"),
    contributionGrid: document.getElementById("contributionGrid"),
    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    resetBtn: document.getElementById("resetBtn"),
    extendPresetSelect: document.getElementById("extendPresetSelect"),
    extendCustomMinutes: document.getElementById("extendCustomMinutes"),
    applyExtendBtn: document.getElementById("applyExtendBtn"),
    extendHint: document.getElementById("extendHint"),
    todoInput: document.getElementById("todoInput"),
    addTodoBtn: document.getElementById("addTodoBtn"),
    clearDoneBtn: document.getElementById("clearDoneBtn"),
    todoList: document.getElementById("todoList"),
    currentTaskName: document.getElementById("currentTaskName"),
    clearActiveTodoBtn: document.getElementById("clearActiveTodoBtn"),
    reviewDate: document.getElementById("reviewDate"),
    hourlyChart: document.getElementById("hourlyChart"),
    interruptCount: document.getElementById("interruptCount"),
    reviewTotalFocus: document.getElementById("reviewTotalFocus"),
    reviewAdvice: document.getElementById("reviewAdvice"),
    openReviewModalBtn: document.getElementById("openReviewModalBtn"),
    reviewModal: document.getElementById("reviewModal"),
    closeReviewModalBtn: document.getElementById("closeReviewModalBtn"),
    modalReviewDate: document.getElementById("modalReviewDate"),
    modalReviewSubtitle: document.getElementById("modalReviewSubtitle"),
    reviewRange24Btn: document.getElementById("reviewRange24Btn"),
    reviewRange7Btn: document.getElementById("reviewRange7Btn"),
    modalHourlyChart: document.getElementById("modalHourlyChart"),
    modalInterruptCount: document.getElementById("modalInterruptCount"),
    modalReviewTotalFocus: document.getElementById("modalReviewTotalFocus"),
    modalReviewAdvice: document.getElementById("modalReviewAdvice"),
    autoNext: document.getElementById("autoNext"),
    soundEnabled: document.getElementById("soundEnabled"),
    ringtoneSelect: document.getElementById("ringtoneSelect"),
    previewSoundBtn: document.getElementById("previewSoundBtn"),
    themeSelect: document.getElementById("themeSelect"),
    notifyBtn: document.getElementById("notifyBtn"),
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    subtitleDisplay: document.getElementById("subtitleDisplay"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    studyMinutesInput: document.getElementById("studyMinutesInput"),
    breakMinutesInput: document.getElementById("breakMinutesInput"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  };

  const state = {
    mode: "study",
    isRunning: false,
    endTime: 0,
    remainingMs: STUDY_MS,
    completedPomodoros: 0,
    dailyFocusMs: 0,
    dailyDate: "",
    focusHistory: {},
    focusHourHistory: {},
    dailyInterruptions: {},
    todos: [],
    activeTodoId: null,
    currentPomodoroTodoId: null,
    currentPomodoroFocusMs: 0,
    selectedMonth: new Date().getMonth(),
    viewMode: "detailed",
    reviewRange: "24h",
    autoNext: true,
    soundEnabled: true,
    ringtone: "classic",
    theme: "blue",
    studyMinutes: 35,
    breakMinutes: 5
  };

  let timerId = null;
  let lastTickAt = null;
  let activeAudioCtx = null;
  let stopRingtoneTimer = null;
  const quickExtendButtons = Array.from(document.querySelectorAll(".quick-extend-btn"));
  let draggingTodoId = null;

  function modeDuration(mode) {
    var mins = mode === "study" ? state.studyMinutes : state.breakMinutes;
    return Math.max(60000, mins * 60 * 1000);
  }

  function formatTime(ms) {
    const total = Math.ceil(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function todayKey(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseHistory(raw) {
    if (!raw || typeof raw !== "object") return {};
    const result = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const ms = Number(value);
      if (!Number.isFinite(ms) || ms <= 0) continue;
      result[key] = ms;
    }
    return result;
  }

  function parseHourHistory(raw) {
    if (!raw || typeof raw !== "object") return {};
    const result = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      if (!Array.isArray(value) || value.length !== 24) continue;
      const row = value.map((n) => {
        const ms = Number(n);
        return Number.isFinite(ms) && ms > 0 ? ms : 0;
      });
      result[key] = row;
    }
    return result;
  }

  function parseInterruptions(raw) {
    if (!raw || typeof raw !== "object") return {};
    const result = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (count > 0) result[key] = count;
    }
    return result;
  }

  function normalizeFocusHours(raw) {
    if (!Array.isArray(raw) || raw.length !== 24) return Array(24).fill(0);
    return raw.map((value) => {
      const ms = Math.floor(Number(value) || 0);
      return ms > 0 ? ms : 0;
    });
  }

  function pruneHistory() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const keepFrom = new Date(today);
    keepFrom.setFullYear(today.getFullYear() - 2);

    for (const key of Object.keys(state.focusHistory)) {
      const [y, m, d] = key.split("-").map(Number);
      const t = new Date(y, m - 1, d).getTime();
      if (t < keepFrom.getTime()) {
        delete state.focusHistory[key];
      }
    }
    for (const key of Object.keys(state.focusHourHistory)) {
      const [y, m, d] = key.split("-").map(Number);
      const t = new Date(y, m - 1, d).getTime();
      if (t < keepFrom.getTime()) {
        delete state.focusHourHistory[key];
      }
    }
    for (const key of Object.keys(state.dailyInterruptions)) {
      const [y, m, d] = key.split("-").map(Number);
      const t = new Date(y, m - 1, d).getTime();
      if (t < keepFrom.getTime()) {
        delete state.dailyInterruptions[key];
      }
    }
  }

  function ensureTodayBucket() {
    const key = todayKey();
    if (state.dailyDate && state.dailyDate !== key) {
      state.completedPomodoros = 0;
    }
    state.dailyDate = key;
    if (!Number.isFinite(Number(state.focusHistory[key]))) {
      state.focusHistory[key] = 0;
    }
    if (!Array.isArray(state.focusHourHistory[key]) || state.focusHourHistory[key].length !== 24) {
      state.focusHourHistory[key] = Array(24).fill(0);
    }
    if (!Number.isFinite(Number(state.dailyInterruptions[key]))) {
      state.dailyInterruptions[key] = 0;
    }
    state.dailyFocusMs = Math.max(0, Number(state.focusHistory[key]) || 0);
  }

  function addFocusToDay(key, ms) {
    if (ms <= 0) return;
    state.focusHistory[key] = (Number(state.focusHistory[key]) || 0) + ms;
  }

  function addFocusToHour(key, hour, ms) {
    if (ms <= 0 || hour < 0 || hour > 23) return;
    if (!Array.isArray(state.focusHourHistory[key]) || state.focusHourHistory[key].length !== 24) {
      state.focusHourHistory[key] = Array(24).fill(0);
    }
    state.focusHourHistory[key][hour] = (Number(state.focusHourHistory[key][hour]) || 0) + ms;
  }

  function addFocusOverlap(fromMs, toMs) {
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return;
    state.currentPomodoroFocusMs += toMs - fromMs;
    let cursor = fromMs;
    while (cursor < toMs) {
      const d = new Date(cursor);
      const nextHour = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours() + 1,
        0,
        0,
        0
      ).getTime();
      const chunkEnd = Math.min(nextHour, toMs);
      const key = todayKey(cursor);
      const duration = chunkEnd - cursor;
      addFocusToDay(key, duration);
      addFocusToHour(key, d.getHours(), duration);
      cursor = chunkEnd;
    }
    ensureTodayBucket();
  }

  function dailyLevel(ms) {
    if (ms < 60 * 60 * 1000) return "level-low";
    if (ms < 180 * 60 * 1000) return "level-mid";
    return "level-high";
  }

  function persist() {
    pruneHistory();

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;

      state.mode = saved.mode === "break" ? "break" : "study";
      state.isRunning = Boolean(saved.isRunning);
      state.endTime = Number(saved.endTime) || 0;
      state.remainingMs = Number(saved.remainingMs) || modeDuration(state.mode);
      state.completedPomodoros = Math.max(0, Number(saved.completedPomodoros) || 0);
      state.focusHistory = parseHistory(saved.focusHistory);
      state.focusHourHistory = parseHourHistory(saved.focusHourHistory);
      state.dailyInterruptions = parseInterruptions(saved.dailyInterruptions);
      state.todos = Array.isArray(saved.todos)
        ? saved.todos
          .filter((t) => t && typeof t.text === "string")
          .map((t) => ({
            id: Number.isFinite(Number(t.id)) ? Number(t.id) : Date.now() + Math.random(),
            text: t.text.trim().slice(0, 80),
            done: Boolean(t.done),
            position: Number.isFinite(Number(t.position)) ? Number(t.position) : 0,
            pomodoroCount: Math.max(0, Math.floor(Number(t.pomodoroCount) || 0)),
            focusMs: Math.max(0, Math.floor(Number(t.focusMs) || 0))
          }))
        : [];
      const savedActiveTodoId = saved.activeTodoId == null
        ? NaN
        : Number(saved.activeTodoId);
      state.activeTodoId = Number.isFinite(savedActiveTodoId) ? savedActiveTodoId : null;
      const savedCurrentPomodoroTodoId = saved.currentPomodoroTodoId == null
        ? NaN
        : Number(saved.currentPomodoroTodoId);
      state.currentPomodoroTodoId = Number.isFinite(savedCurrentPomodoroTodoId)
        ? savedCurrentPomodoroTodoId
        : null;
      state.currentPomodoroFocusMs = Math.max(
        0,
        Number(saved.currentPomodoroFocusMs) || 0
      );
      if (!state.todos.some((todo) => todo.id === state.activeTodoId && !todo.done)) {
        state.activeTodoId = null;
      }
      if (!state.todos.some((todo) => todo.id === state.currentPomodoroTodoId)) {
        state.currentPomodoroTodoId = null;
      }
      state.dailyDate = typeof saved.dailyDate === "string" ? saved.dailyDate : todayKey();
      const savedMonth = Number(saved.selectedMonth);
      state.selectedMonth = Number.isInteger(savedMonth) && savedMonth >= 0 && savedMonth <= 11
        ? savedMonth
        : new Date().getMonth();
      state.viewMode = saved.viewMode === "compact" ? "compact" : "detailed";
      state.reviewRange = saved.reviewRange === "7d" ? "7d" : "24h";

      const savedDailyFocusMs = Number(saved.dailyFocusMs);
      const hasDailyFocus = Number.isFinite(savedDailyFocusMs) && savedDailyFocusMs > 0;
      const hasHistory = Object.keys(state.focusHistory).length > 0;
      if (!hasHistory) {
        const fallbackMs = hasDailyFocus
          ? savedDailyFocusMs
          : state.completedPomodoros * STUDY_MS;
        if (fallbackMs > 0) {
          state.focusHistory[state.dailyDate] = fallbackMs;
        }
      }
      if (!Object.keys(state.focusHourHistory).length) {
        const key = state.dailyDate;
        const arr = Array(24).fill(0);
        const currentHour = new Date().getHours();
        arr[currentHour] = Number(state.focusHistory[key]) || 0;
        state.focusHourHistory[key] = arr;
      }

      state.autoNext = saved.autoNext !== false;
      state.soundEnabled = saved.soundEnabled !== false;
      const allowedRingtones = ["classic", "digital", "soft", "urgent"];
      state.ringtone = allowedRingtones.includes(saved.ringtone) ? saved.ringtone : "classic";
      state.theme = THEME_VALUES.includes(saved.theme) ? saved.theme : "blue";
      ensureTodayBucket();

      if (state.isRunning) {
        const now = Date.now();
        if (state.mode === "study") {
          addFocusOverlap(Number(saved.savedAt) || now, now);
        }
        state.remainingMs = Math.max(0, state.endTime - now);
        if (state.remainingMs === 0) {
          state.isRunning = false;
          handlePhaseComplete();
        }
      }
    } catch {
      // Ignore broken local data.
    }
  }

  function updateTitle() {
    document.title = `${formatTime(state.remainingMs)} ${state.mode === "study" ? "学习" : "休息"} | 番茄钟`;
  }

  function applyTheme() {
    document.body.classList.remove(
      "theme-green",
      "dark-theme",
      "theme-lavender",
      "theme-sand",
      "theme-mist",
      "theme-midnight"
    );
    if (state.theme === "green") {
      document.body.classList.add("theme-green");
    } else if (state.theme === "dark") {
      document.body.classList.add("dark-theme");
    } else if (state.theme !== "blue") {
      document.body.classList.add(`theme-${state.theme}`);
    }
  }

  function heatLevel(ms, maxMs) {
    if (ms <= 0 || maxMs <= 0) return 0;
    const ratio = ms / maxMs;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  function renderContributionGrid() {
    if (!els.contributionGrid) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = state.selectedMonth;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();

    if (els.calendarYear) {
      els.calendarYear.textContent = `${year}`;
    }
    if (els.monthSelect) {
      els.monthSelect.value = String(month);
    }
    if (els.viewModeSelect) {
      els.viewModeSelect.value = state.viewMode;
    }

    const calendarCard = els.contributionGrid.closest(".calendar-card");
    if (calendarCard) {
      calendarCard.classList.toggle("compact", state.viewMode === "compact");
    }
    const contentGrid = document.querySelector(".content-grid");
    if (contentGrid) {
      contentGrid.classList.toggle("compact-layout", state.viewMode === "compact");
    }

    const days = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(year, month, day);
      const key = todayKey(d.getTime());
      days.push({ day, date: d, key, ms: Number(state.focusHistory[key]) || 0 });
    }

    const maxMs = days.reduce((max, item) => Math.max(max, item.ms), 0);
    const leading = monthStart.getDay();
    const cells = new Array(leading).fill(null).concat(days);
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    els.contributionGrid.innerHTML = cells.map((item) => {
      if (!item) {
        return '<div class="calendar-day empty" aria-hidden="true"></div>';
      }
      const level = heatLevel(item.ms, maxMs);
      const title = `${item.key} 专注 ${formatDuration(item.ms)}`;
      if (state.viewMode === "compact") {
        return `<div class="calendar-day compact lv-${level}" title="${title}" aria-label="${title}"></div>`;
      }
      return `<div class="calendar-day lv-${level}" title="${title}">${item.day}</div>`;
    }).join("");
  }

  function render() {
    ensureTodayBucket();
    applyTheme();

    els.modeLabel.textContent = state.mode === "study" ? "学习模式" : "休息模式";
    els.timeDisplay.textContent = formatTime(state.remainingMs);
    els.pomodoroCount.textContent = String(state.completedPomodoros);
    els.dailyFocus.textContent = formatDuration(state.dailyFocusMs);
    els.dailyFocus.className = `daily-time ${dailyLevel(state.dailyFocusMs)}`;
    els.autoNext.checked = state.autoNext;
    els.soundEnabled.checked = state.soundEnabled;
    if (els.ringtoneSelect) {
      els.ringtoneSelect.value = state.ringtone;
    }
    if (els.themeSelect) {
      els.themeSelect.value = state.theme;
    }

    const paused = !state.isRunning && state.remainingMs > 0 && state.remainingMs < modeDuration(state.mode);
    els.startBtn.disabled = state.isRunning || paused;
    els.pauseBtn.disabled = !state.isRunning;
    els.resumeBtn.disabled = state.isRunning || !paused;

    updateExtendUI();
    renderCurrentTask();
    renderTodos();
    renderContributionGrid();
    renderDailyReview();
    updateTitle();
     if (els.subtitleDisplay) {
      els.subtitleDisplay.textContent = state.studyMinutes + "\u5206\u949F\u5B66\u4E60 + " + state.breakMinutes + "\u5206\u949F\u4F11\u606F";
    }
   }

  function getActiveTodo() {
    return state.todos.find((todo) => todo.id === state.activeTodoId && !todo.done) || null;
  }

  function renderCurrentTask() {
    if (!els.currentTaskName || !els.clearActiveTodoBtn) return;
    const todo = getActiveTodo();
    els.currentTaskName.textContent = todo ? todo.text : "未关联任务";
    els.clearActiveTodoBtn.disabled = !todo;
  }

  function setActiveTodo(todoId) {
    const todo = state.todos.find((item) => item.id === todoId);
    if (!todo || todo.done) return;
    if (
      state.mode === "study"
      && state.currentPomodoroFocusMs > 0
      && state.currentPomodoroTodoId !== todoId
    ) {
      showToast("当前番茄已开始，请完成或重置后再切换任务");
      return;
    }
    state.activeTodoId = todoId;
    persist();
    render();
  }

  function clearActiveTodo() {
    if (state.mode === "study" && state.currentPomodoroFocusMs > 0) {
      showToast("当前番茄已开始，请完成或重置后再取消关联");
      return;
    }
    state.activeTodoId = null;
    persist();
    render();
  }



  function renderTodos() {
    if (!els.todoList) return;
    if (!state.todos.length) {
      els.todoList.innerHTML = '<li class="todo-item"><span class="todo-text">暂无代办，先添加一项吧。</span></li>';
      return;
    }
    els.todoList.innerHTML = state.todos.map((todo) => {
      const active = todo.id === state.activeTodoId;
      const safeText = todo.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `
        <li class="todo-item ${todo.done ? "done" : ""} ${active ? "active-task" : ""}" data-id="${todo.id}">
          <input type="checkbox" class="todo-check" ${todo.done ? "checked" : ""} />
          <span class="todo-drag-handle" draggable="true" title="拖拽排序">⋮⋮</span>
          <span class="todo-main">
            <span class="todo-text">${safeText}</span>
            <span class="todo-stats">🍅 ${todo.pomodoroCount} · ${formatDuration(todo.focusMs)}</span>
          </span>
          <button class="todo-link ${active ? "active" : ""}" type="button" aria-pressed="${active}" ${todo.done ? "disabled" : ""}>${active ? "当前" : "关联"}</button>
          <button class="todo-del" type="button">删除</button>
        </li>
      `;
    }).join("");
  }

  function addTodo() {
    const text = (els.todoInput.value || "").trim();
    if (!text) {
      showToast("请输入代办内容");
      return;
    }
    const newTodo = {
      id: Date.now() + Math.random(),
      text: text.slice(0, 80),
      done: false,
      position: 0,
      pomodoroCount: 0,
      focusMs: 0
    };
    state.todos.unshift(newTodo);
    els.todoInput.value = "";
    persist();
    renderTodos();
  }

  function drawHourlyFocusChart(canvas, values, labels) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(320, canvas.clientWidth || 960);
    const cssHeight = 280;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const left = 34;
    const right = 12;
    const top = 14;
    const bottom = 36;
    const chartW = cssWidth - left - right;
    const chartH = cssHeight - top - bottom;
    const maxVal = Math.max(...values, 1);

    ctx.strokeStyle = "rgba(120,140,170,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + chartH);
    ctx.lineTo(left + chartW, top + chartH);
    ctx.stroke();

    const count = Math.max(1, values.length);
    const barGap = count > 10 ? 2 : 4;
    const barW = Math.max(4, (chartW - barGap * (count - 1)) / count);

    const barColor = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1b74ff";
    ctx.fillStyle = barColor;
    for (let i = 0; i < values.length; i += 1) {
      const val = values[i] || 0;
      const h = (val / maxVal) * (chartH - 4);
      const x = left + i * (barW + barGap);
      const y = top + chartH - h;
      ctx.fillRect(x, y, barW, h);
    }

    ctx.fillStyle = "rgba(38, 55, 86, 1)";
    ctx.font = "600 13px Segoe UI, sans-serif";
    const step = Math.max(1, Math.ceil(labels.length / 8));
    for (let i = 0; i < labels.length; i += step) {
      const x = left + i * (barW + barGap);
      ctx.fillText(String(labels[i]), x, top + chartH + 18);
    }
    if (labels.length > 1) {
      const lastX = left + (labels.length - 1) * (barW + barGap);
      ctx.fillText(String(labels[labels.length - 1]), lastX, top + chartH + 18);
    }
  }

  function buildDailyAdvice(hourlyMs, totalMs, interruptions, mode = "24h", labels = []) {
    const advice = [];
    const maxHourMs = Math.max(...hourlyMs);
    const peakHour = hourlyMs.findIndex((v) => v === maxHourMs);

    if (totalMs < 60 * 60 * 1000) {
      advice.push("今日专注时长偏少，建议先保证 1-2 个完整番茄钟，优先完成最重要任务。");
    } else if (totalMs < 3 * 60 * 60 * 1000) {
      advice.push("今日专注达标基础不错，可尝试把高优先级任务提前到精力最好的时段。");
    } else {
      advice.push("今日专注表现良好，建议保持当前节奏，并在晚间做简短复盘。");
    }

    if (mode === "24h" && peakHour >= 0 && maxHourMs > 0) {
      const hourText = labels[peakHour] ?? String(peakHour);
      advice.push(`你的高专注时段在 ${hourText} 点附近，建议把深度任务放到这个时间段。`);
    }
    if (mode === "7d" && peakHour >= 0 && maxHourMs > 0) {
      const dayText = labels[peakHour] ?? "某天";
      advice.push(`过去7天中 ${dayText} 的专注表现最佳，可复用当天的作息安排。`);
    }

    if (interruptions >= 6) {
      advice.push("中断次数较高，建议下一轮开启免打扰并减少临时切换任务。");
    } else if (interruptions >= 3) {
      advice.push("中断次数中等，可在每轮开始前准备好资料，降低中途打断。");
    } else {
      advice.push("中断控制较好，可继续保持单任务工作流。");
    }

    return advice.slice(0, 3);
  }

  function getHourlyRowForKey(key) {
    const row = state.focusHourHistory[key];
    if (!Array.isArray(row) || row.length !== 24) return Array(24).fill(0);
    return row.map((v) => Number(v) || 0);
  }

  function getDailyTotalForKey(key) {
    return Math.max(0, Number(state.focusHistory[key]) || 0);
  }

  function hasHourlyRow(key) {
    return Array.isArray(state.focusHourHistory[key]) && state.focusHourHistory[key].length === 24;
  }

  function buildReviewSeries(range) {
    const now = new Date();
    if (range === "7d") {
      const labels = [];
      const values = [];
      let interruptions = 0;
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = todayKey(d.getTime());
        const total = hasHourlyRow(key)
          ? getHourlyRowForKey(key).reduce((s, v) => s + v, 0)
          : getDailyTotalForKey(key);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        values.push(total);
        interruptions += Number(state.dailyInterruptions[key]) || 0;
      }
      const totalMs = values.reduce((s, v) => s + v, 0);
      const start = labels[0] || "";
      const end = labels[labels.length - 1] || "";
      return {
        title: "过去7天专注时长分布（柱状图）",
        dateText: `${start} - ${end}`,
        labels,
        values,
        totalMs,
        interruptions,
        mode: "7d"
      };
    }

    const labels = [];
    const values = [];
    const keySet = new Set();
    for (let i = 23; i >= 0; i -= 1) {
      const ts = Date.now() - i * 60 * 60 * 1000;
      const d = new Date(ts);
      const key = todayKey(ts);
      const hour = d.getHours();
      const row = getHourlyRowForKey(key);
      const fallbackHourValue = getDailyTotalForKey(key) / 24;
      labels.push(String(hour));
      values.push(hasHourlyRow(key) ? (row[hour] || 0) : fallbackHourValue);
      keySet.add(key);
    }
    let interruptions = 0;
    keySet.forEach((k) => {
      interruptions += Number(state.dailyInterruptions[k]) || 0;
    });
    return {
      title: "过去24小时专注时长分布（柱状图）",
      dateText: "最近24小时",
      labels,
      values,
      totalMs: values.reduce((s, v) => s + v, 0),
      interruptions,
      mode: "24h"
    };
  }

  function renderDailyReviewPanel({ dateEl, canvasEl, interruptEl, totalEl, adviceEl }) {
    const data = buildReviewSeries(state.reviewRange);

    if (dateEl) {
      dateEl.textContent = data.dateText;
    }
    if (interruptEl) {
      interruptEl.textContent = String(data.interruptions);
    }
    if (totalEl) {
      totalEl.textContent = formatDuration(data.totalMs);
    }

    drawHourlyFocusChart(canvasEl, data.values, data.labels);

    if (adviceEl) {
      const tips = buildDailyAdvice(data.values, data.totalMs, data.interruptions, data.mode, data.labels);
      adviceEl.innerHTML = tips.map((tip) => `<li>${tip}</li>`).join("");
    }

    if (els.modalReviewSubtitle && canvasEl === els.modalHourlyChart) {
      els.modalReviewSubtitle.textContent = data.title;
    }
  }

  function renderDailyReview() {
    if (els.reviewRange24Btn && els.reviewRange7Btn) {
      els.reviewRange24Btn.classList.toggle("active", state.reviewRange === "24h");
      els.reviewRange7Btn.classList.toggle("active", state.reviewRange === "7d");
    }
    renderDailyReviewPanel({
      dateEl: els.reviewDate,
      canvasEl: els.hourlyChart,
      interruptEl: els.interruptCount,
      totalEl: els.reviewTotalFocus,
      adviceEl: els.reviewAdvice
    });
    renderDailyReviewPanel({
      dateEl: els.modalReviewDate,
      canvasEl: els.modalHourlyChart,
      interruptEl: els.modalInterruptCount,
      totalEl: els.modalReviewTotalFocus,
      adviceEl: els.modalReviewAdvice
    });
  }

  function clearTodoDragMarkers() {
    els.todoList.querySelectorAll(".todo-item").forEach((el) => {
      el.classList.remove("drag-over-top", "drag-over-bottom");
    });
  }

  function moveTodoByDrag(dragId, targetId, beforeTarget) {
    if (!Number.isFinite(dragId) || dragId === targetId) return;
    const fromIndex = state.todos.findIndex((t) => t.id === dragId);
    if (fromIndex < 0) return;

    const [moved] = state.todos.splice(fromIndex, 1);

    if (!Number.isFinite(targetId)) {
      state.todos.push(moved);
      persist();
      renderTodos();
      return;
    }

    let toIndex = state.todos.findIndex((t) => t.id === targetId);
    if (toIndex < 0) {
      state.todos.push(moved);
    } else {
      if (!beforeTarget) toIndex += 1;
      state.todos.splice(toIndex, 0, moved);
    }
    persist();
    renderTodos();
  }

  function updateExtendUI() {
    if (!els.extendPresetSelect) return;
    const cfg = EXTEND_CONFIG[state.mode];
    const modeKey = state.mode;
    if (els.extendPresetSelect.dataset.mode !== modeKey) {
      const presetOptions = cfg.presets
        .map((m) => `<option value="preset:${m}">+${m} 分钟</option>`)
        .join("");
      els.extendPresetSelect.innerHTML = `${presetOptions}<option value="custom">自定义</option>`;
      els.extendPresetSelect.dataset.mode = modeKey;
      els.extendPresetSelect.value = `preset:${cfg.presets[0]}`;
      els.extendCustomMinutes.value = "";
    }

    els.extendCustomMinutes.max = String(cfg.maxCustom);
    els.extendCustomMinutes.placeholder = `自定义(<=${cfg.maxCustom})`;
    if (els.extendHint) {
      const presetText = cfg.presets.map((m) => `${m}分钟`).join("、");
      els.extendHint.textContent = `${cfg.label}模式可延长：${presetText}，或自定义（不超过${cfg.maxCustom}分钟）`;
    }

    const usingCustom = els.extendPresetSelect.value === "custom";
    els.extendCustomMinutes.disabled = !usingCustom;
  }

  function tick() {
    const now = Date.now();
    if (state.isRunning && state.mode === "study" && lastTickAt !== null) {
      addFocusOverlap(lastTickAt, now);
    }
    lastTickAt = now;
    state.remainingMs = Math.max(0, state.endTime - now);
    render();

    if (state.remainingMs === 0) {
      stopTimer(false);
      handlePhaseComplete();
    } else {
      persist();
    }
  }

  function startTimer() {
    if (state.isRunning) return;
    ensureTodayBucket();
    if (state.mode === "study" && state.currentPomodoroFocusMs <= 0) {
      const todo = getActiveTodo();
      state.currentPomodoroTodoId = todo ? todo.id : null;
    }
    state.isRunning = true;
    lastTickAt = Date.now();
    state.endTime = Date.now() + state.remainingMs;
    tick();
    timerId = setInterval(tick, 250);
    persist();
  }

  function resumeRunningTimer() {
    if (!state.isRunning) return;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    lastTickAt = Date.now();
    tick();
    timerId = setInterval(tick, 250);
  }

  function pauseForPageExit() {
    if (!state.isRunning) return;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    state.remainingMs = Math.max(0, state.endTime - Date.now());
    state.isRunning = false;
    state.endTime = 0;
    lastTickAt = null;
    persist();
  }

  function stopTimer(shouldReset = false) {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    state.isRunning = false;
    lastTickAt = null;
    if (shouldReset) {
      state.remainingMs = modeDuration(state.mode);
    }
    persist();
    render();
  }

  function pauseTimer() {
    if (!state.isRunning) return;
    if (state.mode === "study" && state.remainingMs > 0 && state.remainingMs < modeDuration("study")) {
      const key = todayKey();
      state.dailyInterruptions[key] = (Number(state.dailyInterruptions[key]) || 0) + 1;
    }
    state.remainingMs = Math.max(0, state.endTime - Date.now());
    stopTimer(false);
  }

  function resetAll() {
    stopTimer(false);
    ensureTodayBucket();
    state.mode = "study";
    state.remainingMs = modeDuration("study");
    state.endTime = 0;
    state.currentPomodoroTodoId = null;
    state.currentPomodoroFocusMs = 0;
    persist();
    render();
  }

  function stopRingtone() {
    if (stopRingtoneTimer) {
      clearTimeout(stopRingtoneTimer);
      stopRingtoneTimer = null;
    }
    if (activeAudioCtx) {
      activeAudioCtx.close().catch(() => {});
      activeAudioCtx = null;
    }
  }

  function scheduleTone(ctx, freq, startAt, toneSec, type = "sine", volume = 0.16) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + toneSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + toneSec + 0.02);
  }

  function playRingtone({ durationMs = 5000, force = false } = {}) {
    if (!force && !state.soundEnabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      stopRingtone();

      const ctx = new Ctx();
      activeAudioCtx = ctx;
      const start = ctx.currentTime + 0.03;
      const totalSec = Math.max(1, durationMs / 1000);

      if (state.ringtone === "digital") {
        const notes = [523.25, 659.25, 783.99, 659.25];
        let t = 0;
        let i = 0;
        while (t < totalSec) {
          scheduleTone(ctx, notes[i % notes.length], start + t, 0.18, "triangle", 0.15);
          t += 0.35;
          i += 1;
        }
      } else if (state.ringtone === "soft") {
        const notes = [660, 587.33, 523.25, 587.33];
        let t = 0;
        let i = 0;
        while (t < totalSec) {
          scheduleTone(ctx, notes[i % notes.length], start + t, 0.45, "sine", 0.11);
          t += 0.75;
          i += 1;
        }
      } else if (state.ringtone === "urgent") {
        let t = 0;
        while (t < totalSec) {
          scheduleTone(ctx, 987.77, start + t, 0.14, "square", 0.18);
          scheduleTone(ctx, 880, start + t + 0.18, 0.14, "square", 0.18);
          t += 0.55;
        }
      } else {
        let t = 0;
        while (t < totalSec) {
          scheduleTone(ctx, 880, start + t, 0.22, "sine", 0.16);
          t += 0.8;
        }
      }

      stopRingtoneTimer = setTimeout(() => {
        stopRingtone();
      }, durationMs + 250);
    } catch {
      // Ignore audio errors.
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("当前浏览器不支持桌面通知");
      return;
    }
    if (Notification.permission === "granted") {
      alert("桌面通知已开启");
      return;
    }
    const permission = await Notification.requestPermission();
    alert(permission === "granted" ? "通知授权成功" : "未授予通知权限");
  }

  function showToast(message) {
    const old = document.getElementById("pomodoro-toast");
    if (old) {
      old.remove();
    }

    const toast = document.createElement("div");
    toast.id = "pomodoro-toast";
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.right = "16px";
    toast.style.bottom = "16px";
    toast.style.zIndex = "9999";
    toast.style.maxWidth = "320px";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "10px";
    toast.style.color = "#fff";
    toast.style.background = "rgba(17, 24, 39, 0.9)";
    toast.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.25)";
    toast.style.fontSize = "0.9rem";
    toast.style.lineHeight = "1.3";

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2400);
  }

  function notify(text) {
    playRingtone({ durationMs: 5000, force: false });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("番茄钟提醒", { body: text });
    } else {
      showToast(text);
    }
  }

  function applyExtension(minutesInput = null) {
    const cfg = EXTEND_CONFIG[state.mode];
    const selected = minutesInput === null ? els.extendPresetSelect.value : null;
    let addMinutes = 0;

    if (minutesInput !== null) {
      if (!Number.isFinite(minutesInput) || minutesInput <= 0) {
        showToast("请选择有效的快捷延长时长");
        return;
      }
      addMinutes = Math.floor(minutesInput);
    } else if (selected === "custom") {
      const inputMinutes = Number(els.extendCustomMinutes.value);
      if (!Number.isFinite(inputMinutes) || inputMinutes <= 0) {
        showToast("请输入有效的自定义分钟数");
        return;
      }
      if (inputMinutes > cfg.maxCustom) {
        showToast(`${cfg.label}模式自定义延长不能超过 ${cfg.maxCustom} 分钟`);
        return;
      }
      addMinutes = Math.floor(inputMinutes);
      if (addMinutes < 1) {
        showToast("自定义延长至少为 1 分钟");
        return;
      }
    } else {
      const presetMinutes = Number(String(selected).replace("preset:", ""));
      if (!cfg.presets.includes(presetMinutes)) {
        showToast("请选择有效的延长时长");
        return;
      }
      addMinutes = presetMinutes;
    }

    if (state.mode === "study" && addMinutes > EXTEND_CONFIG.study.maxCustom) {
      showToast(`学习模式单次最多延长 ${EXTEND_CONFIG.study.maxCustom} 分钟`);
      return;
    }
    if (state.mode === "break" && addMinutes > EXTEND_CONFIG.break.maxCustom) {
      showToast(`休息模式单次最多延长 ${EXTEND_CONFIG.break.maxCustom} 分钟`);
      return;
    }

    const addMs = addMinutes * 60 * 1000;
    state.remainingMs += addMs;
    if (state.isRunning) {
      state.endTime += addMs;
    }
    persist();
    render();
    showToast(`已延长 ${addMinutes} 分钟`);
  }

  function switchMode() {
    if (state.mode === "study") {
      state.mode = "break";
      state.remainingMs = modeDuration("break");
    } else {
      state.mode = "study";
      state.remainingMs = modeDuration("study");
    }
    state.endTime = 0;
  }

  function handlePhaseComplete() {
    const finishedMode = state.mode;
    const completedTodoId = finishedMode === "study" ? state.currentPomodoroTodoId : null;
    const completedFocusMs = finishedMode === "study"
      ? Math.max(0, Math.floor(state.currentPomodoroFocusMs))
      : 0;
    if (finishedMode === "study") {
      state.completedPomodoros += 1;
      state.currentPomodoroTodoId = null;
      state.currentPomodoroFocusMs = 0;
    }

    switchMode();

    const msg = finishedMode === "study"
      ? "35分钟学习结束，开始休息5分钟。"
      : "5分钟休息结束，开始下一轮35分钟学习。";

    notify(msg);
    persist();
    render()

    if (state.autoNext) {
      startTimer();
    }
  }

  function toggleFullscreen() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement) {
      const requestFullscreen = document.documentElement.requestFullscreen
        || document.documentElement.webkitRequestFullscreen
        || document.documentElement.msRequestFullscreen;
      if (requestFullscreen) {
        Promise.resolve(requestFullscreen.call(document.documentElement)).catch(() => {
          showToast("无法进入全屏，请检查浏览器权限");
        });
      }
      return;
    }

    const exitFullscreen = document.exitFullscreen
      || document.webkitExitFullscreen
      || document.msExitFullscreen;
    if (exitFullscreen) {
      Promise.resolve(exitFullscreen.call(document)).catch(() => {});
    }
  }

  function updateFullscreenButton() {
    if (!els.fullscreenBtn) return;
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    els.fullscreenBtn.innerHTML = fullscreenElement ? "\u26F6 退出全屏" : "\u26F6 全屏";
  }

  function closeOpenModal() {
    if (els.reviewModal && !els.reviewModal.classList.contains("hidden")) {
      els.reviewModal.classList.add("hidden");
      els.reviewModal.setAttribute("aria-hidden", "true");
      return true;
    }
    if (els.settingsModal && !els.settingsModal.classList.contains("hidden")) {
      els.settingsModal.classList.add("hidden");
      els.settingsModal.setAttribute("aria-hidden", "true");
      return true;
    }
    return false;
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tagName = target.tagName;
    return tagName === "INPUT"
      || tagName === "TEXTAREA"
      || tagName === "SELECT"
      || target.isContentEditable;
  }

  function toggleTimerFromShortcut() {
    if (state.isRunning) {
      pauseTimer();
      return;
    }
    if (state.remainingMs <= 0) {
      state.remainingMs = modeDuration(state.mode);
    }
    startTimer();
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (closeOpenModal()) return;
        toggleFullscreen();
        return;
      }

      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === "Space") {
        e.preventDefault();
        toggleTimerFromShortcut();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetAll();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        applyExtension(5);
      }
    });
  }

  function bindEvents() {
    els.startBtn.addEventListener("click", () => {
      const paused = !state.isRunning && state.remainingMs > 0 && state.remainingMs < modeDuration(state.mode);
      if (paused) return;
      if (state.remainingMs <= 0) {
        state.remainingMs = modeDuration(state.mode);
      }
      startTimer();
    });

    els.pauseBtn.addEventListener("click", pauseTimer);

    els.resumeBtn.addEventListener("click", () => {
      if (state.remainingMs > 0) startTimer();
    });

    els.resetBtn.addEventListener("click", resetAll);

    els.extendPresetSelect.addEventListener("change", () => {
      updateExtendUI();
    });

    els.applyExtendBtn.addEventListener("click", () => applyExtension());

    quickExtendButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const minutes = Number(btn.dataset.minutes);
        applyExtension(minutes);
      });
    });

    els.autoNext.addEventListener("change", (e) => {
      state.autoNext = e.target.checked;
      persist();
    });

    els.soundEnabled.addEventListener("change", (e) => {
      state.soundEnabled = e.target.checked;
      persist();
    });

    els.ringtoneSelect.addEventListener("change", (e) => {
      const allowedRingtones = ["classic", "digital", "soft", "urgent"];
      const value = allowedRingtones.includes(e.target.value) ? e.target.value : "classic";
      state.ringtone = value;
      persist();
    });

    els.previewSoundBtn.addEventListener("click", () => {
      playRingtone({ durationMs: 5000, force: true });
    });

    els.addTodoBtn.addEventListener("click", addTodo);
    if (els.clearActiveTodoBtn) {
      els.clearActiveTodoBtn.addEventListener("click", clearActiveTodo);
    }

    els.todoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTodo();
      }
    });

    els.clearDoneBtn.addEventListener("click", async () => {
      const doneTodos = state.todos.filter((todo) => todo.done);
      if (!doneTodos.length) return;
      state.todos = state.todos.filter((todo) => !todo.done);
      if (!state.todos.some((todo) => todo.id === state.activeTodoId)) {
        state.activeTodoId = null;
      }
      if (!state.todos.some((todo) => todo.id === state.currentPomodoroTodoId)) {
        state.currentPomodoroTodoId = null;
      }
      persist();
      render();
    });

    els.todoList.addEventListener("click", async (e) => {
      const item = e.target.closest(".todo-item");
      if (!item) return;
      const id = Number(item.dataset.id);
      if (!Number.isFinite(id)) return;

      if (e.target.classList.contains("todo-link")) {
        setActiveTodo(id);
        return;
      }

      if (e.target.classList.contains("todo-del")) {
        state.todos = state.todos.filter((t) => t.id !== id);
        if (state.activeTodoId === id) state.activeTodoId = null;
        if (state.currentPomodoroTodoId === id) state.currentPomodoroTodoId = null;
        persist();
        render();
      }
    });

    els.todoList.addEventListener("change", async (e) => {
      if (!e.target.classList.contains("todo-check")) return;
      const item = e.target.closest(".todo-item");
      if (!item) return;
      const id = Number(item.dataset.id);
      const todo = state.todos.find((t) => t.id === id);
      if (!todo) return;
      todo.done = !todo.done;
      if (todo.done) {
        if (state.activeTodoId === id) state.activeTodoId = null;
        if (state.currentPomodoroTodoId === id) state.currentPomodoroTodoId = null;
      }
      persist();
      render();
    });

    els.todoList.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".todo-drag-handle");
      if (!handle) return;
      const item = handle.closest(".todo-item");
      if (!item || !item.dataset.id) return;
      draggingTodoId = Number(item.dataset.id);
      if (!Number.isFinite(draggingTodoId)) return;
      item.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(draggingTodoId));
      }
    });

    els.todoList.addEventListener("dragend", () => {
      draggingTodoId = null;
      clearTodoDragMarkers();
      els.todoList.querySelectorAll(".todo-item").forEach((el) => el.classList.remove("dragging"));
    });

    els.todoList.addEventListener("dragover", (e) => {
      if (!Number.isFinite(draggingTodoId)) return;
      e.preventDefault();
      clearTodoDragMarkers();
      const item = e.target.closest(".todo-item");
      if (!item || !item.dataset.id) return;
      const rect = item.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      item.classList.add(before ? "drag-over-top" : "drag-over-bottom");
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    });

    els.todoList.addEventListener("drop", (e) => {
      if (!Number.isFinite(draggingTodoId)) return;
      e.preventDefault();
      const item = e.target.closest(".todo-item");
      if (!item || !item.dataset.id) {
        moveTodoByDrag(draggingTodoId, NaN, false);
        draggingTodoId = null;
        clearTodoDragMarkers();
        return;
      }
      const targetId = Number(item.dataset.id);
      const rect = item.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      moveTodoByDrag(draggingTodoId, targetId, before);
      draggingTodoId = null;
      clearTodoDragMarkers();
    });

    els.themeSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      state.theme = THEME_VALUES.includes(value) ? value : "blue";
      applyTheme();
      persist();
      render();
    });

    els.openReviewModalBtn.addEventListener("click", () => {
      els.reviewModal.classList.remove("hidden");
      els.reviewModal.setAttribute("aria-hidden", "false");
      renderDailyReview();
    });

    els.reviewRange24Btn.addEventListener("click", () => {
      state.reviewRange = "24h";
      persist();
      renderDailyReview();
    });

    els.reviewRange7Btn.addEventListener("click", () => {
      state.reviewRange = "7d";
      persist();
      renderDailyReview();
    });

    els.closeReviewModalBtn.addEventListener("click", () => {
      els.reviewModal.classList.add("hidden");
      els.reviewModal.setAttribute("aria-hidden", "true");
    });

    els.reviewModal.addEventListener("click", (e) => {
      if (e.target === els.reviewModal) {
        els.reviewModal.classList.add("hidden");
        els.reviewModal.setAttribute("aria-hidden", "true");
      }
    });

    els.notifyBtn.addEventListener("click", requestNotificationPermission);

    els.monthSelect.addEventListener("change", (e) => {
      const month = Number(e.target.value);
      if (!Number.isInteger(month) || month < 0 || month > 11) return;
      state.selectedMonth = month;
      persist();
      render();
    });

    els.viewModeSelect.addEventListener("change", (e) => {
      const mode = e.target.value === "compact" ? "compact" : "detailed";
      state.viewMode = mode;
      persist();
      render();
    });

    document.addEventListener("visibilitychange", () => {
      if (!state.isRunning) return;
      const now = Date.now();
      if (state.mode === "study" && lastTickAt !== null) {
        addFocusOverlap(lastTickAt, now);
      }
      lastTickAt = now;
      state.remainingMs = Math.max(0, state.endTime - now);
      render();
      if (state.remainingMs === 0) {
        stopTimer(false);
        handlePhaseComplete();
      }
    });

    window.addEventListener("pagehide", pauseForPageExit);
    window.addEventListener("beforeunload", pauseForPageExit);
  }

  function boot() {
    restore();
    if (els.monthSelect) {
      els.monthSelect.innerHTML = MONTH_LABELS
        .map((label, idx) => `<option value="${idx}">${label}</option>`)
        .join("");
      els.monthSelect.value = String(state.selectedMonth);
    }
    if (els.viewModeSelect) {
      els.viewModeSelect.value = state.viewMode;
    }
    bindEvents();
    render();

    if (state.isRunning) {
      resumeRunningTimer();
    }
    render();

    // 全屏按钮与键盘快捷键
    if (els.fullscreenBtn) {
      els.fullscreenBtn.addEventListener("click", toggleFullscreen);
    }
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
    updateFullscreenButton();
    bindKeyboardShortcuts();
    // 设置弹窗
    els.openSettingsBtn.addEventListener("click", function() {
      els.studyMinutesInput.value = String(state.studyMinutes);
      els.breakMinutesInput.value = String(state.breakMinutes);
      els.settingsModal.classList.remove("hidden");
      els.settingsModal.setAttribute("aria-hidden", "false");
    });
    els.closeSettingsBtn.addEventListener("click", function() {
      els.settingsModal.classList.add("hidden");
      els.settingsModal.setAttribute("aria-hidden", "true");
    });
    els.settingsModal.addEventListener("click", function(e) {
      if (e.target === els.settingsModal) {
        els.settingsModal.classList.add("hidden");
        els.settingsModal.setAttribute("aria-hidden", "true");
      }
    });
    els.saveSettingsBtn.addEventListener("click", function() {
      var study = parseInt(els.studyMinutesInput.value, 10);
      var brk = parseInt(els.breakMinutesInput.value, 10);
      if (!study || study < 1) study = 35;
      if (!brk || brk < 1) brk = 5;
      study = Math.min(180, Math.max(1, study));
      brk = Math.min(60, Math.max(1, brk));
      state.studyMinutes = study;
      state.breakMinutes = brk;
      stopTimer(false);
      state.remainingMs = modeDuration(state.mode);
      state.endTime = 0;
      state.currentPomodoroTodoId = null;
      state.currentPomodoroFocusMs = 0;
      els.settingsModal.classList.add("hidden");
      els.settingsModal.setAttribute("aria-hidden", "true");
      persist();
      render();
    });
    // 注册 Service Worker（PWA 离线支持）
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").then(function(reg) {
        console.log("SW registered:", reg.scope);
      }).catch(function(err) {
        console.log("SW registration failed:", err);
      });
    }

  }

  boot();
})();

