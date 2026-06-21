// recording.js

// Base URL of the AfterThought web app. Keep in sync with manifest host_permissions.
const API_BASE = "http://localhost:3000";
const UPLOAD_URL = API_BASE + "/api/transcribe";
const TOKEN_KEY = "afterthought_access_token";

let mediaRecorder = null;
let chunks = [];
let activeStream = null;

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

function stopStream() {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
}

// Upload the recorded audio directly from this page. The Blob stays in this
// context (passing it through runtime.sendMessage would serialize it to an
// empty object), so the request body is always a valid binary payload.
async function uploadRecording(blob) {
  if (!blob || blob.size === 0) {
    throw new Error("Recording is empty. Please try recording again.");
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error("Missing access token. Open the AfterThought popup and save your token.");
  }

  let res;
  try {
    res = await fetch(UPLOAD_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "audio/webm",
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
  } catch (err) {
    throw new Error("The server returned an unexpected response.");
  }

  if (!data?.ok || !data?.id) {
    throw new Error(data?.error || "Upload did not complete. Please try again.");
  }

  return data;
}

confirmBtn.addEventListener("click", async () => {
  clearBanners();

  // Block recording until a valid token is saved.
  const token = await getAccessToken();
  if (!token) {
    showError("No access token found. Open the AfterThought popup, paste your token, and save it before recording.");
    return;
  }

  try {
    setStatus("Requesting microphone access…");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    activeStream = stream;

    chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stopStream();
      setStatus("Uploading recording…");

      const blob = new Blob(chunks, { type: "audio/webm" });

      try {
        const data = await uploadRecording(blob);
        setStatus("");
        showSuccess("Recording uploaded. Opening your summary…");
        setTimeout(() => {
          window.location.href = API_BASE + "/recording/" + data.id;
        }, 1200);
      } catch (err) {
        console.error("Upload failed:", err);
        setStatus("");
        showError(err.message || "Something went wrong during upload.");
        // Allow the user to retry from the recording screen.
        recordingControls.style.display = "none";
        preRecording.style.display = "block";
      }
    };

    // Collect data periodically so a chunk is always available.
    mediaRecorder.start(1000);

    preRecording.style.display = "none";
    recordingControls.style.display = "block";
    setStatus("");
  } catch (err) {
    console.error(err);
    stopStream();
    showError("Microphone permission denied or unavailable. Allow mic access and try again.");
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
  window.close();
});
