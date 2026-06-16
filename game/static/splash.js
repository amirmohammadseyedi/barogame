(function () {
  const SPLASH_DURATION = 4000;
  const splashScreen = document.getElementById("splashScreen");
  const splashBar = document.getElementById("splashBar");

  const preloadUrls = [
    "/static/images/cover.webp",
    "/static/images/buses/man.webp",
    "/static/images/buses/benz-modern.webp",
    "/static/images/buses/scania.webp",
    "/static/images/buses/volvo.webp",
    "/static/images/buses/yutang.webp",
    "/static/images/buses/benz-classic.webp",
  ];

  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = url;
    });
  }

  function animateProgress(duration) {
    if (!splashBar) return;
    splashBar.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => {
      splashBar.style.width = "100%";
    });
  }

  window.splashReady = (async () => {
    document.documentElement.classList.add("phase-splash");
    animateProgress(SPLASH_DURATION);
    await Promise.all([
      Promise.all(preloadUrls.map(preloadImage)),
      new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION)),
    ]);
    if (splashScreen) splashScreen.classList.add("hidden");
    document.documentElement.classList.remove("phase-splash");
  })();
})();
