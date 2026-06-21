// popup.js

// Base URL of the AfterThought web app. Keep in sync with manifest host_permissions.
const API_BASE = "http://localhost:3000";
const SETTINGS_PATH = "/settings/extension-access";
const TOKEN_KEY = "afterthought_access_token";

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const tokenInput = document.getElementById("tokenInput");
const saveTokenBtn = document.getElementById("saveTokenBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = "status" + (type ? " " + type : "");
}

// Point the settings link at the dashboard token page.
if (openSettingsBtn) {
  openSettingsBtn.href = API_BASE + SETTINGS_PATH;
  // Open in a real browser tab even if popup blocks target=_blank.
  openSettingsBtn.addEventListener("click", (e) => {
    if (browserApi?.tabs?.create) {
      e.preventDefault();
      browserApi.tabs.create({ url: API_BASE + SETTINGS_PATH });
    }
  });
}

// Load any previously saved token into the input.
function loadToken() {
  if (!browserApi?.storage?.local) {
    setStatus("Extension storage is unavailable.", "error");
    return;
  }
  browserApi.storage.local.get([TOKEN_KEY], (result) => {
    const token = result?.[TOKEN_KEY];
    if (token) {
      tokenInput.value = token;
      setStatus("Access token loaded. You're ready to record.", "success");
    } else {
      setStatus("Paste your access token to enable recording.");
    }
  });
}

loadToken();

saveTokenBtn.addEventListener("click", () => {
  const token = (tokenInput.value || "").trim();
  if (!token) {
    setStatus("Please paste a valid access token.", "error");
    return;
  }
  if (!browserApi?.storage?.local) {
    setStatus("Extension storage is unavailable.", "error");
    return;
  }
  browserApi.storage.local.set({ [TOKEN_KEY]: token }, () => {
    setStatus("Access token saved. You're ready to record.", "success");
  });
});

startBtn.addEventListener("click", () => {
  if (!browserApi) {
    setStatus("Browser API not available.", "error");
    return;
  }

  const token = (tokenInput.value || "").trim();
  if (!token) {
    setStatus("Save your access token before recording.", "error");
    return;
  }

  // Persist the latest token value before opening the recording tab.
  browserApi.storage.local.set({ [TOKEN_KEY]: token }, () => {
    setStatus("Opening recording tab…");
    browserApi.runtime.sendMessage({ action: "open-recording-tab" }, () => {
      if (browserApi.runtime.lastError) {
        console.error(browserApi.runtime.lastError);
        setStatus("Failed to open recording tab.", "error");
        return;
      }
      setStatus("Recording tab opened.", "success");
    });
  });
});
