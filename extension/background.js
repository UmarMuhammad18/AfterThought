// background.js

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

// Open the recorder page for a call tab. The recorder lives in its own
// extension tab (not the popup, which closes when it loses focus) and uploads
// audio itself — Blobs can't be passed through runtime messages.
browserApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "start-recording") return;

  const params = new URLSearchParams({
    tabId: String(message.tabId ?? ""),
    mode: message.mode || "both",
    title: message.title || "",
    kind: message.kind || "meeting",
    platform: message.platform || "",
  });

  browserApi.tabs.create(
    { url: browserApi.runtime.getURL("recording.html?" + params.toString()), active: true },
    () => sendResponse({ ok: true }),
  );
  return true;
});
