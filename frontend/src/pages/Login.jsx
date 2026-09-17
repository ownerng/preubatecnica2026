import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { login, setSession } from "../api.js";

export default function Login({ onLogin, user }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/board" replace />;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      setSession(res.token, res.user);
      onLogin(res.user);
      navigate("/board", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      {/* el producto como telón de fondo: notas ya clavadas en la pared */}
      <div className="login-notes" aria-hidden="true">
        <span className="n1">Revisar el contrato de la API</span>
        <span className="n2">Migrar la tabla de notas</span>
        <span className="n3">Demo del viernes</span>
        <span className="n4">Pedir accesos a Ana</span>
      </div>

      <form className="login-form" onSubmit={submit}>
        <h1>Portal de equipo</h1>
        <p className="login-lead">Entra para ver el tablero y mover tus notas.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
