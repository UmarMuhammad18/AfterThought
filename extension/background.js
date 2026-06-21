// background.js

let currentTabId = null;

const TOKEN_KEY = "afterthought_access_token";

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

// Read the saved Supabase access token from extension storage.
function getAccessToken() {
  return new Promise((resolve) => {
    if (!browserApi?.storage?.local) {
      resolve(null);
      return;
    }
    browserApi.storage.local.get([TOKEN_KEY], (result) => {
      resolve(result?.[TOKEN_KEY] || null);
    });
  });
}

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

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Missing access token. Open the AfterThought popup and save your token.");
  }

  const res = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "audio/webm",
      Authorization: `Bearer ${token}`,
    },
    body: blob,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized. Your access token may have expired — save a fresh token.");
  }
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

  try {
    return await res.json();
  } catch (err) {
    throw new Error("Invalid response format from server");
  }
}
