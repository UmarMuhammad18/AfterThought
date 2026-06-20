import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

type PopupMessage = {
  type?: string;
  isRecording?: boolean;
  error?: string;
  ok?: boolean;
};

type RuntimeLike = {
  runtime?: {
    onMessage?: {
      addListener?: (callback: (message: PopupMessage) => void) => void;
      removeListener?: (callback: (message: PopupMessage) => void) => void;
    };
    sendMessage?: (message: { type: string }) => void;
  };
};

function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    const runtime =
      (globalThis as { chrome?: RuntimeLike; browser?: RuntimeLike }).chrome ||
      (globalThis as { chrome?: RuntimeLike; browser?: RuntimeLike }).browser;

    const listener = (message: PopupMessage) => {
      if (message?.type === 'recording-state') {
        setIsRecording(Boolean(message.isRecording));
        setStatus(
          message.error
            ? `Error: ${message.error}`
            : message.isRecording
              ? 'Recording…'
              : 'Ready',
        );
      }

      if (message?.type === 'upload-result') {
        setStatus(
          message.ok ? 'Upload complete' : `Upload failed: ${message.error || 'Unknown error'}`,
        );
      }
    };

    if (runtime?.runtime?.onMessage?.addListener) {
      runtime.runtime.onMessage.addListener(listener);
      return () => {
        if (runtime.runtime?.onMessage?.removeListener) {
          runtime.runtime.onMessage.removeListener(listener);
        }
      };
    }
  }, []);

  const sendMessage = (type: string) => {
    const runtime =
      (globalThis as { chrome?: RuntimeLike; browser?: RuntimeLike }).chrome ||
      (globalThis as { chrome?: RuntimeLike; browser?: RuntimeLike }).browser;
    runtime?.runtime?.sendMessage?.({ type });
  };

  const startRecordingSession = () => {
    setStatus('Starting…');
    sendMessage('start-recording');
  };

  const stopRecordingSession = () => {
    setStatus('Stopping…');
    sendMessage('stop-recording');
  };

  return (
    <main className="popup-shell">
      <div className="popup-header">
        <span className="brand">AfterThought</span>
        <span className={`status-dot ${isRecording ? 'recording' : ''}`} />
      </div>
      <p className="status-text">{status}</p>
      <div className="button-group">
        <button className="button primary" onClick={startRecordingSession} disabled={isRecording}>
          Start Recording
        </button>
        <button className="button secondary" onClick={stopRecordingSession} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}
