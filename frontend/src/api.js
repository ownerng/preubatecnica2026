// Cliente HTTP único. Ruta relativa /api: sirve igual en local (nginx) y en AWS (CloudFront).
const TOKEN_KEY = "portal.token";
const USER_KEY = "portal.user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 401 en cualquier punto: sesión muerta (logout, usuario desactivado o token revocado)
  if (res.status === 401 && path !== "/auth/login") {
    clearSession();
    window.location.replace("/login");
    throw new ApiError(401, "UNAUTHORIZED", "Sesión expirada");
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? `Error ${res.status}`);
  }
  return data;
}

export const login = (email, password) => api("/auth/login", { method: "POST", body: { email, password } });
export const logout = () => api("/auth/logout", { method: "POST" });
export const me = () => api("/auth/me");

export const listUsers = () => api("/users");
export const createUser = (body) => api("/users", { method: "POST", body });
export const updateUser = (id, body) => api(`/users/${id}`, { method: "PUT", body });
export const setUserStatus = (id, active) => api(`/users/${id}/status`, { method: "PATCH", body: { active } });

export const listNotes = () => api("/notes");
export const createNote = (body) => api("/notes", { method: "POST", body });
export const updateNote = (id, body) => api(`/notes/${id}`, { method: "PUT", body });
export const moveNote = (id, x, y) => api(`/notes/${id}/position`, { method: "PATCH", body: { x, y } });
export const deleteNote = (id) => api(`/notes/${id}`, { method: "DELETE" });

export const getMetrics = () => api("/metrics");
