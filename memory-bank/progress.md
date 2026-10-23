# Progress — Estado actual, qué funciona, deuda técnica y prioridades

> Documento de estado generado el **2026-10-15** tras la auditoría exhaustiva (verificación 2026-10-14 + ejecución real de tests). Fuentes: `verification.md`, `findings.md`, `.agents/rules/`, `git log`.

## 1. Estado general

- ✅ **Todo el stack verificado**: backend, frontend, tests, build, lint y endpoints HTTP reales.
- 🔖 **HEAD**: `630caa4 refactor(a11y): apply accessibility audit findings` (accessibility skill `ui-ux-pro-max` aplicada y validada)
- 📁 Estructura de contexto para agentes ya presente: `verification.md` (raíz), `findings.md` (raíz), `.agents/rules/` (3 reglas), `memory-bank/` (este directorio, recién creado).

## 2. Qué funciona (verificado con evidencia)

### Backend (`backend/`)

- API FastAPI `Financial Metrics API` con CORS `*` (`main.py`).
- 9 endpoints: `/health` + 8 `/api/metrics*` — **todos responden `200`** en verificación HTTP real (`routes.py`).
- Datos mock deterministas con `seed=42`, 360 movimientos/año móvil.
- **15 tests pasan** (`python -m pytest -q` → `15 passed`).

### Frontend (`frontend/`)

- Dashboard de una página: cabecera, 4 KPIs, 2 gráficas Recharts.
- **5 tests pasan** (`npm test` → `5 passed`), **lint sin errores**, **build OK** (`tsc -b && vite build`).
- **Periodo de cabecera corregido en fase-3**: ya no está hardcodeado `"2024 - Full Year"`; ahora se deriva de `monthlyData[0].month` … `monthlyData[last].month` con estados `Loading...` y `No data` (`App.tsx` + `dashboard-header.tsx`).

### Documentación de la auditoría (fases 1–3)

| Archivo | Estado |
|---|---|
| `verification.md` | 25 afirmaciones ✅ verificadas, 8 ❌ corregidas, 1 ❓ sin verificar |
| `findings.md` | 5 categorías: Arquitectura, Naming, Error Handling, Testing, DX (19 hallazgos con evidencia) |
| `.agents/rules/` | `backend-conventions.md`, `frontend-structure.md`, `git-workflow.md` — implementadas y validadas en fase-3 |

## 3. Qué NO funciona / deuda técnica conocida

### Deuda funcional o riesgos activos (de `findings.md`, con evidencia)

| # | Deuda | Evidencia | Severidad |
|---|---|---|---|
| E5 | `build_metrics_facets` fallaría con `IndexError` si la colección es vacía (`ordered[0]`/`ordered[-1]`) | `backend/app/routes.py` | Media |
| E4 | `/api/metrics/comparison` no valida `start_date <= end_date` | `backend/app/routes.py` | Media |
| E3 | `generate_mock_movements` muta el RNG global (`random.seed(seed)`) | `backend/app/routes.py` | Baja–Media |
| A4 | Contrato `FinancialMovement` duplicado manualmente (Pydantic ↔ TS), sin generar desde OpenAPI | `routes.py` + `financial-types.ts` | Media |
| A2 | UI solo usa `/api/metrics`; endpoints analíticos (`summary`, `top`, `comparison`, `alerts`) sin consumidor | `App.tsx` + `routes.py` | Media (superficie duplicada potencial) |
| E1/E2 | `.catch(() => ...)` oculta el error técnico; fetch sin `AbortController`/timeout | `App.tsx` | Baja |
| D1 | Proxy Vite apunta a hostname Docker `http://backend:8000`; `npm run dev` fuera de Docker falla sin `VITE_API_BASE_URL` | `vite.config.ts` | Baja (DX) |
| D2 | Compose `depends_on: backend` sin `healthcheck` → Vite puede arrancar antes que FastAPI | `docker-compose.yml` | Baja (DX) |
| D4 | Bundle ~584 kB (aviso Vite >500 kB) | build real | Baja (rendimiento) |
| N2 | Mezcla de idiomas (UI en inglés, error en español) y locale/moneda fijos a `en-US/USD` | `App.tsx`, `financial-utils.ts`, `kpi-row.tsx` | Cosmética |
| N3 | Estilos mixtos (comillas simples/dobles, `;`) entre archivos frontend; sin Prettier | `financial-types.ts` vs `App.tsx` | Cosmética |

