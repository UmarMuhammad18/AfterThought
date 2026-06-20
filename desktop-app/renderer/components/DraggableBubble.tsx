import React from 'react';

export function DraggableBubble({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        width: 64,
        height: 64,
        borderRadius: 999,
        border: 'none',
        background: 'linear-gradient(135deg, #6d5dfc, #8b5cf6)',
        color: '#fff',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 10px 22px rgba(109, 93, 252, 0.35)',
      }}
    >
      AI
    </button>
  );
}
