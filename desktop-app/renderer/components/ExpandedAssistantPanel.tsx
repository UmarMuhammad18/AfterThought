import React from 'react';
import { LiveTranscriptFeed } from './LiveTranscriptFeed';
import { ActionItemsList } from './ActionItemsList';

export function ExpandedAssistantPanel({ onClose }: { onClose: () => void }) {
  return (
    <section
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #11141f, #0b0d14)',
        color: '#eef2ff',
        borderRadius: 18,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>AfterThought Assistant</strong>
        <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none' }}>
          ✕
        </button>
      </div>
      <LiveTranscriptFeed />
      <ActionItemsList />
    </section>
  );
}