### Código muerto

- **`frontend/src/lib/mock-data.ts`**: dataset estático 2024 (57 registros) **no se importa en ningún sitio** (verificado por `grep`). Legacy → candidato a eliminar.

### Verificaciones pendientes (❓ de `verification.md`)

- Semántica de negocio de `/api/metrics/comparison` (`delta_pct` usa `abs(previous_net)`, `None` si `previous_net == 0`): ningún test/UI valida que el cálculo sea el deseado.

## 4. Prioridades inmediatas

1. **Corregir la deuda de defectos de bajo esfuerzo** con sus tests:
   - `build_metrics_facets` con lista vacía (E5).
   - Validación `start_date <= end_date` en `/api/metrics/comparison` (E4).
   - `random.Random(seed)` local en `generate_mock_movements` (E3).
2. **Eliminar `mock-data.ts`** (código muerto) o migrarlo a fixture de tests si se necesita.
3. **Elegir una fuente canónica de cálculo** para los endpoints analíticos o documentar qué pantallas consumen cada endpoint (A2).
4. **Sincronizar contrato** `FinancialMovement` (generar desde OpenAPI o prueba de contrato) (A4).
5. **Mejorar DX**: healthcheck en Compose (D2), documentar flujo host vs Docker con `VITE_API_BASE_URL` (D1).
6. **Frontend**: añadir pruebas de pantalla (estados de carga/error) (T2) y revisar bundle (D4).
7. **Consolidar convenciones** aplicando y ampliando `.agents/rules/` en cada cambio nuevo (reglas ya implementadas y validadas en fase-3).

## 5. Notas de proceso

- Los commits de fases 1–3 están en `main`: `ca87707` (fase-1: auditoría + `verification.md`), `585b8f7` (fase-2: `findings.md` + reglas propuestas), `38f5426` (fase-3: reglas implementadas y validadas en `.agents/rules/`).
- `memory-bank/` es nuevo (no versionado todavía); `AGENTS.md` ya lo referencia como contexto obligatorio para agentes.
- Al ejecutar Vite fuera de Docker, definir `VITE_API_BASE_URL` apuntando a la API (p. ej. `http://localhost:8000`) para no depender del hostname Docker del proxy.

## 6. Registro de skills

