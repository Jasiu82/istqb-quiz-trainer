import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeSyllabus() {
  const syllabusPath = path.resolve(
    __dirname,
    '../../../data/syllabus/ISTQB_CertyfikowanyTester_PoziomPodstawowy_v4.0.1.pdf'
  );

  console.log('📄 Analyzing Syllabus PDF:', syllabusPath);

  const dataBuffer = fs.readFileSync(syllabusPath);
  const pdfParser = new PDFParse({ data: dataBuffer });
  const result = await pdfParser.getText();

  console.log('\n📊 PDF Metadata:');
  console.log('- Pages:', result.total);
  console.log('- Text length:', result.text.length);

  // Find learning objectives pattern (FL-X.Y.Z)
  const loPattern = /FL-(\d+)\.(\d+)\.(\d+)/g;
  const matches = [...result.text.matchAll(loPattern)];

  console.log('\n📝 Found learning objectives:', matches.length);

  // Show first 10 learning objectives with context
  console.log('\n=== Sample Learning Objectives ===');
  matches.slice(0, 10).forEach((match, idx) => {
    const startPos = match.index! - 50;
    const endPos = match.index! + 200;
    console.log(`\n${idx + 1}. ${match[0]}`);
    console.log('Context:', result.text.substring(startPos, endPos).replace(/\n/g, ' '));
  });

  // Find chapter headings
  console.log('\n\n=== Looking for Chapter Structure ===');
  const chapterPattern = /(?:Rozdział\s+\d+|Chapter\s+\d+)[^\n]*/gi;
  const chapterMatches = [...result.text.matchAll(chapterPattern)];

  console.log(`Found ${chapterMatches.length} chapter markers`);
  chapterMatches.slice(0, 10).forEach((match) => {
    console.log('-', match[0]);
  });

  // Sample first 2 pages
  console.log('\n\n=== Page 10 Sample ===');
  if (result.pages[9]) {
    console.log(result.pages[9].text.substring(0, 1000));
  }
}

analyzeSyllabus().catch(console.error);
