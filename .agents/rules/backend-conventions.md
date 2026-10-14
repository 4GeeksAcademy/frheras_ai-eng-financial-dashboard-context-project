# Nombre

Convenciones de backend y contratos de métricas

## Alcance

Aplica a `backend/app/**/*.py`, `backend/tests/**/*.py` y a cualquier cambio en rutas, modelos, filtros o cálculos de la API FastAPI.

## Justificación

`backend/app/routes.py` actualmente contiene modelos Pydantic, generación de datos, filtros, agregaciones y nueve endpoints. Mantener juntos estos elementos es razonable para el tamaño actual, pero aumenta el acoplamiento si la lógica crece. Los tipos del contrato también están duplicados manualmente en `frontend/src/lib/financial-types.ts`.

## Guía específica del proyecto

- Mantén los endpoints como capa HTTP y las funciones de cálculo como funciones deterministas siempre que sea posible. Si lógica de datos o dominio empieza a reutilizarse, sepárala en módulos con responsabilidad clara; evita crear capas sin un caso real de reutilización.
- Usa `snake_case` para funciones, variables y campos Python. Conserva los modelos Pydantic como definición explícita de las respuestas.
- Trata los valores de `OperationType`, `Category`, `BusinessType` y los campos de modelos como contrato público. Si cambian, actualiza los tipos del frontend y las pruebas en el mismo cambio.
- No cambies nombres de dominio expuestos por la API sin revisar compatibilidad. Por ejemplo, `operation_type="outcome"` aparece en `backend/app/routes.py` y en `frontend/src/lib/financial-types.ts`; no lo renombres solo en un lado.
- No alteres el generador aleatorio global. `generate_mock_movements` actualmente llama `random.seed(seed)`; para nuevos generadores usa una instancia local `random.Random(seed)` y pásala a las funciones auxiliares.
- Valida invariantes en la frontera HTTP. En particular, comprueba que los rangos tengan `start_date <= end_date` antes de calcular la comparación del periodo en `/api/metrics/comparison`.
- Define y prueba qué ocurre con colecciones vacías antes de indexarlas. `build_metrics_facets` usa `ordered[0]` y `ordered[-1]`; conserva esa precondición de forma explícita o devuelve un resultado/error controlado.
- Mantén las pruebas de backend en `backend/tests/`. Usa fixtures pequeñas con resultados conocidos para cálculos; no limites las pruebas analíticas a comprobar que existan ciertas claves JSON.

Ejemplo actual de respuesta tipada y ruta:

```python
class MetricsSummaryItem(BaseModel):
    period: str
    income: float
    outcome: float
    net: float

@router.get("/api/metrics/summary", response_model=list[MetricsSummaryItem])
def get_metrics_summary(...):
    ...
```

Ejecuta las pruebas desde `backend/` con `python -m pytest -q`.
