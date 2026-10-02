import json

with open('pdf_tables.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

p1 = [d['row'] for d in data if 1 <= d['page'] <= 12][1:]
p2 = [d['row'] for d in data if 13 <= d['page'] <= 24][1:]
res = [r1 + r2 for r1, r2 in zip(p1, p2)]

n_map = {}
dups = []
for r in res:
    nom = r[2].strip()
    if nom in n_map:
        dups.append((nom, n_map[nom], r))
    else:
        n_map[nom] = r

for nom, old_r, new_r in dups:
    print("DUP:", nom)
    print("  OLD:", old_r)
    print("  NEW:", new_r)
