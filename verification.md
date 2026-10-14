# verification.md — Rastro de Verificación del Repositorio

> Auditoría exhaustiva del repositorio `ai-eng-financial-dashboard-context-project`.
> Fecha de verificación: **2026-10-14**.
> Método: inspección de código fuente + ejecución real (pytest, vitest, build, lint, servidor uvicorn y peticiones HTTP a todos los endpoints).

---

## 1. Instrucciones de Ejecución

### Servicios y puertos reales (respaldados por código)

| Servicio | Descripción | Puerto real (código) | Base del respaldo |
|---|---|---|---|
| `backend` | API FastAPI (uvicorn) + debugger debugpy | `8000` (API) / `5678` (debugpy) | `docker-compose.yml` líneas 18‑20 (puertos) y 14‑22 (servicio); `backend/Dockerfile` (`EXPOSE 8000 5678` en línea 10 y `CMD` con `--port 8000` en línea 12) |
| `frontend` | Dev server Vite (React + TS) | `5173` | `docker-compose.yml` línea 7 (puerto `5173:5173`); `frontend/Dockerfile` (`EXPOSE 5173` en línea 10, `CMD npm run dev -- --host 0.0.0.0 --port 5173` en línea 12) |

**docker-compose.yml** define el orden: `frontend` depende de `backend` (`depends_on`), con volúmenes bind-mount y `npm install` en `frontend/Dockerfile`. El backend arranca con `--reload` y debugpy en `0.0.0.0:5678`.

### Cómo levantar todo el stack

```bash
docker compose up --build
```

- Frontend: **http://localhost:5173** → “Financial Overview” (dashboard).
- Backend: **http://localhost:8000**
- Documentación API: **http://localhost:8000/docs** (Swagger UI, verificado con `curl -o /dev/null -w "%{http_code}"` → `200`) y `openapi.json` → `200`.

### Cómo levantar y verificar servicios por separado (sin Docker)

**Backend (FastAPI):**

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q            # 15 tests ✓ (verificado)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verificación por HTTP (todas verificadas en vivo, todas responden `200`):

```bash
curl http://localhost:8000/health                  # {"status":"ok"}
curl http://localhost:8000/api/metrics             # lista completa de movimientos
curl http://localhost:8000/api/metrics/facets      # facets de filtros + rango de fechas
curl http://localhost:8000/api/metrics/summary?group_by=month
curl http://localhost:8000/api/metrics/categories/top?operation_type=outcome&limit=3
curl http://localhost:8000/api/metrics/comparison?start_date=2025-03-01&end_date=2025-03-31
curl http://localhost:8000/api/metrics/alerts?threshold=0.2&group_by=month
curl http://localhost:8000/api/metrics/b2b
curl http://localhost:8000/api/metrics/b2c
curl http://localhost:8000/docs                    # Swagger UI
```

**Frontend (Vite):**

```bash
cd frontend
npm install
npm test                    # 5 tests vitest ✓ (verificado)
npm run lint                # sin errores ✓ (verificado)
npm run build               # build tsc + vite ✓ (verificado)
npm run dev -- --host 0.0.0.0 --port 5173
```

### Ruta de comunicación frontend → backend (proxy)

`frontend/vite.config.ts` define un proxy de desarrollo:

```ts
server: {
  host: "0.0.0.0",
  proxy: {
    "/api": { target: "http://backend:8000", changeOrigin: true },
  },
}
```

- **Importante:** el target usa el hostname de Docker `http://backend:8000`, no `localhost`. Dentro de la red de `docker compose` funciona; ejecutando Vite fuera del contenedor apuntará al host docker (o fallará). El README lo describe como “Vite proxy para `/api` por defecto”.
- El frontend lee `VITE_API_BASE_URL` (`frontend/src/App.tsx`): `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";`. Si no se define, usa `""` → las peticiones van a `/api/metrics` del mismo origen (proxy). El archivo `frontend/.env.example` documenta esta variable (verificado su contenido vía terminal).

---

## 2. Resumen del Proyecto

### ¿Qué hace la app?

Dashboard de métricas financieras de **una sola página**:

