(function () {
  const TOKEN_KEY = "arobazi_token";
  const PHASES = ["login", "wizard", "rotate", "countdown", "playing", "gameover"];

  const loginScreen = document.getElementById("loginScreen");
  const rotateScreen = document.getElementById("rotateScreen");
  const countdownScreen = document.getElementById("countdownScreen");
  const countdownNumber = document.getElementById("countdownNumber");
  const startScreen = document.getElementById("startScreen");
  const phoneInput = document.getElementById("phoneInput");
  const loginBtn = document.getElementById("loginBtn");
  const rotateConfirmBtn = document.getElementById("rotateConfirmBtn");
  const loginError = document.getElementById("loginError");
  const gameOverLeaderboard = document.getElementById("gameOverLeaderboard");

  if (!loginScreen || !startScreen || !phoneInput || !loginBtn) return;

  let authToken = localStorage.getItem(TOKEN_KEY) || "";
  let countdownToken = 0;

  function faNum(value) {
    return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isPortraitPhone() {
    return window.matchMedia("(orientation: portrait) and (max-width: 900px)").matches;
  }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "خطا در ارتباط با سرور");
    return data;
  }

  function setPhase(phase) {
    document.documentElement.classList.remove(...PHASES.map((p) => "phase-" + p));
    document.documentElement.classList.add("phase-" + phase);

    loginScreen.classList.toggle("hidden", phase !== "login");
    if (rotateScreen) rotateScreen.classList.toggle("hidden", phase !== "rotate");
    if (countdownScreen) countdownScreen.classList.toggle("hidden", phase !== "countdown");

    if (phase === "wizard") {
      startScreen.classList.remove("hidden");
      gameOverScreen.classList.add("hidden");
    } else if (phase === "gameover") {
      startScreen.classList.add("hidden");
    } else if (phase === "playing" || phase === "countdown") {
      startScreen.classList.add("hidden");
      gameOverScreen.classList.add("hidden");
    }

    if (typeof setupCanvasDPR === "function") setupCanvasDPR();
  }

  function enterWizard() {
    setPhase("wizard");
  }

  function afterAuthSuccess() {
    phoneInput.value = "";
    enterWizard();
  }

  function applyBestScore(value) {
    bestScore = value || 0;
    if (typeof bestScoreEl !== "undefined" && bestScoreEl) {
      bestScoreEl.textContent = faNum(bestScore);
    }
  }

  function renderLeaderboard(items) {
    if (!gameOverLeaderboard) return;
    if (!items || !items.length) {
      gameOverLeaderboard.innerHTML = '<p class="leaderboard-empty">هنوز رکوردی ثبت نشده</p>';
      return;
    }
    gameOverLeaderboard.innerHTML = items
      .map(
        (item) =>
          `<div class="leaderboard-row">
            <span class="leaderboard-rank">${faNum(item.rank)}</span>
            <span class="leaderboard-phone">${item.phoneMask}</span>
            <span class="leaderboard-score">${faNum(item.score)}</span>
          </div>`
      )
      .join("");
  }

  async function loadLeaderboard() {
    try {
      const data = await fetch("/api/leaderboard?limit=10").then((r) => r.json());
      renderLeaderboard(data.items || []);
    } catch {
      renderLeaderboard([]);
    }
  }

  function clearSession() {
    authToken = "";
    localStorage.removeItem(TOKEN_KEY);
    setPhase("login");
  }

  async function validateSession() {
    if (!authToken) return null;
    try {
      const data = await api("/api/auth/me");
      applyBestScore(data.bestScore || 0);
      return data;
    } catch {
      clearSession();
      return null;
    }
  }

  async function restoreSession() {
    const user = await validateSession();
    if (!user) {
      setPhase("login");
      return;
    }
    enterWizard();
  }

  async function login() {
    loginError.textContent = "";
    loginBtn.disabled = true;
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: phoneInput.value.trim() }),
      });
      authToken = data.token;
      localStorage.setItem(TOKEN_KEY, authToken);
      applyBestScore(data.bestScore || 0);
      afterAuthSuccess();
    } catch (err) {
      loginError.textContent = err.message || "خطا در ورود";
    } finally {
      loginBtn.disabled = false;
    }
  }

  async function startCountdown() {
    const token = ++countdownToken;
    setPhase("countdown");

    for (const n of [3, 2, 1]) {
      if (token !== countdownToken) return;
      if (countdownNumber) countdownNumber.textContent = faNum(n);
      await sleep(1000);
    }

    if (token !== countdownToken) return;
    if (countdownScreen) countdownScreen.classList.add("hidden");
    setPhase("playing");
    originalStartGame();
  }

  async function beginPlayFlow() {
    const user = await validateSession();
    if (!user) {
      loginError.textContent = "لطفاً دوباره وارد شو.";
      setPhase("login");
      return;
    }

    if (isPortraitPhone()) {
      setPhase("rotate");
      return;
    }
    await startCountdown();
  }

  loginBtn.addEventListener("click", login);
  phoneInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  if (rotateConfirmBtn) {
    rotateConfirmBtn.addEventListener("click", () => startCountdown());
  }

  const originalStartGame = startGame;
  startGame = beginPlayFlow;

  const originalEndGame = endGame;
  endGame = function patchedEndGame() {
    countdownToken++;
    originalEndGame();
    setPhase("gameover");
    if (!authToken) {
      loadLeaderboard();
      return;
    }
    api("/api/scores", {
      method: "POST",
      body: JSON.stringify({ score, level }),
    })
      .then((data) => {
        applyBestScore(data.bestScore ?? bestScore);
        return loadLeaderboard();
      })
      .catch(async () => {
        await validateSession();
        loadLeaderboard();
      });
  };

  setPhase("login");
  restoreSession();
})();
