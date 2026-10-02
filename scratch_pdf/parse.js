const fs = require('fs');
const pdf = require('pdf-parse');

const PDF_PATH = "C:\\Users\\maicr\\.gemini\\antigravity-ide\\brain\\edbf5b1a-6b5d-4852-a471-7726f9f91fb2\\.user_uploaded\\media_1790916767342.pdf";

async function parsePDF() {
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const data = await pdf(dataBuffer);
  
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  fs.writeFileSync('parsed_text.txt', lines.join('\n'));
  console.log('Saved parsed_text.txt. Lines:', lines.length);
}

parsePDF().catch(console.error);
