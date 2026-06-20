// background.js

let currentTabId = null;

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

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

  if (message.action === "upload-recording") {
    uploadRecording(message.blob)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("Upload failed:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

async function uploadRecording(blob) {
  const url = "http://localhost:3000/api/transcribe";

  const res = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "audio/webm",
    },
    body: blob,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

  try {
    return await res.json();
  } catch (err) {
    throw new Error("Invalid response format from server");
  }
}
