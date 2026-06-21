import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Sidebar from './Sidebar';
import CommandBar from './CommandBar';
import FloatingWorkspace from './FloatingWorkspace';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { activePanel, panelVisible } = useWorkspace();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(140,184,255,0.11),_transparent_32%),_radial-gradient(circle_at_bottom,_rgba(144,111,255,0.08),_transparent_40%),#050813] text-slate-100">
      <Sidebar />
      <main className="relative mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <CommandBar />
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.35 }}
          className="mt-8 w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl"
        >
          {children}
        </motion.div>
      </main>
      <FloatingWorkspace visible={panelVisible} activePanel={activePanel} />
    </div>
  );
};
