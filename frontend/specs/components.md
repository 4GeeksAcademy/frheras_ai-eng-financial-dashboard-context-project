# Componentes del Dashboard Financiero

> Documento de especificación de componentes React.
> Basado en `api-types.ts`, `param-types.ts`, `pm-brief.md` y `verification.md`.
> Sin código React ni JSX — solo definición de props, estados y decisiones.

---

## Funcionalidad 1 — Filtro de rango de fechas en el dashboard principal

### 1. Propósito

Permitir al usuario acotar los datos mostrados en el dashboard mediante un rango de fechas start–end, indicando visualmente el rango completo disponible en el dataset.

### 2. Componentes

- **DateRangeFilter**
- **DashboardHeader** (existente). Por P10-a forma parte de un layout común a `/` y `/comparison`, con pestañas `Dashboard` / `B2B vs B2C`. La etiqueta de período se deriva del rango **aplicado**: `2025-10-01 – 2026-03-31`, `From 2025-10-01`, `Until 2026-03-31` o `All time`.
- **FiltersContext** (Q8-a): provider por encima de las rutas que guarda los filtros **aplicados** `{ startDate, endDate, threshold, granularity }`. Los valores en edición (borrador) viven en el estado local de cada página.

### 2b. Ubicación (N1-a)

Fila propia **debajo de `DashboardHeader` y antes de los KPIs**: inputs de fecha + botón `Apply` a la izquierda y `Available range: {min_date} – {max_date}` a la derecha. Es el mismo bloque en `/comparison`.

### 3. Props

#### DateRangeFilter

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `startDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de inicio **borrador**. Por defecto `min_date` de facets (Q6-B). Vacío cuando no hay selección. |
| `endDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de fin **borrador**. Por defecto `max_date` de facets (Q6-B). Vacío cuando no hay selección. |
| `availableMinDate` | `string \| undefined` | No | `FacetsResponse.min_date`. `undefined` mientras carga o si falló facets (P15-a, Q10-a). |
| `availableMaxDate` | `string \| undefined` | No | `FacetsResponse.max_date`. Igual que arriba. |
| `onStartDateChange` | `(date: string) => void` | Sí | Callback cuando el usuario cambia la fecha de inicio. |
| `onEndDateChange` | `(date: string) => void` | Sí | Callback cuando el usuario cambia la fecha de fin. |
| `onApply` | `() => void` | Sí | Callback del botón `Apply`. Copia los borradores de la página al `FiltersContext`, lo que dispara los refetch. |
| `canApply` | `boolean` | Sí | `false` si el rango es inválido, si `extraInvalid` es `true` o si hay peticiones en curso (P7-b). Deshabilita `Apply`. |
| `extraInvalid` | `boolean` | No (default `false`) | D-3: validación propia de la página. El dashboard pasa `!isValidThreshold(thresholdDraft)` (P11-a); `/comparison` no lo pasa. |
| `isApplying` | `boolean` | Sí | Hay peticiones de datos en curso: el botón muestra `Applying…` (P7-b). |
| `isLoadingFacets` | `boolean` | Sí | Facets en curso. |
| `facetsError` | `string \| null` | Sí | Error al cargar facets. |
| `onRetryFacets` | `() => void` | Sí | Callback del botón `Retry` (Q10-a). Vuelve a pedir `/api/metrics/facets`. |

Renderizado condicional de `DateRangeFilter`: `Available range: {min} – {max}` solo con facets cargado; `Available range: —` si `isLoadingFacets`; aviso + `Retry` si `facetsError`; mensaje `Start date cannot be after end date` si el rango es inválido; `Apply` muestra `Applying…` si `isApplying`.

#### DashboardHeader

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `startDate` | `string` | No | Fecha de inicio **aplicada** (de `FiltersContext`). Vacío = sin límite. |
| `endDate` | `string` | No | Fecha de fin **aplicada**. Vacío = sin límite. |

Renderizado condicional: la etiqueta de período es `{startDate} – {endDate}` si hay ambas, `From {startDate}` si solo hay inicio, `Until {endDate}` si solo hay fin y `All time` si no hay ninguna. Las pestañas `Dashboard` / `B2B vs B2C` se resaltan según la ruta activa (P10-a).

