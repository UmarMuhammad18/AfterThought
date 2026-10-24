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
const connectSection = document.getElementById("connectSection");
const modeSelect = document.getElementById("modeSelect");
const titleInput = document.getElementById("titleInput");
const interviewInput = document.getElementById("interviewInput");
const consentInput = document.getElementById("consentInput");

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
  return (baseUrlInput?.value || "").trim().replace(/\/$/, "") || DEFAULT_BASE_URL;
}

function hasToken() {
  return Boolean((tokenInput.value || "").trim());
}

function updateStartState() {
  startBtn.disabled = !hasToken() || !consentInput.checked;
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    browserApi.tabs.create({ url: getApiBase() + SETTINGS_PATH });
  });
}

// Load previously saved key and base URL from extension storage.
browserApi.storage.local.get([TOKEN_KEY, BASE_URL_KEY], (result) => {
  if (result?.[BASE_URL_KEY]) baseUrlInput.value = result[BASE_URL_KEY];
  if (result?.[TOKEN_KEY]) {
    tokenInput.value = result[TOKEN_KEY];
  } else {
    connectSection.open = true;
    setStatus("Add your API key to start recording.");
  }
  updateStartState();
});

consentInput.addEventListener("change", updateStartState);
tokenInput.addEventListener("input", updateStartState);

saveTokenBtn.addEventListener("click", () => {
  const token = (tokenInput.value || "").trim();
  if (!token) {
    setStatus("Please paste your API key.", "error");
    return;
  }
  const toSave = { [TOKEN_KEY]: token };
  const baseUrl = (baseUrlInput.value || "").trim();
  if (baseUrl) toSave[BASE_URL_KEY] = baseUrl.replace(/\/$/, "");
  browserApi.storage.local.set(toSave, () => {
    connectSection.open = false;
    setStatus("Saved. You're ready to record.", "success");
    updateStartState();
  });
});

startBtn.addEventListener("click", async () => {
  // The tab the user is looking at right now is the call to capture. Clicking
  // the toolbar button grants activeTab, which tab capture requires.
  const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus("Couldn't find the current tab.", "error");
    return;
  }
  setStatus("Starting…");
  browserApi.runtime.sendMessage(
    {
      action: "start-recording",
      tabId: tab.id,
      mode: modeSelect.value,
      title: (titleInput.value || "").trim(),
      kind: interviewInput.checked ? "interview" : "meeting",
      platform: guessPlatform(tab.url || ""),
    },
    (res) => {
      if (browserApi.runtime.lastError || !res?.ok) {
        setStatus(res?.error || "Could not start recording.", "error");
        return;
      }
      window.close();
    },
  );
});

function guessPlatform(url) {
  const map = [
    ["meet.google.com", "Google Meet"],
    ["zoom.us", "Zoom"],
    ["teams.microsoft.com", "Microsoft Teams"],
    ["teams.live.com", "Microsoft Teams"],
    ["web.whatsapp.com", "WhatsApp"],
    ["app.slack.com", "Slack"],
    ["discord.com", "Discord"],
    ["whereby.com", "Whereby"],
    ["webex.com", "Webex"],
  ];
  const hit = map.find(([host]) => url.includes(host));
  return hit ? hit[1] : undefined;
}
