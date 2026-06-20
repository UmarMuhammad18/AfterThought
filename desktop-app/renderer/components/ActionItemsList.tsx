import React from 'react';

const placeholderActions = [
  'Send recap to stakeholders',
  'Schedule design review',
  'Draft follow-up notes',
];

export function ActionItemsList() {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Action items</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#eef2ff' }}>
        {placeholderActions.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
