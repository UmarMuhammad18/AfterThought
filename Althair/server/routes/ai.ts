import { Router } from 'express';
import { chat } from '../services/ollamaService.js';
import { supabase } from '../services/supabaseService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/chat', requireAuth, async (req, res) => {
  const user = res.locals.user;
  const { message, model } = req.body;
  const cleanModel = model === 'llama-3' ? 'llama-3' : 'gemma-3';

  try {
    const { data: memoryData } = await supabase
      .from('memories')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const memoryContext = memoryData?.map((item) => `- ${item.content}`).join('\n') || 'No known memories yet.';
    const prompt = `Remembered items:\n${memoryContext}\n\nUser: ${message}`;

    const result = await chat(prompt, cleanModel);

    if (/\bI work\b|\bI study\b|\bI am\b/i.test(message)) {
      await supabase.from('memories').insert({
        user_id: user.id,
        content: message,
        category: 'personal'
      });
    }

    res.json({ response: result.response });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

export default router;
