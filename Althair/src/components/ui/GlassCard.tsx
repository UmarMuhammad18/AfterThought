import { motion } from 'framer-motion';

const GlassCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-soft backdrop-blur-xl"
  >
    <div className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-400">{title}</div>
    {children}
  </motion.div>
);

export default GlassCard;
