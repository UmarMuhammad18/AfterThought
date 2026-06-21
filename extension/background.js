// background.js

let currentTabId = null;

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

// The recording tab uploads audio directly (the Blob must stay in the page
// context — it cannot be transferred through runtime.sendMessage), so the
// service worker only needs to open the recording tab.
browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-recording-tab") {
    browserApi.tabs.create(
      { url: browserApi.runtime.getURL("recording.html") },
      (tab) => {
        currentTabId = tab.id;
        sendResponse({ ok: true });
      }
    );
    return true;
  }
});
