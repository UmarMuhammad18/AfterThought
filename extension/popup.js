// popup.js

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const tokenInput = document.getElementById("tokenInput");
const saveTokenBtn = document.getElementById("saveTokenBtn");

const TOKEN_KEY = "afterthought_access_token";

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

// Load any previously saved token into the input.
function loadToken() {
  if (!browserApi?.storage?.local) return;
  browserApi.storage.local.get([TOKEN_KEY], (result) => {
    const token = result?.[TOKEN_KEY];
    if (token) {
      tokenInput.value = token;
      statusEl.textContent = "Access token loaded.";
    } else {
      statusEl.textContent = "Paste your access token to enable recording.";
    }
  });
}

loadToken();

saveTokenBtn.addEventListener("click", () => {
  const token = (tokenInput.value || "").trim();
  if (!token) {
    statusEl.textContent = "Please paste a valid access token.";
    return;
  }
  if (!browserApi?.storage?.local) {
    statusEl.textContent = "Storage not available.";
    return;
  }
  browserApi.storage.local.set({ [TOKEN_KEY]: token }, () => {
    statusEl.textContent = "Access token saved.";
  });
});

startBtn.addEventListener("click", () => {
  if (!browserApi) {
    statusEl.textContent = "Browser API not available.";
    return;
  }

  const token = (tokenInput.value || "").trim();
  if (!token) {
    statusEl.textContent = "Save your access token before recording.";
    return;
  }

  // Persist the latest token value before opening the recording tab.
  browserApi.storage.local.set({ [TOKEN_KEY]: token }, () => {
    statusEl.textContent = "Opening recording tab...";
    browserApi.runtime.sendMessage({ action: "open-recording-tab" }, () => {
      if (browserApi.runtime.lastError) {
        console.error(browserApi.runtime.lastError);
        statusEl.textContent = "Failed to open recording tab.";
        return;
      }
      statusEl.textContent = "Recording tab opened.";
    });
  });
});
