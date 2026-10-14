# Hallazgos de Arquitectura y Calidad

Análisis del estado actual del repositorio. Cada hallazgo incluye evidencia concreta y una regla accionable; las reglas son recomendaciones para mantener la coherencia, no una afirmación de que ya estén implantadas.

## Arquitectura

### A1. El router concentra varias responsabilidades
**Evidencia:** `backend/app/routes.py` contiene generación de datos (`generate_mock_movements`), filtros, agregaciones, comparación, alertas y las nueve rutas HTTP. `backend/app/main.py` se limita a configurar FastAPI, CORS e incluir el router.

**Riesgo:** Cambios en datos, lógica de métricas y contrato HTTP quedan acoplados en el mismo módulo, lo que hace más difícil evolucionar o probar esas partes por separado.

**Regla:** Mantener los endpoints como capa de transporte y, cuando la lógica crezca o se reutilice, mover generación/repositorio y cálculos de dominio a módulos separados; no dividir por anticipado sin una segunda implementación real.

### A2. La UI y el backend ofrecen superficies distintas
**Evidencia:** `frontend/src/App.tsx` solicita solamente `/api/metrics` y calcula sus vistas con `frontend/src/lib/financial-utils.ts`. El backend también ofrece `/api/metrics/summary`, `/categories/top`, `/comparison` y `/alerts` en `backend/app/routes.py`, pero la UI no los consume. Además, `business_type` se acepta en varios endpoints analíticos y no en `/api/metrics` ni `/facets`.

**Riesgo:** Se mantienen cálculos duplicados potenciales y filtros con capacidades distintas; el frontend puede terminar mostrando resultados distintos a los endpoints analíticos.

**Regla:** Definir para cada cálculo cuál es la fuente canónica y documentar qué endpoints consume cada pantalla. Antes de añadir un filtro, acordar y probar su disponibilidad coherente en las rutas relacionadas.

### A3. El periodo mostrado no representa los datos
**Evidencia:** `backend/app/routes.py` genera movimientos relativos a `date.today()`; `frontend/src/App.tsx` pasa el texto fijo `"2024 - Full Year"` a `DashboardHeader`.

**Riesgo:** El encabezado puede describir un periodo distinto del que se agrega en los KPI y las gráficas.

**Regla:** Derivar el periodo visible de los datos/respuesta del servidor o de filtros activos; no codificar etiquetas temporales en la UI.

### A4. Contratos de datos duplicados entre lenguajes
**Evidencia:** El modelo Pydantic `FinancialMovement` vive en `backend/app/routes.py`, mientras que el tipo homónimo está declarado manualmente en `frontend/src/lib/financial-types.ts`.

**Riesgo:** Cambios de nombres, valores permitidos o nulabilidad pueden actualizarse en un lado y romper el otro sin que TypeScript lo detecte.

**Regla:** Mantener los contratos sincronizados con generación desde OpenAPI o, como mínimo, añadir una prueba de contrato que compare las respuestas reales con los tipos/esquemas esperados.

## Naming

### N1. El vocabulario financiero puede confundirse
**Evidencia:** La API y sus tipos llaman `outcome` a los gastos (`OperationType`, `MetricsSummaryItem` en `backend/app/routes.py`); la UI también usa `Total Outcome` en `frontend/src/components/dashboard/kpi-row.tsx`, mientras que otras etiquetas usan `expenditure`.

**Riesgo:** `outcome` puede interpretarse como resultado/neto y no como egreso; mezclar términos dificulta leer API, métricas y pruebas.

**Regla:** Elegir un glosario de dominio (por ejemplo, ingreso/egreso) y usarlo consistentemente en nombres nuevos, labels y documentación. Si se cambia un término del contrato público, versionar o compatibilizar la API.

### N2. Formato de fechas y locales no está centralizado
**Evidencia:** `frontend/src/lib/financial-utils.ts` formatea meses con `en-US` y moneda con `en-US`/`USD`; `frontend/src/App.tsx` y otros textos de error están en español, mientras que `dashboard-header.tsx` contiene etiquetas en inglés.

