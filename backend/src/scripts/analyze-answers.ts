import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeAnswers() {
  const pdfPath = path.resolve(__dirname, '../../../data/questions/CTFL-4.0_Egzamin-przykladowy-zbior-A-odpowiedzi_v.-1.61.0.0.5-PL.pdf');

  console.log('📄 Analyzing Answers PDF:', pdfPath);

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfParser = new PDFParse({ data: dataBuffer });
  const result = await pdfParser.getText();

  console.log('\n📊 PDF Metadata:');
  console.log('- Pages:', result.total);

  // Search for answer table
  const answerTablePattern = /Nr pytania.*?Poprawna odpowiedź/i;
  const match = result.text.match(answerTablePattern);

  if (match) {
    console.log('\n✅ Found answer table at position:', match.index);
    const startPos = match.index!;
    console.log('\n=== ANSWER TABLE SAMPLE ===');
    console.log(result.text.substring(startPos, startPos + 2000));
  }

  // Check pages 8-10 which have the answer key
  for (let i = 7; i <= 10; i++) {
    if (result.pages[i]) {
      console.log(`\n=== PAGE ${i + 1} ===`);
      console.log(result.pages[i].text);
      console.log('\n---END OF PAGE---\n');
    }
  }
}

analyzeAnswers().catch(console.error);
