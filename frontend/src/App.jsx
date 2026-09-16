import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { clearSession, getToken, getUser, logout as apiLogout } from "./api.js";
import Admin from "./pages/Admin.jsx";
import Board from "./pages/Board.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

function Protected({ user, adminOnly = false, children }) {
  if (!user || !getToken()) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/board" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();
  const location = useLocation();

  // Otra pestaña cerró sesión -> esta también
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      /* el token ya podía estar muerto */
    }
    clearSession();
    setUser(null);
    navigate("/login", { replace: true });
  }

  const showNav = user && location.pathname !== "/login";

  return (
    <>
      {showNav && (
        <header className="nav">
          <span className="brand">Portal de equipo</span>
          <nav>
            <Link to="/board">Tablero</Link>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === "ADMIN" && <Link to="/admin">Administración</Link>}
          </nav>
          <span className="spacer" />
          <span className="who">
            {user.name} · {user.role}
          </span>
          <button className="secondary" onClick={handleLogout}>
            Salir
          </button>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} user={user} />} />
          <Route
            path="/board"
            element={
              <Protected user={user}>
                <Board />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected user={user}>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected user={user} adminOnly>
                <Admin />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to={user ? "/board" : "/login"} replace />} />
        </Routes>
      </main>
    </>
  );
}
