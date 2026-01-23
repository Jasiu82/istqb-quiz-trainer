import { PDFParserService } from '../services/pdf-parser.service.js';

async function testParser() {
  console.log('🧪 Testing PDF Parser Service\n');

  const parser = new PDFParserService();

  // Test parsing set A
  console.log('=== Testing Set A ===');
  const questionsA = await parser.parseQuestions('A');

  console.log(`\n📊 Parsed ${questionsA.length} questions`);

  // Show first 3 questions
  console.log('\n=== Sample Questions ===');
  questionsA.slice(0, 3).forEach((q, idx) => {
    console.log(`\n--- Question ${idx + 1} ---`);
    console.log('ID:', q.id);
    console.log('Question:', q.question.substring(0, 100) + '...');
    console.log('Chapter:', q.chapter);
    console.log('Level:', q.level);
    console.log('Correct:', q.correct);
    console.log('Learning Objective:', q.learningObjective);
    console.log('Answers:');
    console.log('  A:', q.answers.A.substring(0, 60) + '...');
    console.log('  B:', q.answers.B.substring(0, 60) + '...');
    console.log('  C:', q.answers.C.substring(0, 60) + '...');
    console.log('  D:', q.answers.D.substring(0, 60) + '...');
  });

  // Count by chapter
  console.log('\n=== Questions by Chapter ===');
  const byChapter = questionsA.reduce((acc, q) => {
    acc[q.chapter] = (acc[q.chapter] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log(byChapter);

  // Count by level
  console.log('\n=== Questions by Level ===');
  const byLevel = questionsA.reduce((acc, q) => {
    acc[q.level] = (acc[q.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(byLevel);
}

testParser().catch(console.error);
