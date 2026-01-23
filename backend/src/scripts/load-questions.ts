import { PDFParserService } from '../services/pdf-parser.service.js';
import { DatabaseService } from '../services/database.service.js';

async function loadQuestions() {
  console.log('🚀 Starting question import process\n');

  const parser = new PDFParserService();
  const db = new DatabaseService();

  try {
    // Initialize database
    console.log('📦 Initializing database...');
    await db.initialize();

    // Parse all questions from PDFs
    console.log('\n📄 Parsing questions from PDFs...');
    const questions = await parser.parseAllQuestions();

    console.log(`\n✅ Total questions parsed: ${questions.length}`);

    // Insert into database
    console.log('\n💾 Inserting questions into database...');
    await db.bulkInsertQuestions(questions);

    // Show statistics
    console.log('\n📊 Database Statistics:');
    const stats = await db.getStatistics();
    console.log('Total questions:', stats.total);
    console.log('By chapter:', stats.byChapter);
    console.log('By level:', stats.byLevel);
    console.log('By set:', stats.bySet);

    // Test random question
    console.log('\n🎲 Testing random question retrieval...');
    const randomQuestion = await db.getRandomQuestion(1, 'K2');
    if (randomQuestion) {
      console.log('\nSample question (Chapter 1, Level K2):');
      console.log('ID:', randomQuestion.id);
      console.log('Question:', randomQuestion.question.substring(0, 100) + '...');
      console.log('Correct answer:', randomQuestion.correct);
    }

    console.log('\n✅ Question import completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during import:', error);
    throw error;
  } finally {
    await db.close();
  }
}

loadQuestions().catch(console.error);
