const StickerNote = ({ emoji, title, content, color }: { emoji: string; title: string; content: string; color: string }) => (
  <div className="rounded-[28px] border border-white/10 p-5 shadow-soft backdrop-blur-xl" style={{ background: color }}>
    <div className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-950">
      <span>{emoji}</span>
      <span>{title}</span>
    </div>
    <p className="text-sm text-slate-950">{content}</p>
  </div>
);

export default StickerNote;