#### FiltersContext (valor del provider, Q8-a)

| Campo | Tipo | Descripción |
|---|---|---|
| `startDate` | `string` | Inicio **aplicado**; `""` = sin límite. |
| `endDate` | `string` | Fin **aplicado**; `""` = sin límite. |
| `threshold` | `number` | Umbral aplicado (default `0.3`). |
| `granularity` | `"day" \| "week" \| "month"` | Granularidad aplicada (default `"month"`). |
| `applyFilters` | `(patch: Partial<{ startDate: string; endDate: string; threshold: number; granularity: "day" \| "week" \| "month" }>) => void` | Lo llama `onApply`. `/comparison` solo aporta las fechas; el resto se conserva. |

#### FacetsProvider (M-4, Q16-B)

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `children` | `ReactNode` | Sí | Contenido de la app (layout y rutas). |

Valor expuesto a `useFacets()`: `{ data: FacetsResponse \| null, isLoading: boolean, error: string \| null, retry: () => void }`. Renderizado condicional: el banner de arranque (Q16-B) se muestra solo si `error !== null` y `data === null`, y desaparece cuando `retry` tiene éxito. El `Retry` de `DateRangeFilter` llama al mismo `retry`.

### 4. Comportamiento de interacción (decisiones B2, J2, Q4-b, Q5-a, Q6-B, Q8-a, Q11-a, P7-b, P15-a)

- **Q6-B (estado inicial):** los inputs arrancan **prefijados** a `min_date`–`max_date` cuando facets carga (rango completo visible). Mientras facets carga, quedan vacíos sin `min`/`max` (P15-a). Con rango aplicado = minimizado, el header muestra `All time`.
- **D-2 (rango completo = sin filtro):** al aplicar, si el borrador es igual a `min_date`–`max_date` (o ambos vacíos), se **omiten** `start_date`/`end_date` en las peticiones; el header muestra `All time`. `Apply` se habilita igualmente (no es error).
- El usuario edita fechas (y en el dashboard, umbral y granularidad) sin que se disparen peticiones.
- **Un único botón `Apply`** (o Enter dentro del formulario) confirma **fechas + umbral + granularidad** a la vez (Q4-b, Q5-a).
- En el dashboard, `Apply` refetchea KPIs, gráficos y alertas (J2). En `/comparison`, refetchea las dos peticiones B2B/B2C. Facets **no** se vuelve a pedir (P12-a).
- El rango aplicado es **compartido** entre `/` y `/comparison` (Q8-a): al navegar, los inputs muestran el rango aplicado.
- Los inputs tienen `min={min_date}` y `max={max_date}` cuando facets está cargado (Q11-a). Mientras no lo está, no hay límites.
- **Los inputs nunca se deshabilitan** (P15-a). Solo `Apply` se deshabilita mientras hay peticiones en curso.
- Cada hook usa `AbortController`: un nuevo `Apply` o el desmontaje cancela la petición anterior (P7-b).
- **D-3 (`canApply` por página):** `DateRangeFilter` recibe `extraInvalid?: boolean`. En `/dashboard` la página pasa `!isValidThreshold(thresholdDraft)`; en `/comparison` no pasa nada. `Apply` se deshabilita si el rango es inválido, si `extraInvalid` es `true` o si hay peticiones en curso (P7-b).
- **M-6 (borradores al navegar):** al montar cada página, el borrador se inicializa desde el rango **aplicado** del contexto. Si se edita y se navega sin `Apply`, el borrador se descarta (no se sincronizan borradores entre páginas).
- **M-5 (rango fuera del disponible):** si facets cargó y el rango aplicado no encaja en `[min_date, max_date]`, se muestra la nota `No financial data in the selected range. Available: {min_date} – {max_date}` junto al filtro; los componentes muestran sus estados vacíos estándar.

### 5. Estados

