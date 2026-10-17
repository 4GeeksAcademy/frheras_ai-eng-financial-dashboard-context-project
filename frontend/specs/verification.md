# Verificación

## Mis dudas antes de mirar la API
- Funcionalidad 1: ¿El endpoint /api/metrics actual ya acepta parámetros start_date y end_date o hay que modificarlo? ¿El endpoint /api/metrics/facets devuelve el rango de fechas mínimo y máximo del dataset?
- Funcionalidad 2: ¿La API de alertas calcula la media móvil de exactamente 3 períodos anteriores como pide el PM? ¿El endpoint /api/metrics/alerts acepta filtros de rango de fechas para respetar la Funcionalidad 1? ¿El umbral que acepta la API coincide con el rango 0.01–1.0 que pide el PM?
- Funcionalidad 3: ¿El endpoint /api/metrics/categories/top acepta un filtro por business_type para separar B2B y B2C? ¿El frontend tiene un sistema de navegación entre páginas o todo es una sola vista?

## Afirmaciones verificadas
| Afirmación | Fuente | Estado (✅ ❌ ❓) |
|---|---|---|
| **GET /api/metrics** | | |
| Parámetro `start_date`: query, opcional, type=date (`YYYY-MM-DD`) | Backend `get_metrics`: `start_date: date \| None = Query(default=None)` | ✅ |
| Parámetro `end_date`: query, opcional, type=date (`YYYY-MM-DD`) | Backend `get_metrics`: `end_date: date \| None = Query(default=None)` | ✅ |
| Parámetro `category`: query, opcional, enum=["suppliers","sales","operational","administrative","others"] | Backend `get_metrics`: `category: Category \| None` | ✅ |
| Parámetro `operation_type`: query, opcional, enum=["income","outcome"] | Backend `get_metrics`: `operation_type: OperationType \| None` | ✅ |
| No acepta `business_type` ni `group_by` | Backend `get_metrics`: solo los 4 parámetros anteriores | ✅ |
| Respuesta: array de `FinancialMovement` en orden cronológico | Backend `get_metrics`: `response_model=list[FinancialMovement]` + `ensure_chronological_order` | ✅ |
| | | |
| **GET /api/metrics/facets** | | |
| Parámetros: no tiene ningún query parameter | OpenAPI spec — `paths./api/metrics/facets.get.parameters` vacío | ✅ |
| Respuesta campo `operation_types`: array de strings, valores `["income","outcome"]` | Curl real + OpenAPI `FinancialMovement.operation_type.enum` | ✅ |
| Respuesta campo `business_types`: array de strings, valores `["B2B","B2C"]` | Curl real + OpenAPI `FinancialMovement.business_type.enum` | ✅ |
| Respuesta campo `categories`: array de strings, valores `["administrative","operational","others","sales","suppliers"]` | Curl real + OpenAPI `FinancialMovement.category.enum` | ✅ |
| Respuesta campo `min_date`: string, format=date, ejemplo `"2025-10-02"` | Curl real + OpenAPI `MetricsFacets.min_date.format=date` | ✅ |
| Respuesta campo `max_date`: string, format=date, ejemplo `"2026-09-28"` | Curl real + OpenAPI `MetricsFacets.max_date.format=date` | ✅ |
| | | |
| **GET /api/metrics/alerts** | | |
| Parámetro `threshold`: query, opcional, type=number, default=0.3, minimum=0 | OpenAPI spec — schema `minimum=0` | ✅ |
| Parámetro `group_by`: query, opcional, type=string, default="month", enum=["day","week","month"] | OpenAPI spec — schema `enum` | ✅ |
| Parámetro `start_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `end_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `business_type`: query, opcional, type=string, enum=["B2B","B2C"] (confirmado en backend) | OpenAPI spec + backend `BusinessType = Literal["B2B","B2C"]` | ✅ |
| Respuesta campo `period`: string, ejemplo `"2025-12"` | Curl real | ✅ |
| Respuesta campo `outcome_total`: number, ejemplo `103378.98` | Curl real | ✅ |
| Respuesta campo `baseline_average`: number, ejemplo `51174.1` | Curl real | ✅ |
| Respuesta campo `increase_ratio`: number, ejemplo `1.0201` | Curl real | ✅ |
| El cálculo de `baseline_average` usa ventana deslizante de exactamente 3 períodos | Backend `detect_outcome_alerts`: usa media expansiva de **todos** los períodos previos y genera alertas desde el 2º período. | ❌ → Q1-a |
| Formato de `period` con `group_by=day` es `"YYYY-MM-DD"` | Backend `summarize_movements`: `create_date.isoformat()` | ✅ |
| | | |
| **GET /api/metrics/summary** | | |
| Parámetros: `group_by` (day/week/month, default month), `start_date`, `end_date`, `category`, `operation_type`, `business_type`, todos opcionales | Backend `get_metrics_summary` | ✅ |
| Respuesta: array de `{ period, income, outcome, net }` ordenado ascendente por `period`; los períodos sin movimientos no aparecen | Backend `summarize_movements` | ✅ |
| | | |
| **GET /api/metrics/categories/top** | | |
| Parámetro `operation_type`: query, opcional, type=string, default="outcome", enum=["income","outcome"] | OpenAPI spec — schema `enum` | ✅ |
| Parámetro `limit`: query, opcional, type=integer, default=5, minimum=1, maximum=20 | OpenAPI spec — schema `minimum=1, maximum=20` | ✅ |
| Parámetro `start_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `end_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `business_type`: query, opcional, type=string, enum=["B2B","B2C"] (confirmado en backend) | OpenAPI spec + backend `BusinessType = Literal["B2B","B2C"]` | ✅ |
| Respuesta campo `category`: string, enum=["suppliers","sales","operational","administrative","others"], ejemplo `"sales"` | Curl real + OpenAPI `TopCategoryItem.category.enum` | ✅ |
| Respuesta campo `operation_type`: string, enum=["income","outcome"], ejemplo `"income"` | Curl real + OpenAPI `TopCategoryItem.operation_type.enum` | ✅ |
| Respuesta campo `total_amount`: number, ejemplo `1132097.38` | Curl real | ✅ |

