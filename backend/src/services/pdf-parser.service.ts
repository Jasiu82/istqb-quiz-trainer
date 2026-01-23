import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ParsedQuestion {
  id: string;
  question: string;
  answers: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: string; // Can be 'A', 'B', 'C', 'D', or 'A,E' for multiple answers
  explanation: string;
  chapter: number;
  level: 'K1' | 'K2' | 'K3';
  learningObjective: string; // e.g., "FL-1.1.1"
  points: number;
  set: 'A' | 'B' | 'C' | 'D';
}

interface AnswerKey {
  [questionId: string]: {
    correct: string;
    learningObjective: string;
    level: 'K1' | 'K2' | 'K3';
    points: number;
  };
}

export class PDFParserService {
  private dataPath: string;

  constructor() {
    this.dataPath = path.resolve(__dirname, '../../../data/questions');
  }

  /**
   * Parse answer key from answers PDF
   */
  private async parseAnswerKey(set: 'A' | 'B' | 'C' | 'D'): Promise<AnswerKey> {
    const answersFile = this.getAnswersFilePath(set);
    const dataBuffer = fs.readFileSync(answersFile);
    const pdfParser = new PDFParse({ data: dataBuffer });
    const result = await pdfParser.getText();

    const answerKey: AnswerKey = {};

    // Find the answer key table (starts with "Nr pytania")
    const answerKeyPattern = /(\d+|A\d+)\s+([a-d](?:,\s*[a-e])?)\s+(FL-\d+\.\d+\.\d+)\s+(K[123])\s+(\d+)/g;

    let match;
    while ((match = answerKeyPattern.exec(result.text)) !== null) {
      const [, questionNum, correct, learningObj, level, points] = match;
      answerKey[questionNum] = {
        correct: correct.replace(/\s/g, '').toUpperCase(),
        learningObjective: learningObj,
        level: level as 'K1' | 'K2' | 'K3',
        points: parseInt(points)
      };
    }

    return answerKey;
  }

  /**
   * Parse questions from questions PDF
   */
  async parseQuestions(set: 'A' | 'B' | 'C' | 'D'): Promise<ParsedQuestion[]> {
    console.log(`📄 Parsing question set ${set}...`);

    const questionsFile = this.getQuestionsFilePath(set);
    const answerKey = await this.parseAnswerKey(set);

    const dataBuffer = fs.readFileSync(questionsFile);
    const pdfParser = new PDFParse({ data: dataBuffer });
    const result = await pdfParser.getText();

    const questions: ParsedQuestion[] = [];

    // Pattern to match questions
    // Pytanie nr X (1 p.)
    // Question text
    // a) Answer A
    // b) Answer B
    // c) Answer C
    // d) Answer D
    const questionPattern = /Pytanie nr (\d+|A\d+) \((\d+) p\.\)\s*\n([\s\S]*?)(?=Pytanie nr \d+|Pytanie nr A\d+|$)/g;

    let match;
    while ((match = questionPattern.exec(result.text)) !== null) {
      const [, questionNum, , content] = match;

      // Extract question text and answers
      const answerPattern = /^(.*?)\na\)\s*(.*?)\nb\)\s*(.*?)\nc\)\s*(.*?)\nd\)\s*(.*?)(?=\nWybierz|$)/s;
      const answerMatch = content.match(answerPattern);

      if (!answerMatch) {
        console.warn(`⚠️  Could not parse question ${questionNum}`);
        continue;
      }

      const [, questionText, ansA, ansB, ansC, ansD] = answerMatch;

      // Get answer key info
      const keyInfo = answerKey[questionNum];
      if (!keyInfo) {
        console.warn(`⚠️  No answer key found for question ${questionNum}`);
        continue;
      }

      // Extract chapter from learning objective (FL-X.Y.Z -> chapter X)
      const chapterMatch = keyInfo.learningObjective.match(/FL-(\d+)\./);
      const chapter = chapterMatch ? parseInt(chapterMatch[1]) : 1;

      // Map correct answer letter to full format (a -> A)
      const correctAnswers = keyInfo.correct.split(',').map(c => c.toUpperCase()).join(',');

      questions.push({
        id: `${set}-${questionNum}`,
        question: questionText.trim(),
        answers: {
          A: ansA.trim(),
          B: ansB.trim(),
          C: ansC.trim(),
          D: ansD.trim()
        },
        correct: correctAnswers,
        explanation: '', // Will be filled from detailed answers
        chapter,
        level: keyInfo.level,
        learningObjective: keyInfo.learningObjective,
        points: keyInfo.points,
        set
      });
    }

    console.log(`✅ Parsed ${questions.length} questions from set ${set}`);
    return questions;
  }

  /**
   * Parse all question sets
   */
  async parseAllQuestions(): Promise<ParsedQuestion[]> {
    const sets: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const allQuestions: ParsedQuestion[] = [];

    for (const set of sets) {
      try {
        const questions = await this.parseQuestions(set);
        allQuestions.push(...questions);
      } catch (error) {
        console.error(`❌ Error parsing set ${set}:`, error);
      }
    }

    return allQuestions;
  }

  private getQuestionsFilePath(set: 'A' | 'B' | 'C' | 'D'): string {
    const fileMap = {
      A: 'CTFL_4.0_Egzamin_przykladowy_zbior_A_v.1.61.0.0.3-PL.pdf',
      B: 'CTFL_4.0_Pytania_przykladowe_zbior_B_w.1.61.0.0.4-PL.pdf',
      C: 'CTFL_4.0_Pytania_przykladowe_zbior_C_w.1.51.0.0.4-PL.pdf',
      D: 'CTFL_4.0_Pytania_przykladowe_zbior_Dw-1.4_1.0.0.3-PL.pdf'
    };

    return path.join(this.dataPath, fileMap[set]);
  }

  private getAnswersFilePath(set: 'A' | 'B' | 'C' | 'D'): string {
    const fileMap = {
      A: 'CTFL-4.0_Egzamin-przykladowy-zbior-A-odpowiedzi_v.-1.61.0.0.5-PL.pdf',
      B: 'CTFL_4.0_Pytania_przykladowe_odpowiedzi_zbior_B_w.1.6_w.1.0.0.5-PL.pdf',
      C: 'CTFL_4.0_Pytania_przykladowe_odpowiedzi_zbior_C_w.1.5_w.1.0.0.4-PL.pdf',
      D: 'CTFL_4.0_pytania_przykladowe_odpowiedzi_zbior_D_w.1.4_1.0.0.2-PL.pdf'
    };

    return path.join(this.dataPath, fileMap[set]);
  }
}
