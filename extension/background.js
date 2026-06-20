let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;

const runtimeApi = globalThis.chrome || globalThis.browser;

function log(message, detail) {
  console.log('[AfterThought Background]', message, detail || '');
}

async function uploadAudio(audioBlob) {
  const endpoint = 'http://localhost:3000/api/transcribe';

  log('Uploading audio to backend', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'audio/webm',
    },
    body: audioBlob,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  log('Upload succeeded', data);
  return data;
}

async function startCapture() {
  try {
    log('Starting microphone capture');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    currentStream = stream;
    audioChunks = [];

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      log('Recorder stopped, preparing upload');
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      try {
        await uploadAudio(audioBlob);
        notifyPopup({ type: 'upload-result', ok: true });
      } catch (error) {
        notifyPopup({
          type: 'upload-result',
          ok: false,
          error: error.message || 'Upload failed',
        });
      } finally {
        stopTracks();
      }
    };

    mediaRecorder.start();
    notifyPopup({ type: 'recording-state', isRecording: true });
    log('MediaRecorder started successfully');
  } catch (error) {
    log('Capture failed', error);
    notifyPopup({
      type: 'recording-state',
      isRecording: false,
      error: error.message || 'Unable to start recording',
    });
  }
}

function stopTracks() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
}

function stopCapture() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    log('Stopping recorder');
    mediaRecorder.stop();
  } else {
    stopTracks();
    notifyPopup({ type: 'recording-state', isRecording: false });
  }
}

function notifyPopup(payload) {
  if (runtimeApi && runtimeApi.runtime && runtimeApi.runtime.sendMessage) {
    runtimeApi.runtime.sendMessage(payload);
  }
}

if (runtimeApi && runtimeApi.runtime) {
  runtimeApi.runtime.onInstalled.addListener(() => {
    log('Extension installed');
  });

  runtimeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Message received', message);

    if (message && message.type === 'start-recording') {
      startCapture();
      sendResponse({ ok: true });
      return true;
    }

    if (message && message.type === 'stop-recording') {
      stopCapture();
      sendResponse({ ok: true });
      return true;
    }

    sendResponse({ ok: false, error: 'Unknown message' });
    return true;
  });
}

