import pdfplumber
import json

pdf_path = r"C:\Users\maicr\.gemini\antigravity-ide\brain\edbf5b1a-6b5d-4852-a471-7726f9f91fb2\.user_uploaded\media_1790916767342.pdf"

all_data = []
with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                # Clean up newlines in cells
                cleaned_row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                all_data.append({"page": i+1, "row": cleaned_row})

with open("pdf_tables.json", "w", encoding="utf-8") as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(all_data)} rows.")
