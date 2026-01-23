import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzePDF() {
  const pdfPath = path.resolve(__dirname, '../../../data/questions/CTFL_4.0_Egzamin_przykladowy_zbior_A_v.1.61.0.0.3-PL.pdf');

  console.log('📄 Analyzing PDF:', pdfPath);

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfParser = new PDFParse({ data: dataBuffer });
  const result = await pdfParser.getText();

  console.log('\n📊 PDF Metadata:');
  console.log('- Pages:', result.total);

  // Find where questions start (after header pages)
  const questionStartPattern = /Pytanie.*?nr.*?(\d+)/i;
  const matches = [...result.text.matchAll(new RegExp(questionStartPattern, 'gi'))];

  console.log('\n📝 Found question markers:', matches.length);
  if (matches.length > 0) {
    console.log('First question position:', matches[0].index);
    console.log('Sample around first question:');
    console.log(result.text.substring(matches[0].index! - 100, matches[0].index! + 500));
  }

  // Look for actual question content (after TOC)
  console.log('\n\n📝 Searching for actual question content...');

  // Find "Pytanie nr 1" followed by actual question text
  const q1Pattern = /Pytanie nr 1.*?\n(.*?)\na\)(.*?)\nb\)(.*?)\nc\)(.*?)\nd\)(.*?)(?=\n\n|Pytanie nr 2|$)/s;
  const q1Match = result.text.match(q1Pattern);

  if (q1Match) {
    console.log('Found Question 1 structure:');
    console.log('Question:', q1Match[1]?.substring(0, 200));
    console.log('Answer a):', q1Match[2]?.substring(0, 100));
    console.log('Answer b):', q1Match[3]?.substring(0, 100));
  }

  // Let's check specific pages where questions actually are
  console.log('\n\n📝 Pages content:');

  // Page 8 should have first questions (based on TOC)
  if (result.pages[7]) {
    console.log('\n=== PAGE 8 (index 7) ===');
    console.log(result.pages[7].text);
  }

  if (result.pages[8]) {
    console.log('\n=== PAGE 9 (index 8) ===');
    console.log(result.pages[8].text);
  }
}

analyzePDF().catch(console.error);
