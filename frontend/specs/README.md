# Dashboard Financiero — Especificaciones

> **Punto de entrada para una sesión nueva del agente.**
>
> Cada funcionalidad enlaza a los tipos (`api-types.ts`, `param-types.ts`) y
> a las especificaciones detalladas (`components.md`, `pm-brief.md`, `verification.md`).
> No duplica código ni tipos — enlaza y referencia.
>
> **Tipos (P3-a):** al implementar, los tipos de `api-types.ts` y `param-types.ts` se mueven a `src/lib/api-types.ts` y `src/lib/param-types.ts` (fuente única, dentro de `include` de `tsconfig.app.json`). Los archivos de `specs/` pasan a reexportarlos.
>
> **Idioma (P2-b):** todos los textos visibles de la UI en inglés y formatos `en-US`. Esta documentación sigue en español.

---

## Funcionalidad 1 — Filtro de rango de fechas en el dashboard principal

**Requisito PM:** [pm-brief.md](./pm-brief.md) · Funcionalidad 1 — El equipo de finanzas quiere centrarse en períodos concretos sin ver todos los datos a la vez.

### Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/api/metrics/facets` | Obtener `min_date` y `max_date` del dataset (rango disponible). Sin parámetros. |
| `GET` | `/api/metrics` (y derivados) | Acepta `start_date` y `end_date` opcionales para filtrar. |

### Tipos relacionados

