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
- **DashboardHeader** (existente, recibe props adicionales)

### 3. Props

#### DateRangeFilter

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `startDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de inicio seleccionada por el usuario. Vacío cuando no hay selección. |
| `endDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de fin seleccionada por el usuario. Vacío cuando no hay selección. |
| `availableMinDate` | `string` (formato `YYYY-MM-DD`) | Sí | Fecha más antigua disponible en el dataset, proveniente de `FacetsResponse.min_date`. Se muestra como referencia al usuario. |
| `availableMaxDate` | `string` (formato `YYYY-MM-DD`) | Sí | Fecha más reciente disponible en el dataset, proveniente de `FacetsResponse.max_date`. Se muestra como referencia al usuario. |
| `onStartDateChange` | `(date: string) => void` | Sí | Callback cuando el usuario cambia la fecha de inicio. |
| `onEndDateChange` | `(date: string) => void` | Sí | Callback cuando el usuario cambia la fecha de fin. |

### 4. Estados

| Estado | Qué ve exactamente el usuario |
|---|---|
| **Cargando** | Los inputs de fecha aparecen deshabilitados (disabled) con un placeholder "Cargando…". El texto de rango disponible muestra "Rango disponible: —". |
| **Vacío** (dataset sin datos) | Los inputs están deshabilitados. El texto de rango disponible muestra "No hay datos disponibles". |
| **Error** (fallo al obtener facets) | Los inputs están deshabilitados. El texto de rango disponible muestra "Error al cargar el rango disponible". |
| **Dato parcial — solo una fecha rellena** | El input relleno conserva su valor. El input vacío permanece en blanco con placeholder `YYYY-MM-DD`. La petición a la API se envía **solo con el parámetro presente** (start_date o end_date); el endpoint trata el parámetro ausente como "sin límite". El usuario puede ver claramente qué lado del filtro está activo. |
| **Rango inválido** (start > end) | Ambos inputs muestran sus valores. Aparece un mensaje de error textual debajo de los inputs: "La fecha de inicio no puede ser posterior a la fecha de fin". No se envía ninguna petición a la API. |

### 5. Decisiones aplicadas (de `verification.md`)

- El endpoint `GET /api/metrics/facets` no requiere parámetros y devuelve `min_date` y `max_date` con formato `date` (`YYYY-MM-DD`) — confirmado ✅.
- El endpoint `GET /api/metrics` (y endpoints relacionados como `/alerts`, `/categories/top`) ya aceptan `start_date` y `end_date` como query parameters opcionales — confirmado ✅.
- Si start_date o end_date están vacíos, se omite el parámetro en la petición (la API lo trata como "sin límite").
- El texto "Rango disponible: {min_date} – {max_date}" se muestra siempre que los datos estén cargados, cerca de los inputs, como referencia visual.

---

## Funcionalidad 2 — Tabla de alertas de anomalías en el dashboard principal

### 1. Propósito

Mostrar una tabla con los períodos en los que el gasto (outcome) superó un umbral configurable respecto a la media móvil de los 3 períodos anteriores, respetando el filtro de fechas activo.

### 2. Componentes

- **AlertsTable**
- **ThresholdInput**

### 3. Props

#### AlertsTable

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `alerts` | `AlertEntry[]` | Sí | Lista de alertas devuelta por `GET /api/metrics/alerts`. Vacío cuando no hay anomalías para el umbral actual. |
| `threshold` | `number` | Sí | Valor del umbral actualmente activo (entre `0.01` y `1.0`). Se muestra en el mensaje de estado vacío. |
| `isLoading` | `boolean` | Sí | Indica si la petición de alertas está en curso. |
| `error` | `string \| null` | No | Mensaje de error si la petición falló. `null` cuando no hay error. |

#### ThresholdInput

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `value` | `number` | Sí | Valor actual del umbral. Por defecto `0.3`. |
| `onChange` | `(value: number) => void` | Sí | Callback cuando el usuario cambia el valor del umbral. |

### 4. Columnas de la tabla

| Columna | Tipo de dato | Formato de visualización | Fuente (campo de `AlertEntry`) |
|---|---|---|---|
| **Período** | `string` | Según `group_by`: `"YYYY"` (día), `"YYYY-Www"` (semana) o `"YYYY-MM"` (mes). Ejemplo visible: `"2025-12"`. | `period` |
| **Outcome registrado** | `number` | Número con 2 decimales, separador de miles, y símbolo de moneda (ej. `$103,378.98`). | `outcome_total` |
| **Media móvil (3 períodos)** | `number` | Número con 2 decimales, separador de miles, y símbolo de moneda (ej. `$51,174.10`). | `baseline_average` |
| **Incremento porcentual** | `number` | Porcentaje con 2 decimales y signo `+` (ej. `+102.01%`). Se calcula como `increase_ratio * 100`. | `increase_ratio` |

