import json
import os

pdf_json_path = 'pdf_tables.json'
md_out_path = r'C:\Users\maicr\OneDrive\Desktop\Demo\docs\catalogo_materiales_stock_minimo.md'

with open(pdf_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Exclude headers
p1 = [d['row'] for d in data if 1 <= d['page'] <= 12][1:]
p2 = [d['row'] for d in data if 13 <= d['page'] <= 24][1:]

res = [r1 + r2 for r1, r2 in zip(p1, p2)]

# Clean up data
cleaned = []
for row in res:
    # row: FAMILIA, ARTICULO/CONSECUTIVO, NOMENCLATURA, DESCRIPCION, TIPO, MARCA, LOCALIDAD, Stock Minimo, Alerta de Stock
    fam = row[0].strip()
    art = row[1].strip()
    nom = row[2].strip()
    desc = row[3].strip()
    tipo = row[4].strip()
    marca = row[5].strip()
    loc = row[6].strip()
    stock = row[7].strip() if len(row) > 7 else ""
    alerta = row[8].strip() if len(row) > 8 else ""

    if not nom and fam and art:
        nom = f"{fam}{art}"

    # Fix typos / misalignments
    if marca == "DERMACAERE Y":
        marca = "DERMACARE"
    if marca == "SUK VARIAS":
        marca = "VARIAS"
    if marca == "SUK":
        marca = "VARIAS"
    
    # Empty family handling (ELC-MOT-001 had an issue)
    if not fam and "ELC" in art:
        fam = "ELC-"
    
    # Fix empty values for ELC-MOT-001
    if art == "MOT-001" and not tipo:
        tipo = "MOTOR"
        
    cleaned.append([fam, art, nom, desc, tipo, marca, loc, stock])

# Write markdown
md_content = "| FAMILIA | ARTICULO/CONSECUTIVO | NOMENCLATURA DE QR | DESCRIPCION | TIPO | MARCA | LOCALIDAD | Stock Minimo |\n"
md_content += "| -------- | -------------------- | -------------------- | ----------- | ---- | ----- | --------- | ------------ |\n"

for row in cleaned:
    md_content += f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]} | {row[5]} | {row[6]} | {row[7]} |\n"

with open(md_out_path, 'w', encoding='utf-8') as f:
    f.write(md_content)

print(f"Written {len(cleaned)} rows to {md_out_path}")
