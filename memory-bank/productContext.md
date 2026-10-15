# Product Context — Visión y funcionalidad

> Estado: respaldado estrictamente por el código del repositorio (verificación 2026-10-14 + ejecución real de tests).
> Fuentes: `backend/app/*`, `frontend/src/*`, `verification.md`, `findings.md`.

## Qué es este proyecto

Un **dashboard de métricas financieras de una sola página** (`frontend/src/App.tsx`) alimentado por una **API REST FastAPI** (`backend/app/main.py`, `backend/app/routes.py`) que expone **datos mock generados en memoria**.

### Por qué existe el producto

- **Backend** (`backend/app/routes.py`): genera **datos mock deterministas con `seed=42`** (`generate_mock_movements(seed=42)` se invoca en los 8 endpoints `/api/metrics*`) y los expone vía REST con modelos Pydantic.
- **Frontend** (`frontend/src/App.tsx`): hace **una sola petición a `/api/metrics`**, calcula los indicadores en el cliente (`frontend/src/lib/financial-utils.ts`) y los visualiza con **Recharts**.
- No hay base de datos ni archivos de datos precargados: todo se genera aleatoriamente en memoria en cada request (`generate_mock_movements`, `backend/app/routes.py`).

## Funcionalidad visible (respaldada por código)

### Cabecera (`frontend/src/components/dashboard/dashboard-header.tsx`)

- Título: **"Financial Overview"**, subtítulo: **"Executive metrics dashboard"**.
- Badge de periodo derivado en `App.tsx`:

```tsx
const period = loading
  ? "Loading..."
  : monthlyData.length > 0
    ? `${monthlyData[0].month} - ${monthlyData[monthlyData.length - 1].month}`
    : "No data";
```

  (El periodo **ya no está hardcodeado**; se deriva de `monthlyData[0].month` y `monthlyData[last].month` con estados `Loading...` y `No data`.)

### KPIs (`frontend/src/components/dashboard/kpi-row.tsx` + `kpi-card.tsx`)

| KPI | Cálculo (fuente) | Label |
|---|---|---|
| Total Income | suma de movimientos `operation_type === "income"` (`computeKPIs` en `financial-utils.ts`) | `Total Income` |
| Total Outcome | suma de movimientos `operation_type === "outcome"` | `Total Outcome` |
| Profit | `totalIncome - totalOutcome` | `Profit` |
| Profit Margin | `profit / totalIncome * 100` (si `totalIncome > 0`, si no `0`) | `Profit Margin` |

- Muestran `—` cuando no hay métricas y skeletons mientras `loading` (verificado en `kpi-card.tsx`).

### Gráficas (sección "Financial charts" en `App.tsx`)

- **Ingresos vs. Gastos mensuales**: `IncomeOutcomeChart` (`frontend/src/components/dashboard/income-outcome-chart.tsx`).
- **Margen % mensual con `ReferenceLine y=0`**: `ProfitPercentChart` (`frontend/src/components/dashboard/profit-percent-chart.tsx`).

### Estados de carga y error

- `App.tsx` maneja `loading` (estado inicial `true` → `false` en `.finally`) y `error`:
  - Mensaje mostrado: *"No se pudo cargar la informacion financiera. Revisa la API de backend."* (`.catch`).
  - Al renderizar, muestra un `div` con `border-destructive/30` cuando hay error.
- **La UI solo consume `/api/metrics`** (1 petición). El resto de endpoints existen en backend con tests, pero la pantalla actual **no** los usa (ver `verification.md` ❌-corregido #3).

## Datos que maneja el producto

### Modelo de negocio (contrato, `backend/app/routes.py` + `frontend/src/lib/financial-types.ts`)

```python
# backend/app/routes.py
OperationType = Literal["income", "outcome"]
Category = Literal["suppliers", "sales", "operational", "administrative", "others"]
BusinessType = Literal["B2B", "B2C"]
GroupBy = Literal["day", "week", "month"]
```

`FinancialMovement`: `create_date: date`, `amount: float`, `operation_type`, `category`, `business_type`.

### Volumen y rango real

- **360 movimientos/año** (12 meses × 30, verificado por el test `test_generate_mock_movements_returns_full_year_sorted_data` → `len == 360`).
- **Año móvil (rolling year)** relativo a `date.today()` (función `_year_for_month` y `_build_movement`). En la verificación real: `min_date=2025-10-02`, `max_date=2026-09-28` (NO es un dataset estático de 2024).
- Probabilidades base: 55% B2B vs 45% B2C; income → categoría `sales` (90%) u `others`; outcomes repartidos entre `suppliers | operational | administrative | others` (`_build_movement`).

## Funcionalidad de la API no consumida por la UI (disponible con tests)

| Endpoint | Qué hace |
|---|---|
| `GET /api/metrics/facets` | Opciones de filtro + `min_date`/`max_date` |
| `GET /api/metrics/summary` | Serie income/outcome/net agrupada por `day\|week\|month` |
| `GET /api/metrics/categories/top` | Top categorías por `operation_type` (default `outcome`, `limit` 1–20) |
| `GET /api/metrics/comparison` | Periodo actual vs. previo (`delta_abs`, `delta_pct`); requiere `start_date` y `end_date` |
| `GET /api/metrics/alerts` | Alertas de aumento de gasto sobre media histórica (`threshold` default `0.3`) |
| `GET /api/metrics/b2b` y `GET /api/metrics/b2c` | Movimientos filtrados por business type |

## Aspecto de producto a tener en cuenta

- **Contenido del dashboard en inglés** (labels "Total Income", "Total Outcome", "Profit Margin", "Financial Overview").
- **Mensaje de error de la UI en español** (texto en `App.tsx`): convivencia de idiomas documentada como hallazgo en `findings.md` (N2).
- **`frontend/src/lib/mock-data.ts` es código muerto/legacy**: exporta `mockMovements` (dataset estático 2024, 57 registros) pero **no se importa en ningún sitio** (verificado por `grep`); la UI usa la API, no este dataset (ver `verification.md` ✅ #23 y ❌-corregido #1/#6).