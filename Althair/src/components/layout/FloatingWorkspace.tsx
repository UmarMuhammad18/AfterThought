import { motion } from 'framer-motion';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const contentMap: Record<string, string> = {
  home: 'Focus on your command bar — everything begins here.',
  tasks: 'Your task board is ready. Add, prioritize and complete work with ease.',
  calendar: 'Your calendar has emerged, showing events and deadlines for the week.',
  goals: 'Goal planning is available. Expand any objective into a rich mind map.',
  habits: 'Track daily habits, streaks and momentum over time.',
  notes: 'Your notes workspace is waiting. Capture ideas, tags and insights.',
  memory: 'Past memories are being retrieved to make your AI assistant more personal.',
  settings: 'Customize your theme, model and profile from the settings panel.'
};

const FloatingWorkspace = ({ visible, activePanel }: { visible: boolean; activePanel: string }) => {
  const displayText = contentMap[activePanel] || 'Use Velmeir to open content and keep your workspace calm and clear.';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-none fixed bottom-8 right-8 z-30 hidden w-[320px] rounded-[28px] border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-200 backdrop-blur-xl sm:block"
    >
      <div className="text-slate-400">Workspace status</div>
      <p className="mt-2 text-slate-100">{displayText}</p>
    </motion.div>
  );
};

export default FloatingWorkspace;
