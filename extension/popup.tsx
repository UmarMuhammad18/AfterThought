import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === 'recording-state') {
        setIsRecording(message.isRecording);
        setStatus(message.isRecording ? 'Recording…' : 'Ready');
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleStart = async () => {
    setStatus('Starting…');
    await chrome.runtime.sendMessage({ type: 'start-recording' });
  };

  const handleStop = async () => {
    setStatus('Stopping…');
    await chrome.runtime.sendMessage({ type: 'stop-recording' });
  };

  return (
    <main className="popup-shell">
      <div className="popup-header">
        <span className="brand">AfterThought</span>
        <span className={`status-dot ${isRecording ? 'recording' : ''}`} />
      </div>
      <p className="status-text">{status}</p>
      <div className="button-group">
        <button className="button primary" onClick={handleStart} disabled={isRecording}>
          Start Recording
        </button>
        <button className="button secondary" onClick={handleStop} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);