| Estado | Qué ve exactamente el usuario |
|---|---|
| **Cargando facets** | Inputs habilitados sin `min`/`max` (P15-a). El texto de rango muestra `Available range: —`. |
| **Error** (fallo al obtener facets) | Inputs y `Apply` habilitados (Q10-a), sin `min`/`max`. En lugar del rango se muestra `Could not load the available range` y un botón `Retry`. Mientras reintenta, el botón muestra `Retrying…` deshabilitado. |
| **Error inicial de datos (D-1)** | Si la **primera** carga de KPIs/gráficos falla y `hasAppliedOnce === false`: mensaje `Failed to load financial data. Check the backend API.`, KPIs en `—`, gráficos vacíos. Si ya hubo datos aplicados, se aplica Q20-A (conservar + aviso). |
| **Aplicando** (datos en curso) | Inputs habilitados; `Apply` deshabilitado con el texto `Applying…` (P7-b, P15-a). |
| **Dato parcial — solo una fecha rellena** | El input relleno conserva su valor. El input vacío permanece en blanco con placeholder `YYYY-MM-DD`. Al aplicar, la petición se envía **solo con el parámetro presente**; el endpoint trata el ausente como "sin límite". |
| **Rango inválido** (start > end) | Ambos inputs muestran sus valores. Mensaje debajo: `Start date cannot be after end date`. `Apply` deshabilitado. |
| **Dataset/rango vacío** (U3-A, Q17-A) | KPIs en `—`, gráficos con su estado vacío existente (`No data available to display`, ya presente en los componentes). El header muestra el rango aplicado. Sin banner global. |

### 6. Decisiones aplicadas (de `verification.md`)

- El endpoint `GET /api/metrics/facets` no requiere parámetros y devuelve `min_date` y `max_date` con formato `date` (`YYYY-MM-DD`) — confirmado ✅.
- El endpoint `GET /api/metrics` (y endpoints relacionados como `/alerts`, `/categories/top`) ya aceptan `start_date` y `end_date` como query parameters opcionales — confirmado ✅.
- Si start_date o end_date están vacíos, se omite el parámetro en la petición (la API lo trata como "sin límite").
- El texto `Available range: {min_date} – {max_date}` se muestra siempre que facets esté cargado.
- **B2 (propagación):** Botón `Apply` explícito. Sin clic no hay refetch.
- **J2 (refetch):** `Apply` refetchea KPIs, gráficos y alertas simultáneamente (no facets, P12-a).
- **Q4-b, Q8-a, Q10-a, Q11-a, P7-b, P15-a:** ver sección 4 y tabla de estados.
- **P13-a:** no existe estado «Vacío»: `/facets` con dataset vacío responde con error y se cubre con `Retry`.
- **P2-b (idioma):** todos los textos visibles en inglés y formatos `en-US`.
- **Q9-a / P1-a (hooks):** en `src/hooks/`, llamados solo desde las páginas (`App.tsx`, `ComparisonPage`). `useFacets()` → `{ data, isLoading, error, retry }`; `useMetrics({ startDate, endDate })` → `{ data, isLoading, error, hasAppliedOnce }` con los movimientos de `/api/metrics` para KPIs y gráficos (`hasAppliedOnce` es `true` tras la primera respuesta correcta; lo usa D-1). Los hooks solo hacen fetch y delegan los cálculos en `financial-utils.ts`.

---

## Funcionalidad 2 — Tabla de alertas de anomalías en el dashboard principal

### 1. Propósito

Mostrar una tabla con los períodos en los que el gasto (outcome) superó un umbral configurable respecto a la media móvil de los 3 períodos anteriores, respetando el filtro de fechas activo.

### 2. Componentes

- **AlertsTable**
- **ThresholdInput**
- **GranularitySelect**

### 2b. Ubicación (R1-b)

- Un `Card` a ancho completo **debajo del grid de gráficos** (`IncomeOutcomeChart` + `ProfitPercentChart`).
- `CardHeader`: título `Spending alerts` + `ThresholdInput` y `GranularitySelect` alineados a la derecha.
- `CardContent`: `AlertsTable`.
- Los controles editan borradores; se confirman con el `Apply` del `DateRangeFilter` superior (Q4-b).

