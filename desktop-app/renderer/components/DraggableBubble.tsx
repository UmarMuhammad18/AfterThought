import React, { useRef, useState } from 'react';

export function DraggableBubble({ onOpen }: { onOpen: () => void }) {
  const [position, setPosition] = useState({ x: 18, y: 18 });
  const dragRef = useRef<{ startX: number; startY: number; startXPos: number; startYPos: number } | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startXPos: position.x,
      startYPos: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    setPosition({
      x: Math.max(
        0,
        Math.min(window.innerWidth - 64, dragRef.current.startXPos + deltaX),
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - 64, dragRef.current.startYPos + deltaY),
      ),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <button
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        right: position.x,
        bottom: position.y,
        width: 64,
        height: 64,
        borderRadius: 999,
        border: 'none',
        background: 'linear-gradient(135deg, #6d5dfc, #8b5cf6)',
        color: '#fff',
        fontWeight: 700,
        cursor: 'grab',
        boxShadow: '0 10px 22px rgba(109, 93, 252, 0.35)',
        touchAction: 'none',
      }}
    >
      AI
    </button>
  );
}
