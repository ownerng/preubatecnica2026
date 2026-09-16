import { useCallback, useEffect, useState } from "react";

import { getMetrics } from "../api.js";

const LABELS = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", HECHO: "Hecho" };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setData(await getMetrics());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="page">
      <div className="toolbar">
        <h1>Dashboard</h1>
        <button onClick={load} disabled={busy}>
          {busy ? "Actualizando…" : "Recargar"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="cards">
            <div className="card metric">
              <span className="metric-label">Total de notas</span>
              <strong className="metric-value">{data.total}</strong>
            </div>
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className={`card metric status-${status}`}>
                <span className="metric-label">{LABELS[status] ?? status}</span>
                <strong className="metric-value">{count}</strong>
              </div>
            ))}
          </div>
          <p className="hint">
            Calculado por la Lambda de métricas (source: <code>{data.source}</code>) · {data.generatedAt}
          </p>
        </>
      )}
    </section>
  );
}
