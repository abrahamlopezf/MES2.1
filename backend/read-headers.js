const xlsx = require('xlsx');

function dumpHeaders() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n=== SHEET: ${sheetName} ===`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log('Headers:', data[0]);
    });
  } catch (error) {
    console.error("Error reading excel file:", error);
  }
}

dumpHeaders();