### 3. Props

#### AlertsTable

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `alerts` | `ComputedAlert[]` | Sí | Alertas calculadas en frontend (Q1-a, Q13-b), ordenadas por `period` **descendente** (P9-b). Vacío cuando no hay anomalías. |
| `granularity` | `"day" \| "week" \| "month"` | Sí | Granularidad **aplicada**; se usa para formatear la columna Período (Q5-b). |
| `threshold` | `number` | Sí | Umbral **aplicado** (entre `0.01` y `1.0`). Se muestra en el mensaje de estado vacío. |
| `isLoading` | `boolean` | Sí | Indica si la petición de alertas está en curso. |
| `error` | `string \| null` | No | Mensaje de error si la petición falló. `null` cuando no hay error. |

#### ThresholdInput

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `value` | `string` | Sí | Texto en borrador del input (`type="number"`, `step="0.01"`, `min="0.01"`, `max="1"`). Por defecto `"0.30"`. Se guarda como texto para detectar vacío o `NaN` (P11-a). |
| `onChange` | `(value: string) => void` | Sí | Actualiza el borrador. No dispara petición (Q4-b). |

Validación (P11-a + **U2-A**), con `isValidThreshold(value)` en `financial-utils.ts`: es inválido si está vacío o es `NaN`. Si es un número válido se **clampa** a `[0.01, 1.0]` y se redondea a **2 decimales** (`Math.max(0.01, Math.min(1.0, round2(v)))`). Valores fuera de rango **no** bloquean `Apply` (U2-A); solo vacío/`NaN` lo bloquean. **M-2:** el redondeo a 2 decimales ocurre **solo en `Apply`** (`clampThreshold`); el borrador conserva el texto que escribe el usuario y el input no «corrige» mientras se escribe.

#### GranularitySelect

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `value` | `"day" \| "week" \| "month"` | Sí | Granularidad en borrador. Por defecto `"month"`. |
| `onChange` | `(value: "day" \| "week" \| "month") => void` | Sí | Actualiza el borrador. No dispara petición (Q4-b). |

### 3b. Cálculo de alertas (Q1-a, Q9-B, Q10-B, Q11-B)

`useAlerts({ threshold, granularity, startDate, endDate })` (Q9-a) solo hace el fetch (con `AbortController`, P7-b). El cálculo lo hace la función pura `computeAlerts(summary, { threshold, granularity, startDate, endDate })` en `financial-utils.ts` (P1-a). **No se llama a `/api/metrics/alerts`** (aprobado, Q1-A).

1. Pedir `GET /api/metrics/summary?operation_type=outcome&group_by=<granularity>[&start_date=<startDate>][&end_date=<endDate>]` — **con `start_date` y `end_date` tal cual** (Q9-B, sustituye a Q2-a). El rango aplicado se envía siempre que esté activo.
2. Recorrer la respuesta (ordenada por `period`). Para cada ítem `i ≥ 1`:
   - Si hay **rango de fechas activo** (Q10-B): solo se evalúa el ítem si tiene **3 períodos previos dentro del rango**. Si no, **no genera alerta** (no se usa `average of N periods`).
   - Sin rango de fechas (Q2-A): `previos` = hasta 3 ítems anteriores en la respuesta (`i-3 … i-1`). Los períodos sin movimientos no existen en la respuesta y no cuentan.
   - `baseline_average` = media de `previos.outcome`; `baseline_periods` = `previos.length` (1, 2 o 3 — Q3-b).
   - Si `baseline_average > 0`: `increase_ratio = (outcome - baseline_average) / baseline_average`, y es alerta si `increase_ratio > threshold` (estricto — Q3-A).
   - Si `baseline_average === 0`: el ítem **no genera alerta** (ratio indefinido; B-2). `increase_ratio` nunca es `Infinity`.
3. Si hay `startDate` (P5-c):
   - Se descartan las alertas cuyo `period` sea anterior a `periodKeyOf(startDate, granularity)`.
   - Si `startDate` **no** es el primer día de su período (día 1 en `month`, lunes en `week`; en `day` siempre lo es), también se descarta ese período. Así nunca se muestran importes de fuera del rango.
