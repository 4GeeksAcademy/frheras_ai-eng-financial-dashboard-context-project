# Verificación

## Mis dudas antes de mirar la API
- Funcionalidad 1: ¿El endpoint /api/metrics actual ya acepta parámetros start_date y end_date o hay que modificarlo? ¿El endpoint /api/metrics/facets devuelve el rango de fechas mínimo y máximo del dataset?
- Funcionalidad 2: ¿La API de alertas calcula la media móvil de exactamente 3 períodos anteriores como pide el PM? ¿El endpoint /api/metrics/alerts acepta filtros de rango de fechas para respetar la Funcionalidad 1? ¿El umbral que acepta la API coincide con el rango 0.01–1.0 que pide el PM?
- Funcionalidad 3: ¿El endpoint /api/metrics/categories/top acepta un filtro por business_type para separar B2B y B2C? ¿El frontend tiene un sistema de navegación entre páginas o todo es una sola vista?

## Afirmaciones verificadas
| Afirmación | Fuente | Estado (✅ ❌ ❓) |
|---|---|---|
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
| Parámetro `business_type`: query, opcional, type=? (string con enum ["B2B","B2C"] inferido) | OpenAPI spec — parámetro presente, type=? | ❓ |
| Respuesta campo `period`: string, ejemplo `"2025-12"` | Curl real | ✅ |
| Respuesta campo `outcome_total`: number, ejemplo `103378.98` | Curl real | ✅ |
| Respuesta campo `baseline_average`: number, ejemplo `51174.1` | Curl real | ✅ |
| Respuesta campo `increase_ratio`: number, ejemplo `1.0201` | Curl real | ✅ |
| El cálculo de `baseline_average` usa ventana deslizante de exactamente 3 períodos | No observable en OpenAPI ni en la respuesta | ❓ |
| | | |
| **GET /api/metrics/categories/top** | | |
| Parámetro `operation_type`: query, opcional, type=string, default="outcome", enum=["income","outcome"] | OpenAPI spec — schema `enum` | ✅ |
| Parámetro `limit`: query, opcional, type=integer, default=5, minimum=1, maximum=20 | OpenAPI spec — schema `minimum=1, maximum=20` | ✅ |
| Parámetro `start_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `end_date`: query, opcional, type=date (formato string) | OpenAPI spec — parámetro presente | ✅ |
| Parámetro `business_type`: query, opcional, type=? (string con enum ["B2B","B2C"] inferido) | OpenAPI spec — parámetro presente, type=? | ❓ |
| Respuesta campo `category`: string, enum=["suppliers","sales","operational","administrative","others"], ejemplo `"sales"` | Curl real + OpenAPI `TopCategoryItem.category.enum` | ✅ |
| Respuesta campo `operation_type`: string, enum=["income","outcome"], ejemplo `"income"` | Curl real + OpenAPI `TopCategoryItem.operation_type.enum` | ✅ |
| Respuesta campo `total_amount`: number, ejemplo `1132097.38` | Curl real | ✅ |

## Decisiones
| Duda | Decisión | Quién la confirma (yo / el PM) |
|---|---|---|
| ¿Cómo obtener el total de ingresos B2B y B2C para el gráfico comparativo y el porcentaje sobre el grupo? | **Opción A:** llamar a `/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` (y B2C) y sumar los `total_amount` de las categorías devueltas. No requiere cambios en backend. | yo |
| ¿Qué rango debe aceptar el input numérico del usuario en el frontend para el threshold de alertas? | **Opción A:** input con `min=0.01` y `max=1.0`, alineado con el brief del PM. Si el usuario introduce un valor fuera de rango, el frontend no envía la petición. | yo |