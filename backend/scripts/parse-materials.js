const fs = require('fs');

const rawText = fs.readFileSync(__dirname + '/raw-materials.txt', 'utf-8');

// Known brands to match at the end
const knownBrands = [
  "ROMA, SALVO ETC", "SANITAS", "SCOTCH", "DERMACAERE Y SUK", "DERMACARE", 
  "ACP", "ROTOPLAS JUMBO", "FRAM", "SISTA", "RESISTOL 5000", "SANDYQUIM", 
  "DURACELL", "NICHOLSON", "TOKAI", "SURTEK", "ADHECINTAS", "TUK", 
  "FANDELI", "EFKA", "KLEVAR", "GENERICA", "VARIAS", "M3", "N/A"
];

// Combine lines that were wrapped
const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
const combinedLines = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];
  // If the next line doesn't start with a known family prefix and is not a completely unrelated line, combine it.
  // Families in this list: LIM-, SEG-, HER-, MATCONS-, REF-, PQ-, ELC-, MATEMP-, GOM-
  while (i + 1 < lines.length && !lines[i+1].match(/^(LIM|SEG|HER|MATCONS|REF|PQ|ELC|MATEMP|GOM|RF)-/)) {
    if (lines[i+1] === 'GOM-001 GOM-001 GOMA SOSA HULE VARIAS G2' || lines[i+1] === 'REGISTRO DE ALMACÉN-LOCALIDADES') {
      break;
    }
    line += ' ' + lines[i+1];
    i++;
  }
  if (line !== 'REGISTRO DE ALMACÉN-LOCALIDADES') {
    combinedLines.push(line);
  }
  i++;
}

const records = [];

for (let line of combinedLines) {
  // Normalize weird spacings
  line = line.replace(/\s+/g, ' ');
  
  const tokens = line.split(' ');
  if (tokens.length < 5) continue;

  let familia = tokens[0].replace('-', '');
  // GOM-001 edge case
  if (tokens[0] === 'GOM-001') {
    familia = 'GOM';
    tokens.unshift('GOM-'); // shift so it matches normal pattern
  }

  const articulo = tokens[1];
  const nomenclatura = tokens[2];
  let localidad = tokens[tokens.length - 1];
  
  // Localidad might be "F 2" instead of "F2"
  if (localidad.match(/^[0-9]+$/)) {
     localidad = tokens[tokens.length - 2] + localidad;
     tokens.pop();
  }
  
  tokens.pop(); // remove localidad
  
  let restOfText = tokens.slice(3).join(' ');
  
  let marca = 'GENERICA';
  for (const b of knownBrands) {
    if (restOfText.endsWith(b)) {
      marca = b;
      restOfText = restOfText.substring(0, restOfText.length - b.length).trim();
      break;
    }
  }

  // Descripcion and Tipo
  // Heuristic: Type is usually the last word(s)
  let tipo = 'POR DEFINIR';
  let desc = restOfText;

  // Custom multi-word types based on user list
  const knownTypes = [
    "ROMA", "PAPEL SANITAS", "FIBRA", "ANTIRAYADURAS", "CLARO", "OBSCURO", "PALMA DE NITRILO",
    "No. 7", "No. 8", "LATEX AZUL", "CON PVC", "NARANJAS", "CARTUCHO SPC-25-1005",
    "ROTOPLAS JUMBO", "CARTUCHO SPC-45-1020", "CARTUCHO SPC-45-1005", "MALLA MOSQ.",
    "15/16 A 3/4", "1 A 2", "2 A 2 3/4", "1/8 A 3/32", "3 1/8 A 5", "4 1/2 A 6",
    "GEL P/MANOS", "1/2", "3/4", "1/8", "3/8", "1", "2"
  ];

  for (const t of knownTypes) {
    if (restOfText.endsWith(t)) {
      tipo = t;
      desc = restOfText.substring(0, restOfText.length - t.length).trim();
      break;
    }
  }

  if (tipo === 'POR DEFINIR') {
    // Just take the last word as tipo
    const parts = restOfText.split(' ');
    if (parts.length > 1) {
      tipo = parts.pop();
      desc = parts.join(' ');
    } else {
      tipo = desc;
    }
  }

  records.push({ familia, articulo, nomenclatura, descripcion: desc, tipo, marca, localidad });
}

fs.writeFileSync(__dirname + '/parsed-materials.json', JSON.stringify(records, null, 2));
console.log('Parsed ' + records.length + ' records.');
