let isRecording = false;
let mediaRecorder;
let audioChunks = [];

async function getTabAudio() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  await chrome.tabs.sendMessage(tab.id, { action: 'getAudioStream' });
}

async function startRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      try {
        await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        console.error('Failed to send audio to backend', error);
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    chrome.runtime.sendMessage({ type: 'recording-state', isRecording: true });
  } catch (error) {
    console.error('Failed to start recording', error);
    chrome.runtime.sendMessage({ type: 'recording-state', isRecording: false, error: error.message });
  }
}

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  chrome.runtime.sendMessage({ type: 'recording-state', isRecording: false });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'start-recording') {
    startRecording();
    sendResponse({ ok: true });
  }

  if (message.type === 'stop-recording') {
    stopRecording();
    sendResponse({ ok: true });
  }

  return true;
});
