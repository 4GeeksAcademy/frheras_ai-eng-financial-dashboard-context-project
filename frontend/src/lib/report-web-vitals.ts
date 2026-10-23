// ─── RUM ligero sin dependencias externas ──────────────────────────────
// Mide Core Web Vitals (LCP, INP, CLS) + FCP usando la PerformanceObserver
// API del navegador. No requiere instalar `web-vitals`.
// (perf: Workflow paso 1 MEASURE + paso 5 GUARD)

type MetricName = "FCP" | "LCP" | "CLS" | "INP";

interface Metric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

// El rating se calcula internamente; los callers solo aportan nombre y valor.
type MetricInput = Omit<Metric, "rating">;

type ObsEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
  duration?: number;
};

// Umbrales alineados con la skill performance-optimization + estándar web-vitals
const thresholds: Record<MetricName, { good: number; poor: number }> = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 }, // skill: LCP ≤ 2.5s
  CLS: { good: 0.1, poor: 0.25 }, // skill: CLS ≤ 0.1
  INP: { good: 200, poor: 500 }, // skill: INP ≤ 200ms
};

function ratingFor(name: MetricName, value: number): Metric["rating"] {
  const t = thresholds[name];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function reportMetric(metric: MetricInput): void {
  const entry: Metric & { path: string } = {
    ...metric,
    rating: ratingFor(metric.name, metric.value),
    path: window.location.pathname,
  };

  // En dev se muestra en consola; en prod es el punto de extensión para
  // enviar a Analytics (telemetría). No enviamos nada por defecto.
  if (import.meta.env.DEV) {
    const decimals = metric.name === "CLS" ? 4 : 1;
    console.info(
      `[web-vitals] ${metric.name}: ${metric.value.toFixed(decimals)} ms (${entry.rating})`,
    );
  }
  void entry;
  // fetch("/api/telemetry", { method: "POST", body: JSON.stringify(entry), keepalive: true });
}

const alreadyLcp = new Set<MetricName>();

export function reportWebVitals(enabled = true): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  if (!("PerformanceObserver" in window)) return;

  // ── FCP ──
  try {
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((p) => p.name === "first-contentful-paint");
    if (fcp) reportMetric({ name: "FCP", value: fcp.startTime });
  } catch {
    /* Performance API no disponible */
  }

  // ── LCP (se reporta con la última entry, como hace web-vitals) ──
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last && !alreadyLcp.has("LCP")) {
        alreadyLcp.add("LCP");
        reportMetric({ name: "LCP", value: last.startTime });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* LCP no soportado */
  }

  // ── CLS (acumulado, ignorando shifts con input reciente) ──
  let clsTotal = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as ObsEntry[]) {
        if (!entry.hadRecentInput) clsTotal += entry.value ?? 0;
      }
      if (clsTotal > 0) reportMetric({ name: "CLS", value: clsTotal });
    }).observe({ type: "layout-shift", buffered: true });
  } catch {
    /* CLS no soportado */
  }

  // ── INP (duración del evento) ──
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries() as ObsEntry[];
      const last = entries[entries.length - 1];
      if (last && !alreadyLcp.has("INP")) {
        alreadyLcp.add("INP");
        reportMetric({ name: "INP", value: last.duration ?? last.startTime });
      }
    }).observe({ type: "event", buffered: true });
  } catch {
    /* INP no soportado */
  }
}