4. El primer ítem de la respuesta nunca genera alerta.
5. Resultado ordenado por `period` descendente (P9-b).

Utilidades de fecha (P6-a + **Q11-B / B-1**), en `financial-utils.ts` y sin dependencias: `periodKeyOf(date, granularity)`, `weekKey(date)` (clave `YYYY-Www` con el **año ISO** de la semana, el mismo cómputo que `isocalendar()` del backend — p. ej. `2025-12-29` → `2026-W01`), `isPeriodStart(date, granularity)` y `formatPeriod(period, granularity)`. Parsean `YYYY-MM-DD` a mano, sin `new Date("YYYY-MM-DD")`, para evitar el desfase de zona horaria.

### 4. Columnas de la tabla

| Columna | Tipo de dato | Formato de visualización | Fuente (campo de `ComputedAlert`) |
|---|---|---|---|
| `Period` | `string` | `formatPeriod` (Q5-b, P2-b): mes `2025-12` → `Dec 2025`; semana `2025-W05` → `Week 05, 2025`; día `2025-12-15` → `Dec 15, 2025`. | `period` |
| `Recorded outcome` | `number` | `formatCurrency(v, 2)` (Q6-a), ej. `$103,378.98`. | `outcome_total` |
| `3-period moving average` | `number` | `formatCurrency(v, 2)`. Si `baseline_periods < 3`, se añade debajo en texto secundario `average of N periods` (`average of 1 period` en singular) (Q3-b). | `baseline_average`, `baseline_periods` |
| `Increase` | `number` | Porcentaje con 2 decimales y flecha de dirección (Q7-B): si `increase_ratio > 0`, `102.01% ↑`; si `increase_ratio < 0`, `45.00% ↓`; si es `0`, `0.00%`. Toma el valor absoluto de `increase_ratio * 100` y añade `↑`/`↓` según el signo. | `increase_ratio` |

### 5. Estados

| Estado | Qué ve exactamente el usuario |
|---|---|
| **Cargando** | La tabla muestra filas esqueleto (skeleton) con 4 columnas. El input de umbral y el selector de granularidad siguen habilitados (P15-a). |
| **Vacío** (sin anomalías) | La tabla no se oculta. En el cuerpo, a todo el ancho: `No anomalies detected for threshold 0.30` (umbral aplicado con `toFixed(2)`, P11-a). |
| **Error** (fallo en la petición) | La tabla no se renderiza. En su lugar: `Failed to load alerts. Please try again later.` Controles habilitados. |
| **Umbral no válido** (vacío o `NaN`; los fuera de `[0.01, 1.0]` se **clampan** — U2-A) | Borde rojo y mensaje `Threshold is required` (solo vacío/`NaN`; P11-a + U2-A). **`Apply` deshabilitado**. La tabla mantiene los últimos datos aplicados (Q20-A). |
| **Dato parcial** (rango sin datos) | Mensaje de vacío estándar. |
| **Período con menos de 3 previos** — sin rango de fechas | La fila se muestra si supera el umbral; bajo la media aparece `average of 1 period` o `average of 2 periods` (Q3-b). |
| **Período con menos de 3 previos — con rango de fechas activo** (Q10-B) | El período **no se evalúa ni se muestra** (no genera alerta); debe tener 3 previos dentro del rango. |

### 6. Decisiones aplicadas (de `verification.md`)

