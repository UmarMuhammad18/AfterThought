import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StickerNote from '../components/ui/StickerNote';

const initialNotes = [
  { id: 'n1', title: 'AI strategy', tags: ['AI', 'Productivity'], content: 'Keep the assistant minimal, elegant, and tailored to your daily rhythm.' },
  { id: 'n2', title: 'Weekly review', tags: ['Planning'], content: 'Review tasks on Friday and adapt the next week around capacity.' }
];

const NotesPage = () => {
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState('');

  const filteredNotes = notes.filter((note) => note.title.toLowerCase().includes(query.toLowerCase()) || note.content.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Notes and insights</h2>
        <p className="mt-2 text-sm text-slate-400">Capture ideas in a calm space with tags and lightweight linking.</p>
        <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or tags"
            className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
          />
        </div>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-2">
        {filteredNotes.map((note) => (
          <div key={note.id} className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-white">{note.title}</p>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{note.tags.join(', ')}</div>
            </div>
            <p className="mt-4 text-sm text-slate-300">{note.content}</p>
          </div>
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-3">
        <StickerNote emoji="💡" title="Idea" content="Capture new concepts and connect them to goals." color="rgba(238, 232, 255, 0.8)" />
        <StickerNote emoji="🔥" title="Progress" content="Note the momentum and keep the pace calm yet intentional." color="rgba(224, 242, 254, 0.82)" />
        <StickerNote emoji="🎯" title="Milestone" content="Highlight the next important objective in your project." color="rgba(241, 245, 249, 0.88)" />
      </motion.div>
    </div>
  );
};

export default NotesPage;