1. **Backend FastAPI** (`backend/app/routes.py` + `backend/app/main.py`) genera **datos mock aleatorios pero con semilla fija (`seed=42`)** y los expone vía REST. Los datos son **un año móvil (rolling year)** calculado desde `date.today()` — no datos estáticos de 2024.
2. **Frontend React + TypeScript** (`frontend/src/App.tsx`) hace **una sola petición** a `/api/metrics`, calcula KPI y series mensuales en el cliente (`frontend/src/lib/financial-utils.ts`) y las gráficas con Recharts.

### Componentes y conexión (citas de rutas exactas)

#### Backend

| Ruta | Responsabilidad | Archivo exacto |
|---|---|---|
| `backend/app/main.py` | Crea `app = FastAPI(title="Financial Metrics API")`, CORS `*`, incluye el router. | `backend/app/main.py` |
| `backend/app/routes.py` | Define modelos Pydantic (`FinancialMovement`, `MetricsFacets`, `MetricsSummaryItem`, `TopCategoryItem`, `MetricsComparison`, `MetricsAlert`), generador de datos `generate_mock_movements(seed=42)` y **9 endpoints** del router. | `backend/app/routes.py` |

Endpoints registrados (verificados por enumeración del router y por HTTP):

1. `GET /health` → `{"status": "ok"}`
2. `GET /api/metrics` → lista de `FinancialMovement` (filtros `start_date`, `end_date`, `category`, `operation_type`)
3. `GET /api/metrics/facets` → opciones de filtro + `min_date`/`max_date`
4. `GET /api/metrics/summary` → serie `income`/`outcome`/`net` agrupada por `day|week|month`
5. `GET /api/metrics/categories/top` → top categorías por `operation_type`
6. `GET /api/metrics/comparison` → comparación del periodo actual vs. previo (`delta_abs`, `delta_pct`) — requiere `start_date` y `end_date`
7. `GET /api/metrics/alerts` → alertas por aumento de gasto sobre la media histórica (`threshold` default `0.3`)
8. `GET /api/metrics/b2b` → movimientos B2B
9. `GET /api/metrics/b2c` → movimientos B2C

Core de datos (todos en `backend/app/routes.py`): `_year_for_month`, `_build_movement`, `generate_mock_movements`, `filter_movements_by_date`, `filter_movements`, `ensure_chronological_order`, `build_metrics_facets`, `summarize_movements`, `build_top_categories`, `calculate_net_value`, `detect_outcome_alerts`.

#### Frontend

| Módulo | Responsabilidad | Archivo exacto |
|---|---|---|
| `App.tsx` | Punto de entrada de la UI: fetch de `/api/metrics`, estados `metrics`/`monthlyData`/`loading`/`error`, render de header + KPIs + 2 gráficas. | `frontend/src/App.tsx` |
| `main.tsx` | Monta React (`createRoot` + `StrictMode`). | `frontend/src/main.tsx` |
| `financial-types.ts` | Tipos `OperationType`, `Category`, `BusinessType`, `FinancialMovement`, `KPIMetrics`, `MonthlyDataPoint`. | `frontend/src/lib/financial-types.ts` |
| `financial-utils.ts` | `computeKPIs`, `computeMonthlyData`, `formatCurrency`, `formatPercent` (lógica de negocio del cliente). | `frontend/src/lib/financial-utils.ts` |
| `mock-data.ts` | Exporta `mockMovements` (dataset estático 2024 de **57 registros**, conteo verificado con `awk`). **⚠️ No se importa en ningún sitio** (verificado por grep) → código muerto/legacy. | `frontend/src/lib/mock-data.ts` |
| `dashboard-header.tsx` | Cabecera con título “Financial Overview” y badge de periodo (default **“2024 — Full Year”**). | `frontend/src/components/dashboard/dashboard-header.tsx` |
| `kpi-row.tsx` y `kpi-card.tsx` | 4 KPI cards: Total Income, Total Outcome, Profit, Profit Margin (con skeletons en carga). | `frontend/src/components/dashboard/kpi-row.tsx` y `kpi-card.tsx` |
| `income-outcome-chart.tsx` | Gráfica de líneas Ingresos vs. Gastos mensuales (Recharts). | `frontend/src/components/dashboard/income-outcome-chart.tsx` |
| `profit-percent-chart.tsx` | Gráfica de línea del margen % mensual con `ReferenceLine y=0`. | `frontend/src/components/dashboard/profit-percent-chart.tsx` |
| `ui/card.tsx`, `ui/skeleton.tsx` | Primitivas shadcn/ui (Card, Skeleton). | `frontend/src/components/ui/*` |
| `lib/utils.ts` | Helper `cn` (clsx + tailwind-merge). | `frontend/src/lib/utils.ts` |
| `index.css` | Tailwind v4 + variables CSS (tema dark, colores `--chart-income`, `--chart-outcome`, `--chart-profit`, badges). | `frontend/src/index.css` |

