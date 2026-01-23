import { Router } from 'express';
import { generateQuestion } from '../services/ai.service.js';
import { DatabaseService } from '../services/database.service.js';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';
import { RecommendationsService } from '../services/recommendations.service.js';

const router = Router();

// Initialize services (singleton pattern)
let dbService: DatabaseService | null = null;
let syllabusService: SyllabusParserService | null = null;
let recommendationsService: RecommendationsService | null = null;

async function getDbService(): Promise<DatabaseService> {
  if (!dbService) {
    dbService = new DatabaseService();
    await dbService.initialize();
  }
  return dbService;
}

function getSyllabusService(): SyllabusParserService {
  if (!syllabusService) {
    syllabusService = new SyllabusParserService();
  }
  return syllabusService;
}

async function getRecommendationsService(): Promise<RecommendationsService> {
  if (!recommendationsService) {
    const db = await getDbService();
    recommendationsService = new RecommendationsService(db);
  }
  return recommendationsService;
}

router.get('/question', async (req, res) => {
  try {
    const chapter = req.query.chapter ? parseInt(req.query.chapter as string) : undefined;
    const level = (req.query.level as 'K1' | 'K2' | 'K3') || undefined;
    const useAI = req.query.useAI === 'true';

    // If useAI flag is set, use Claude API
    if (useAI) {
      console.log('🤖 Generating question using Claude API...');
      const question = await generateQuestion(chapter || 1, level || 'K2');
      return res.json(question);
    }

    // Otherwise, use database (official ISTQB questions)
    const db = await getDbService();
    const question = await db.getRandomQuestion(chapter, level);

    if (!question) {
      return res.status(404).json({
        error: 'No questions found matching the criteria',
        hint: 'Try different chapter/level or use ?useAI=true to generate questions'
      });
    }

    // Get enhanced explanation with syllabus excerpt
    const syllabusService = getSyllabusService();
    const enhancedExplanation = await syllabusService.getEnhancedExplanation(
      question.learningObjective,
      question.explanation
    );

    // Format response to match frontend expectations
    res.json({
      question: question.question,
      answers: question.answers,
      correct: question.correct,
      explanation: enhancedExplanation,
      chapter: question.chapter,
      level: question.level
    });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Get question statistics
router.get('/stats', async (_req, res) => {
  try {
    const db = await getDbService();
    const stats = await db.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Record answer attempt (3-strike system)
router.post('/answer', async (req, res) => {
  try {
    const { questionId, userAnswer, isCorrect, userId = 'default' } = req.body;

    if (!questionId || !userAnswer || typeof isCorrect !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: questionId, userAnswer, isCorrect'
      });
    }

    const db = await getDbService();
    const result = await db.recordAttempt(questionId, userAnswer, isCorrect, userId);

    res.json({
      success: true,
      strikes: result.strikes,
      mastered: result.mastered,
      message: result.strikes >= 3
        ? 'Trzecia niepoprawna odpowiedź - pytanie będzie się pojawiać częściej'
        : result.mastered
        ? 'Pytanie opanowane!'
        : `Niepoprawna odpowiedź (${result.strikes}/3 błędów)`
    });
  } catch (error) {
    console.error('Error recording answer:', error);
    res.status(500).json({ error: 'Failed to record answer' });
  }
});

// Get user progress for a specific question
router.get('/progress/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    const progress = await db.getUserProgress(questionId, userId);

    res.json(progress || { attempts: 0, strikes: 0, mastered: false, lastAnswer: null });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get overall user statistics
router.get('/user-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    const stats = await db.getUserStatistics(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Reset user progress (for testing)
router.delete('/progress', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    await db.resetUserProgress(userId);

    res.json({ success: true, message: 'User progress reset successfully' });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// Get 40 questions for exam mode
router.get('/exam-questions', async (_req, res) => {
  try {
    const db = await getDbService();
    const questions = await db.getQuestions(undefined, undefined, 40);

    if (questions.length < 40) {
      return res.status(404).json({
        error: 'Not enough questions in database',
        available: questions.length
      });
    }

    // Get syllabus service for enhanced explanations
    const syllabusService = getSyllabusService();

    // Format response with enhanced explanations
    const formattedQuestions = await Promise.all(
      questions.map(async (q) => ({
        id: q.id,
        question: q.question,
        answers: q.answers,
        correct: q.correct,
        explanation: await syllabusService.getEnhancedExplanation(
          q.learningObjective,
          q.explanation
        ),
        chapter: q.chapter,
        level: q.level
      }))
    );

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Error getting exam questions:', error);
    res.status(500).json({ error: 'Failed to get exam questions' });
  }
});

// Save exam results
router.post('/exam-results', async (req, res) => {
  try {
    const {
      userId = 'default',
      startedAt,
      finishedAt,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      timeRemainingSeconds
    } = req.body;

    if (!startedAt || !finishedAt || typeof correctAnswers !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: startedAt, finishedAt, correctAnswers'
      });
    }

    const db = await getDbService();
    const examId = await db.saveExamResults(userId, {
      startedAt: new Date(startedAt),
      finishedAt: new Date(finishedAt),
      correctAnswers,
      incorrectAnswers,
      unanswered,
      timeRemainingSeconds
    });

    res.json({
      success: true,
      examId,
      message: 'Exam results saved successfully'
    });
  } catch (error) {
    console.error('Error saving exam results:', error);
    res.status(500).json({ error: 'Failed to save exam results' });
  }
});

// Get exam history
router.get('/exam-history', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const db = await getDbService();
    const history = await db.getExamHistory(userId, limit);

    res.json(history);
  } catch (error) {
    console.error('Error getting exam history:', error);
    res.status(500).json({ error: 'Failed to get exam history' });
  }
});

// Get exam statistics
router.get('/exam-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    const stats = await db.getExamStatistics(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting exam statistics:', error);
    res.status(500).json({ error: 'Failed to get exam statistics' });
  }
});

