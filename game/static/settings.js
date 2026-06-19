(function () {
  const MUSIC_KEY = "arobazi_music";

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseBtn = document.getElementById("settingsCloseBtn");
  const musicToggle = document.getElementById("musicToggle");

  if (!settingsBtn || !settingsPanel || !musicToggle) return;

  function isMusicEnabled() {
    return localStorage.getItem(MUSIC_KEY) === "on";
  }

  function setMusicEnabled(enabled) {
    localStorage.setItem(MUSIC_KEY, enabled ? "on" : "off");
    musicToggle.checked = enabled;
    if (!enabled && typeof pauseBackgroundMusic === "function") {
      pauseBackgroundMusic();
    }
  }

  window.isMusicEnabled = isMusicEnabled;

  musicToggle.checked = isMusicEnabled();
  musicToggle.addEventListener("change", () => {
    setMusicEnabled(musicToggle.checked);
  });

  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
  });

  settingsCloseBtn.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
  });

  settingsPanel.addEventListener("click", (e) => {
    if (e.target === settingsPanel) settingsPanel.classList.add("hidden");
  });
})();
