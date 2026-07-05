// popup.js

const SETTINGS_PATH = "/settings/extension-access";
const TOKEN_KEY = "afterthought_access_token";
const BASE_URL_KEY = "afterthought_base_url";
const DEFAULT_BASE_URL = "http://localhost:3000";

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const tokenInput = document.getElementById("tokenInput");
const baseUrlInput = document.getElementById("baseUrlInput");
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

function getApiBase() {
  return (baseUrlInput?.value || "").trim() || DEFAULT_BASE_URL;
}

// Point the settings link at the dashboard token page and open it in a real tab.
function updateSettingsLink() {
  if (!openSettingsBtn) return;
  const url = getApiBase() + SETTINGS_PATH;
  openSettingsBtn.href = url;
}

if (openSettingsBtn) {
  updateSettingsLink();
  openSettingsBtn.addEventListener("click", (e) => {
    if (browserApi?.tabs?.create) {
      e.preventDefault();
      browserApi.tabs.create({ url: getApiBase() + SETTINGS_PATH });
    }
  });
}

// Load previously saved token and base URL from extension storage.
function loadSettings() {
  if (!browserApi?.storage?.local) {
    setStatus("Extension storage is unavailable.", "error");
    return;
  }
  browserApi.storage.local.get([TOKEN_KEY, BASE_URL_KEY], (result) => {
    const token = result?.[TOKEN_KEY];
    const baseUrl = result?.[BASE_URL_KEY];

    if (baseUrl && baseUrlInput) {
      baseUrlInput.value = baseUrl;
      updateSettingsLink();
    }

    if (token) {
      tokenInput.value = token;
      setStatus("Access token loaded. You're ready to record.", "success");
    } else {
      setStatus("Paste your access token to enable recording.");
    }
  });
}

loadSettings();

// Save token (and base URL if provided) when the user clicks Save.
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

  const toSave = { [TOKEN_KEY]: token };
  const baseUrl = (baseUrlInput?.value || "").trim();
  if (baseUrl) toSave[BASE_URL_KEY] = baseUrl;

  browserApi.storage.local.set(toSave, () => {
    updateSettingsLink();
    setStatus("Settings saved. You're ready to record.", "success");
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

  // Persist the current values then open the recording tab.
  const toSave = { [TOKEN_KEY]: token };
  const baseUrl = (baseUrlInput?.value || "").trim();
  if (baseUrl) toSave[BASE_URL_KEY] = baseUrl;

  browserApi.storage.local.set(toSave, () => {
    setStatus("Opening recording tab…");
    browserApi.runtime.sendMessage({ action: "open-recording-tab" }, () => {
      if (browserApi.runtime.lastError) {
        setStatus("Failed to open recording tab.", "error");
        return;
      }
      setStatus("Recording tab opened.", "success");
    });
  });
});