## Decisiones
| Duda | Decisión | Quién la confirma (yo / el PM) |
|---|---|---|
| ¿Cómo obtener el total de ingresos B2B y B2C para el gráfico comparativo y el porcentaje sobre el grupo? | **Opción A:** llamar a `/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` (y B2C) y sumar los `total_amount` de las categorías devueltas. No requiere cambios en backend. **Sustituida por R3-a.** | yo |
| ¿Qué rango debe aceptar el input numérico del usuario en el frontend para el threshold de alertas? | **Opción A:** input con `min=0.01` y `max=1.0`, alineado con el brief del PM. Si el usuario introduce un valor fuera de rango, el frontend no envía la petición. | yo |
| ¿Qué sistema de navegación usar para la nueva página de F3? | **A1 — react-router-dom** con dos rutas: `"/"` → dashboard, `"/comparison"` → vista B2B vs B2C. Enlace en `DashboardHeader`. | yo |
| ¿Cómo se propaga el filtro de fechas al resto del dashboard? | **B2 — Botón «Aplicar» explícito.** El usuario selecciona fechas y al hacer clic en «Aplicar» se disparan todas las peticiones. Sin botón no hay refetch. | yo |
| ¿La API devuelve media móvil de 3 períodos? No — usa media expansiva. ¿Cómo manejarlo? | **C2 — Calcular la media de 3 períodos en el frontend.** Llamar a `/api/metrics/summary?group_by=month` para obtener outcomes históricos y calcular localmente `baseline_average` sobre los 3 períodos anteriores. Ignorar el `baseline_average` que devuelve la API. | yo |
| El campo `business_type` en `/alerts` y `/categories/top` estaba marcado como ❓. ¿Está confirmado? | **D1 — Dar por confirmado.** El backend tiene `BusinessType \| None` con `BusinessType = Literal["B2B","B2C"]`. Actualizar `param-types.ts` y quitar ❓ y TODOs. | yo |
| ¿Se expone un selector de `group_by` (día/semana/mes) al usuario en la tabla de alertas? | **E2 — Añadir selector de granularidad** (`"day"`, `"week"`, `"month"`) junto al input de umbral. El `period` se adapta al formato correspondiente. | yo |
| ¿Qué símbolo monetario usar? | **F1 — USD fijo (`$`)** con el `formatCurrency` existente. | yo |
| ¿Cómo capitalizar los nombres de categoría? | **G1 — Mapa fijo:** `sales → "Sales", administrative → "Administrative", operational → "Operational", suppliers → "Suppliers", others → "Others"`. | yo |
| ¿Estrategia de data fetching? | **H1 — Hooks custom:** `useAlerts`, `useFacets`, `useComparison`. Cada uno encapsula fetch, loading/error/data, y refetch. | yo |
| ¿Errores independientes por endpoint o error global bloqueante? | **I1 — Errores independientes.** Si facets falla pero alertas funciona, cada componente muestra su propio error. | yo |
| Al hacer clic en «Aplicar» en F1, ¿qué se refetchea? | **J2 — Refetch de todo:** KPIs, gráficos y alertas se disparan simultáneamente al hacer clic en «Aplicar». Facets no se vuelve a pedir (P12-a). | yo |
| C2 solo recalculaba la media, pero el conjunto de alertas y `increase_ratio` seguían saliendo de la API. | **Q1-a — No usar `/alerts`.** Todo se calcula en frontend desde `/api/metrics/summary?operation_type=outcome&group_by=<g>`: media, ratio y filtro `ratio > threshold` (estricto, como la API). Sustituye y precisa C2. **Aprobado por el PM (Q1-A, 2026-10-15):** se mantiene la desviación; `/alerts` queda documentado como no conforme (media expansiva) y no se usa. Como verificación, el cálculo local se contrasta con `/alerts` en los tests (`threshold=0.3`). | yo → PM |
| Con filtro de fechas, los 3 períodos previos al inicio quedan fuera del rango. | **Q2-a — (SUSTITUIDO por Q9-B en la revisión 2026-10-15)** Pedir `/summary` **sin `start_date`** (solo `end_date`), calcular con todo el histórico y mostrar solo las alertas cuyo período sea ≥ al período que contiene `start_date`. El tratamiento del período inicial lo define P5-c. **Revisión:** se envía `start_date` y la media se calcula dentro del rango (Q9-B + Q10-B). | yo → PM |
| Períodos con menos de 3 previos. | **Q3-b —** Se usa la media de los 1 o 2 previos disponibles y la fila indica «media de N períodos». El primer período nunca genera alerta. **Revisión 2026-10-15:** sin filtro de fechas se mantiene (Q2-A); con filtro activo aplica Q10-B (solo se evalúa un período si tiene 3 previos dentro del rango). | yo → PM |
| ¿Umbral y granularidad refetchean al momento? | **Q4-b — Un único botón «Aplicar»** confirma fechas, umbral y granularidad. Sin Aplicar no hay petición. | yo |
| Formato de período `day`. | **Q5-b —** Corregir a `"YYYY-MM-DD"` y formatear para mostrar: mes `Dic 2025`, semana `Sem 05, 2025`, día `15 Dic 2025`. | yo |
| `formatCurrency` tiene 0 decimales y las tablas piden 2. | **Q6-a —** Añadir parámetro opcional `decimals` (por defecto 0) a `formatCurrency`. Los KPIs no cambian. | yo |
| Props de `ComparisonPage` contradicen H1 e I1. | **Q7-a —** `ComparisonPage` sin props; usa `useFacets` y `useComparison`. `BusinessPanel` recibe `isLoading` y `error` propios. | yo |
| ¿Filtro de fechas compartido entre rutas? | **Q8-a —** Rango aplicado compartido en un Context (`FiltersContext`) por encima de las rutas. | yo |
| Faltan hooks. | **Q9-a —** Añadir `useMetrics(dateRange)`; `useAlerts` llama internamente a `/summary`. | yo |
| ¿Inputs bloqueados si falla `/facets`? | **Q10-a + reintento —** Inputs habilitados; se oculta el rango disponible, aparece un aviso y un botón «Reintentar» que vuelve a pedir facets. | yo |
| ¿Limitar los inputs al rango disponible? | **Q11-a —** Atributos `min`/`max` del `<input type="date">` con `min_date`/`max_date`. Sin facets cargadas no se ponen límites. | yo |
| Tipo de gráfico F3. | **Q12-a —** Barras verticales lado a lado (`BarChart` de recharts). | yo |
| JSDoc de `AlertEntry` incorrecto. | **Q13-b —** Nuevo tipo frontend `ComputedAlert`; `AlertEntry` queda como respuesta cruda de la API (no se usa en la UI). | yo |
| Anclas inexistentes en enlaces del README. | **Q14-a —** Enlazar al archivo sin ancla. | yo |
| ¿Dónde va la tabla de alertas? | **R1-b —** `Card` a ancho completo bajo el grid de gráficos. `ThresholdInput` y `GranularitySelect` en el `CardHeader`. | yo |
| «Las categorías disponibles para cada grupo deben obtenerse del endpoint de facetas», pero `/facets` no distingue por grupo ni por tipo de operación. | **R2-a —** `FacetsResponse.categories` es la lista maestra: cada tabla muestra solo las categorías de `/categories/top` que estén en esa lista. Se documenta la limitación de facets. | yo |
| El total del grupo calculado con el top-5 no es el total real si hay más de 5 categorías. | **R3-a —** Pedir `/categories/top` con `limit=20` (máximo), calcular el total con todas las categorías devueltas y mostrar solo las 5 primeras. Sustituye a la Opción A (suma del top-5). | yo |
| ¿Dónde va el filtro de fechas en el dashboard? | **N1-a —** Fila propia bajo `DashboardHeader` y antes de los KPIs; `Available range` a la derecha. Mismo bloque en `/comparison`. | yo |
| Q7-a y Q1-a chocan con `.agents/rules/frontend-structure.md` (fetch/estado en las páginas, cálculos en `financial-utils.ts`). | **P1-a —** Hooks en `src/hooks/` llamados solo desde las páginas (`App.tsx`, `ComparisonPage`). Cálculos puros (`computeAlerts`, `summarizeCategoryGroup`, utilidades de fecha) en `financial-utils.ts`. | yo |
| Idioma del producto sin acordar (la regla exige acordarlo). | **P2-b —** UI en inglés y formatos `en-US`. Se traducen los mensajes de la spec. Sustituye los formatos en español de Q5-b. | yo |
| Los tipos de `specs/` están fuera del `include` de `tsconfig.app.json`. | **P3-a —** Al implementar se mueven a `src/lib/api-types.ts` y `src/lib/param-types.ts`; `specs/*.ts` los reexporta. | yo |
| Gráfico F3 con un grupo cargando o en error. | **P4-a —** Skeleton si carga cualquiera de los dos; si falla alguno, aviso en lugar del gráfico. | yo |
| El período que contiene `start_date` incluye días fuera del rango. | **P5-c —** Si `start_date` no es el primer día de su período, ese período no se evalúa. | yo |
| Semana ISO y parseo de fechas sin desfase de zona horaria. | **P6-a —** Utilidades propias en `financial-utils.ts`, sin dependencias y con tests. **Revisión Q11-B (2026-10-15) + B-1 (2ª revisión 2026-10-15):** las claves de semana usan el **mismo cómputo ISO** que el backend (`isocalendar()`): `YYYY-Www` con el año **ISO** de la semana. Elimina el desajuste de cambio de año. `formatPeriod` muestra el año ISO en la clave visual. | yo → PM |
| Respuestas fuera de orden al aplicar varias veces. | **P7-b —** `AbortController` en cada hook y `Apply` deshabilitado mientras hay peticiones en curso. | yo |
| Alcance de los tests. | **P8-a —** Añadir `@testing-library/react` y `jsdom`; tests unitarios de las funciones puras y de integración de ambas páginas. | yo |
| Orden de las alertas. | **P9-b —** Por período descendente. | yo |
| Cabecera en `/comparison`. | **P10-a —** Layout común con pestañas `Dashboard` / `B2B vs B2C`; la etiqueta muestra el rango aplicado o `All time`. | yo |
| Detalles del input de umbral. | **P11-a — (matizado por U2-A en la revisión 2026-10-15)** `step=0.01`, máx. 2 decimales; vacío o `NaN` es inválido; el mensaje usa `toFixed(2)`. **U2-A:** los valores fuera de `[0.01, 1.0]` se **clampan** al límite más cercano y se redondean a 2 decimales — no bloquean `Apply`; solo vacío/`NaN` lo bloquean. | yo → PM |
| ¿`Apply` vuelve a pedir facets? | **P12-a —** No: facets solo al montar y con `Retry`. | yo |
| Estado «Vacío» de F1 inalcanzable (`/facets` falla con 500 si el dataset está vacío). | **P13-a —** Se elimina; queda cubierto por el estado de error con `Retry`. | yo |
| R2-a no tiene efecto visible: los ingresos solo usan `sales` y `others`, que siempre están en facets. | **P14-a —** Se acepta y se documenta como «cumplido nominalmente; facets no distingue por grupo». | yo |
| ¿Inputs deshabilitados durante la carga? | **P15-a —** Inputs siempre habilitados; solo `Apply` se deshabilita. | yo |

