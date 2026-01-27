import * as fs from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse');

async function parsePdf() {
  const pdfPath = path.join(__dirname, 'test.pdf');

  console.log('Loading PDF:', pdfPath);
  console.log('---');

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  console.log('Number of pages:', data.numpages);
  console.log('Number of characters:', data.text.length);
  console.log('---');
  console.log('RAW TEXT:');
  console.log('---');
  console.log(data.text);
}

parsePdf().catch(console.error);