#### Configuración

- `frontend/vite.config.ts` → alias `@`→`./src`, plugin React + Tailwind, proxy `/api`.
- `frontend/package.json` → scripts `dev`, `build` (`tsc -b && vite build`), `lint`, `test` (`vitest run`), `test:coverage`; React 19, Vite 8, TS ~6.0, Recharts 3.x, Vitest 4.x.
- `frontend/tsconfig*.json` → project references, `@/*` path alias, strict flags.
- `backend/requirements.txt` → `fastapi`, `uvicorn[standard]`, `debugpy`, `pytest`, `pytest-cov`, `httpx`.

### Pruebas existentes

- Backend: `backend/tests/test_routes.py` (**15 funciones `test_`**, cuenta verificada con `grep -c '^def test_'`) + `backend/tests/conftest.py` (agrega `backend/` a `sys.path`). **15 passed** (verificado con `pytest -q`).
- Frontend: `frontend/src/lib/financial-utils.test.ts` (**5 tests** con Vitest). **5 passed** (verificado con `npm test`).

---

## 3. Tabla / Rastro de Verificación

Leyenda: **✅ Verificado** (respaldado por archivos/ejecución real) · **❌ Incorrecto/Corregido** (se detectó un supuesto o “alucinación” respecto al repo y se corrige) · **❓ Sin verificar** (ambiguo en código).

### ✅ Afirmaciones verificadas