**Riesgo:** La interfaz mezcla idiomas y asume moneda/locale sin una configuración explícita del producto.

**Regla:** Centralizar locale, moneda y traducciones en una configuración compartida; no introducir nuevos formatos localizados directamente en componentes/utilidades.

### N3. Las reglas de estilo varían entre archivos
**Evidencia:** `frontend/src/lib/financial-types.ts` y `main.tsx` usan comillas simples y omiten puntos y coma; `App.tsx` y `financial-utils.ts` usan comillas dobles y puntos y coma. Los componentes existentes también mezclan ambos estilos.

**Riesgo:** El formato depende del archivo y las diferencias se perpetúan en nuevos cambios.

**Regla:** Adoptar una configuración de formatter (por ejemplo, Prettier) y aplicarla al frontend en CI o mediante scripts; evitar reformatear archivos fuera del alcance de una tarea.

## Error Handling

### E1. El frontend oculta la causa del fallo de red
**Evidencia:** `frontend/src/App.tsx` convierte cualquier rechazo de `fetch` en el mismo mensaje y descarta el error capturado (`.catch(() => ...)`). `fetchFinancialData` comprueba `response.ok`, pero no distingue fallos HTTP, red o parseo JSON.

**Riesgo:** El usuario y quien depura no pueden distinguir backend caído, respuesta HTTP inválida o payload malformado.

**Regla:** Conservar el error técnico para logging/diagnóstico y mostrar un mensaje de usuario seguro pero específico por tipo de fallo; cubrir cada caso con pruebas. No exponer detalles internos al usuario.

### E2. La petición inicial no tiene cancelación ni timeout
**Evidencia:** El `useEffect` de `frontend/src/App.tsx` inicia `fetchFinancialData()` sin `AbortController` y actualiza estado al completar.

**Riesgo:** Una navegación/desmontaje durante una petición o una conexión que no termina puede dejar trabajo innecesario y estados de carga indefinidos.

**Regla:** Para peticiones que puedan durar o repetirse, definir timeout/cancelación y una política explícita de carga; evitar actualizar estado después de cancelar.

### E3. El generador muta el RNG global
**Evidencia:** `generate_mock_movements` llama `random.seed(seed)` en `backend/app/routes.py`; los endpoints lo ejecutan en cada solicitud.

**Riesgo:** La función altera el estado global del generador aleatorio y puede interferir con código concurrente u otras partes que usen `random`.

**Regla:** Usar una instancia local `random.Random(seed)` y pasarla al generador de movimientos; no mutar estado global desde funciones de dominio.

### E4. Hay entradas de rango sin validación de orden
**Evidencia:** `/api/metrics/comparison` exige `start_date` y `end_date`, pero no comprueba que `start_date <= end_date`; calcula el periodo previo con la duración resultante. `filter_movements` permite recibir ambos límites sin validar su relación.

**Riesgo:** Un rango invertido produce resultados vacíos o una comparación de periodos inesperada en vez de un error de validación claro.

**Regla:** Validar invariantes de rango en la frontera de la API (por ejemplo, `start_date <= end_date`) y probar el status y el mensaje para entradas inválidas.

### E5. Facets presupone una colección no vacía
**Evidencia:** `build_metrics_facets` accede a `ordered[0]` y `ordered[-1]` en `backend/app/routes.py` sin manejar lista vacía.

**Riesgo:** Si la fuente de datos se sustituye o filtra hasta quedar vacía, el endpoint puede fallar con `IndexError`.

**Regla:** Para funciones que acepten colecciones, definir explícitamente el comportamiento vacío (respuesta vacía válida o error de dominio controlado) y cubrirlo con una prueba.

## Testing

