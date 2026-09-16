import { useEffect, useRef, useState } from "react";

import { createNote, deleteNote, listNotes, moveNote, updateNote } from "../api.js";

const CANVAS_W = 3000;
const CANVAS_H = 2000;
const NOTE_W = 240;
const NOTE_H = 190;
const STATUSES = ["PENDIENTE", "EN_CURSO", "HECHO"];
const LABELS = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", HECHO: "Hecho" };

const clamp = (v, max) => Math.max(0, Math.min(Math.round(v), max));

export default function Board() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [zTop, setZTop] = useState(1);
  const scrollRef = useRef(null);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function addNote() {
    const box = scrollRef.current;
    // la nota nueva aparece dentro de lo que se está viendo
    const x = clamp((box?.scrollLeft ?? 0) + 40, CANVAS_W - NOTE_W);
    const y = clamp((box?.scrollTop ?? 0) + 40, CANVAS_H - NOTE_H);
    try {
      const note = await createNote({ title: "Nueva nota", text: "", status: "PENDIENTE", x, y });
      setNotes((prev) => [...prev, note]);
    } catch (e) {
      setError(e.message);
    }
  }

  function replace(note) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
  }

  async function remove(id) {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="board-page">
      <div className="toolbar">
        <button onClick={addNote}>Nueva nota</button>
        <span className="hint">Arrastra una nota por su barra superior; la posición se guarda sola.</span>
        {error && <span className="error">{error}</span>}
      </div>

      <div className="canvas-scroll" ref={scrollRef}>
        <div className="canvas" style={{ width: CANVAS_W, height: CANVAS_H }}>
          {loading && <p className="loading">Cargando…</p>}
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSaved={replace}
              onDelete={() => remove(note.id)}
              onError={setError}
              bringToFront={() => setZTop((z) => z + 1)}
              zTop={zTop}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function NoteCard({ note, onSaved, onDelete, onError, bringToFront, zTop }) {
  const [draft, setDraft] = useState({ title: note.title, text: note.text, status: note.status });
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const [z, setZ] = useState(1);
  const [saving, setSaving] = useState(false);
  const drag = useRef(null);

  // Contenido y posición se sincronizan por separado: mover una nota NO debe descartar
  // las ediciones de título/texto/estado que todavía no se han guardado.
  useEffect(() => {
    setDraft({ title: note.title, text: note.text, status: note.status });
  }, [note.title, note.text, note.status]);

  useEffect(() => {
    setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  const dirty =
    draft.title !== note.title || draft.text !== note.text || draft.status !== note.status;

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
    setZ(zTop + 1);
    bringToFront();
  }

  function onPointerMove(e) {
    if (!drag.current) return;
    const x = clamp(e.clientX - drag.current.dx, CANVAS_W - NOTE_W);
    const y = clamp(e.clientY - drag.current.dy, CANVAS_H - NOTE_H);
    drag.current.moved = true;
    setPos({ x, y });
  }

  async function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved || (pos.x === note.x && pos.y === note.y)) return;
    try {
      const saved = await moveNote(note.id, pos.x, pos.y);
      onSaved(saved);
    } catch (e) {
      setPos({ x: note.x, y: note.y }); // revertir si el guardado falla
      onError(e.message);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await updateNote(note.id, draft);
      onSaved(saved);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`note status-${draft.status}`}
      style={{ left: pos.x, top: pos.y, width: NOTE_W, zIndex: z }}
    >
      <header
        className="note-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Arrastrar"
      >
        <span>{LABELS[draft.status]}</span>
        {dirty && <span className="dot" title="Cambios sin guardar">●</span>}
      </header>

      <input
        className="note-title"
        value={draft.title}
        maxLength={120}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <textarea
        className="note-text"
        value={draft.text}
        maxLength={2000}
        rows={3}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
      />
      <div className="note-actions">
        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABELS[s]}
            </option>
          ))}
        </select>
        <button onClick={save} disabled={!dirty || saving}>
          Guardar
        </button>
        <button className="danger" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </article>
  );
}