### 5. Estados

| Estado | Qué ve exactamente el usuario |
|---|---|
| **Cargando** | La tabla muestra filas esqueleto (skeleton loader) con 4 columnas anchas. El input de umbral está visible pero deshabilitado. |
| **Vacío** (sin anomalías) | La tabla no se oculta. Se muestra un mensaje textual en el cuerpo de la tabla ocupando todo el ancho: "No se detectaron anomalías para el umbral 0.30". El input de umbral está habilitado y funcional. |
| **Error** (fallo en la petición) | La tabla no se renderiza. En su lugar se muestra un mensaje de error: "Error al cargar las alertas. Intente de nuevo más tarde". El input de umbral permanece habilitado. |
| **Umbral fuera de rango** (menor de `0.01` o mayor de `1.0`) | El input de umbral muestra el valor introducido pero con un borde rojo y un mensaje de error debajo: "El umbral debe estar entre 0.01 y 1.0". **No se envía la petición** a la API. La tabla mantiene su estado anterior (últimos datos válidos cargados o vacío). |
| **Dato parcial** (threshold en rango, pero alerts vacío por fechas sin datos) | Se muestra el mensaje de estado vacío estándar: "No se detectaron anomalías para el umbral 0.30". El input de umbral está habilitado. |

### 6. Decisiones aplicadas (de `verification.md`)

- El endpoint `GET /api/metrics/alerts` acepta `threshold` (opcional, type=number, default=0.3, minimum=0), `group_by`, `start_date` y `end_date` — confirmado ✅.
- El frontend valida que `threshold` esté entre `0.01` y `1.0` (rango del PM); si está fuera, no se envía la petición (decisión propia, alineada con el PM). La API acepta `minimum=0`, pero el frontend es más restrictivo.
- Cada fila de `AlertEntry` contiene: `period`, `outcome_total`, `baseline_average`, `increase_ratio` — confirmado ✅ vía curl real.
- El cálculo interno de `baseline_average` como ventana deslizante de 3 períodos está marcado como ❓ en verification.md porque no es observable desde la respuesta; el frontend lo muestra tal cual lo devuelve la API.
- La tabla respeta el rango de fechas activo porque la petición incluye `start_date` y `end_date` cuando están definidos.

---

## Funcionalidad 3 — Vista comparativa B2B vs B2C

### 1. Propósito

Crear una nueva página que permita comparar el rendimiento de ingresos entre las dos líneas de negocio (B2B y B2C), mostrando sus 5 categorías principales y un gráfico comparativo de totales.

### 2. Componentes

- **ComparisonPage** (nueva página/ruta del dashboard)
- **BusinessPanel** (x2: B2B y B2C)
- **CategoryRankingTable** (dentro de cada BusinessPanel)
- **ComparisonChart**

### 3. Props