- **Q1-a / Q9-B / Q10-B / Q3-b / P5-c:** ver sección 3b. Sustituyen a C2. `/api/metrics/alerts` no se usa (aprobado Q1-A).
- **Q4-b:** umbral y granularidad se confirman con el mismo `Apply` que las fechas.
- **Q5-b / Q6-a / P2-b / Q7-B:** formato de período (inglés, `en-US`), de moneda y de incremento (flecha `↑`/`↓`, valor absoluto), ver columnas.
- **Q13-b:** la tabla consume `ComputedAlert`, no `AlertEntry`.
- **P1-a / P6-a / Q11-B / B-1:** cálculo y utilidades de fecha como funciones puras en `financial-utils.ts`; claves de semana con **año ISO**, alineadas con el backend (`isocalendar`).
- **P9-b:** las alertas más recientes, primero.
- **P11-a + U2-A:** validación del umbral con `isValidThreshold` (vacío/`NaN`); clamp a `[0.01, 1.0]` con 2 decimales para valores fuera de rango.
- El frontend valida que `threshold` esté entre `0.01` y `1.0` (rango del PM) **clampando** sin bloquear (U2-A).
- **E2 + Q4-A (granularidad):** selector `GranularitySelect` junto al input de umbral; su valor aplicado se pasa como `group_by` a `/api/metrics/summary`. Aprobado por el PM.
- La tabla respeta el rango de fechas aplicado (Q9-B: `start_date` y `end_date` se envían a `/summary`; Q10-B para los previos).

---

## Funcionalidad 3 — Vista comparativa B2B vs B2C

### 1. Propósito

Crear una nueva página que permita comparar el rendimiento de ingresos entre las dos líneas de negocio (B2B y B2C), mostrando sus 5 categorías principales y un gráfico comparativo de totales.

### 2. Componentes

- **ComparisonPage** (nueva página en ruta `"/comparison"` con react-router-dom)
- **BusinessPanel** (x2: B2B y B2C)
- **CategoryRankingTable** (dentro de cada BusinessPanel)
- **ComparisonChart**

### 2b. Navegación (decisión A1)

- Se añade `react-router-dom` como dependencia.
- `App.tsx` envuelve el contenido en `<BrowserRouter>` con `<Routes>`:
  - `"/"` → renderiza el dashboard actual (con KPIs, gráficos, alertas, filtro de fechas).
  - `"/comparison"` → renderiza `ComparisonPage`.
- `DashboardHeader` forma parte de un layout común a las dos rutas, con pestañas `Dashboard` / `B2B vs B2C` y la etiqueta del rango aplicado (P10-a).
- No hay cambios de ruta internos en `ComparisonPage`.
- **Q16-B (health check):** en el arranque, el frontend hace `GET /api/metrics/facets`. Si no responde, se muestra un banner de error de arranque (p. ej. `Financial API unavailable. Check that the backend is running.`) sobre todo el contenido. Facets se **comparte** entre el health check y el resto de la app (no se duplica la petición) — **M-4:** lo orquesta un `FacetsProvider` en `App.tsx` que expone `{ data, isLoading, error, retry }`; el banner y `DateRangeFilter` consumen el mismo estado. Solo durante el montaje inicial; los errores posteriores de cada página usan la jerarquía D-4.

### 3. Props

#### ComparisonPage

**Sin props** (Q7-a). Es el `element` de la ruta `"/comparison"` y obtiene sus datos internamente:

- Rango aplicado: `FiltersContext` (Q8-a). Borrador de fechas: estado local.
- `useFacets()` → rango disponible para `DateRangeFilter` y lista maestra `categories` (R2-a).
- `useComparison({ startDate, endDate, allowedCategories })` → `{ b2b: { data, total, isLoading, error }, b2c: { data, total, isLoading, error } }`. Cada grupo es una petición independiente (I1) a `/categories/top?operation_type=income&limit=20&business_type=<g>` (R3-a):
  - Se filtran las categorías que no estén en `allowedCategories` (R2-a). Si facets no cargó, no se filtra.
  - `total` = suma de `total_amount` de **todas** las categorías filtradas (R3-a).
  - `data` = las 5 primeras (la API ya devuelve orden descendente).
- P1-a: `useComparison` solo hace fetch (con `AbortController`, P7-b). El filtrado, el total y el top-5 los calcula la función pura `summarizeCategoryGroup(entries, allowedCategories)` en `financial-utils.ts`.

#### BusinessPanel

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `businessType` | `"B2B" \| "B2C"` | Sí | Identificador visual del panel (se usa en el encabezado). |
| `categories` | `CategoryEntry[]` | Sí | Lista de categorías para este panel. Puede estar vacía. |
| `groupTotal` | `number` | Sí | Total real del grupo (suma de todas las categorías devueltas con `limit=20`, R3-a). Base del porcentaje de cada categoría. |
| `isLoading` | `boolean` | Sí | Petición de este grupo en curso (Q7-a). |
| `error` | `string \| null` | Sí | Error de este grupo (Q7-a, I1). |

