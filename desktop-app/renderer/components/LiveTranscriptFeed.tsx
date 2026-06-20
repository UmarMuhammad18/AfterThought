import React from 'react';

const placeholderTranscript = [
  'Speaker A: We should confirm the launch timeline.',
  'Speaker B: I will handle the onboarding follow-up.',
];

export function LiveTranscriptFeed() {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Live transcript</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {placeholderTranscript.map((line, index) => (
          <div key={index} style={{ fontSize: 13, color: '#eef2ff' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
