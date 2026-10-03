const xlsx = require('xlsx');

function dumpExcel() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n=== SHEET: ${sheetName} ===`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Print first few rows to understand structure
      data.slice(0, 100).forEach((row, i) => {
        if (row.length > 0) {
          console.log(`Row ${i + 1}:`, row.join(' | '));
        }
      });
    });
  } catch (error) {
    console.error("Error reading excel file:", error);
  }
}

dumpExcel();
