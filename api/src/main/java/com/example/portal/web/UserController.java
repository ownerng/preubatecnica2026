package com.example.portal.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import com.example.portal.model.User;
import com.example.portal.web.Dtos.CreateUserRequest;
import com.example.portal.web.Dtos.StatusRequest;
import com.example.portal.web.Dtos.UpdateUserRequest;
import com.example.portal.web.Dtos.UserDto;

import jakarta.validation.Valid;

/** Solo ADMIN (lo impone SecurityConfig: USER recibe 403). */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final Store store;
    private final PasswordEncoder encoder;

    public UserController(Store store, PasswordEncoder encoder) {
        this.store = store;
        this.encoder = encoder;
    }

    @GetMapping
    public List<UserDto> list() {
        return store.allUsers().stream().map(UserDto::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody CreateUserRequest req) {
        String email = normalize(req.email());
        if (store.userByEmail(email).isPresent()) {
            throw ApiException.conflict("EMAIL_TAKEN", "Ya existe un usuario con ese email");
        }
        User u = new User();
        u.setId(UUID.randomUUID().toString());
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(req.role());
        u.setActive(true);
        u.setTokenVersion(1);
        u.setCreatedAt(Instant.now().toString());
        u.setUpdatedAt(u.getCreatedAt());
        store.save(u);
        return UserDto.of(u);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest req) {
        User u = store.user(id).orElseThrow(() -> ApiException.notFound("Usuario"));
        String email = normalize(req.email());
        if (!email.equals(u.getEmail()) && store.userByEmail(email).isPresent()) {
            throw ApiException.conflict("EMAIL_TAKEN", "Ya existe un usuario con ese email");
        }
        boolean demoting = u.isAdmin() && u.isActive() && !"ADMIN".equals(req.role());
        if (demoting && store.activeAdmins() <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "Debe quedar al menos un administrador activo");
        }
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setRole(req.role());
        if (req.password() != null && !req.password().isBlank()) {
            u.setPasswordHash(encoder.encode(req.password()));
            u.setTokenVersion(u.getTokenVersion() + 1); // cambiar la clave cierra sesiones abiertas
        }
        u.setUpdatedAt(Instant.now().toString());
        store.save(u);
        return UserDto.of(u);
    }

    @PatchMapping("/{id}/status")
    public UserDto status(@PathVariable String id, @Valid @RequestBody StatusRequest req) {
        User u = store.user(id).orElseThrow(() -> ApiException.notFound("Usuario"));
        boolean deactivating = u.isActive() && !req.active();
        if (deactivating && u.isAdmin() && store.activeAdmins() <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "Debe quedar al menos un administrador activo");
        }
        u.setActive(req.active());
        u.setUpdatedAt(Instant.now().toString());
        store.save(u);
        return UserDto.of(u);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