| Skill | Fuente | Hallazgos aceptados | Hallazgos rechazados (y por qué) | Evidencia |
|---|---|---|---|---|
| `ui-ux-pro-max` (accessibility) | `nextlevelbuilder/ui-ux-pro-max-skill@github` | 10 — `form-labels` (#1), `heading-hierarchy` (#2, #3), `voiceover-sr` (#4, #7), `aria-labels` (#5), `skip-links` (#8), `color-not-only` (#7), `reduced-motion` (#10), `keyboard-nav` (#8) | 13 — `alt-text` (sin `<img>`), `icon-context` (Lucide ya oculta iconos decorativos), `dragging-alternative` (sin drag & drop), `accessible-authentication` (sin login), `auto-rotation-controls` (sin carruseles), `contextual-live-badge-updates` (sin badges en vivo), `keyboard-shortcuts` (sin atajos personalizados), `escape-routes` (sin modales), `consistent-help` (sin ayuda repetida), `redundant-entry` (sin procesos multi-paso), `dynamic-type` (específico iOS), `focus-not-obscured`/`focus-not-obscured-enhanced` (sin UI sticky) | `get_errors` → 0 errores TS; **12 archivos modificados** (commit `630caa4`): `index.html`, `index.css`, `App.tsx`, `dashboard-page.tsx`, `date-range-filter.tsx`, `alerts-table.tsx`, `category-ranking-table.tsx`, `income-outcome-chart.tsx`, `profit-percent-chart.tsx`, `comparison-chart.tsx`, `business-panel.tsx`, `threshold-input.tsx` |
| `vercel-react-best-practices` | `vercel-labs/agent-skills@github` (`skills/react-best-practices/SKILL.md`) | 6 — eliminar imports no usados `CardTitle` (#1), mover `role="img"` fuera de `ResponsiveContainer` (#2), crear hook `useApiFetch` y refactorizar 4 hooks de fetching (#3), `useCallback` en `applyFilters` (#4), key serializada en `useAlerts` (#7), `useMemo` para KPIs y monthlyData en dashboard (#8) | 2 — `React.memo` en páginas (#5, sin beneficio: no reciben props, todo viene del contexto), hoistear iconos (#6, ya son constantes de módulo con referencia estable: `TrendingUp`, `TrendingDown`, etc. importados de `lucide-react`) | `npm run build` → **0 errores TS**, compila en 3.08 s; **8 archivos modificados** (commit `git commit -m "perf(react): apply react best practices audit findings"`): `useApiFetch.ts` (nuevo), `useFacets.ts`, `useMetrics.ts`, `useAlerts.ts`, `useComparison.ts`, `App.tsx`, `business-panel.tsx`, `income-outcome-chart.tsx`, `profit-percent-chart.tsx`, `dashboard-page.tsx` |
| `performance-optimization` | `addyosmani/agent-skills@github` | 4 — **#1** code splitting de rutas con `React.lazy`+`Suspense` (`DashboardPage`, `ComparisonPage`) en `App.tsx`; **#2** lazy de charts de recharts (`IncomeOutcomeChart`, `ProfitPercentChart`) en `dashboard-page.tsx`; **#3** `threshold` fuera del fetch-key en `useAlerts.ts` (el servidor no usa `threshold` → cambiar umbral ya no refetchea `/api/metrics/summary`); **#4** monitoring sin dependencias nuevas: RUM nativo con `PerformanceObserver` (`report-web-vitals.ts`, FCP/LCP/CLS/INP) + guard de bundle en CI (`scripts/check-bundle.mjs` con `zlib`, script `check:bundle`) | 4 (fuera de scope del pedido, no aplicados) — `useMemo` en `filtersValue` (#5), `useCallback`/hoisting de funciones en render (#6), O(n²) en `computeAlerts` (#7), paginación/limit en `/api/metrics` (#8). Reglas **no aplicables**: N+1 / índices / connection pool (sin DB; backend genera mock determinista `seed=42`), imágenes (el frontend no tiene `<img>`, solo `favicon.svg`) | `npm run build` → **0 errores TS**; bundle inicial **669 kB → 225.76 kB** (gzip 200.28 → **72.86 kB**, −57 %); desaparece aviso Vite ">500 kB"; `check:bundle` pasa (204.76 kB JS/5.21 kB CSS); `npm test` → **5 passed**; **7 archivos**: `App.tsx`, `dashboard-page.tsx`, `useAlerts.ts`, `main.tsx`, `package.json`, `report-web-vitals.ts` (nuevo), `check-bundle.mjs` (nuevo). Sin commit aún (working tree) |
| `financial-format` | Skill local definida por el usuario (`.skills/financial-format/SKILL.md`) | 3 — **#1** todos los montos visibles con símbolo, separador de miles y 2 decimales; **#2** porcentajes con 2 decimales; **#3** fechas en `DD/MM/AAAA`. Se eligió porque la auditoría del dashboard detectó formatos inconsistentes en montos, porcentajes y fechas, y el usuario estableció el estándar requerido. | Ninguno — se aplicaron únicamente los criterios #1–#3 solicitados; no se añadieron reglas. | `npm run build` → OK; `npx vitest run` → **6 passed**. **8 archivos modificados**: `financial-utils.ts`, `financial-utils.test.ts`, `income-outcome-chart.tsx`, `profit-percent-chart.tsx`, `category-ranking-table.tsx`, `App.tsx`, `date-range-filter.tsx`, `dashboard-page.tsx` |

### Skills descartadas

| Skill | Fuente | Motivo del descarte | Evidencia |
|---|---|---|---|
| `mattpocock/skills@tdd` | `mattpocock/skills@github` (aparece en `npx skills find --topic "unit testing"`) | El proyecto ya cuenta con 15 tests de backend y 5 de frontend que pasan (§2). No hay necesidad documentada de adoptar TDD; el único hallazgo de testing (T1 en `findings.md`) sugiere mejorar validaciones, no cambiar la metodología. La skill no resuelve ninguna deuda concreta del proyecto. | `findings.md` T1, `memory-bank/progress.md` §2 |
| `mehmetmuejde/agent-skills@react-frontend` | `mehmetmuejde/agent-skills@github` (aparece en búsquedas de charts, testing y componentes React) | El proyecto ya tiene `vercel-react-best-practices` para buenas prácticas React y `frontend-structure.md` para convenciones. Una skill genérica de frontend React solaparía con ambas sin cubrir ninguna necesidad documentada en `findings.md` o `progress.md`. | `skills-lock.json`, `.agents/rules/frontend-structure.md`, `memory-bank/progress.md` §6 |

**Elección confirmada:** `performance-optimization` (`addyosmani/agent-skills@github`) — resuelve la deuda D4 (bundle ~584 kB), ha producido resultados medibles (−57 % bundle gzip) y no solapa con skills existentes.

### Resumen operativo de skills

- **Instaladas para agentes** en `.agents/skills/`: `ui-ux-pro-max` sirve para diseño/revisión de UI y UX (incluida accesibilidad); `vercel-react-best-practices` para patrones de rendimiento React/Next.js; `performance-optimization` para medir, localizar, optimizar y volver a verificar problemas de rendimiento.
- **Skills del agente**: `ui-ux-pro-max`, `vercel-react-best-practices` y `performance-optimization` en `.agents/skills/<nombre>/SKILL.md`; `financial-format` (skill interna) en `.skills/financial-format/SKILL.md`. La skill financiera fija el formato del dashboard para importes (USD, `en-US`, símbolo, miles y 2 decimales), porcentajes (2 decimales) y fechas (`DD/MM/AAAA`), incluyendo convenciones para negativos, cero y fechas de calendario. Las fuentes y rutas están registradas en `skills-lock.json`.
- **Hallazgos rechazados/no aplicados según el registro:** accesibilidad se descartó cuando la función no existe en la UI (p. ej., imágenes, drag & drop, login, carruseles, modales, atajos, ayuda o flujos multi-paso), el caso era específico de iOS, los iconos ya eran decorativos o no había UI sticky. React: `React.memo` no aportaba porque las páginas no reciben props y leen contexto; hoistear iconos era redundante porque ya son constantes de módulo. Rendimiento: `useMemo`/`useCallback`/hoisting, el caso O(n²) y paginación quedaron fuera del alcance; N+1, índices y pool no aplican sin base de datos, y la regla de imágenes no aplica sin `<img>`. `financial-format` no registra rechazos.
- **Aplicación y conflictos:** consultar y aplicar las skills cuyo alcance coincida con la tarea; explicar brevemente por qué se omite una recomendación relevante. En caso de conflicto, prevalecen las instrucciones del usuario y las reglas del proyecto; entre skills, elegir la más específica y explicar conflictos materiales.
- **Ciclo de vida de skills:** antes de instalar, revisar este registro y los `SKILL.md` existentes para detectar solapamientos. `.agents/skills/<nombre>/SKILL.md` es la ruta canónica para skills externas; `.skills/<nombre>/SKILL.md` es la ruta para la skill interna (según enunciado). Para skills de GitHub, verificar fuente, ruta del repositorio y hash de contenido en `skills-lock.json`. Actualizaciones y retiros deben actualizar lockfile y registro en el mismo cambio, preservando procedencia y motivo.