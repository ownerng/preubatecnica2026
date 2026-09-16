import { useEffect, useState } from "react";

import { createUser, listUsers, setUserStatus, updateUser } from "../api.js";

const EMPTY = { name: "", email: "", password: "", role: "USER" };

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id en edición
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function reload() {
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      if (editing) {
        const body = { name: form.name, email: form.email, role: form.role };
        if (form.password) body.password = form.password;
        await updateUser(editing, body);
        setInfo("Usuario actualizado");
      } else {
        await createUser(form);
        setInfo("Usuario creado. Ya puede entrar con la contraseña que le asignaste.");
      }
      setForm(EMPTY);
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(user) {
    setEditing(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError("");
    setInfo("");
  }

  async function toggle(user) {
    setError("");
    setInfo("");
    try {
      await setUserStatus(user.id, !user.active);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="page">
      <h1>Administración de usuarios</h1>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <form className="card user-form" onSubmit={submit}>
        <h2>{editing ? "Editar usuario" : "Nuevo usuario"}</h2>
        <div className="row">
          <label>
            Nombre
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Contraseña {editing && <small>(opcional)</small>}
            <input
              type="password"
              value={form.password}
              minLength={8}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
            />
          </label>
          <label>
            Rol
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        </div>
        <div className="row">
          <button type="submit">{editing ? "Guardar cambios" : "Crear usuario"}</button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <table className="users">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? "" : "inactive"}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.active ? "Activo" : "Inactivo"}</td>
              <td className="actions">
                <button className="secondary" onClick={() => edit(u)}>
                  Editar
                </button>
                <button className={u.active ? "danger" : ""} onClick={() => toggle(u)}>
                  {u.active ? "Desactivar" : "Reactivar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
