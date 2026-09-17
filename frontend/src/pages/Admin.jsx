import { useEffect, useRef, useState } from "react";

import { createUser, listUsers, setUserStatus, updateUser } from "../api.js";

const EMPTY = { name: "", email: "", password: "", role: "USER" };
const ROLES = { ADMIN: "Administrador", USER: "Usuario" };

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id en edición
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const formRef = useRef(null);

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
        setInfo("Cambios guardados.");
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
    // el formulario vive debajo de la lista: lo traigo a la vista
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          <p className="page-lead">
            Quién entra al portal. Un usuario desactivado pierde el acceso al instante.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}


      <table className="users">
        <colgroup>
          <col />
          <col />
          <col className="c-rol" />
          <col className="c-estado" />
          <col className="c-acciones" />
        </colgroup>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? "" : "inactive"}>
              <td className="name">{u.name}</td>
              <td>{u.email}</td>
              <td>
                <span className={`tag${u.role === "ADMIN" ? " admin" : ""}`}>
                  {ROLES[u.role] ?? u.role}
                </span>
              </td>
              <td>
                {u.active ? <span className="tag">Activo</span> : <span className="tag off">Inactivo</span>}
              </td>
              <td className="actions">
                <button className="secondary" onClick={() => edit(u)}>
                  Editar
                </button>
                <button className={u.active ? "danger" : "secondary"} onClick={() => toggle(u)}>
                  {u.active ? "Desactivar" : "Reactivar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="panel user-form" ref={formRef} onSubmit={submit}>
        <h2>{editing ? "Editar usuario" : "Añadir usuario"}</h2>
        <div className="row">
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
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
            Contraseña {editing && <small>(déjala vacía para no cambiarla)</small>}
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
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
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
    </section>
  );
}
