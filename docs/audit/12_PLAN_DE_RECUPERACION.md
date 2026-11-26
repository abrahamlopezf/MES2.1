# 12 — Plan y Mecanismo Verificable de Recuperación

## 1. Arquitectura de la Bóveda de Recuperación (`recovery_vault`)

En cumplimiento de la **Fase 0** (*"Crea un mecanismo de recuperación verificable antes de eliminar archivos. La recuperación deberá contemplar también archivos no rastreados por Git. No consideres que Git, por sí solo, constituye un respaldo suficiente."*), antes de eliminar un solo byte se construyó una bóveda de recuperación independiente fuera del árbol del repositorio Git:

- **Ubicación de la bóveda**:
  `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\recovery_vault\`
- **Por qué se ubica fuera del workspace**:
  Garantiza que los archivos respaldados no contaminen `git status`, no sean indexados por Vite/Sequelize ni interfieran con las herramientas de compilación, manteniendo su estructura exacta de directorios relativos y verificación criptográfica `SHA-256`.

### Estructura de la Bóveda

```text
C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\recovery_vault\
├── deleted_files_manifest.json          # Manifiesto completo de los 136 archivos eliminados (ruta, lote, tamaño, SHA-256, backupPath)
├── pending_work_baseline.json           # Hashes SHA-256 de los 76 archivos modificados (M) y 20 archivos no rastreados (??)
├── deleted_files/                       # Copia espejo íntegra (136 archivos, 22,307,413 bytes) verificada por SHA-256
│   ├── .playwright-cli/                 # 108 archivos respaldados del Lote 2
│   ├── backend/                         # Logs, renders PNG de backend/tmp y 5 scripts post-limpieza (Lotes 1, 3 y 4)
│   ├── frontend/                        # 4 logs .codex-e2e-vite*.log (Lote 1)
│   └── tmp/                             # 8 logs de tmp/*.log (Lote 1)
└── untracked_functional_backup/         # Copia de resguardo adicional de los 19 archivos funcionales/documentales nuevos (??)
    ├── backend/src/database/migrations/ # 5 migraciones nuevas no rastreadas aún por Git
    ├── backend/src/modules/             # 4 módulos nuevos no rastreados aún por Git
    ├── backend/test/                    # 5 pruebas nuevas no rastreadas aún por Git
    ├── docs/MEJORAS_PENDIENTES.md       # 1 documento nuevo no rastreado aún por Git
    └── frontend/src/                    # 4 componentes React nuevos no rastreados aún por Git
```

---

## 2. Procedimientos de Restauración Verificable

### 2.1 Restaurar un Archivo Individual Eliminado (con Verificación SHA-256)

Para restaurar cualquier archivo individual de los 136 eliminados y comprobar su integridad SHA-256 contra el manifiesto:

```powershell
# Ejemplo: Restaurar un archivo específico indicando su ruta relativa (ej. "backend/verify_db_post_cleanup.js")
$RelPath = "backend/verify_db_post_cleanup.js"
$Root = "c:\Users\maicr\OneDrive\Desktop\Demo"
$Vault = "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\recovery_vault"

$Manifest = Get-Content "$Vault\deleted_files_manifest.json" | ConvertFrom-Json
$Entry = $Manifest.files | Where-Object { $_.relPath -eq $RelPath }
if (-not $Entry) { throw "Archivo no encontrado en el manifiesto: $RelPath" }

$DestPath = Join-Path $Root ($RelPath -replace '/', '\')
$DestDir = Split-Path $DestPath -Parent
if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }

Copy-Item -Path $Entry.backupPath -Destination $DestPath -Force
$RestoredHash = (Get-FileHash -Path $DestPath -Algorithm SHA256).Hash.ToLower()

if ($RestoredHash -eq $Entry.sha256) {
  Write-Host "✅ Restauración exitosa y hash SHA-256 verificado: $RelPath ($RestoredHash)"
} else {
  throw "❌ Discrepancia de hash SHA-256 al restaurar $RelPath"
}
```

### 2.2 Restaurar un Lote Completo (`LOTE_1`, `LOTE_2`, `LOTE_3` o `LOTE_4`)

```powershell
# Indicar el lote a restaurar: "LOTE_1", "LOTE_2", "LOTE_3" o "LOTE_4"
$BatchId = "LOTE_4"
$Root = "c:\Users\maicr\OneDrive\Desktop\Demo"
$Vault = "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\recovery_vault"

$Manifest = Get-Content "$Vault\deleted_files_manifest.json" | ConvertFrom-Json
$BatchFiles = $Manifest.files | Where-Object { $_.batchId -eq $BatchId }

foreach ($Entry in $BatchFiles) {
  $DestPath = Join-Path $Root ($Entry.relPath -replace '/', '\')
  $DestDir = Split-Path $DestPath -Parent
  if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }
  Copy-Item -Path $Entry.backupPath -Destination $DestPath -Force
  $Hash = (Get-FileHash -Path $DestPath -Algorithm SHA256).Hash.ToLower()
  if ($Hash -ne $Entry.sha256) { throw "Error de integridad en $($Entry.relPath)" }
}
Write-Host "✅ Lote $BatchId restaurado íntegramente ($($BatchFiles.Count) archivos verificados por SHA-256)."
```

### 2.3 Restaurar la Totalidad de los 136 Archivos Eliminados (Rollback Total de la Fase 4)

```powershell
node -e "
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = 'c:/Users/maicr/OneDrive/Desktop/Demo';
const VAULT = 'C:/Users/maicr/.gemini/antigravity/brain/fff425d7-4fc2-4dfd-a64f-39c04a64fce9/scratch/recovery_vault';
const manifest = require(VAULT + '/deleted_files_manifest.json');
let restored = 0;
for (const f of manifest.files) {
  const dest = path.join(ROOT, f.relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f.backupPath, dest);
  const h = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  if (h !== f.sha256) throw new Error('Hash mismatch: ' + f.relPath);
  restored++;
}
for (const d of manifest.summary.removedDirs) {
  fs.mkdirSync(path.join(ROOT, d), { recursive: true });
}
console.log('Restaurados y verificados con SHA-256:', restored, 'archivos.');
"
```

### 2.4 Verificar o Restaurar los 19 Archivos Funcionales Nuevos No Rastreados por Git (`??`)

En caso de pérdida accidental de cualquiera de las 5 migraciones nuevas, 4 módulos de backend, 5 pruebas de integración o 4 componentes de frontend que aún no tenían commit en Git al inicio de esta intervención:

```powershell
node -e "
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = 'c:/Users/maicr/OneDrive/Desktop/Demo';
const VAULT = 'C:/Users/maicr/.gemini/antigravity/brain/fff425d7-4fc2-4dfd-a64f-39c04a64fce9/scratch/recovery_vault';
const baseline = require(VAULT + '/pending_work_baseline.json').filter(x => x.backupPath);
for (const b of baseline) {
  const dest = path.join(ROOT, b.relPath);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(b.backupPath, dest);
    console.log('Restaurado archivo funcional no rastreado:', b.relPath);
  }
  const h = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  if (h !== b.sha256) console.error('ALERTA Hash diferente en:', b.relPath);
}
console.log('Verificación de los', baseline.length, 'archivos funcionales no rastreados completada.');
"
```
