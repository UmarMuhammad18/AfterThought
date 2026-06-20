// recording.js

let mediaRecorder = null;
let chunks = [];

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
const messageEl = document.getElementById("message");

confirmBtn.addEventListener("click", async () => {
  try {
    statusEl.textContent = "Requesting microphone access...";

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    chunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      statusEl.textContent = "Uploading recording...";

      const blob = new Blob(chunks, { type: "audio/webm" });

      browserApi.runtime.sendMessage(
        { action: "upload-recording", blob },
        (res) => {
          if (browserApi.runtime.lastError) {
            console.error(browserApi.runtime.lastError);
            statusEl.textContent = "Upload failed.";
            messageEl.textContent = "Something went wrong.";
            return;
          }

          if (res?.ok) {
            statusEl.textContent = "Upload complete. Redirecting...";
            messageEl.textContent = "Recording finished.";

            const recordingId = res.id; // Get the unique recording ID from the response

            // 🔁 Redirect to your web app dashboard after a short delay
            setTimeout(() => {
              window.location.href = `http://localhost:3000/recording/${recordingId}`;
            }, 1200);
          } else {
            statusEl.textContent = "Upload failed.";
            messageEl.textContent = "Something went wrong.";
          }
        }
      );
    };

    mediaRecorder.start();

    preRecording.style.display = "none";
    recordingControls.style.display = "block";
    messageEl.textContent = "Recording in progress…";
    statusEl.textContent = "";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to start recording.";
    messageEl.textContent = "Microphone permission denied or unavailable.";
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder) {
    statusEl.textContent = "Stopping recording...";
    mediaRecorder.stop();
  }
});

cancelBtn.addEventListener("click", () => {
  window.close();
});
