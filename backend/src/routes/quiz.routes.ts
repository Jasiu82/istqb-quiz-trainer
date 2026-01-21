import { Router } from 'express';
import { generateQuestion } from '../services/ai.service.js';

const router = Router();

router.get('/question', async (req, res) => {
  try {
    const chapter = parseInt(req.query.chapter as string) || 1;
    const level = (req.query.level as 'K1' | 'K2' | 'K3') || 'K2';
    
    const question = await generateQuestion(chapter, level);
    res.json(question);
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

export default router;