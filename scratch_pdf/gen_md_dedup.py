import json
import os

pdf_json_path = 'pdf_tables.json'
md_out_path = r'C:\Users\maicr\OneDrive\Desktop\Demo\docs\catalogo_materiales_stock_minimo.md'

with open(pdf_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

p1 = [d['row'] for d in data if 1 <= d['page'] <= 12][1:]
p2 = [d['row'] for d in data if 13 <= d['page'] <= 24][1:]
res = [r1 + r2 for r1, r2 in zip(p1, p2)]

cleaned = []
nomenclatures = set()

for row in res:
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

    # Fix typos
    if marca == "DERMACAERE Y":
        marca = "DERMACARE"
    if marca in ["SUK VARIAS", "SUK"]:
        marca = "VARIAS"
    if not fam and "ELC" in art:
        fam = "ELC-"
    if art == "MOT-001" and not tipo:
        tipo = "MOTOR"

    if art == "GOM-001" and not fam:
        fam = "OTR-"
        nom = f"OTR-GOM-001"
        
    base_art = art.split('-')[0] if '-' in art else art
    
    # Check duplicate
    if nom in nomenclatures:
        # Resolve by incrementing
        counter = 1
        new_nom = nom
        new_art = art
        while new_nom in nomenclatures:
            new_consec = str(counter).zfill(3)
            new_art = f"{base_art}-{new_consec}"
            new_nom = f"{fam}{new_art}"
            counter += 1
        
        nom = new_nom
        art = new_art

    nomenclatures.add(nom)
    cleaned.append([fam, art, nom, desc, tipo, marca, loc, stock])

md_content = "| FAMILIA | ARTICULO/CONSECUTIVO | NOMENCLATURA DE QR | DESCRIPCION | TIPO | MARCA | LOCALIDAD | Stock Minimo |\n"
md_content += "| -------- | -------------------- | -------------------- | ----------- | ---- | ----- | --------- | ------------ |\n"

for row in cleaned:
    md_content += f"| {row[0]} | {row[1]} | {row[2]} | {row[3]} | {row[4]} | {row[5]} | {row[6]} | {row[7]} |\n"

with open(md_out_path, 'w', encoding='utf-8') as f:
    f.write(md_content)

print(f"Written {len(cleaned)} rows to {md_out_path}")