## Revisión 2026-10-15 — Decisiones adoptadas (PM)

| Código | Tema | Decisión adoptada | Implicación |
|---|---|---|---|
| **U1-A** | Categorías por grupo desde facets | Se acepta la limitación de `/facets` (lista maestra global). Las tablas B2B/B2C muestran las categorías de `/categories/top?...business_type=`; si una categoría no está en `FacetsResponse.categories`, se omite. Cuando facets no cargó, no se filtra. | R2-a queda tal cual; se documenta como nominal (P14-a). |
| **U2-A** | Umbral fuera de rango | **Clamp** en frontend: `Math.max(0.01, Math.min(1.0, value))` redondeado a 2 decimales. Solo vacío/`NaN` bloquean `Apply`. | Modifica P11-a (ver arriba). |
| **U3-A** | Estado vacío del dashboard con rango sin datos | KPIs en `—`, gráficos con su estado vacío existente (`No data available to display`), header muestra el rango aplicado o `All time`. Sin banner global. | Coherente con `App.tsx` actual. Sin backend nuevo. |
| **U4-A** | `/api/metrics/alerts` | Se mantiene la desviación Q1-a (frontend calcula). `/alerts` verificado como no conforme y **no se usa** en la UI. Verificación dual opcional en tests (script/test con `threshold=0.3`). | Sin cambios en backend ni tipos de red. |
| **U5-A** | Categoría del top con `total_amount = 0` | Se muestra tal cual: `$0` y `0.0%`. No se filtra. | Comportamiento de la API reflejado fielmente. |
| **Q1-A** | Aprobación de no usar `/alerts` | El PM confirma la desviación Q1-a. | Se elimina cualquier duda bloqueante; se documenta. |
| **Q2-A** | Períodos iniciales sin 3 previos | Sin filtro de fechas: media de los 1–2 previos disponibles con la nota `average of N periods` (Q3-b). El primer período nunca da alerta. | Sin filtro de fechas, se mantiene el comportamiento original. |
| **Q3-A** | Comparación del umbral | **Estricta** `ratio > threshold`. | Ya era el comportamiento; queda confirmado. |
| **Q4-A** | Selector de granularidad | **Se mantiene** el `GranularitySelect` (day/week/month, default `month`). Aprobado por el PM. | UI añade el selector (no está en el PM original, aprobado). |
| **Q5-A** | Refetch al «Apply» | **Botón `Apply` explícito** (B2). Sin clic no hay refetch. Refetch simultáneo de KPIs, gráficos y alertas (J2). `AbortController` (P7-b). | Sin `debounce`/refetch automático. |
| **Q6-B** | Estado inicial del filtro | Los inputs arrancan **prefijados** a `min_date`–`max_date` (rango completo visible). `Apply` confirma. | El borrador inicial no está vacío; coincide con «All time» en el header. |
| **Q7-B** | Formato de la columna `Increase` | **Solo valor absoluto con `%`** + flecha `↑`/`↓` según el signo (ej. `102.01% ↑`, `0.00%`). | Sustituye el `+102.01%` de Q5-b/P2-b. Dos decimales. |
| **Q8-A** | Alcance de los fetch con filtro | `start_date`/`end_date` se aplican a **todos** los endpoints del dashboard (`/metrics`, `/summary`, `/categories/top`, `/comparison`). | Con Q9-B/Q10-B, `/summary` ahora los recibe (ver filas). |
| **Q9-B** | `start_date` en `/summary` | **SUSTITUYE a Q2-a**: se envía `start_date` **y** `end_date` a `/summary`. El cálculo de medias usa solo los períodos **dentro del rango**. | Los períodos iniciales del rango se evalúan con los previos **disponibles dentro del rango** (Q10-B). |
| **Q10-B** | Media con filtro de fechas | Solo se evalúa un período si tiene **3 períodos previos dentro del rango**; si no, **no genera alerta** (no muestra `average of N periods` con rango activo). | Difiere de Q3-b cuando el rango no cubre los 3 previos. |
| **Q11-B** | Formato de semana | Claves de período `YYYY-Www` con **año ISO** (mismo cómputo que `isocalendar()` del backend), p. ej. `2025-12-29` → `2026-W01`. `formatPeriod` muestra `Week 01, 2026`. | Utilidades de fecha alineadas con `/summary`; sin ventana de desajuste (B-1, 2ª revisión 2026-10-15). |
| **Q12-A** | Fallo/uso de facets | Inputs habilitados sin `min`/`max`, aviso `Could not load the available range` + botón `Retry` (Q10-a, P15-a). | Sin bloqueo de inputs. |
| **Q13-A** | Límite de 20 categorías | Se mantiene `limit=20` (R3-a) documentando la limitación. | Si la API devuelve exactamente 20 filas, el total es un mínimo. **M-3:** no se muestra aviso en la UI; solo se documenta. |
| **Q14-A** | Fetch en F3 | Dos peticiones independientes (B2B y B2C) con `useComparison` (H1), cada una con su `isLoading`/`error` (I1). | Sin `Promise.all`. |
| **Q15-A** | Categorías no presentes en facets | **Se filtran** (R2-a). Si facets no cargó, no se filtra. | Comportamiento nominal (ver U1-A, P14-a). |
| **Q16-B** | Conectividad/API base | Se añade un **health check** en el arranque del frontend: si `GET /api/metrics/facets` no responde, se muestra un banner de error de arranque. | Complementa el manejo de errores por componente. |
| **Q17-A** | Idioma | **UI en inglés** (P2-b), incluido el texto de error actual de `App.tsx` (`No se pudo cargar…` → inglés). Se actualizan los tests que miran texto. | Rompe el idioma actual del único mensaje visible; aceptado. |
| **Q18-A** | `% of group` con total 0 | Si `groupTotal = 0`, mostrar `0.0%`. | Evita división por 0. |
| **Q19-A** | Encabezado de la página `/comparison` | Pestaña `B2B vs B2C` en `DashboardHeader` (compartido) y H1 de la página `Revenue comparison — B2B vs B2C`. | Header compartido + H1 propio en la página. |
| **Q20-A** | Mantener datos tras «Apply» con error | Se conservan los últimos datos aplicados y se muestra un aviso de error. | Coherente con F2 (la tabla mantiene los últimos datos aplicados). |

