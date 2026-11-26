# 01 — VERIFICACIÓN INTEGRAL DEL MECANISMO DE RECUPERACIÓN (FASE B)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Verificación:** 2026-11-25  
**Estado General de las Bóvedas:** ✅ **100% ÍNTEGRAS, VERIFICADAS POR SHA-256 Y FUERA DEL REPOSITORIO GIT**

---

## 1. Arquitectura de Triple Bóveda Fuera del Repositorio

Todas las bóvedas de recuperación residen en el directorio de artefactos del sistema (`C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\`), completamente fuera de `c:\Users\maicr\OneDrive\Desktop\Demo`:

| # | Bóveda | Ruta Absoluta | Propósito | Elementos Respaldados | Estado SHA-256 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Bóveda de Auditoría #1 (`recovery_vault`)** | `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\recovery_vault\` | Respaldo de los `136` archivos temporales/logs eliminados en la primera auditoría + `pending_work_baseline.json` (`101` archivos) + `untracked_functional_backup/`. | `136` archivos eliminados + `19` archivos funcionales `??` | ✅ **`100% Verificado`** |
| **2** | **Bóveda de Fase 0 de Blindaje (`readiness_recovery_vault`)** | `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\` | Respaldo previo a modificaciones de configuración/seguridad (`154` archivos de código/config/docs) + `git_diff_initial.patch` + dumps nativos de PostgreSQL (`sistema_enterprise_phase0.dump` y `_schema.sql`). | `154` archivos (`25,305,884 B`) + `1` patch + `2` dumps PostgreSQL | ✅ **`154 / 154 Hashes Exactos (0 Errores)`** |
| **3** | **Bóveda de Limpieza de Cierre (`closure_cleanup_vault`)** | `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\closure_cleanup_vault\` | Punto de recuperación específico generado en esta Fase de Cierre antes de retirar los **116 archivos** innecesarios (Lotes `F1`, `F2`, `F3` y `F4`). | `116` archivos (`2,241,232 B`) con `manifest.json` | ✅ **`116 / 116 Hashes Exactos (0 Errores)`** |

---

## 2. Resultados de la Comprobación Automatizada (`closure_audit_analyzer.js`)

Se ejecutó una auditoría criptográfica completa sobre `readiness_recovery_vault`:

1. **Verificación del Manifiesto (`manifest.json`):**
   - `totalInManifest`: **`154`** archivos.
   - `vaultVerified`: **`154`** archivos existentes en `readiness_recovery_vault/files/` cuyo hash SHA-256 calculado en disco coincide exactamente con el registrado en `manifest.json`.
   - `vaultErrorsCount`: **`0`**.
2. **Verificación del Parche Git Inicial (`git_diff_initial.patch`):**
   - Existe: `true` (`294,344 bytes`).
   - Hash SHA-256 verificado: `b802e78bdeb23d6e5cd88639b2ed4c1f7692ea7a5c587fda84fcf61a507cf1c5` (**100% coincidente con `00_BASELINE.md`**).
3. **Verificación de Respaldos PostgreSQL (`db_backups/`):**
   - **Volcado completo formato custom (`sistema_enterprise_phase0.dump`):**
     - Existe: `true` (`2,287,895 bytes`).
     - Hash SHA-256 verificado: `858e78f60cb1076348242f44c6d83a9c6d7474158272148a99679e0343d7d9cc` (**100% coincidente**).
   - **Volcado de esquema SQL (`sistema_enterprise_phase0_schema.sql`):**
     - Existe: `true` (`1,236,107 bytes`).
     - Hash SHA-256 verificado: `649c3ca775aa504a5f93e3d5f524bbce78da6e028b5dd26f0852ca710bd39695` (**100% coincidente**).
4. **Prueba Real de Restauración Individual de Archivo (`singleFileRestoreOk`):**
   - Se restauró un archivo de prueba desde `readiness_recovery_vault/files/` hacia un directorio temporal aislado (`scratch/restore_verification_test/`), se recalculó su hash SHA-256 en el destino restaurado y se comparó con `manifest.json`:
   - Resultado: **`singleFileRestoreOk: true` (`100% coincidente`)**. El directorio temporal de prueba fue limpiado inmediatamente después.

---

## 3. Auditoría de Seguridad y Protección de Credenciales en Respaldos

1. **Ubicación fuera del árbol de Git:**
   - Las tres bóvedas residen en `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\`, ruta que se encuentra fuera del repositorio `c:\Users\maicr\OneDrive\Desktop\Demo` y bajo el perfil local del usuario de Windows (`C:\Users\maicr\`).
   - Por estar fuera del repositorio, **es físicamente imposible que `git add .` o `git commit` incluyan archivos de las bóvedas en el control de versiones**.
2. **Contenido sensible protegido dentro de la bóveda:**
   - `readiness_recovery_vault/files/backend/.env` conserva el archivo `.env` original previo a la sanitización, y los 9 archivos `.codex-e2e-*.cjs` en `readiness_recovery_vault/files/` conservan su estado pre-remediación para garantizar reversibilidad exacta si se requiriera forensia.
   - En cambio, los 9 archivos `.codex-e2e-*.cjs` respaldados en la nueva bóveda `closure_cleanup_vault/files/` corresponden a la versión ya sanitizada (sin contraseñas literales).
   - **Recomendación de seguridad:** Una vez que el equipo cierre formalmente la etapa de refactorización MVC y rote la credencial histórica de Neon Cloud, la copia histórica de `readiness_recovery_vault/files/backend/.env` debe eliminarse de forma segura.
3. **Exclusión de respaldos locales dentro del repositorio (`.gitignore`):**
   - Se verificó que `.gitignore` incluye `*.dump`, `*.sql`, `*.bak`, `backend/tmp/` y `.env.*`.
   - Los respaldos locales existentes dentro del árbol (`backend/tmp/pre-extrusion-cleanup-20261122.dump`, `docs/qa/evidence/local-pre-multirun-20261125.dump`, `backend/backup_neon_pre_cleanup.sql`, `backend/backup_pre_cleanup_production.sql`) tienen estado `IGNORED` en Git.
   - **Única excepción preexistente:** `backend/master_data_dump.sql` (`430,755 B`) ya estaba rastreado en el índice de Git (`git ls-files`) desde commits anteriores a esta intervención (detectado automáticamente por `security-check.js` con la regla `TRACKED_SENSITIVE_ARTIFACT`). Su retiro del índice requiere autorización humana para ejecutar `git rm --cached backend/master_data_dump.sql`.

---

## 4. Procedimiento para Revertir Exclusivamente la Limpieza de esta Fase de Cierre

Si se desea restaurar cualquiera (o la totalidad) de los **116 archivos** retirados durante esta Fase de Cierre desde `closure_cleanup_vault`:

```powershell
node -e "
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const vaultRoot = 'C:/Users/maicr/.gemini/antigravity/brain/fff425d7-4fc2-4dfd-a64f-39c04a64fce9/scratch/closure_cleanup_vault';
const repoRoot = 'c:/Users/maicr/OneDrive/Desktop/Demo';
const manifest = JSON.parse(fs.readFileSync(path.join(vaultRoot, 'manifest.json'), 'utf8'));

// Para restaurar un archivo específico, filtrar manifest.files por relPath
for (const entry of manifest.files) {
  const src = path.join(vaultRoot, 'files', entry.relPath);
  const dst = path.join(repoRoot, entry.relPath);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex');
  if (hash !== entry.sha256) throw new Error('Hash mismatch restoring ' + entry.relPath);
}
console.log('Restaurados exitosamente ' + manifest.files.length + ' archivos con verificación SHA-256.');
"
```