#### CategoryRankingTable

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `categories` | `CategoryEntry[]` | Sí | Lista de categorías a mostrar. Vacío si no hay datos. |
| `groupTotal` | `number` | Sí | Total del grupo para calcular el porcentaje. |

#### ComparisonChart

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `b2bTotal` | `number` | Sí | Total de ingresos B2B (eje del gráfico). |
| `b2cTotal` | `number` | Sí | Total de ingresos B2C (eje del gráfico). |
| `isLoading` | `boolean` | Sí | `true` si **cualquiera** de los dos grupos está cargando: se muestra skeleton (P4-a). |
| `failedGroups` | `("B2B" \| "B2C")[]` | Sí | Grupos cuya petición falló. Si no está vacío, no se dibuja el gráfico (P4-a). |

### 4. Columnas de CategoryRankingTable

| Columna | Tipo de dato | Formato de visualización | Fuente |
|---|---|---|---|
| `Category` | `string` (enum) | Nombre capitalizado. Ejemplo: `"sales"` → `"Sales"`, `"administrative"` → `"Administrative"`. | `CategoryEntry.category` |
| `Total income` | `number` | `formatCurrency(v, 2)` (Q6-a), ej. `$1,132,097.38`. | `CategoryEntry.total_amount` |
| `% of group` | `number` | Porcentaje con 1 decimal (ej. `45.3%`). Se calcula como `(category.total_amount / groupTotal) * 100`. Si `groupTotal = 0`, muestra `0.0%` (Q18-A). | Derivado: `total_amount / groupTotal * 100` |

### 5. Layout

```
+--------------------------------------------------+
|  Filtro de fechas (DateRangeFilter)               |
+--------------------------------------------------+
|  Panel B2B          |  Panel B2C                  |
|  +----------------+ |  +----------------+         |
|  | CategoryRanking| |  | CategoryRanking|         |
|  | Table (top 5)  | |  | Table (top 5)  |         |
|  +----------------+ |  +----------------+         |
+--------------------------------------------------+
|  ComparisonChart                                  |
|  [Gráfico: B2B total vs B2C total]               |
+--------------------------------------------------+
```

### 6. Estados

| Estado | Qué ve exactamente el usuario |
|---|---|
| **Cargando** | Cada panel que carga muestra un skeleton de 5 filas. El gráfico muestra skeleton mientras cargue cualquier grupo (P4-a). Inputs de fecha habilitados; solo `Apply` deshabilitado (P15-a). |
| **Vacío — ambos paneles sin datos** | Cada panel muestra en su tabla: `No income categories for B2B in the selected range` (o B2C). El gráfico muestra ambas barras en 0 con el texto `No data for the selected period`. |
| **Vacío — solo un panel sin datos** | El panel con datos muestra su tabla normalmente. El panel vacío muestra el mensaje anterior. El gráfico dibuja la barra con datos y la otra en 0 con etiqueta `$0`. |
| **Error** (fallo en una o ambas peticiones) | **Errores independientes (I1).** El panel que falla muestra `Failed to load B2B data. Please try again later.` (o B2C); el otro se renderiza normal. **El gráfico no se dibuja** y en su lugar aparece `Comparison unavailable: failed to load B2B data` (o `B2B and B2C data`) (P4-a). Inputs de fecha habilitados. Si una petición falla tras un `Apply`, se conservan los últimos datos aplicados del panel que sí tiene datos (Q20-A). |
| **Error — ambos grupos fallan (D-4)** | Jerarquía: el banner Q16-B solo aplica en el arranque global. Si tras un `Apply` **ambas** peticiones fallan: **sin datos previos** → ambos paneles con su mensaje de error y el gráfico sustituido por `Comparison unavailable: failed to load B2B and B2C data`; **con datos previos** → se conservan (Q20-A) y se muestra el aviso de error. |
| **Dato parcial** (rango de fechas sin ingresos para el período) | Mismo comportamiento que "Vacío — ambos paneles sin datos". |
| **Rango inválido** (start > end) | Mismo comportamiento que en Funcionalidad 1: mensaje de error en los inputs de fecha y `Apply` deshabilitado. |

