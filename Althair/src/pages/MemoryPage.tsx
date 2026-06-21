import { useEffect, useState } from 'react';
import { assistantService } from '../services/assistantService';
import { motion } from 'framer-motion';

const MemoryPage = () => {
  const [memories, setMemories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await assistantService.memories();
        setMemories(data?.memories || []);
      } catch {
        setMemories(['User works Fridays and Saturdays', 'User wants to build a calm operating system']);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Memory layer</h2>
        <p className="mt-2 text-sm text-slate-400">Velmeir keeps a simple memory archive to personalize recommendations and plans.</p>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-slate-400">Loading memories…</div>
        ) : (
          memories.map((memory, index) => (
            <div key={index} className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 text-slate-200 shadow-soft backdrop-blur-xl">
              {memory}
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default MemoryPage;
