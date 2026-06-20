import React from 'react';
import { createRoot } from 'react-dom/client';
import { AssistantApp } from './AssistantApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AssistantApp />
  </React.StrictMode>,
);
