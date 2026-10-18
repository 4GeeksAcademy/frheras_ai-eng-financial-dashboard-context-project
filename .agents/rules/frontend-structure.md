# Nombre

Estructura y convenciones del frontend

## Alcance

Aplica a `frontend/src/**/*.tsx`, `frontend/src/**/*.ts`, estilos, pruebas de frontend y cambios en la comunicación con la API.

## Justificación

La UI separa la composición de página (`frontend/src/App.tsx`), los cálculos (`frontend/src/lib/financial-utils.ts`) y los componentes de presentación (`frontend/src/components/dashboard/`). Sin embargo, la pantalla fija el periodo en 2024 aunque el backend produce un año móvil, los contratos TypeScript se mantienen manualmente y las pruebas actuales se concentran en funciones puras.

## Guía específica del proyecto

- Mantén `App.tsx` como punto de composición y coordinación del fetch/estado. Conserva cálculos financieros reutilizables en `src/lib/financial-utils.ts` y la presentación en componentes bajo `src/components/`; no dupliques agregaciones dentro de gráficas.
- Usa nombres de archivo en `kebab-case` para componentes, como `income-outcome-chart.tsx`, y componentes/funciones en `PascalCase`/`camelCase`, siguiendo el patrón ya existente.
- Sincroniza `FinancialMovement`, `OperationType`, `Category` y `BusinessType` de `src/lib/financial-types.ts` con los modelos y valores de la API en `backend/app/routes.py`. Añade o actualiza pruebas de contrato al cambiar el payload.
- Deriva las etiquetas temporales de los datos o filtros activos. No repitas el literal `period="2024 - Full Year"` de `App.tsx` cuando los datos del backend se generan relativos a `date.today()`.
- Mantén estados visibles de carga, error y ausencia de datos. `App.tsx` ya administra `loading` y `error`; ante nuevos errores, conserva información técnica para diagnóstico y muestra un mensaje seguro. Para solicitudes cancelables, usa `AbortController`.
- Centraliza formato de moneda, porcentaje y fecha siguiendo `.agents/skills/financial-format/SKILL.md`: el estándar vigente es locale `en-US`, moneda USD, importes y porcentajes con dos decimales, y fechas `DD/MM/YYYY`. Si el usuario cambia el mercado objetivo, actualiza skill, formatters y pruebas en el mismo cambio.
- Añade pruebas unitarias de lógica en `src/lib/*.test.ts`. Si cambia el flujo de `App.tsx`, cubre también carga correcta, error de red/HTTP y datos vacíos con pruebas de integración.
- Ejecuta desde `frontend/`: `npm test`, `npm run lint` y `npm run build`.

Ejemplo actual de la separación entre acceso a datos y cálculo:

```tsx
const response = await fetch(`${API_BASE_URL}/api/metrics`);
if (!response.ok) {
  throw new Error(`Failed to fetch financial data: ${response.status}`);
}
return response.json();
```

```ts
const profit = totalIncome - totalOutcome;
const profitPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
```

El proxy configurado en `frontend/vite.config.ts` apunta a `http://backend:8000` (nombre de servicio de Compose). Documenta y verifica por separado el uso de Docker y la ejecución de Vite directamente en el host; no asumas que el hostname `backend` se resuelve desde el host.