| # | Afirmación | Evidencia | Estado |
|---|---|---|---|
| 1 | Backend es FastAPI | `backend/app/main.py` → `FastAPI(title="Financial Metrics API")`; `requirements.txt` | ✅ |
| 2 | Frontend es React + TypeScript + Vite + Tailwind | `frontend/package.json`; `vite.config.ts`; `index.css` (`@import "tailwindcss"`) | ✅ |
| 3 | Backend expone `/health` y 8 rutas `/api/metrics*` (total: 9 endpoints del router) | `backend/app/routes.py` (enumeración del router: 9 rutas — 1 `/health` + 8 `/api/metrics*`) | ✅ |
| 4 | Puerto backend = 8000, debugpy = 5678 | `docker-compose.yml`; `backend/Dockerfile` (`EXPOSE 8000 5678`, CMD `--port 8000`) | ✅ |
| 5 | Puerto frontend = 5173, host `0.0.0.0` | `docker-compose.yml` (línea 7); `frontend/Dockerfile` (`EXPOSE 5173`, CMD `--host 0.0.0.0 --port 5173`); `vite.config.ts` (`server.host: "0.0.0.0"`) | ✅ |
| 6 | Levantar todo con `docker compose up --build` | `docker-compose.yml` (ambos servicios con `build`) | ✅ |
| 7 | Docs API en `/docs` (Swagger UI) | `curl http://localhost:8000/docs` → `200`; rutas `/docs`, `/redoc` registradas | ✅ |
| 8 | `/health` devuelve `{"status":"ok"}` | Ejecución real: `curl /health` → `{"status":"ok"}`; test `test_health_endpoint_returns_ok` | ✅ |
| 9 | Datos mock con `seed=42` determinista | `backend/app/routes.py`: `generate_mock_movements(seed=42)` en los 8 endpoints `/api/metrics*` (el `/health` no genera datos) | ✅ |
| 10 | 360 movimientos/año (12 meses × 30) | `generate_mock_movements` (bucle 12 × 30); test `test_generate_mock_movements_returns_full_year_sorted_data` (`len == 360`) | ✅ |
| 11 | 15 tests backend pasan | `python -m pytest -q` → `15 passed` | ✅ |
| 12 | 5 tests frontend pasan | `npm test` → `5 passed` | ✅ |
| 13 | Build frontend sin errores | `npm run build` → `✓ built` (tsc + vite) | ✅ |
| 14 | Lint frontend sin errores | `npm run lint` → sin salida de errores | ✅ |
| 15 | Frontend consume `/api/metrics` vía `fetch` | `frontend/src/App.tsx` → `fetch(\`${API_BASE_URL}/api/metrics\`)` | ✅ |
| 16 | Proxy de Vite `/api` → backend | `frontend/vite.config.ts` (`target: "http://backend:8000"`) | ✅ |
| 17 | `VITE_API_BASE_URL` opcional (defecto `""`) | `frontend/src/App.tsx` + `frontend/.env.example` | ✅ |
| 18 | KPIs/series se calculan en el cliente | `frontend/src/lib/financial-utils.ts` (`computeKPIs`, `computeMonthlyData`) | ✅ |
| 19 | CORS abierto (`*`) en backend | `backend/app/main.py` (`CORSMiddleware`, `allow_origins=["*"]`) | ✅ |
| 20 | Modelos Pydantic para cada respuesta | `backend/app/routes.py` (6 clases `...Model`) | ✅ |
| 21 | Árbol de trabajo limpio (excepto este doc) | `git status --short` solo muestra `?? verification.md` (este archivo, aún sin versionar). Durante la auditoría se generó accidentalmente `backend/package-lock.json` (por un `npm install` ejecutado desde el cwd incorrecto); fue **eliminado** y verificado que no queda rastro. HEAD `954f812` | ✅ |
| 22 | `.agents/` y `memory-bank/` referenciados pero **no existen** en el repo | `AGENTS.md` + `README.md` los mencionan como estructura esperada; `file_search` no encuentra `/`.agents/` ni `/memory-bank/` | ✅ (existencia ausente verificada) |
| 23 | `mock-data.ts` es código muerto | `grep "mock-data\|mockMovements"` → solo se encuentra dentro del propio archivo; no hay imports | ✅ |
| 24 | Favicon en `frontend/public/favicon.svg` y referenciado en `index.html` | `index.html` → `<link rel="icon" ... href="/favicon.svg">`; `public/favicon.svg` existe | ✅ |
| 25 | Datos del backend = año móvil (rolling year), no 2024 | Ejecución real: `/api/metrics/facets` → `min_date=2025-10-02`, `max_date=2026-09-28`; generados con `date.today()` y `_year_for_month` | ✅ |

### ❌ Incorrecto / Corregido (supuestos o alucinaciones detectadas)

| # | Supuesto / “Alucinación” inicial | Corrección respaldada por el repo | Estado |
|---|---|---|---|
| 1 | “El dashboard muestra datos **estáticos de 2024** (los de `mock-data.ts`)” | ❌ Falso. El frontend **no usa** `mock-data.ts` (código muerto). La API genera un **año móvil** relativo a `date.today()` con `seed=42` (`backend/app/routes.py`). El título estático “2024 — Full Year” (`dashboard-header.tsx`) **no coincide** con los datos reales (2025‑10 → 2026‑09 verificados). | ❌ → Corregido |
| 2 | “El proxy de Vite apunta a `localhost:8000`” | ❌ Falso. Apunta a **`http://backend:8000`** (hostname de la red Docker), ver `frontend/vite.config.ts`. Fuera de Docker no funcionará sin `VITE_API_BASE_URL`. | ❌ → Corregido |
| 3 | “El frontend consume múltiples endpoints (summary, top categories, alerts, comparison…)” | ❌ Falso. `App.tsx` solo hace **1 petición a `/api/metrics`**. El resto de endpoints existen en backend y tienen tests, pero **no** los usa la UI actual. | ❌ → Corregido |
| 4 | “El periodo mostrado en la cabecera se calcula de los datos” | ❌ Falso. Es un **string hardcodeado** `"2024 — Full Year"` (default en `dashboard-header.tsx`), pasado literalmente desde `App.tsx`: `<DashboardHeader period="2024 - Full Year" />`. | ❌ → Corregido |
| 5 | “El backend sirve datos estáticos precargados o desde una DB” | ❌ Falso. No hay base de datos ni archivos de datos: todo es generado aleatoriamente en memoria en cada request (`generate_mock_movements`). | ❌ → Corregido |
| 6 | “Los datasets del frontend y del backend coinciden” | ❌ Falso. `frontend/src/lib/mock-data.ts` (2024, **57 registros**, importes `3200–96800` verificados) y la API (rolling year, 360 movimientos, importes `514–11984` verificados con `seed=42`) son **inherentemente distintos**. El frontend usa la API. | ❌ → Corregido |
| 7 | “El stack se puede verificar entero con `docker compose up` en cualquier entorno” | Parcialmente ❌. Los puertos/volúmenes están correctos, pero el contenedor frontend depende del hostname docker `backend` para el proxy; además el bind-mount `./frontend:/app` + `npm install` en build puede requerir reinstalar dependencias si `node_modules` no se monta correctamente. Se recomienda la verificación local por separado documentada arriba. | ❌ → Corregido (matiz) |
| 8 | “Hay un banco de memoria (`memory-bank/`) que los agentes deben consultar” | ❌ Falso en este snapshot. `AGENTS.md` y `README` lo describen, pero el directorio **no existe** en el repo actual. | ❌ → Corregido |