| Archivo | Tipo |
|---|---|
| [`api-types.ts`](./api-types.ts) | [`FacetsResponse`](./api-types.ts#L10) — respuesta con `min_date` y `max_date`. |
| [`param-types.ts`](./param-types.ts) | [`DateRangeFilter`](./param-types.ts#L9) — `start_date` y `end_date` opcionales. |
| [`param-types.ts`](./param-types.ts) | [`MetricsParams`](./param-types.ts#L101) — filtros adicionales (category, operation_type). |

### Parámetros

| Parámetro | ¿Obligatorio? | Valores válidos | Restricciones |
|---|---|---|---|
| `start_date` | No | `YYYY-MM-DD` | Si se envía, debe ser ≤ `end_date`. Vacío = sin límite inferior. |
| `end_date` | No | `YYYY-MM-DD` | Si se envía, debe ser ≥ `start_date`. Vacío = sin límite superior. |
| `category` | No | `"suppliers" \| "sales" \| "operational" \| "administrative" \| "others"` | — |
| `operation_type` | No | `"income" \| "outcome"` | — |

### Estados y casos límite

| Caso | Qué debe mostrar la UI |
|---|---|
| **Solo una fecha rellena** (ej. solo start_date) | El input relleno conserva su valor; el vacío queda en blanco con placeholder `YYYY-MM-DD`. La petición se envía **solo con el parámetro presente**; el endpoint trata el ausente como "sin límite". El usuario ve claramente qué lado del filtro está activo. |
| **Rango inválido** (start > end) | Ambos inputs muestran sus valores. Mensaje: `Start date cannot be after end date`. **`Apply` deshabilitado**; no se envía ninguna petición. |
| **Rango fuera del disponible** (fechas sin datos) | Los inputs tienen `min`/`max` = `min_date`/`max_date` (Q11-a), así que el selector nativo no permite elegir fuera. Si se escribe a mano o facets no cargó, la API devuelve vacío y KPIs, gráficos y tablas muestran sus estados vacíos (KPIs en `—`, gráficos `No data available to display` — U3-A). |
| **Cargando facets** | Inputs habilitados sin `min`/`max` (P15-a). Texto: `Available range: —`. |
| **Error al obtener facets** | Inputs habilitados sin `min`/`max` (Q10-a). Aviso `Could not load the available range` + botón `Retry`. |
| **Error inicial de datos (D-1)** | Primera carga de KPIs/gráficos falla y nunca hubo datos (`hasAppliedOnce === false`): `Failed to load financial data. Check the backend API.`, KPIs `—`, gráficos vacíos. Si ya hubo datos, Q20-A. |
| **Rango fuera del disponible (M-5)** | Con facets cargado y rango aplicado fuera de `[min_date, max_date]`: nota `No financial data in the selected range. Available: {min_date} – {max_date}` junto al filtro; los componentes muestran sus vacíos estándar. |
| **Aplicando** | Inputs habilitados; `Apply` deshabilitado con el texto `Applying…`. Un nuevo `Apply` cancela las peticiones anteriores con `AbortController` (P7-b). |

### Referencias adicionales

- [components.md](./components.md) — F1: props de `DateRangeFilter`, `FiltersContext`, estados detallados.
- [verification.md](./verification.md) — verificación de `GET /api/metrics/facets` ✅.

### Decisiones aplicadas (F1)

| Decisión | Descripción |
|---|---|
| **B2 + Q4-b / Q5-a** | **Un único botón `Apply`** confirma fechas, umbral y granularidad. Sin clic no hay refetch. |
| **Q6-B** | Estado inicial: los inputs arrancan **prefijados** a `min_date`–`max_date` (rango completo) cuando facets carga. |
| **J2 + P12-a** | Al aplicar se refetchean KPIs, gráficos y alertas. Facets no. |
| **Q8-a** | Rango aplicado compartido entre `/` y `/comparison` mediante `FiltersContext`. |
| **Q10-a + Q12-a** | Si falla facets, inputs habilitados + botón `Retry`. Con facets cargado, `min`/`max` en los inputs. |
| **Q16-B** | Health check al arranque: si `/api/metrics/facets` no responde, banner de error de arranque compartido (sin duplicar la petición, M-4: `FacetsProvider` en `App.tsx`). |
| **N1-a** | El filtro va en una fila propia bajo `DashboardHeader` y antes de los KPIs, con `Available range` a la derecha. |
| **P7-b / P15-a** | `AbortController` en los hooks; los inputs nunca se deshabilitan, solo `Apply` mientras hay peticiones en curso. |
| **P10-a** | Cabecera común con pestañas `Dashboard` / `B2B vs B2C`. La etiqueta muestra el rango aplicado o `All time`. |
| **P13-a** | No hay estado «Vacío» en F1 para facets; un dataset vacío llega como error de facets. Rango sin datos sí tiene estados vacíos por componente (U3-A). |
| **Q17-A** | UI en inglés (P2-b), incluido el error actual de `App.tsx` (se traduce). |

---

## Funcionalidad 2 — Tabla de alertas de anomalías en el dashboard principal

**Requisito PM:** [pm-brief.md](./pm-brief.md) · Funcionalidad 2 — Tabla que destaque períodos donde el gasto subió de forma inesperada, con umbral configurable.

### Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/api/metrics/summary?operation_type=outcome&group_by=<granularity>[&start_date=<date>][&end_date=<date>]` | Outcomes por período para calcular las alertas en frontend. **Con `start_date` y `end_date`** si el rango está activo (Q9-B). |

> `/api/metrics/alerts` **no se usa** (Q1-a): su media es expansiva, no de 3 períodos.

### Tipos relacionados

| Archivo | Tipo |
|---|---|
| [`api-types.ts`](./api-types.ts) | [`SummaryItem`](./api-types.ts#L89) / [`SummaryResponse`](./api-types.ts#L106) — `period`, `income`, `outcome`, `net`. |
| [`api-types.ts`](./api-types.ts) | [`ComputedAlert`](./api-types.ts#L112) — fila de la tabla calculada en frontend (Q13-b). |
| [`param-types.ts`](./param-types.ts) | [`SummaryParams`](./param-types.ts#L79) — `group_by`, `operation_type`, + `DateRangeFilter`. |

### Parámetros (F2)

| Parámetro | ¿Obligatorio? | Valores válidos | Restricciones |
|---|---|---|---|
| `threshold` (solo frontend) | No (default `0.30`) | `number` entre `0.01` y `1.0` (U2-A: se **clampa** a `[0.01,1.0]` y se redondea a 2 decimales) | Vacío o `NaN`: `Apply` deshabilitado. Comparación estricta `ratio > threshold` (Q3-a). |
| `group_by` | No (default `"month"`) | `"day" \| "week" \| "month"` | Formato de `period`: `YYYY-MM-DD` / `YYYY-Www` (año ISO, Q11-B/B-1) / `YYYY-MM`. |
| `operation_type` | Sí (fijo) | `"outcome"` | — |
| `start_date` | No | `YYYY-MM-DD` | **Se envía** (Q9-B). La media se calcula con los períodos dentro del rango; un período solo se evalúa si tiene 3 previos en el rango (Q10-B). |
| `end_date` | No | `YYYY-MM-DD` | Se envía tal cual. |

### Columnas de la tabla (F2)

Filas ordenadas por período descendente, lo más reciente primero (P9-b).

| Columna | Formato |
|---|---|
| `Period` | Q5-b / P2-b: `Dec 2025` (mes), `Week 05, 2025` (semana), `Dec 15, 2025` (día) |
| `Recorded outcome` | `formatCurrency(v, 2)` → `$103,378.98` (Q6-a) |
| `3-period moving average` | `formatCurrency(v, 2)`; con menos de 3 previos **sin rango de fechas**, nota `average of N periods` (Q3-b). Con rango de fechas, el período no se evalúa si no tiene 3 previos dentro del rango (Q10-B). |
| `Increase` | `102.01% ↑` / `45.00% ↓` / `0.00%` — valor absoluto + flecha según signo (Q7-B) |

### Estados y casos límite (F2)

| Caso | Qué debe mostrar la UI |
|---|---|
| **Threshold no válido** (vacío o `NaN`; fuera de rango se clampa — U2-A) | Borde rojo y mensaje `Threshold is required`. **`Apply` deshabilitado**. La tabla mantiene los últimos datos aplicados (Q20-A). El redondeo a 2 decimales ocurre solo al aplicar (M-2). |
| **Sin alertas** (threshold actual no detecta anomalías) | La tabla **no se oculta**. Mensaje: `No anomalies detected for threshold 0.30` (`toFixed(2)`). |
| **Períodos iniciales sin 3 períodos previos — sin filtro de fechas** | Se evalúan con la media de los 1 o 2 previos disponibles; si son alerta, la fila muestra `average of N periods` (Q3-b). El primer período del histórico nunca es alerta. |
| **`start_date` a mitad de período** | Ese período no se evalúa ni se muestra (P5-c), para no enseñar importes de fuera del rango. |
| **Período sin 3 previos **dentro del rango** (filtro activo, Q10-B)** | No se evalúa ni se muestra (no genera alerta). |
| **Media de previos = 0 (B-2)** | El ítem **no genera alerta** (ratio indefinido); `increase_ratio` nunca es `Infinity`. |
| **Cargando** | Skeleton con 4 columnas. Input de umbral y selector de granularidad habilitados (P15-a). |
| **Error en la petición** | No se renderiza la tabla. Mensaje: `Failed to load alerts. Please try again later.` Se conservan los últimos datos aplicados si vuelve tras un `Apply` con error (Q20-A). |
| **Dato parcial — rango sin datos** | Mensaje de vacío estándar. |

### Notas de implementación (F2)

- **Q1-a / Q9-a / P1-a:** `useAlerts({ threshold, granularity, startDate, endDate })` solo hace el fetch a `/summary` (**con `start_date` y `end_date`** — Q9-B). Las alertas las calcula la función pura `computeAlerts` de `financial-utils.ts` (algoritmo en [components.md](./components.md), F2 sección 3b). Sustituye a C2. `/alerts` no se usa (aprobado Q1-A).
- **P6-a + Q11-B + B-1:** utilidades de fecha propias en `financial-utils.ts` (`periodKeyOf`, `weekKey` con **año ISO** — igual a `isocalendar()` del backend —, `isPeriodStart`, `formatPeriod`), sin dependencias y sin `new Date("YYYY-MM-DD")`.
- **E2 + Q4-A:** Selector `GranularitySelect` junto al input de umbral. Valores: `"day"`, `"week"`, `"month"` (default `"month"`). Aprobado por el PM.
- **Q4-b:** umbral y granularidad solo se aplican con el botón `Apply`.
- **R1-b (ubicación):** `Card` a ancho completo bajo el grid de gráficos, con título `Spending alerts`; `ThresholdInput` y `GranularitySelect` en el `CardHeader`, `AlertsTable` en el `CardContent`.
- **U2-A:** el umbral se clampa a `[0.01, 1.0]` (2 decimales) antes de usarse; vacío/`NaN` bloquean `Apply`.
- **Q7-B:** la columna `Increase` muestra el valor absoluto con flecha `↑`/`↓`.

### Referencias adicionales (F2)

- [components.md](./components.md) — F2: props de `AlertsTable`, `ThresholdInput`, `GranularitySelect`, algoritmo y estados.
- [verification.md](./verification.md) — verificación de `/summary`, de la media expansiva de `/alerts` y de la revisión 2026-10-15.

---

## Funcionalidad 3 — Vista comparativa B2B vs B2C

**Requisito PM:** [pm-brief.md](./pm-brief.md) · Funcionalidad 3 — Nueva página para comparar ingresos B2B vs B2C con top-5 categorías y gráfico comparativo.

### Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/api/metrics/categories/top?operation_type=income&limit=20&business_type=B2B&start_date=<date>&end_date=<date>` | Categorías de ingreso B2B: total del grupo con todas, tabla con las 5 primeras (R3-a). |
| `GET` | `/api/metrics/categories/top?operation_type=income&limit=20&business_type=B2C&start_date=<date>&end_date=<date>` | Igual para B2C. |
| `GET` | `/api/metrics/facets` | Rango de fechas y lista maestra de categorías (R2-a). |

### Tipos relacionados

| Archivo | Tipo |
|---|---|
| [`api-types.ts`](./api-types.ts) | [`CategoryEntry`](./api-types.ts#L64) — `category`, `operation_type`, `total_amount`. |
| [`api-types.ts`](./api-types.ts) | [`TopCategoriesResponse`](./api-types.ts#L80) — `CategoryEntry[]`. |
| [`api-types.ts`](./api-types.ts) | [`FacetsResponse`](./api-types.ts#L10) — `categories`, `min_date`, `max_date`. |
| [`param-types.ts`](./param-types.ts) | [`TopCategoriesParams`](./param-types.ts#L51) — `operation_type`, `limit`, `business_type`, + `DateRangeFilter`. |

### Parámetros

| Parámetro | ¿Obligatorio? | Valores válidos | Restricciones |
|---|---|---|---|
| `operation_type` | No (default `"outcome"`) | `"income" \| "outcome"` | Para esta funcionalidad siempre se usa `"income"`. |
| `limit` | No (default `5`) | `integer` entre `1` y `20` | Se usa `20` (R3-a); el frontend recorta a 5 para la tabla. |
| `business_type` | No | `"B2B" \| "B2C"` | Confirmado ✅ (D1). El backend acepta `BusinessType = Literal["B2B","B2C"]`. |
| `start_date` | No | `YYYY-MM-DD` | Filtro de fecha de inicio. |
| `end_date` | No | `YYYY-MM-DD` | Filtro de fecha de fin. |

### Columnas de CategoryRankingTable

| Columna | Formato |
|---|---|
| `Category` | Nombre capitalizado: `"sales"` → `"Sales"`, `"administrative"` → `"Administrative"`. |
| `Total income` | `formatCurrency(v, 2)` → `$1,132,097.38` (Q6-a) |
| `% of group` | `45.3%` (1 decimal). Fórmula: `(category.total_amount / groupTotal) * 100`. Si `groupTotal = 0` → `0.0%` (Q18-A). |

### Layout

```
+--------------------------------------------------+
|  DateRangeFilter                                  |
+--------------------------------------------------+
|  Panel B2B          |  Panel B2C                  |
|  CategoryRankingTable|  CategoryRankingTable       |
|  (top 5)             |  (top 5)                    |
+--------------------------------------------------+
|  ComparisonChart (B2B total vs B2C total)          |
+--------------------------------------------------+
```

### Estados y casos límite

| Caso | Qué debe mostrar la UI |
|---|---|
| **Menos de 5 categorías** (el dataset devuelve menos) | La tabla muestra solo las filas disponibles. No se rellena con filas vacías. Los porcentajes se calculan sobre el total real del grupo (R3-a). |
| **Categoría devuelta que no está en facets** | Se descarta de la tabla y del total (R2-a). Si facets no cargó, no se filtra. |
| **Grupo sin ingresos** (una línea de negocio sin datos en el rango) | Ese panel muestra `No income categories for B2B in the selected range` (o B2C). El gráfico dibuja la barra de ese grupo en **0** con etiqueta `$0` y la del otro grupo con su valor real. |
| **Rango sin datos** (ambos grupos sin ingresos) | Ambos paneles muestran el mensaje de vacío. El gráfico muestra ambas barras en **0** con el texto `No data for the selected period`. |
| **Cargando** | Skeleton de 5 filas en cada panel que carga. El gráfico muestra skeleton mientras cargue cualquier grupo (P4-a). Inputs de fecha habilitados; solo `Apply` deshabilitado (P15-a). |
| **Error en petición** | **Errores independientes (I1).** El panel que falla muestra `Failed to load B2B data. Please try again later.` y el otro se renderiza normal. **El gráfico no se dibuja**: aparece `Comparison unavailable: failed to load B2B data` (o `B2B and B2C data`) (P4-a). Tras un `Apply` con error, el panel sano conserva sus últimos datos aplicados (Q20-A). |
| **Error — ambos grupos fallan (D-4)** | Sin datos previos: ambos paneles con su error + gráfico sustituido por `Comparison unavailable: failed to load B2B and B2C data`. Con datos previos: Q20-A (conservar + aviso). El banner Q16-B solo aplica en el arranque global. |
| **Rango inválido** (start > end) | Mismo comportamiento que Funcionalidad 1: mensaje de error en inputs. No se envía petición. |

### Notas de implementación

- **A1 (ruteo):** `react-router-dom` con ruta `"/comparison"` para esta página. Enlace de navegación en `DashboardHeader`.
- **Q19-A (encabezado):** pestaña `B2B vs B2C` en el header compartido + H1 propio de la página `Revenue comparison — B2B vs B2C`.
- **G1 (capitalización):** Mapa fijo: `"sales"` → `"Sales"`, `"administrative"` → `"Administrative"`, `"operational"` → `"Operational"`, `"suppliers"` → `"Suppliers"`, `"others"` → `"Others"`.
- **H1 / Q7-a / Q14-A:** `ComparisonPage` no recibe props; usa `useFacets()` y `useComparison()`, este último con dos peticiones independientes (B2B y B2C), cada una con su `isLoading`/`error` (sin `Promise.all`).
- **Q8-a:** el rango de fechas aplicado se comparte con el dashboard vía `FiltersContext`.
- **Q12-a:** `ComparisonChart` es un `BarChart` de recharts con barras verticales lado a lado.
- **R3-a (totales de grupo) + Q13-A:** total = suma de todas las categorías devueltas con `limit=20`; la tabla muestra las 5 primeras. Sustituye a la Opción A (suma del top-5). Si el backend devuelve exactamente 20 filas, el total es un mínimo.
- **R2-a / U1-A / Q15-A (facets):** `FacetsResponse.categories` actúa como lista maestra global; las categorías de `/categories/top` que no estén en la lista se omiten (y no cuentan en el total). Si facets no cargó, no se filtra.
- **U5-A:** categorías con `total_amount = 0` se muestran tal cual (`$0`, `0.0%`).
- `business_type` en `TopCategoriesParams` está **confirmado** ✅ (D1).
- **P1-a:** `useComparison` solo hace fetch; el filtrado, el total y el top-5 los calcula la función pura `summarizeCategoryGroup` de `financial-utils.ts`.
- **P4-a:** `ComparisonChart` solo se dibuja si los dos grupos cargaron correctamente.
- **P14-a:** R2-a se cumple nominalmente. Hoy los ingresos solo usan `sales` y `others`, que siempre están en facets, así que el filtro no descarta nada.

### Referencias adicionales

- [components.md](./components.md) — F3: `ComparisonPage`, `BusinessPanel`, `CategoryRankingTable`, `ComparisonChart`, layout, estados.
- [verification.md](./verification.md) — decisión sobre cálculo de totales de grupo (Opción A).

---

## Resumen rápido de dependencias entre archivos

```
                     ┌──────────────────┐
                     │   pm-brief.md    │  ← Requisitos del PM (fuente original)
                     └────────┬─────────┘
                              │ verificación
                              ▼
                     ┌──────────────────┐
                     │ verification.md  │  ← Afirmaciones verificadas con curl + OpenAPI
                     └────────┬─────────┘
                              │ tipos y props
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  api-types.ts│ │param-types.ts│ │components.md │
     │  (respuestas)│ │ (parámetros) │ │  (props +     │
     │              │ │              │ │   estados)    │
     └──────────────┘ └──────────────┘ └──────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │    README.md     │  ← Este archivo (punto de entrada)
                     └──────────────────┘
```

> **Para el agente:** Este `README.md` es tu punto de partida. Cada funcionalidad enlaza a los tipos y especificaciones detalladas. No copies tipos — impórtalos o enlázalos. Consulta `components.md` para la especificación completa de props, estados y edge cases de cada componente React.

---

## Resumen de decisiones arquitectónicas

| Decisión | Código | Descripción |
|---|---|---|
| Ruteo | **A1** | `react-router-dom` con rutas `"/"` (dashboard) y `"/comparison"` (vista B2B vs B2C). |
| Propagación fechas | **B2** | Botón `Apply` explícito. Sin clic no hay refetch. |
| Media móvil 3 períodos | **C2 → Q1-a** | Alertas calculadas 100% en frontend desde `/api/metrics/summary`. `/alerts` no se usa (aprobado Q1-A). |
| Ventana con filtro de fechas | **Q9-B + P5-c** | `/summary` **con `start_date` y `end_date`**; la media se calcula dentro del rango y se descarta el período inicial si el rango empieza a mitad de él. Sustituye a Q2-a. |
| Menos de 3 previos | **Q3-b / Q10-B** | Sin filtro: media de los 1–2 previos con nota `average of N periods`. Con filtro: el período no se evalúa si no tiene 3 previos dentro del rango. |
| Umbral | **Q3-a + U2-A** | Comparación estricta `ratio > threshold`; clamp a `[0.01, 1.0]` (2 decimales); vacío/`NaN` bloquean `Apply`. |
| Cuándo se aplica | **Q4-b / Q5-a** | Un único `Apply` para fechas, umbral y granularidad. Sin clic no hay refetch. |
| Formato de período | **Q5-b + P2-b + Q11-B/B-1** | `day` = `YYYY-MM-DD`; se muestra como `Dec 2025` / `Week 01, 2026` (año ISO) / `Dec 15, 2025`. |
| Incremento de alerta | **Q7-B** | Valor absoluto + flecha `↑`/`↓` (ej. `102.01% ↑`, `0.00%`). |
| Decimales de moneda | **Q6-a** | `formatCurrency(value, decimals = 0)`. |
| Estado inicial del filtro | **Q6-B** | Inputs prefijados a `min_date`–`max_date`; `Apply` confirma (header `All time`). |
| `ComparisonPage` | **Q7-a** | Sin props; hooks internos; error y carga por panel. |
| Filtros entre rutas | **Q8-a** | `FiltersContext` compartido. |
| Hooks extra | **Q9-a** | `useMetrics`; `useAlerts` usa `/summary`. |
| Fallo de facets | **Q10-a / Q12-a** | Inputs habilitados + botón `Retry`; con facets cargado, `min`/`max` en los inputs. |
| Gráfico F3 | **Q12-a** | Barras verticales lado a lado. |
| Tipos de alerta | **Q13-b** | `ComputedAlert` (frontend); `AlertEntry` sin uso. |
| Alerta con rango | **Q10-B** | Solo se evalúa si hay 3 previos dentro del rango. |
| Health check | **Q16-B** | Banner de error de arranque si `/facets` no responde (compartido, sin duplicar petición). |
| Idioma | **Q17-A** | UI en inglés, formatos `en-US` (incluye traducir el error actual de `App.tsx`). |
| Encabezado `/comparison` | **Q19-A** | Pestaña `B2B vs B2C` en el header + H1 `Revenue comparison — B2B vs B2C`. |
| `%` de grupo con total 0 | **Q18-A** | `0.0%`. |
| Datos tras error de `Apply` | **Q20-A** | Últimos datos aplicados se conservan con aviso. |
| Semana `YYYY-Www` | **B-1** | Año **ISO** (igual a `isocalendar()` del backend); p. ej. `2025-12-29` → `2026-W01`. |
| Media de previos = 0 | **B-2** | No genera alerta (ratio indefinido). |
| Primer error de datos | **D-1** | Flag `hasAppliedOnce`: primer fallo → mensaje; después → Q20-A. |
| Rango completo = sin filtro | **D-2** | `Apply` omite `start_date`/`end_date` si el borrador es `min_date`–`max_date` (o vacío). |
| `canApply` por página | **D-3** | `extraInvalid?: boolean` en `DateRangeFilter`. |
| Ambos grupos fallan | **D-4** | Jerarquía de errores; Q20-A con datos previos, mensaje doble sin ellos. |
| Fixtures de test | **M-1** | Unitarios con datos fijos; integración con `fetch` simulado y fixtures fijos (no dependen de «hoy»). |
| Redondeo del umbral | **M-2** | Solo en `Apply` (`clampThreshold`); el borrador conserva el texto. |
| Aviso de límite 20 | **M-3** | Sin aviso en UI; solo documentado. |
| Fetch de facets | **M-4** | `FacetsProvider` en `App.tsx` (compartido, sin duplicar). |
| Rango fuera de datos | **M-5** | Nota `No financial data in the selected range. Available: {min_date} – {max_date}`. |
| Borradores al navegar | **M-6** | Se descartan sin `Apply`; se reinicializan desde el rango aplicado. |
| Enlaces | **Q14-a** | Sin anclas. |
| Ubicación de alertas | **R1-b** | `Card` a ancho completo bajo los gráficos, controles en el header. |
| Categorías desde facets | **R2-a** | Lista maestra global para filtrar las tablas B2B/B2C. |
| Total del grupo | **R3-a** | `limit=20`, total con todas, tabla con 5. |
| Ubicación del filtro | **N1-a** | Fila propia bajo `DashboardHeader`. |
| Organización del código | **P1-a** | Hooks en `src/hooks/` llamados desde las páginas; cálculos puros en `financial-utils.ts`. |
| Idioma | **P2-b** | UI en inglés, formatos `en-US`. |
| Tipos | **P3-a** | Se mueven a `src/lib/`; `specs/` reexporta. |
| Gráfico con un grupo en error | **P4-a** | Skeleton si carga alguno; aviso en lugar del gráfico si falla alguno. |
| Utilidades de fecha | **P6-a** | Propias, sin dependencias, con tests. |
| Concurrencia | **P7-b** | `AbortController` + `Apply` deshabilitado durante la carga. |
| Tests | **P8-a** | Unitarios + integración con Testing Library (ver abajo). |
| Orden de alertas | **P9-b** | Más recientes primero. |
| Cabecera | **P10-a** | Layout común con pestañas y etiqueta del rango aplicado. |
| Input de umbral | **P11-a + U2-A** | `step=0.01`, máx. 2 decimales; vacío/`NaN` inválido; fuera de rango se clampa a `[0.01,1.0]`. |
| Facets en `Apply` | **P12-a** | No se vuelve a pedir. |
| Estado «Vacío» F1 | **P13-a** | Eliminado. |
| R2-a | **P14-a** | Cumplido nominalmente, documentado. |
| Inputs durante la carga | **P15-a** | Siempre habilitados. |

---

## Tests (P8-a)

Se añaden como devDependencies `@testing-library/react` y `jsdom`. Se ejecutan desde `frontend/` con `npm test`, `npm run lint` y `npm run build`.

**Unitarios** (`src/lib/financial-utils.test.ts`):
- `computeAlerts`:
  - umbral estricto (`ratio > threshold`);
  - media con 1, 2 y 3 previos (Q3-b);
  - el primer período nunca es alerta;
  - recorte por `startDate`, incluido el caso de empezar a mitad de período (P5-c);
  - orden descendente (P9-b);
  - `baseline_average = 0` → **no genera alerta** (B-2).
  - **Con rango de fechas activo (Q9-B + Q10-B):** solo se evalúan períodos con 3 previos dentro del rango.
- `periodKeyOf` / `weekKey` (Q11-B / B-1): clave con **año ISO** igual al backend, p. ej. `2025-12-29` → `2026-W01` (`isocalendar`).
- `isPeriodStart`, `formatPeriod` (incluido que no haya desfase de zona horaria) e `isValidThreshold` (vacío/`NaN`).
- `summarizeCategoryGroup`: filtro por facets (R2-a), total con todas las categorías y top-5 (R3-a), lista vacía, categorías con `total_amount = 0` (U5-A), `groupTotal = 0` (Q18-A).
- `formatCurrency(v, 2)` y que el valor por defecto siga teniendo 0 decimales.
- `clampThreshold(value)`: clamp a `[0.01, 1.0]` con 2 decimales (U2-A).

**Integración** (con `fetch` simulado):
- Dashboard: carga correcta, error HTTP, datos vacíos, `Apply` con umbral no válido deshabilitado (solo vacío/`NaN`), fallo de facets con `Retry` y Q6-B (inputs prefijados).
- `/comparison`: carga correcta, un grupo en error (panel con error y gráfico sustituido por el aviso, P4-a) y ambos grupos vacíos.
- **Health check (Q16-B):** banner de arranque si `/facets` no responde.
- **U4-A (verificación dual opcional):** un test de integración que llama a `/api/metrics/alerts?threshold=0.3` y compara el resultado con `computeAlerts(default)` para verificar la divergencia — no bloqueante, solo documental.
| `business_type` | **D1** | Confirmado ✅. `BusinessType = Literal["B2B","B2C"]` en backend. |
| Selector granularidad | **E2** | Dropdown día/semana/mes junto al input de umbral. |
| Símbolo moneda | **F1** | USD fijo (`$`), `formatCurrency` existente. |
| Capitalización categorías | **G1** | Mapa fijo: `"sales"` → `"Sales"`, etc. |
| Data fetching | **H1** | Hooks custom (`useAlerts`, `useFacets`, `useComparison`). |
| Errores | **I1** | Independientes por endpoint. Un fallo no bloquea componentes sanos. |
| Refetch al aplicar | **J2** | KPIs, gráficos y alertas se refetchean simultáneamente. |