#### ComparisonPage

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `b2bData` | `CategoryEntry[]` | Sí | Top-5 categorías de ingresos B2B (limit=5, business_type=B2B, operation_type=income). Vacío si no hay datos. |
| `b2cData` | `CategoryEntry[]` | Sí | Top-5 categorías de ingresos B2C (limit=5, business_type=B2C, operation_type=income). Vacío si no hay datos. |
| `b2bTotal` | `number` | Sí | Suma de `total_amount` de todas las categorías B2B devueltas. Se usa para calcular porcentajes y para el gráfico comparativo. |
| `b2cTotal` | `number` | Sí | Suma de `total_amount` de todas las categorías B2C devueltas. Se usa para calcular porcentajes y para el gráfico comparativo. |
| `startDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de inicio del filtro de fechas. |
| `endDate` | `string` (formato `YYYY-MM-DD`) | No | Fecha de fin del filtro de fechas. |
| `availableMinDate` | `string` (formato `YYYY-MM-DD`) | Sí | Fecha mínima del dataset (de `FacetsResponse`). |
| `availableMaxDate` | `string` (formato `YYYY-MM-DD`) | Sí | Fecha máxima del dataset (de `FacetsResponse`). |
| `onStartDateChange` | `(date: string) => void` | Sí | Callback para cambio de fecha de inicio. |
| `onEndDateChange` | `(date: string) => void` | Sí | Callback para cambio de fecha de fin. |
| `isLoading` | `boolean` | Sí | Indica si alguna de las dos peticiones está en curso. |
| `error` | `string \| null` | No | Mensaje de error si alguna petición falló. |

#### BusinessPanel

| Nombre | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `businessType` | `"B2B" \| "B2C"` | Sí | Identificador visual del panel (se usa en el encabezado). |
| `categories` | `CategoryEntry[]` | Sí | Lista de categorías para este panel. Puede estar vacía. |
| `groupTotal` | `number` | Sí | Suma de `total_amount` del grupo, usada para calcular el porcentaje de cada categoría sobre el total del grupo. |

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
| `isLoading` | `boolean` | No | Si es `true`, el gráfico muestra un skeleton en lugar de las barras. |

### 4. Columnas de CategoryRankingTable

| Columna | Tipo de dato | Formato de visualización | Fuente |
|---|---|---|---|
| **Categoría** | `string` (enum) | Nombre capitalizado. Ejemplo: `"sales"` → `"Sales"`, `"administrative"` → `"Administrative"`. | `CategoryEntry.category` |
| **Total ingresos** | `number` | Número con 2 decimales, separador de miles y símbolo de moneda (ej. `$1,132,097.38`). | `CategoryEntry.total_amount` |
| **Porcentaje del grupo** | `number` | Porcentaje con 1 decimal (ej. `45.3%`). Se calcula como `(category.total_amount / groupTotal) * 100`. | Derivado: `total_amount / groupTotal * 100` |

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
| **Cargando** | Ambos paneles muestran un skeleton con 5 filas de carga. El gráfico muestra un skeleton de barra doble. Los inputs de fecha están deshabilitados. |
| **Vacío — ambos paneles sin datos** | Ambos paneles muestran dentro de la tabla el mensaje: "No hay categorías de ingresos disponibles para [B2B/B2C] en el rango seleccionado". El gráfico comparativo muestra ambas barras en 0 con el texto "Sin datos para el período seleccionado". |
| **Vacío — solo un panel sin datos** | El panel con datos muestra su tabla normalmente. El panel sin datos muestra dentro de su tabla: "No hay categorías de ingresos disponibles para [B2B/B2C] en el rango seleccionado". El gráfico comparativo muestra la barra del grupo con datos con su valor real y la barra del grupo vacío en 0 con etiqueta "$0". |
| **Error** (fallo en una o ambas peticiones) | Se muestra un mensaje de error global: "Error al cargar los datos de comparación. Intente de nuevo más tarde". Los inputs de fecha permanecen habilitados. |
| **Dato parcial** (rango de fechas sin ingresos para el período) | Mismo comportamiento que "Vacío — ambos paneles sin datos": mensaje textual en cada panel y gráfico en 0. |
| **Rango inválido** (start > end) | Mismo comportamiento que en Funcionalidad 1: mensaje de error en los inputs de fecha. No se envía petición. |

### 7. Gráfico comparativo

| Aspecto | Descripción |
|---|---|
| **Tipo** | Gráfico de barras (dos barras una al lado de la otra) o barras horizontales apiladas. |
| **Primer punto de datos** | Total de ingresos B2B. Eje X: "B2B". Eje Y: valor de `b2bTotal`. |
| **Segundo punto de datos** | Total de ingresos B2C. Eje X: "B2C". Eje Y: valor de `b2cTotal`. |
| **Formato del tooltip** | Al hacer hover: "B2B: $X.XX" / "B2C: $X.XX". |
| **Leyenda** | No es necesaria (solo dos barras etiquetadas directamente). |

### 8. Decisiones aplicadas (de `verification.md`)

- Los totales B2B y B2C se obtienen **sumando los `total_amount`** devueltos por `GET /api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` y la variante B2C (Opción A, decisión propia, no requiere cambios en backend).
- El endpoint `GET /api/metrics/categories/top` acepta `operation_type`, `limit`, `start_date`, `end_date` y `business_type` — confirmado ✅ (aunque `business_type` está marcado como ❓ en verification.md por tipo incierto, se confirma que el parámetro existe en OpenAPI).
- El endpoint `GET /api/metrics/facets` se usa para obtener las categorías disponibles, aunque no es estrictamente necesario para el top-5 (se consume directamente de la respuesta de `/categories/top`). Las categorías disponibles en `FacetsResponse.categories` son: `["administrative", "operational", "others", "sales", "suppliers"]` — confirmado ✅.
- El filtro de fechas se aplica a ambas peticiones simultáneamente (mismo `start_date` y `end_date` para B2B y B2C).
- El frontend necesita un sistema de navegación entre páginas (dashboard principal → vista comparativa). Esta decisión queda fuera del alcance de este documento de componentes.