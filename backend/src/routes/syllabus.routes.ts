import express from 'express';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';

const router = express.Router();
const syllabusService = new SyllabusParserService();

/**
 * GET /api/syllabus/chapters
 * Returns all chapters with their learning objectives
 */
router.get('/chapters', async (req, res) => {
  try {
    const sections = await syllabusService.parseSyllabus();

    // Group by chapter
    const chapterMap = new Map<number, { title: string; objectives: string[] }>();

    const chapterTitles: Record<number, string> = {
      1: 'Podstawy testowania',
      2: 'Testowanie w cyklu życia oprogramowania',
      3: 'Testowanie statyczne',
      4: 'Analiza i projektowanie testów',
      5: 'Zarządzanie testowaniem',
      6: 'Narzędzia wspierające testowanie'
    };

    sections.forEach(section => {
      if (!chapterMap.has(section.chapter)) {
        chapterMap.set(section.chapter, {
          title: chapterTitles[section.chapter] || `Rozdział ${section.chapter}`,
          objectives: []
        });
      }
      chapterMap.get(section.chapter)!.objectives.push(section.learningObjective);
    });

    const chapters = Array.from(chapterMap.entries()).map(([chapter, data]) => ({
      chapter,
      title: data.title,
      objectives: data.objectives,
      count: data.objectives.length
    }));

    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

/**
 * GET /api/syllabus/objective/:id
 * Returns detailed information about a specific learning objective
 */
router.get('/objective/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const section = await syllabusService.getSectionByLearningObjective(id);

    if (!section) {
      return res.status(404).json({ error: 'Learning objective not found' });
    }

    // Get related questions count from database
    // For now, we'll return a placeholder - this will be enhanced later
    const relatedQuestions = 0; // TODO: Query database for questions with this learning objective

    res.json({
      ...section,
      relatedQuestions
    });
  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ error: 'Failed to fetch learning objective' });
  }
});

/**
 * GET /api/syllabus/search?q=keyword
 * Search learning objectives by keyword
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const sections = await syllabusService.parseSyllabus();
    const query = q.toLowerCase();

    const results = sections.filter(section =>
      section.learningObjective.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query)
    );

    res.json(results.map(section => ({
      learningObjective: section.learningObjective,
      chapter: section.chapter,
      level: section.level,
      description: section.description
    })));
  } catch (error) {
    console.error('Error searching syllabus:', error);
    res.status(500).json({ error: 'Failed to search syllabus' });
  }
});

/**
 * GET /api/syllabus/all
 * Returns all learning objectives with full details
 */
router.get('/all', async (req, res) => {
  try {
    const sections = await syllabusService.parseSyllabus();
    res.json(sections);
  } catch (error) {
    console.error('Error fetching all objectives:', error);
    res.status(500).json({ error: 'Failed to fetch learning objectives' });
  }
});

export default router;
