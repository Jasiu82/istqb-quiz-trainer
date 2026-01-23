import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { ParsedQuestion } from './pdf-parser.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.resolve(__dirname, '../../../data/questions.db');
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.createTables();
    console.log('✅ Database initialized at:', this.dbPath);
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer_a TEXT NOT NULL,
        answer_b TEXT NOT NULL,
        answer_c TEXT NOT NULL,
        answer_d TEXT NOT NULL,
        correct TEXT NOT NULL,
        explanation TEXT,
        chapter INTEGER NOT NULL,
        level TEXT NOT NULL,
        learning_objective TEXT NOT NULL,
        points INTEGER NOT NULL,
        set_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_chapter ON questions(chapter);
      CREATE INDEX IF NOT EXISTS idx_level ON questions(level);
      CREATE INDEX IF NOT EXISTS idx_set ON questions(set_name);

      -- User progress tracking table
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT 'default',
        question_id TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        incorrect_count INTEGER NOT NULL DEFAULT 0,
        last_answer TEXT,
        last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        mastered BOOLEAN DEFAULT 0,
        strikes INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES questions(id),
        UNIQUE(user_id, question_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_progress ON user_progress(user_id, question_id);
      CREATE INDEX IF NOT EXISTS idx_mastered ON user_progress(mastered);

      -- Exam history tracking table
      CREATE TABLE IF NOT EXISTS exam_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT 'default',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        duration_seconds INTEGER,
        total_questions INTEGER NOT NULL DEFAULT 40,
        correct_answers INTEGER NOT NULL,
        incorrect_answers INTEGER NOT NULL,
        unanswered INTEGER NOT NULL,
        percentage REAL NOT NULL,
        passed BOOLEAN NOT NULL,
        time_remaining_seconds INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_exam_history_user ON exam_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_exam_history_date ON exam_history(started_at);

      -- Bookmarks table for saving favorite learning objectives
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT 'default',
        learning_objective TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, learning_objective)
      );

      CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    `);
  }

  /**
   * Insert or update a question
   */
  async upsertQuestion(question: ParsedQuestion): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT OR REPLACE INTO questions
       (id, question, answer_a, answer_b, answer_c, answer_d, correct,
        explanation, chapter, level, learning_objective, points, set_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question.id,
        question.question,
        question.answers.A,
        question.answers.B,
        question.answers.C,
        question.answers.D,
        question.correct,
        question.explanation,
        question.chapter,
        question.level,
        question.learningObjective,
        question.points,
        question.set
      ]
    );
  }

  /**
   * Bulk insert questions
   */
  async bulkInsertQuestions(questions: ParsedQuestion[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('BEGIN TRANSACTION');

    try {
      for (const question of questions) {
        await this.upsertQuestion(question);
      }
      await this.db.run('COMMIT');
      console.log(`✅ Inserted ${questions.length} questions into database`);
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get random question by filters
   */
  async getRandomQuestion(chapter?: number, level?: string): Promise<ParsedQuestion | null> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (chapter) {
      query += ' AND chapter = ?';
      params.push(chapter);
    }

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const row = await this.db.get(query, params);

    if (!row) return null;

    return this.rowToQuestion(row);
  }

  /**
   * Get questions by chapter and level
   */
  async getQuestions(chapter?: number, level?: string, limit: number = 40): Promise<ParsedQuestion[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (chapter) {
      query += ' AND chapter = ?';
      params.push(chapter);
    }

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);

    const rows = await this.db.all(query, params);

    return rows.map(row => this.rowToQuestion(row));
  }

  /**
   * Get question count by filters
   */
  async getQuestionCount(chapter?: number, level?: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT COUNT(*) as count FROM questions WHERE 1=1';
    const params: any[] = [];

    if (chapter) {
      query += ' AND chapter = ?';
      params.push(chapter);
    }

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    const result = await this.db.get(query, params);
    return result?.count || 0;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byChapter: Record<number, number>;
    byLevel: Record<string, number>;
    bySet: Record<string, number>;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const total = await this.db.get('SELECT COUNT(*) as count FROM questions');

    const byChapter = await this.db.all(
      'SELECT chapter, COUNT(*) as count FROM questions GROUP BY chapter ORDER BY chapter'
    );

    const byLevel = await this.db.all(
      'SELECT level, COUNT(*) as count FROM questions GROUP BY level ORDER BY level'
    );

    const bySet = await this.db.all(
      'SELECT set_name, COUNT(*) as count FROM questions GROUP BY set_name ORDER BY set_name'
    );

    return {
      total: total.count,
      byChapter: byChapter.reduce((acc, row) => {
        acc[row.chapter] = row.count;
        return acc;
      }, {} as Record<number, number>),
      byLevel: byLevel.reduce((acc, row) => {
        acc[row.level] = row.count;
        return acc;
      }, {} as Record<string, number>),
      bySet: bySet.reduce((acc, row) => {
        acc[row.set_name] = row.count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Convert database row to ParsedQuestion
   */
  private rowToQuestion(row: any): ParsedQuestion {
    return {
      id: row.id,
      question: row.question,
      answers: {
        A: row.answer_a,
        B: row.answer_b,
        C: row.answer_c,
        D: row.answer_d
      },
      correct: row.correct,
      explanation: row.explanation || '',
      chapter: row.chapter,
      level: row.level,
      learningObjective: row.learning_objective,
      points: row.points,
      set: row.set_name
    };
  }

  /**
   * Record user answer attempt (3-strike system)
   */
  async recordAttempt(
    questionId: string,
    userAnswer: string,
    isCorrect: boolean,
    userId: string = 'default'
  ): Promise<{ strikes: number; mastered: boolean }> {
    if (!this.db) throw new Error('Database not initialized');

    // Get or create progress record
    const existing = await this.db.get(
      'SELECT * FROM user_progress WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );

    if (!existing) {
      // First attempt - insert new record
      await this.db.run(
        `INSERT INTO user_progress
         (user_id, question_id, attempts, correct_count, incorrect_count, last_answer, strikes, mastered)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
        [
          userId,
          questionId,
          isCorrect ? 1 : 0,
          isCorrect ? 0 : 1,
          userAnswer,
          isCorrect ? 0 : 1,
          isCorrect
        ]
      );

      return { strikes: isCorrect ? 0 : 1, mastered: isCorrect };
    } else {
      // Update existing record
      const newStrikes = isCorrect ? 0 : existing.strikes + 1;
      const newMastered = isCorrect || existing.mastered;

      await this.db.run(
        `UPDATE user_progress
         SET attempts = attempts + 1,
             correct_count = correct_count + ?,
             incorrect_count = incorrect_count + ?,
             last_answer = ?,
             last_attempt_at = CURRENT_TIMESTAMP,
             strikes = ?,
             mastered = ?
         WHERE user_id = ? AND question_id = ?`,
        [
          isCorrect ? 1 : 0,
          isCorrect ? 0 : 1,
          userAnswer,
          newStrikes,
          newMastered ? 1 : 0,
          userId,
          questionId
        ]
      );

      return { strikes: newStrikes, mastered: newMastered };
    }
  }

  /**
   * Get user progress for a question
   */
  async getUserProgress(questionId: string, userId: string = 'default'): Promise<{
    attempts: number;
    strikes: number;
    mastered: boolean;
    lastAnswer: string | null;
  } | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM user_progress WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );

    if (!row) return null;

    return {
      attempts: row.attempts,
      strikes: row.strikes,
      mastered: row.mastered === 1,
      lastAnswer: row.last_answer
    };
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string = 'default'): Promise<{
    totalAttempts: number;
    correctAnswers: number;
    incorrectAnswers: number;
    masteredQuestions: number;
    averageStrikes: number;
    progressByChapter: Record<number, { attempted: number; mastered: number }>;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const overall = await this.db.get(
      `SELECT
         COUNT(*) as total_attempts,
         SUM(correct_count) as correct,
         SUM(incorrect_count) as incorrect,
         SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) as mastered,
         AVG(strikes) as avg_strikes
       FROM user_progress
       WHERE user_id = ?`,
      [userId]
    );

    const byChapter = await this.db.all(
      `SELECT
         q.chapter,
         COUNT(DISTINCT up.question_id) as attempted,
         SUM(CASE WHEN up.mastered = 1 THEN 1 ELSE 0 END) as mastered
       FROM user_progress up
       JOIN questions q ON up.question_id = q.id
       WHERE up.user_id = ?
       GROUP BY q.chapter
       ORDER BY q.chapter`,
      [userId]
    );

    return {
      totalAttempts: overall?.total_attempts || 0,
      correctAnswers: overall?.correct || 0,
      incorrectAnswers: overall?.incorrect || 0,
      masteredQuestions: overall?.mastered || 0,
      averageStrikes: overall?.avg_strikes || 0,
      progressByChapter: byChapter.reduce((acc, row) => {
        acc[row.chapter] = {
          attempted: row.attempted,
          mastered: row.mastered
        };
        return acc;
      }, {} as Record<number, { attempted: number; mastered: number }>)
    };
  }

  /**
   * Reset user progress (for testing or new start)
   */
  async resetUserProgress(userId: string = 'default'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('DELETE FROM user_progress WHERE user_id = ?', [userId]);
  }

  /**
   * Save exam results to history
   */
  async saveExamResults(
    userId: string = 'default',
    results: {
      startedAt: Date;
      finishedAt: Date;
      correctAnswers: number;
      incorrectAnswers: number;
      unanswered: number;
      timeRemainingSeconds: number;
    }
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const durationSeconds = Math.floor(
      (results.finishedAt.getTime() - results.startedAt.getTime()) / 1000
    );
    const totalQuestions = 40;
    const percentage = (results.correctAnswers / totalQuestions) * 100;
    const passed = percentage >= 65;

    const result = await this.db.run(
      `INSERT INTO exam_history
       (user_id, started_at, finished_at, duration_seconds, total_questions,
        correct_answers, incorrect_answers, unanswered, percentage, passed, time_remaining_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        results.startedAt.toISOString(),
        results.finishedAt.toISOString(),
        durationSeconds,
        totalQuestions,
        results.correctAnswers,
        results.incorrectAnswers,
        results.unanswered,
        percentage,
        passed ? 1 : 0,
        results.timeRemainingSeconds
      ]
    );

    return result.lastID!;
  }

  /**
   * Get exam history for user
   */
  async getExamHistory(userId: string = 'default', limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all(
      `SELECT * FROM exam_history
       WHERE user_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return results.map(row => ({
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      durationSeconds: row.duration_seconds,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      incorrectAnswers: row.incorrect_answers,
      unanswered: row.unanswered,
      percentage: row.percentage,
      passed: row.passed === 1,
      timeRemainingSeconds: row.time_remaining_seconds
    }));
  }

  /**
   * Get exam statistics summary
   */
  async getExamStatistics(userId: string = 'default'): Promise<{
    totalExams: number;
    passedExams: number;
    failedExams: number;
    averageScore: number;
    bestScore: number;
    latestExam: any | null;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.get(
      `SELECT
         COUNT(*) as total_exams,
         SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_exams,
         AVG(percentage) as avg_score,
         MAX(percentage) as best_score
       FROM exam_history
       WHERE user_id = ?`,
      [userId]
    );

    const latestExam = await this.db.get(
      `SELECT * FROM exam_history
       WHERE user_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    return {
      totalExams: stats?.total_exams || 0,
      passedExams: stats?.passed_exams || 0,
      failedExams: (stats?.total_exams || 0) - (stats?.passed_exams || 0),
      averageScore: stats?.avg_score || 0,
      bestScore: stats?.best_score || 0,
      latestExam: latestExam ? {
        startedAt: latestExam.started_at,
        finishedAt: latestExam.finished_at,
        correctAnswers: latestExam.correct_answers,
        percentage: latestExam.percentage,
        passed: latestExam.passed === 1
      } : null
    };
  }

  /**
   * Get database instance (for advanced queries)
   */
  async getDb(): Promise<Database> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  /**
   * Add bookmark for a learning objective
   */
  async addBookmark(learningObjective: string, userId: string = 'default'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT OR IGNORE INTO bookmarks (user_id, learning_objective)
       VALUES (?, ?)`,
      [userId, learningObjective]
    );
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(learningObjective: string, userId: string = 'default'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `DELETE FROM bookmarks WHERE user_id = ? AND learning_objective = ?`,
      [userId, learningObjective]
    );
  }

  /**
   * Get all bookmarks for user
   */
  async getBookmarks(userId: string = 'default'): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all(
      `SELECT learning_objective FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return results.map(row => row.learning_objective);
  }

  /**
   * Check if learning objective is bookmarked
   */
  async isBookmarked(learningObjective: string, userId: string = 'default'): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.get(
      `SELECT 1 FROM bookmarks WHERE user_id = ? AND learning_objective = ?`,
      [userId, learningObjective]
    );

    return !!result;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