### 7. Gráfico comparativo

| Aspecto | Descripción |
|---|---|
| **Tipo** | Barras verticales lado a lado con `BarChart` de recharts (Q12-a). |
| **Primer punto de datos** | Total de ingresos B2B. Eje X: "B2B". Eje Y: valor de `b2bTotal`. |
| **Segundo punto de datos** | Total de ingresos B2C. Eje X: "B2C". Eje Y: valor de `b2cTotal`. |
| **Formato del tooltip** | Al hacer hover: "B2B: $X.XX" / "B2C: $X.XX" con `formatCurrency(v, 2)`. |
| **Leyenda** | No es necesaria (solo dos barras etiquetadas directamente). |

### 8. Decisiones aplicadas (de `verification.md`)

- **A1 (ruteo):** Se usa `react-router-dom` con rutas `"/"` (dashboard) y `"/comparison"` (`ComparisonPage`). Enlace en `DashboardHeader`.
- **Q19-A (encabezado):** pestaña `B2B vs B2C` en `DashboardHeader` (compartido) y H1 propio de la página: `Revenue comparison — B2B vs B2C`.
- **R3-a:** los totales B2B y B2C se obtienen sumando **todas** las categorías devueltas por `GET /api/metrics/categories/top?operation_type=income&limit=20&business_type=<g>`; la tabla muestra solo las 5 primeras. Sustituye a la Opción A (suma del top-5). (Q13-A: se documenta la limitación de `limit=20`.)
- El endpoint `GET /api/metrics/categories/top` acepta `operation_type`, `limit`, `start_date`, `end_date` y `business_type` — confirmado ✅ (D1: `business_type` ya no es ❓).
- El endpoint `GET /api/metrics/facets` se usa para el rango de fechas (`min_date`, `max_date`) y, por **R2-a**, como lista maestra de categorías. Limitación: `/facets` no tiene parámetros, así que la lista es global (no por grupo ni por tipo de operación).
- **G1 (capitalización de categorías):** Mapa fijo de traducción a nombre capitalizado: `"sales"` → `"Sales"`, `"administrative"` → `"Administrative"`, `"operational"` → `"Operational"`, `"suppliers"` → `"Suppliers"`, `"others"` → `"Others"`.
- **H1 (data fetching):** Hook `useComparison()` con dos peticiones independientes a `/categories/top` (B2B y B2C), cada una con su propio `isLoading`/`error` (no `Promise.all`, para que un fallo no anule al otro) — Q14-A.
- **I1 (errores independientes):** Cada panel (B2B, B2C) tiene su propio estado de carga y error. Un panel puede fallar mientras el otro se renderiza. Tras un `Apply` con error, el panel sano conserva sus últimos datos aplicados (Q20-A).
- **Q7-a / Q8-a / Q12-a:** `ComparisonPage` sin props, rango compartido vía `FiltersContext`, gráfico de barras verticales.
- **P1-a:** `ComparisonPage` es punto de composición (llama a los hooks); el cálculo está en `summarizeCategoryGroup`.
- **P4-a:** el gráfico solo se dibuja si los dos grupos cargaron bien.
- **P10-a / Q19-A:** layout y cabecera compartidos con el dashboard; H1 de la página definido.
- **P14-a / U1-A / Q15-A:** el filtro de facets (R2-a) se cumple de forma nominal: hoy los ingresos solo usan `sales` y `others`, que siempre están en facets. Si una categoría de `/categories/top` no está en facilities, se omite (U1-A, Q15-A); si facets no cargó, no se filtra.
- **U5-A:** categorías con `total_amount = 0` se muestran tal cual (`$0` y `0.0%`), sin filtrar.
- El filtro de fechas se aplica a ambas peticiones simultáneamente (mismo `start_date` y `end_date` para B2B y B2C).