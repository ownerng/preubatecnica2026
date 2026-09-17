import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { clearSession, getToken, getUser, logout as apiLogout } from "./api.js";
import Admin from "./pages/Admin.jsx";
import Board from "./pages/Board.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

const ROLES = { ADMIN: "Administrador", USER: "Usuario" };

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

  const routes = (
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
  );

  if (!showNav) return <main>{routes}</main>;

  return (
    <div className="shell">
      <header className="rail">
        <div className="rail-mark">
          <span className="rail-mark-name">Portal</span>
          <span className="rail-mark-sub">Tablero del equipo</span>
        </div>

        <nav className="rail-nav">
          <NavLink to="/board">Tablero</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {user.role === "ADMIN" && <NavLink to="/admin">Personas</NavLink>}
        </nav>

        <div className="rail-user">
          <span className="rail-user-name">{user.name}</span>
          <span className="rail-user-role">{ROLES[user.role] ?? user.role}</span>
          <button className="ghost" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <main>{routes}</main>
    </div>
  );
}
