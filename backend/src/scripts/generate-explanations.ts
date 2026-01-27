/**
 * Script to generate explanations for all questions based on syllabus
 * Run with: npx ts-node --esm src/scripts/generate-explanations.ts
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionRow {
  id: string;
  question: string;
  correct: string;
  learning_objective: string;
  chapter: number;
  explanation: string | null;
}

async function generateExplanations() {
  console.log('🚀 Starting explanation generation...\n');

  // Open database
  const dbPath = path.resolve(__dirname, '../../../data/questions.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Initialize syllabus parser
  const syllabusService = new SyllabusParserService();
  await syllabusService.parseSyllabus();

  // Get all questions
  const questions = await db.all<QuestionRow[]>(
    'SELECT id, question, correct, learning_objective, chapter, explanation FROM questions'
  );

  console.log(`📝 Found ${questions.length} questions to process\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of questions) {
    try {
      // Get syllabus section for this learning objective
      const section = await syllabusService.getSectionByLearningObjective(q.learning_objective);

      if (!section) {
        console.log(`⚠️  No syllabus section found for ${q.id} (${q.learning_objective})`);
        skipped++;
        continue;
      }

      // Generate explanation
      const explanation = generateExplanationText(section, q.correct);

      // Update database
      await db.run(
        'UPDATE questions SET explanation = ? WHERE id = ?',
        [explanation, q.id]
      );

      updated++;
      console.log(`✅ Updated ${q.id} (${q.learning_objective})`);

    } catch (error) {
      console.error(`❌ Error processing ${q.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);

  await db.close();
  console.log('\n✅ Done!');
}

function generateExplanationText(
  section: { learningObjective: string; level: string; description: string; content: string; chapter: number; section: number },
  correctAnswer: string
): string {
  const levelDescriptions: Record<string, string> = {
    'K1': 'Zapamiętaj',
    'K2': 'Zrozum',
    'K3': 'Zastosuj'
  };

  const levelDesc = levelDescriptions[section.level] || section.level;

  // Clean and truncate content
  let content = section.content
    .replace(/\s+/g, ' ')
    .trim();

  // Limit content to reasonable length
  if (content.length > 600) {
    content = content.substring(0, 600) + '...';
  }

  return `📖 **Z sylabusa ISTQB (${section.learningObjective}):**
Poziom: ${section.level} (${levelDesc})

**${section.description}**

${content}

📚 _Rozdział ${section.chapter}, Sekcja ${section.chapter}.${section.section}_

Poprawna odpowiedź: **${correctAnswer}**`;
}

// Run the script
generateExplanations().catch(console.error);
