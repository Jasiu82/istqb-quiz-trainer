// ====================================
// ISTQB Quiz Trainer - Type Definitions
// ====================================

// Question types
export interface Question {
  question: string;
  answers: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: string;
  explanation: string;
  chapter: number;
  level: string;
}

// Statistics types
export interface QuizStatistics {
  total: number;
  byChapter: Record<number, number>;
  byLevel: Record<string, number>;
  bySet: Record<string, number>;
}

export interface UserStatistics {
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  masteredQuestions: number;
  averageStrikes: number;
  progressByChapter: Record<number, { attempted: number; mastered: number }>;
}

export interface QuestionProgress {
  attempts: number;
  strikes: number;
  mastered: boolean;
  lastAnswer: string | null;
}

// Syllabus types
export interface SyllabusSection {
  learningObjective: string;
  chapter: number;
  section: number;
  subsection: number;
  level: 'K1' | 'K2' | 'K3';
  description: string;
  content: string;
  relatedQuestions?: number;
}

export interface Chapter {
  chapter: number;
  title: string;
  objectives: string[];
  count: number;
}

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

// Exam types
export interface ExamResult {
  id: number;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  percentage: number;
  passed: boolean;
  timeRemainingSeconds: number;
}

export interface ExamStatistics {
  totalExams: number;
  passedExams: number;
  failedExams: number;
  averageScore: number;
  bestScore: number;
  latestExam: {
    startedAt: string;
    finishedAt: string;
    correctAnswers: number;
    percentage: number;
    passed: boolean;
  } | null;
}

// Progress types
export interface ChapterProgress {
  chapter: number;
  title: string;
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  correctRate: number;
  averageStrikes: number;
}

export interface KLevelStats {
  level: 'K1' | 'K2' | 'K3';
  description: string;
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  correctRate: number;
  averageStrikes: number;
}

export interface WeakArea {
  learningObjective: string;
  description: string;
  chapter: number;
  strikes: number;
  attempts: number;
  correctRate: number;
}

export interface StrongArea {
  learningObjective: string;
  description: string;
  chapter: number;
  masteredQuestions: number;
  correctRate: number;
}

export interface ReadinessScore {
  score: number;
  factors: {
    questionCoverage: number;
    examExperience: number;
    recentAccuracy: number;
    consistency: number;
  };
  level: 'beginner' | 'intermediate' | 'advanced' | 'ready';
  message: string;
}
