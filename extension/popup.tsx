import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

type ChromeTabCapture = {
  capture: (
    options: { audio: boolean; video: boolean },
    callback: (stream: MediaStream | null) => void,
  ) => void;
};

type ChromeWindow = Window & {
  chrome?: {
    tabCapture?: ChromeTabCapture;
  };
  webkitAudioContext?: typeof AudioContext;
};

const chromeApi = (globalThis as unknown as ChromeWindow).chrome;

function Popup() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopRecordingSession();
    };
  }, []);

  const startRecordingSession = async () => {
    setStatus('Starting…');
    try {
      // 1. Try to capture tab audio
      if (chromeApi?.tabCapture) {
        chromeApi.tabCapture.capture({ audio: true, video: false }, async (stream) => {
          if (!stream) {
            console.warn('Tab capture failed or denied. Falling back to mic capture...');
            await startMicrophoneCapture();
            return;
          }
          setupRecorder(stream);
        });
      } else {
        await startMicrophoneCapture();
      }
    } catch (err: any) {
      console.error('Failed to capture audio', err);
      setStatus(`Error: ${err.message || 'Capture failed'}`);
      setIsRecording(false);
    }
  };

  const startMicrophoneCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setupRecorder(stream);
    } catch (err: any) {
      console.error('Failed to capture mic audio', err);
      setStatus(`Permission denied / Mic not found`);
      setIsRecording(false);
    }
  };

  const setupRecorder = (stream: MediaStream) => {
    streamRef.current = stream;

    // Route tab/mic audio to speaker destination so sound continues playing for the user
    try {
      const AudioContextClass =
        window.AudioContext || (window as ChromeWindow).webkitAudioContext;

      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination);
      }
    } catch (err) {
      console.warn('Could not route audio to speaker output:', err);
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      setStatus('Processing transcription…');
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      try {
        const response = await fetch('http://localhost:3000/api/transcribe', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.ok) {
          setStatus('Transcription complete!');
        } else {
          setStatus(`Failed: ${data.error || 'Server error'}`);
        }
      } catch (err) {
        console.error('API upload failed', err);
        setStatus('Failed to upload recording');
      }

      // Cleanup tracks
      stream.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };

    recorder.start();
    setIsRecording(true);
    setStatus('Recording active tab…');
  };

  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
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
