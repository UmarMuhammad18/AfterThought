import React, { createContext, useContext, useState } from 'react';

type WorkspaceState = {
  activePanel: string;
  setActivePanel: (panel: string) => void;
  panelVisible: boolean;
  togglePanel: () => void;
};

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const [activePanel, setActivePanel] = useState('');
  const [panelVisible, setPanelVisible] = useState(false);

  return (
    <WorkspaceContext.Provider
      value={{
        activePanel,
        setActivePanel: (panel: string) => {
          setActivePanel(panel);
          setPanelVisible(Boolean(panel));
        },
        panelVisible,
        togglePanel: () => setPanelVisible((value) => !value)
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