> Nota de coherencia: Q9-B + Q10-B **sustituyen** a Q2-a y matizan Q3-b **cuando hay rango de fechas activo**. El resto de decisiones apuntan a opciones iguales/refinadas de la spec, quedando todo el alcance listo para implementación sin cambios de backend.

## Revisión 2026-10-15 (2ª) — Refinamientos acordados (B-1 … M-6)

| Código | Tema | Decisión | Implicación |
|---|---|---|---|
| **B-1** | Semana `YYYY-Www` | Claves de período con **año ISO** (igual que el backend `isocalendar()`). `formatPeriod` muestra el año ISO. | Sustituye el «año calendario» de Q11-B; elimina el desajuste de cambio de año. |
| **B-2** | `baseline_average = 0` | Si la media de los 3 previos es `0`, el ítem **no genera alerta** (ratio indefinido). | `increase_ratio` nunca es `Infinity`; test específico. |
| **D-1** | Primer load del dashboard | Flag `hasAppliedOnce`: si la **primera** carga falla y nunca hubo datos → mensaje `Failed to load financial data. Check the backend API.` + KPIs `—`; si ya hubo datos → Q20-A (conservar + aviso). | Q17-A también se aplica al primer error de datos. |
| **D-2** | Q6-B vs «vacío = All time» | Si el borrador es igual a `min_date`–`max_date` (o ambos vacíos), el `Apply` **omite** `start_date`/`end_date`. | Sin llamadas redundantes; header `All time`. |
| **D-3** | `canApply` por página | `DateRangeFilter` recibe `extraInvalid?: boolean`; `/dashboard` añade `!isValidThreshold(draft)`, `/comparison` no. | Componente reutilizable; regla por página. |
| **D-4** | Errores en `/comparison` | Jerarquía: (1) banner Q16-B solo en arranque si `/facets` falla; (2) error de página si ambos grupos fallan tras `Apply` sin datos previos → `Comparison unavailable: …`; (3) error de panel (I1) con Q20-A solo en el sano. | Cubre el caso «ambos fallan». |
| **M-1** | Fixtures de test | Los tests unitarios usan datos fijos; los de integración mockean `fetch` con fixtures **fijos** (no dependientes de `seed`/«hoy»). | Tests estables entre días. |
| **M-2** | Redondeo del umbral | El redondeo a 2 decimales ocurre **solo en `Apply`** (`clampThreshold`); el borrador conserva el texto. | El input no «corrige» mientras se escribe. |
| **M-3** | Límite 20 categorías | **Sin aviso en UI**; solo documentado (Q13-A). | Simple. |
| **M-4** | Fetch compartido de facets | Un `FacetsProvider` en `App.tsx` expone `{data, isLoading, error, retry}`; banner Q16-B y `DateRangeFilter` consumen el mismo estado. | Sin peticiones duplicadas. |
| **M-5** | Fechas fuera del rango disponible | Si facets cargó y el rango aplicado está fuera: nota `No financial data in the selected range. Available: {min_date} – {max_date}` junto al filtro. | UX clara; los componentes muestran sus vacíos estándar. |
| **M-6** | Borradores al navegar | Al montar cada página el borrador se inicializa desde el rango **aplicado**; si se edita y se navega sin `Apply`, el borrador se descarta. | Sin sincronización de borradores entre páginas. |