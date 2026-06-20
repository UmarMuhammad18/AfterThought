import React, { useState } from 'react';
import { DraggableBubble } from './components/DraggableBubble';
import { ExpandedAssistantPanel } from './components/ExpandedAssistantPanel';

export function AssistantApp() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent' }}>
      {expanded ? (
        <ExpandedAssistantPanel onClose={() => setExpanded(false)} />
      ) : (
        <DraggableBubble onOpen={() => setExpanded(true)} />
      )}
    </div>
  );
}
