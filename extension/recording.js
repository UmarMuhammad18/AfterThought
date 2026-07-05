// recording.js

const TOKEN_KEY = "afterthought_access_token";
const BASE_URL_KEY = "afterthought_base_url";
const DEFAULT_BASE_URL = "http://localhost:3000";

let mediaRecorder = null;
let chunks = [];
let activeStream = null;
// Resolved once storage is read; used by uploadRecording and the redirect.
let apiBase = DEFAULT_BASE_URL;

function getBrowser() {
  if (typeof chrome !== "undefined") return chrome;
  if (typeof browser !== "undefined") return browser;
  return null;
}

const browserApi = getBrowser();

const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const stopBtn = document.getElementById("stopBtn");
const preRecording = document.getElementById("preRecording");
const recordingControls = document.getElementById("recordingControls");
const statusEl = document.getElementById("status");
const errorBanner = document.getElementById("errorBanner");
const errorText = document.getElementById("errorText");
const successBanner = document.getElementById("successBanner");
const successText = document.getElementById("successText");

function setStatus(text, type) {
  statusEl.textContent = text || "";
  statusEl.className = "status" + (type ? " " + type : "");
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.add("show");
  successBanner.classList.remove("show");
}

function showSuccess(message) {
  successText.textContent = message;
  successBanner.classList.add("show");
  errorBanner.classList.remove("show");
}

function clearBanners() {
  errorBanner.classList.remove("show");
  successBanner.classList.remove("show");
}

// Read a value from extension storage.
function storageGet(keys) {
  return new Promise((resolve) => {
    if (!browserApi?.storage?.local) { resolve({}); return; }
    browserApi.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function stopStream() {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
}

// Pick the best supported mimeType for MediaRecorder across browsers.
function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // Let the browser choose.
}

// Upload the recorded audio blob directly from this page context.
// Passing a Blob through runtime.sendMessage serialises it to {}, so we must
// upload here where the Blob is still a real binary object.
async function uploadRecording(blob) {
  if (!blob || blob.size === 0) {
    throw new Error("Recording is empty. Please try recording again.");
  }

  const { [TOKEN_KEY]: token } = await storageGet([TOKEN_KEY]);
  if (!token) {
    throw new Error("Missing access token. Open the AfterThought popup and save your token.");
  }

  const uploadUrl = apiBase + "/api/transcribe";

  let res;
  try {
    res = await fetch(uploadUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": blob.type || "audio/webm",
        Authorization: "Bearer " + token,
      },
      body: blob,
    });
  } catch (err) {
    throw new Error("Could not reach the server. Make sure AfterThought is running.");
  }

  if (res.status === 401) {
    throw new Error("Unauthorized. Your access token may have expired — save a fresh token.");
  }
  if (!res.ok) {
    throw new Error("Upload failed (" + res.status + "). Please try again.");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The server returned an unexpected response.");
  }

  if (!data?.ok || !data?.id) {
    throw new Error(data?.error || "Upload did not complete. Please try again.");
  }

  return data;
}

// Initialise: load the saved base URL from storage before the user can act.
storageGet([BASE_URL_KEY]).then(({ [BASE_URL_KEY]: savedBase }) => {
  if (savedBase) apiBase = savedBase;
});

confirmBtn.addEventListener("click", async () => {
  clearBanners();

  // Re-read storage at click time so any mid-session token change is picked up.
  const { [TOKEN_KEY]: token } = await storageGet([TOKEN_KEY]);
  if (!token) {
    showError("No access token found. Open the AfterThought popup, paste your token, and save it before recording.");
    return;
  }

  try {
    setStatus("Requesting microphone access…");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    activeStream = stream;

    chunks = [];
    const mimeType = getSupportedMimeType();
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stopStream();
      setStatus("Uploading recording…");

      const mType = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mType });

      try {
        const data = await uploadRecording(blob);
        setStatus("");
        showSuccess("Recording uploaded. Opening your summary…");

        // Open the recording summary in a proper browser tab, not in the
        // extension popup frame (which would navigate away from the extension).
        const summaryUrl = apiBase + "/recording/" + data.id;
        if (browserApi?.tabs?.create) {
          setTimeout(() => browserApi.tabs.create({ url: summaryUrl }), 1200);
        } else {
          setTimeout(() => window.open(summaryUrl, "_blank"), 1200);
        }
      } catch (err) {
        setStatus("");
        showError(err.message || "Something went wrong during upload.");
        recordingControls.style.display = "none";
        preRecording.style.display = "block";
      }
    };

    // Collect data every second so a chunk is always available on stop.
    mediaRecorder.start(1000);

    preRecording.style.display = "none";
    recordingControls.style.display = "block";
    setStatus("");
  } catch (err) {
    stopStream();
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      showError("Microphone permission denied. Allow mic access in your browser settings and try again.");
    } else {
      showError("Could not start recording: " + (err.message || "unknown error."));
    }
    setStatus("");
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setStatus("Stopping recording…");
    mediaRecorder.stop();
  }
});

cancelBtn.addEventListener("click", () => {
  stopStream();
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  window.close();
});
