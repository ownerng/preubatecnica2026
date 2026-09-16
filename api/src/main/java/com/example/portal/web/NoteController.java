package com.example.portal.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.portal.Store;
import com.example.portal.model.Note;
import com.example.portal.model.User;
import com.example.portal.web.Dtos.CreateNoteRequest;
import com.example.portal.web.Dtos.NoteDto;
import com.example.portal.web.Dtos.PositionRequest;
import com.example.portal.web.Dtos.UpdateNoteRequest;

import jakarta.validation.Valid;

/** Tablero único compartido: cualquier usuario activo opera sobre cualquier nota. */
@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final Store store;

    public NoteController(Store store) {
        this.store = store;
    }

    @GetMapping
    public List<NoteDto> list() {
        return store.allNotes().stream().map(NoteDto::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteDto create(@Valid @RequestBody CreateNoteRequest req, @AuthenticationPrincipal User user) {
        Note n = new Note();
        n.setId(UUID.randomUUID().toString());
        n.setTitle(req.title().trim());
        n.setText(req.text() == null ? "" : req.text());
        n.setStatus(req.status() == null ? "PENDIENTE" : req.status());
        n.setX(req.x());
        n.setY(req.y());
        n.setCreatedBy(user.getId());
        n.setCreatedAt(Instant.now().toString());
        n.setUpdatedAt(n.getCreatedAt());
        store.save(n);
        return NoteDto.of(n);
    }

    @PutMapping("/{id}")
    public NoteDto update(@PathVariable String id, @Valid @RequestBody UpdateNoteRequest req) {
        Note n = store.note(id).orElseThrow(() -> ApiException.notFound("Nota"));
        n.setTitle(req.title().trim());
        n.setText(req.text() == null ? "" : req.text());
        n.setStatus(req.status());
        n.setUpdatedAt(Instant.now().toString());
        store.save(n);
        return NoteDto.of(n);
    }

    @PatchMapping("/{id}/position")
    public NoteDto move(@PathVariable String id, @Valid @RequestBody PositionRequest req) {
        Note n = store.note(id).orElseThrow(() -> ApiException.notFound("Nota"));
        n.setX(req.x());
        n.setY(req.y());
        n.setUpdatedAt(Instant.now().toString());
        store.save(n);
        return NoteDto.of(n);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        store.note(id).orElseThrow(() -> ApiException.notFound("Nota"));
        store.deleteNote(id);
        return ResponseEntity.noContent().build();
    }
}
