(() => {
  const button = document.getElementById("installAppButton");
  const status = document.getElementById("installStatus");
  const appName = button.dataset.appName;
  let installPrompt = null;

  if (window.Capacitor?.isNativePlatform?.()) {
    button.hidden = true;
    return;
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js?v=85", { updateViaCache: "none" })
        .catch(error => console.warn("Could not prepare the app for installation.", error));
    }, { once: true });
  }

  if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) {
    button.hidden = true;
    return;
  }

  function showStatus(message) {
    status.textContent = message;
    status.hidden = false;
  }

  function showInstallInstructions() {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      showStatus("Open this page in Safari. Tap Share → Add to Home Screen, turn on Open as Web App if shown, then tap Add.");
    } else if (/Android/i.test(userAgent)) {
      showStatus("Open this page in Chrome. Tap ⋮, choose Add to Home screen or Install and create shortcut, then choose Install. Create shortcut adds a link that opens in Chrome.");
    } else if (/Macintosh/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg/i.test(userAgent)) {
      showStatus("In Safari on macOS Sonoma or later, choose File → Add to Dock.");
    } else if (/Edg\//i.test(userAgent)) {
      showStatus("In Edge, choose ⋯ → More tools → Apps → Install this site as an app. You can also use the install icon in the address bar when it appears.");
    } else {
      showStatus("Open this page in Chrome or Edge. Use the install icon in the address bar if shown. In Chrome, you can also choose ⋮ → Cast, save and share → Install page as app.");
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (!status.hidden) showStatus("The install prompt is ready. Select the install button again.");
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    button.hidden = true;
    showStatus(appName + " was installed. Look for it on your home screen or in your apps.");
  });

  button.addEventListener("click", async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      button.disabled = true;
      try {
        const result = (await prompt.prompt()) ?? (await prompt.userChoice);
        if (result?.outcome === "accepted") {
          if (!button.hidden) showStatus("Install accepted. Look for " + appName + " on your home screen or in your apps.");
          return;
        }
        showStatus("Installation was cancelled. Select the install button again for instructions.");
        return;
      } catch (error) {
        console.warn("The browser could not open the install prompt.", error);
      } finally {
        button.disabled = false;
      }
    }
    showInstallInstructions();
  });
})();
