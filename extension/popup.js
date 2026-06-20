// popup.js

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

startBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening recording tab...";
  if (!browserApi) {
    statusEl.textContent = "Browser API not available.";
    return;
  }

  browserApi.runtime.sendMessage({ action: "open-recording-tab" }, (res) => {
    if (browserApi.runtime.lastError) {
      console.error(browserApi.runtime.lastError);
      statusEl.textContent = "Failed to open recording tab.";
      return;
    }
    statusEl.textContent = "Recording tab opened.";
  });
});
