# Tech Context — Stack, dependencias, base de datos y Docker

> Evidencia extraída de `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `backend/requirements.txt`, `frontend/package.json`, `frontend/vite.config.ts` y código fuente.

## Stack en una frase

**Backend FastAPI (Python 3.13) + Frontend React 19 / TypeScript / Vite 8 / Tailwind 4 / Recharts 3**, orquestados con **Docker Compose**.

## Backend

### Runtime y dependencias (`backend/requirements.txt`)

| Dependencia | Propósito (uso en código) |
|---|---|
| `fastapi` | Framework REST (`backend/app/main.py`) |
| `uvicorn[standard]` | Servidor ASGI (CMD en `backend/Dockerfile`) |
| `debugpy` | Debugger escuchando en `0.0.0.0:5678` (CMD del Dockerfile) |
| `pytest` + `pytest-cov` | Tests + cobertura (`backend/tests/`) |
| `httpx` | Cliente HTTP para `TestClient` de FastAPI (ver `backend/tests/test_routes.py`) |

### Imagen base y arranque (`backend/Dockerfile`)

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000 5678
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- Python 3.13, puertos **8000 (API)** y **5678 (debugpy)**, `--reload` activo.
- Punto de entrada: `app.main:app` → `FastAPI(title="Financial Metrics API")` (`backend/app/main.py`), middleware CORS `allow_origins=["*"]`, incluye el router de `app.routes`.

## Frontend

### Dependencias (`frontend/package.json`)

| Dependencia | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | ^19.2.4 | UI (`frontend/src/main.tsx` monta con `createRoot` + `StrictMode`) |
| `recharts` | ^3.8.1 | Gráficas (`income-outcome-chart.tsx`, `profit-percent-chart.tsx`) |
| `lucide-react` | ^1.8.0 | Iconos (dashboard-header, kpi-row) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | … | Primitivas shadcn/ui (`components/ui/*`, `lib/utils.ts` `cn`) |
| Dev: `vite`, `typescript ~6.0.2`, `tailwindcss ^4.2.2` (+`@tailwindcss/vite`), `@vitejs/plugin-react`, `typescript-eslint`, `eslint`, `vitest ^4.1.4` (+`@vitest/coverage-v8`) | … | Build, lint y test |

### Scripts (`frontend/package.json`)

```json
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "eslint .",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Variables de entorno

- `VITE_API_BASE_URL` — opcional; `frontend/src/App.tsx` usa `import.meta.env.VITE_API_BASE_URL ?? ""` (documentada en `frontend/.env.example`). Vacío por defecto → peticiones al mismo origen `/api/metrics`.

## Base de datos

**No hay base de datos ni capa de persistencia.** Los datos son generados aleatoriamente en memoria en cada request (`generate_mock_movements(seed=42)` en `backend/app/routes.py`). Ningún archivo del repo indica ORM, driver o servicio de almacenamiento.

## Docker Compose (`docker-compose.yml`)

```yaml
services:
  frontend:
    build: ./frontend   # node:24-alpine
    ports: ["5173:5173"]
    volumes: [./frontend:/app, /app/node_modules]
    depends_on: [backend]

  backend:
    build: ./backend    # python:3.13-slim
    ports: ["8000:8000", "5678:5678"]
    volumes: [./backend:/app]
```

| Servicio | Imagen | Puerto(s) | Notas |
|---|---|---|---|
| `frontend` | `node:24-alpine` | `5173` | `CMD npm run dev -- --host 0.0.0.0 --port 5173`; bind-mount de `./frontend` con `node_modules` anonimizado |
| `backend` | `python:3.13-slim` | `8000`, `5678` | bind-mount de `./backend`; debugpy + uvicorn `--reload` |

Levantar todo: `docker compose up --build`

### Comunicación frontend → backend (proxy, `frontend/vite.config.ts`)

```ts
server: {
  host: "0.0.0.0",
  proxy: {
    "/api": { target: "http://backend:8000", changeOrigin: true },
  },
},
```

- **El target usa el hostname Docker `http://backend:8000`, NO `localhost`.** Funciona dentro de la red de Compose; **fuera de Docker** hay que definir `VITE_API_BASE_URL` (hallazgo D1 en `findings.md`).
- Alias `@` → `./src` configurado en el mismo archivo (`path.resolve(__dirname, "./src")`).

## Documentación API

- `/docs` (Swagger UI) y `/redoc` generados por FastAPI (verificado con `curl` → `200`).
- OpenAPI en `/openapi.json`.

## Herramientas de calidad (ejecutadas y verificadas en esta auditoría)

| Herramienta | Resultado verificado |
|---|---|
| `python -m pytest -q` (backend) | **15 passed** (`backend/tests/test_routes.py` + `conftest.py`) |
| `npm test` (frontend, Vitest) | **5 passed** (`frontend/src/lib/financial-utils.test.ts`) |
| `npm run lint` (eslint) | sin errores |
| `npm run build` (`tsc -b && vite build`) | OK (chunk JS ~584 kB, aviso Vite >500 kB — hallazgo D4) |

## Notas de configuración relevantes

- `frontend/tsconfig*.json`: project references + alias `@/*` + strict flags.
- `frontend/index.css`: Tailwind v4 (`@import "tailwindcss"`) + variables de tema dark y colores de chart (`--chart-income`, `--chart-outcome`, `--chart-profit`).
- `.vscode/` y `.gitignore` presentes; AGENTS.md apunta a `./.agents/rules`, `./.agents/skills` y `./memory-bank` como contexto para agentes.