### T1. La cobertura de backend valida algunas respuestas de forma superficial
**Evidencia:** `backend/tests/test_routes.py` tiene pruebas para las rutas, pero la prueba de comparación comprueba principalmente las claves de respuesta; la de alertas permite cualquier lista vacía sin validar el algoritmo.

**Riesgo:** Errores de cálculo, límites de fechas o cambios de semántica pueden pasar mientras se mantiene la forma JSON.

**Regla:** Para cada operación analítica, probar resultados numéricos con fixtures pequeños conocidos, límites (cero, fechas invertidas, límites de `limit`) y filtros combinados; mantener pruebas de contrato además de las estructurales.

### T2. Las pruebas frontend se concentran en funciones puras
**Evidencia:** `frontend/src/lib/financial-utils.test.ts` prueba `computeKPIs`, `computeMonthlyData` y formatters; no hay pruebas de `App.tsx`, estados de carga/error ni renderizado de charts.

**Riesgo:** Cambios en fetch, cableado de componentes o estados visibles no se detectan con las pruebas actuales.

**Regla:** Mantener las pruebas unitarias de utilidades y añadir pruebas de integración de la pantalla para carga exitosa, error HTTP/red y ausencia de datos cuando cambie ese flujo.

### T3. Faltan casos de borde para entrada de datos
**Evidencia:** `FinancialMovement` define `amount: float` en `backend/app/routes.py` y `amount: number` en el tipo frontend; los tests de `financial-utils.test.ts` no cubren importes negativos, fechas inválidas o valores no finitos.

**Riesgo:** Casos inválidos pueden producir totales engañosos o errores de renderizado/serialización.

**Regla:** Establecer invariantes del dominio para importes y fechas en el esquema de entrada, y añadir pruebas de borde acordes antes de aceptar datos reales.

## DX

### D1. El proxy de Vite está acoplado al nombre de servicio Docker
**Evidencia:** `frontend/vite.config.ts` apunta `/api` a `http://backend:8000`, nombre resoluble dentro de Compose. `README.es.md` afirma que el proxy funciona en desarrollo local/Codespaces sin variables adicionales, pero ejecutar Vite directamente en el host no garantiza resolver `backend`.

**Riesgo:** `npm run dev` fuera de Docker puede mostrar error de API pese a que el backend esté disponible en `localhost:8000`.

**Regla:** Documentar por separado el flujo Docker y el flujo host; permitir configurar el target del proxy mediante variable de entorno o instrucción de ejecución reproducible y comprobar ambos flujos.

### D2. Compose ordena arranque, pero no espera disponibilidad
**Evidencia:** `docker-compose.yml` usa `depends_on: backend` para frontend, pero el servicio backend no declara `healthcheck`.

**Riesgo:** Compose puede iniciar Vite antes de que FastAPI esté lista. La carga inicial falla y `frontend/src/App.tsx` no reintenta.

**Regla:** Añadir healthcheck y condición de dependencia de servicio saludable, o implementar reintento/backoff en el cliente; verificar el arranque en frío.

### D3. El identificador visible de periodo es fijo
**Evidencia:** `frontend/src/App.tsx` fija `period="2024 - Full Year"`, mientras los movimientos del backend dependen de la fecha actual.

**Riesgo:** Los datos pueden cambiar al año móvil aunque la etiqueta no cambie, dificultando validar visualmente el dashboard.

**Regla:** Incluir una comprobación automatizada de coherencia entre el rango de datos y el periodo visible; retirar cualquier etiqueta hardcodeada antes de publicar cambios de datos.

### D4. El bundle de producción excede el umbral de aviso de Vite
**Evidencia:** La última ejecución registrada de `npm run build` produjo un chunk JavaScript de aproximadamente 584 kB y el aviso de Vite de chunks mayores a 500 kB.

**Riesgo:** Descarga inicial y parsing más costosos, especialmente en conexiones lentas; el aviso no es un error funcional.

**Regla:** Revisar el tamaño del bundle cuando se añadan dependencias; aplicar división de código o carga diferida solo si el análisis de bundle identifica una mejora útil.
