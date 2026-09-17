import { useCallback, useEffect, useState } from "react";

import { getMetrics } from "../api.js";

// Orden fijo: el color sigue al estado, nunca a su tamaño en el reparto.
const STATUSES = ["PENDIENTE", "EN_CURSO", "HECHO"];
const LABELS = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", HECHO: "Hecho" };

function formatTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es");
}

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

  const total = data?.total ?? 0;
  const rows = STATUSES.map((status) => {
    const count = data?.byStatus?.[status] ?? 0;
    return { status, count, share: total ? Math.round((count / total) * 100) : 0 };
  });

  return (
    <section className="page dash">
      <div className="page-head">
        <div>
          <h1>Cómo va el tablero</h1>
          <p className="page-lead">El reparto de notas por estado, ahora mismo.</p>
        </div>
        <button className="secondary" onClick={load} disabled={busy}>
          {busy ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="panel dist">
            <p className="dist-total">
              <strong>{total}</strong>
              <span>{total === 1 ? "nota en el tablero" : "notas en el tablero"}</span>
            </p>

            {total === 0 ? (
              <p className="dist-empty">
                Todavía no hay notas. Crea una en el tablero y vuelve aquí.
              </p>
            ) : (
              <ul className="dist-rows">
                {rows.map((r) => (
                  <li key={r.status}>
                    <span className="label">{LABELS[r.status]}</span>
                    <span className="count">{r.count}</span>
                    <span className="share">{r.share}%</span>
                    <div className="track">
                      <div
                        className={`fill fill-${r.status}`}
                        style={{ width: `${r.share}%` }}
                        role="img"
                        aria-label={`${LABELS[r.status]}: ${r.count} de ${total} notas`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="source-note">
            Calculado por la Lambda de métricas (<code>source: {data.source}</code>). Datos de{" "}
            {formatTime(data.generatedAt)}.
          </p>
        </>
      )}
    </section>
  );
}