// Get study recommendations based on user progress
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const recommendationsService = await getRecommendationsService();
    const recommendations = await recommendationsService.getRecommendations(userId, limit);

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Add bookmark
router.post('/bookmark', async (req, res) => {
  try {
    const { learningObjective, userId = 'default' } = req.body;

    if (!learningObjective) {
      return res.status(400).json({ error: 'learningObjective is required' });
    }

    const db = await getDbService();
    await db.addBookmark(learningObjective, userId);

    res.json({ success: true, message: 'Bookmark added successfully' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Remove bookmark
router.delete('/bookmark', async (req, res) => {
  try {
    const { learningObjective, userId = 'default' } = req.body;

    if (!learningObjective) {
      return res.status(400).json({ error: 'learningObjective is required' });
    }

    const db = await getDbService();
    await db.removeBookmark(learningObjective, userId);

    res.json({ success: true, message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Get all bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    const bookmarks = await db.getBookmarks(userId);

    res.json(bookmarks);
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// Get weakest areas (topics with highest strikes)
router.get('/weakest-areas', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const db = await getDbService();
    const dbInstance = await db.getDb();

    const weakAreas = await dbInstance.all(`
      SELECT
        q.learning_objective,
        q.chapter,
        SUM(up.strikes) as total_strikes,
        COUNT(DISTINCT up.question_id) as attempts,
        SUM(CASE WHEN up.mastered = 1 THEN 1 ELSE 0 END) as mastered_count,
        COUNT(DISTINCT up.question_id) as total_attempted
      FROM user_progress up
      JOIN questions q ON up.question_id = q.id
      WHERE up.user_id = ? AND q.learning_objective IS NOT NULL
      GROUP BY q.learning_objective
      HAVING total_strikes > 0
      ORDER BY total_strikes DESC, attempts DESC
      LIMIT ?
    `, [userId, limit]);

    const syllabusService = getSyllabusService();
    const result = await Promise.all(weakAreas.map(async (area: any) => {
      const section = await syllabusService.getSectionByLearningObjective(area.learning_objective);
      const correctRate = area.mastered_count > 0
        ? (area.mastered_count / area.total_attempted) * 100
        : 0;

      return {
        learningObjective: area.learning_objective,
        description: section?.description || 'No description',
        chapter: area.chapter,
        strikes: area.total_strikes,
        attempts: area.attempts,
        correctRate: Math.round(correctRate)
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error getting weakest areas:', error);
    res.status(500).json({ error: 'Failed to get weakest areas' });
  }
});

// Get readiness score data
router.get('/readiness', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default';

    const db = await getDbService();
    const dbInstance = await db.getDb();

    // Get user progress stats
    const stats = await db.getUserStatistics(userId);
    const examStats = await db.getExamStatistics(userId);

    // Get total questions in database
    const totalQuestionsResult = await dbInstance.get('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = totalQuestionsResult.count;

    // Calculate recent accuracy (last 20 questions)
    const recentAttempts = await dbInstance.all(`
      SELECT mastered
      FROM user_progress
      WHERE user_id = ?
      ORDER BY last_attempt_at DESC
      LIMIT 20
    `, [userId]);

    const recentCorrect = recentAttempts.filter((a: any) => a.mastered === 1).length;
    const recentAccuracy = recentAttempts.length > 0
      ? recentCorrect / recentAttempts.length
      : 0;

    // Calculate average strikes
    const avgStrikesResult = await dbInstance.get(`
      SELECT AVG(strikes) as avg_strikes
      FROM user_progress
      WHERE user_id = ? AND attempts > 0
    `, [userId]);

    const averageStrikes = avgStrikesResult?.avg_strikes || 0;

    res.json({
      totalQuestions,
      masteredQuestions: stats?.masteredQuestions || 0,
      totalExams: examStats.totalExams,
      passedExams: examStats.passedExams,
      recentAccuracy,
      averageStrikes
    });
  } catch (error) {
    console.error('Error calculating readiness:', error);
    res.status(500).json({ error: 'Failed to calculate readiness' });
  }
});

export default router;