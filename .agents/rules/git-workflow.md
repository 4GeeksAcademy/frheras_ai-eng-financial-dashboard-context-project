# Nombre

Flujo de trabajo Git y validación local

## Alcance

Aplica a cambios en cualquier parte del repositorio, ejecución de comandos, generación de artefactos y preparación de commits.

## Justificación

El repositorio tiene dos áreas de ejecución: `backend/` (pytest, FastAPI) y `frontend/` (npm, Vitest, ESLint y Vite). `docker-compose.yml` levanta ambos servicios. La instalación de npm debe ejecutarse dentro de `frontend/`; ejecutarla en la raíz o en `backend/` puede crear archivos de lock fuera del proyecto Node previsto. El `.gitignore` excluye varios artefactos locales, pero no sustituye la revisión del estado Git.

## Guía específica del proyecto

- Antes de modificar archivos, revisa `git status --short` desde la raíz y conserva cambios existentes que no pertenezcan a la tarea. Después, vuelve a revisar el estado para identificar exactamente los archivos generados o modificados.
- Ejecuta cada gestor desde su directorio de proyecto: `npm install` y scripts npm desde `frontend/`; `pip install -r requirements.txt` y `python -m pytest -q` desde `backend/`. No ejecutes `npm install` desde la raíz ni desde `backend/`.
- Usa los comandos definidos en `frontend/package.json`: `npm test`, `npm run lint` y `npm run build`. Para verificar Compose, usa `docker compose config` antes de `docker compose up --build`.
- Cuando documentes o cambies el proxy, distingue los entornos: `frontend/vite.config.ts` apunta a `http://backend:8000`, que corresponde al servicio de Compose. No afirmes que el proxy funciona desde el host sin configurar o verificar el origen accesible.
- Revisa el diff antes de entregar (`git diff --check` y `git diff --stat`), confirma que los archivos nuevos son los esperados y no incluyas `.venv/`, `node_modules/`, `dist/`, logs ni artefactos de pruebas.
- No borres ni reviertas cambios existentes de otra persona. No crees commits ni ramas salvo que el usuario lo pida explícitamente.

Ejemplo de validación por área desde la raíz:

```bash
(cd backend && . .venv/bin/activate && python -m pytest -q)
(cd frontend && npm test && npm run lint && npm run build)
docker compose config
```

Si el entorno aún no tiene dependencias, instala primero dentro del área correspondiente (`backend/requirements.txt` o `frontend/package.json`) y revisa `git status --short` después de la instalación.
