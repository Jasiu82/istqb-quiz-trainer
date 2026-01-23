import { DatabaseService } from './database.service.js';
import { SyllabusParserService } from './syllabus-parser.service.js';

export interface Recommendation {
  learningObjective: string;
  description: string;
  chapter: number;
  level: string;
  reason: string;
  strikes: number;
  attempts: number;
  questionsAvailable: number;
}

export class RecommendationsService {
  private dbService: DatabaseService;
  private syllabusService: SyllabusParserService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.syllabusService = new SyllabusParserService();
  }

  /**
   * Get personalized study recommendations based on user progress
   */
  async getRecommendations(userId: string = 'default', limit: number = 5): Promise<Recommendation[]> {
    try {
      // Get user statistics to identify weak areas
      const stats = await this.dbService.getUserStatistics(userId);

      if (!stats) {
        return [];
      }

      // Get all learning objectives from syllabus
      const sections = await this.syllabusService.parseSyllabus();

      // Get user progress for all questions
      const db = await this.dbService['getDb']();
      const progressData = await db.all(`
        SELECT
          q.learning_objective,
          COUNT(*) as question_count,
          SUM(up.strikes) as total_strikes,
          SUM(up.attempts) as total_attempts,
          AVG(up.strikes) as avg_strikes,
          SUM(CASE WHEN up.mastered = 1 THEN 1 ELSE 0 END) as mastered_count
        FROM questions q
        LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = ?
        WHERE q.learning_objective IS NOT NULL AND q.learning_objective != ''
        GROUP BY q.learning_objective
        HAVING avg_strikes > 1 OR (mastered_count = 0 AND total_attempts > 0)
        ORDER BY avg_strikes DESC, total_attempts DESC
        LIMIT ?
      `, [userId, limit * 2]);

      // Build recommendations
      const recommendations: Recommendation[] = [];

      for (const data of progressData) {
        const section = await this.syllabusService.getSectionByLearningObjective(data.learning_objective);

        if (!section) continue;

        const avgStrikes = data.avg_strikes || 0;
        const attempts = data.total_attempts || 0;
        const masteredCount = data.mastered_count || 0;
        const totalQuestions = data.question_count || 0;

        let reason = '';
        if (avgStrikes >= 3) {
          reason = `Wysoka liczba błędów (średnio ${avgStrikes.toFixed(1)} błędów na pytanie)`;
        } else if (avgStrikes >= 2) {
          reason = `Wymagana powtórka (średnio ${avgStrikes.toFixed(1)} błędów)`;
        } else if (masteredCount === 0 && attempts > 0) {
          reason = `${attempts} prób, żadne pytanie nie opanowane`;
        } else {
          reason = `Zalecana powtórka`;
        }

        recommendations.push({
          learningObjective: section.learningObjective,
          description: section.description,
          chapter: section.chapter,
          level: section.level,
          reason,
          strikes: data.total_strikes || 0,
          attempts: attempts,
          questionsAvailable: totalQuestions
        });

        if (recommendations.length >= limit) break;
      }

      // If we don't have enough recommendations from weak areas, suggest untouched topics
      if (recommendations.length < limit) {
        const untouchedSections = await this.getUntouchedSections(userId, limit - recommendations.length);
        recommendations.push(...untouchedSections);
      }

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Get learning objectives that the user hasn't practiced yet
   */
  private async getUntouchedSections(userId: string, limit: number): Promise<Recommendation[]> {
    try {
      const db = await this.dbService['getDb']();

      // Get learning objectives that have questions but no user progress
      const untouchedData = await db.all(`
        SELECT
          q.learning_objective,
          COUNT(*) as question_count
        FROM questions q
        WHERE q.learning_objective NOT IN (
          SELECT DISTINCT questions.learning_objective
          FROM questions
          INNER JOIN user_progress up ON questions.id = up.question_id
          WHERE up.user_id = ?
        )
        GROUP BY q.learning_objective
        LIMIT ?
      `, [userId, limit]);

      const recommendations: Recommendation[] = [];

      for (const data of untouchedData) {
        const section = await this.syllabusService.getSectionByLearningObjective(data.learning_objective);

        if (!section) continue;

        recommendations.push({
          learningObjective: section.learningObjective,
          description: section.description,
          chapter: section.chapter,
          level: section.level,
          reason: 'Nowy temat do nauki',
          strikes: 0,
          attempts: 0,
          questionsAvailable: data.question_count
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting untouched sections:', error);
      return [];
    }
  }
}