### ❓ Sin verificar (ambigüedades en código)

| # | Tema | Por qué queda ❓ |
|---|---|---|
| 1 | Semántica del endpoint `/api/metrics/comparison` | Su `delta_pct` usa `abs(previous_net)` y devuelve `None` si `previous_net == 0`, y requiere `start_date`/`end_date` obligatorios. Ningún test ni UI valida su **semántica de negocio** (solo que devuelve las 4 claves). Ambiguo si el cálculo es el deseado. |
| 2 | Algoritmo de alertas `detect_outcome_alerts` | Usa la media histórica acumulada de periodos **anteriores**; no hay especificación externa ni UI que la consuma → interpretación ambigua del umbral/default `0.3`. |
| 3 | Agrupación por semana (`isocalendar` → `"YYYY-Wnn"`) | El formato es una convención interna sin consumidor real; ningún UI lo muestra. Ambigüedad en el formato canónico esperado. |
| 4 | Filtro `business_type` inconsistente entre endpoints | `summary`, `top`, `comparison`, `alerts` lo soportan; `/api/metrics` y `/api/metrics/facets` **no** lo soportan (no está en la firma). Posible inconsistencia de diseño no documentada. |
| 5 | Semilla `random.seed(seed)` global | `generate_mock_movements` llama a `random.seed`, que afecta al estado **global** de `random`; si otro código dependiera del RNG podría romperse. Nadie más lo usa hoy. |
| 6 | `_year_for_month` y el “año móvil” según la fecha del servidor | El rango depende de `date.today()` del servidor (zona horaria). Si el servidor corre en otra zona o el test se ejecuta en otro día, `min_date`/`max_date` cambian. El test de facets solo valida `min_date <= max_date`, no valores concretos. |
| 7 | Chunk del bundle frontend > 500 kB | `vite build` emite warning “chunks larger than 500 kB” (584 kB JS). No hay code-splitting. Sin impacto funcional, pero sin optimizar. |
| 8 | `allow_credentials=True` junto a `allow_origins=["*"]` | Combinación considerada inválida/insegura por algunos navegadores/validadores HTTP (no puede combinarse con wildcard en credenciales). No se ha podido validar comportamiento en navegador aquí. |
| 9 | Contenedor frontend en entornos no-Docker | El proxy `http://backend:8000` solo resuelve dentro de la red docker; ejecutar `npm run dev` puro en el host sin backend disponible degrada la app (mensaje de error en `App.tsx`). No validado end-to-end en navegador en este entorno. |
| 10 | Interfaz visual final (dark theme) | No se ha podido renderizar el navegador; el theme `.dark` se fuerza con `className="dark"` en `App.tsx` y las variables CSS existen, pero el render visual no fue comprobado. |

---

## Nota metodológica rápida

- **Verificado por ejecución**: 15 tests pytest ✓, 5 tests vitest ✓, `npm run build` ✓, `npm run lint` ✓, servidor uvicorn levantado y los **9 endpoints** consultados por HTTP (todos `200`), `/docs` y `/openapi.json` `200`.
- **Verificado por inspección de código**: rutas, modelos, configuración de puertos, proxy, CSS vars, types.
- Archivos creados durante la verificación local (no versionados): `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/` — todos cubiertos por `.gitignore`.