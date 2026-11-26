# 05 — Seguridad de Git, `.gitignore`, Pre-Commit Hook y Control de Workflows (Fases 3.4, 3.5 y 4)

## 1. Blindaje de `.gitignore` y Hook Local Pre-Commit (Fases 3.4 y 3.5)

### 1.1 Actualización de `.gitignore`
Se actualizó [`.gitignore`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.gitignore) para bloquear de raíz la publicación accidental de:
- Todos los archivos `.env` y `.env.*` reales, conservando explícitamente las plantillas (`!.env.example`, `!.env.*.example`, `!backend/.env.example`, `!backend/.env.*.example`, `!frontend/.env.example`, `!frontend/.env.*.example`).
- Artefactos temporales de Vite (`*.timestamp-*.mjs`).
- Logs y volcados de errores de middlewares (`*error_log.txt`, `debug_error.txt`, `backend/validation_error.txt`, `backend/db-status.txt`, `backend/prod-check*.txt`, `backend/gh_logs.json`).
- Respaldos de base de datos (`*.sqlite`, `*.sql`, `*.dump`, `*.bak`, `backend/catalog_dump.json`).
- Directorios temporales y evidencias locales sensibles (`tmp/`, `backend/tmp/`, `docs/qa/evidence/`, `.playwright/`, `.playwright-cli/`, `.audit-telares/`, `recovery_vault/`, `readiness_recovery_vault/`).

### 1.2 Hook Local Pre-Commit Instalado (`.git/hooks/pre-commit`)
Se instaló el hook local [`.git/hooks/pre-commit`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.git/hooks/pre-commit) que se ejecuta automáticamente antes de cada `git commit`:
1. Invoca `node backend/src/scripts/security-check.js` (que escanea 1,203 archivos en `<2 segundos` buscando URLs de PostgreSQL con credenciales, hostnames de Neon Cloud y contraseñas hardcodeadas).
2. Inspecciona `git diff --cached --name-only` y bloquea el commit si detecta cualquier archivo `.env` real, `.sql`, `.dump`, `.bak`, `error_log.txt` o `.log` en staging.

---

## 2. Blindaje de Workflows de GitHub Actions (Fase 4)

En la auditoría de [`.github/workflows/`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.github/workflows/migrations.yml) se detectó un riesgo severo: `migrations.yml` ejecutaba `npm run db:migrate` automáticamente contra `environment: production` (`NODE_ENV: production`) en cada `push` a `main` cuando cambiaba cualquier archivo dentro de `backend/**`.

Se actualizaron localmente los 4 workflows sin publicarlos ni ejecutarlos remotamente:

| Workflow | Riesgo Previo | Control Implementado Ahora |
|---|---|---|
| [`.github/workflows/migrations.yml`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.github/workflows/migrations.yml) | Ejecutaba migraciones automáticas en `production` en cada `push` a `main`. | 1. En `pull_request` hacia `main` o `uat`, ejecuta únicamente el job `ci-verify` (`security-check.js`, `envIsolationGuard.test.js`, `vite build` y `vitest run`).<br>2. El job `migrate` solo puede ejecutarse vía `workflow_dispatch`, exige elegir `target_environment` (`uat` o `production`), escribir `EJECUTAR_MIGRACION` y pasa `APP_ENV: ${{ inputs.target_environment }}`. |
| [`.github/workflows/provision-demo-users.yml`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.github/workflows/provision-demo-users.yml) | Creaba cuentas de demostración directamente en `environment: production`. | Restringido exclusivamente a `environment: uat` (`APP_ENV: uat`) con confirmación `PROVISION_UAT`. **Bloqueada la creación de usuarios demo en Producción**. |
| [`.github/workflows/rollback.yml`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.github/workflows/rollback.yml) | Acoplado únicamente a `production` sin `APP_ENV`. | Parametrizado por `target_environment` (`uat` o `production`), exige `CONFIRMAR_ROLLBACK` y ejecuta `sequelize-cli db:migrate:undo --env ${APP_ENV}`. |
| [`.github/workflows/seed-catalogs.yml`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/.github/workflows/seed-catalogs.yml) | Acoplado únicamente a `production` sin `APP_ENV`. | Parametrizado por `target_environment` (`uat` o `production`), exige `SEED_CONFIRMADO` y pasa `APP_ENV` a `validate-migration.js`, `db:migrate`, `db:seed` y `verify-catalog-seed.js`. |

---

## 3. Protecciones Remotas que el Administrador Debe Activar en GitHub

Dado que modificar un workflow localmente no desactiva el workflow publicado actualmente en la rama remota `origin/main` hasta que se publique el cambio:
1. **Branch Protection Rules en `main` y `uat`**:
   - Activar *Require a pull request before merging*.
   - Activar *Require status checks to pass before merging* seleccionando el job `Security, Unit Tests & Frontend Build Gate` (`ci-verify`).
   - Activar *Do not allow bypassing the above settings* y bloquear `force push`.
2. **GitHub Environments (`uat` y `production`)**:
   - Crear el environment `uat` con su propio secreto `DATABASE_URL` (apuntando a la instancia/rama Neon UAT).
   - En el environment `production`, activar **Required reviewers** (mínimo 1 responsable técnico humano) para que ningún job con `environment: production` pueda iniciar sin aprobación explícita en la interfaz de GitHub.
