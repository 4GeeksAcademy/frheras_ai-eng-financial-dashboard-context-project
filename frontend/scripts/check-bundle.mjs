// ─── Budget de bundle en CI sin dependencias externas ───────────────────
// Equivalente a `bundlesize` usando zlib de Node. Fallo (exit 1) si el JS o
// CSS superan el budget. Budgets alineados con la skill performance-optimization:
//   JavaScript bundle: < 200 KB gzipped (initial load)
//   CSS: < 50 KB gzipped
// Uso: node scripts/check-bundle.mjs [--limit-js-mb=0.20]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = resolve(process.cwd(), 'dist', 'assets')

const args = process.argv.slice(2)
function argVal(name, fallback) {
  const hit = args.find((a) => a.startsWith(name))
  return hit ? Number(hit.split('=')[1]) : fallback
}

// Budgets en MB gzipped (0.20 MB = 200 KB)
const JS_LIMIT = argVal('--limit-js-mb', 0.2)
const CSS_LIMIT = argVal('--limit-css-mb', 0.05)

if (!statSync(distDir, { throwIfNoEntry: false })) {
  console.error('✗ No se encontró dist/. Ejecuta `npm run build` antes.')
  process.exit(1)
}

const jsFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'))
const cssFiles = readdirSync(distDir).filter((f) => f.endsWith('.css'))

const gzipSize = (file) => gzipSync(readFileSync(join(distDir, file))).length

const jsTotalKB = jsFiles.reduce((s, f) => s + gzipSize(f), 0) / 1024
const cssTotalKB = cssFiles.reduce((s, f) => s + gzipSize(f), 0) / 1024

console.log('── Bundle budget (gzipped) ──')
console.log(`JS:   ${jsTotalKB.toFixed(2)} kB  (límite ${(JS_LIMIT * 1024).toFixed(0)} kB)`)
console.log(`CSS:  ${cssTotalKB.toFixed(2)} kB  (límite ${(CSS_LIMIT * 1024).toFixed(0)} kB)`)

let failed = false
if (jsTotalKB > JS_LIMIT * 1024) {
  console.error(`✗ JS supera el budget (${jsTotalKB.toFixed(2)} kB > ${(JS_LIMIT * 1024).toFixed(0)} kB)`)
  failed = true
} else {
  console.log('✓ JS dentro del budget')
}
if (cssTotalKB > CSS_LIMIT * 1024) {
  console.error(`✗ CSS supera el budget (${cssTotalKB.toFixed(2)} kB > ${(CSS_LIMIT * 1024).toFixed(0)} kB)`)
  failed = true
} else {
  console.log('✓ CSS dentro del budget')
}

process.exit(failed ? 1 : 0)