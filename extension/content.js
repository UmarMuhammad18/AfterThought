chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getAudioStream') {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      sendResponse({ ok: true, stream: destination.stream });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
  }

  return true;
});
