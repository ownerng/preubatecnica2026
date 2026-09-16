package com.example.portal.web;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.portal.Store;
import com.example.portal.model.User;
import com.example.portal.security.JwtService;
import com.example.portal.web.Dtos.LoginRequest;
import com.example.portal.web.Dtos.LoginResponse;
import com.example.portal.web.Dtos.UserDto;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final Store store;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(Store store, PasswordEncoder encoder, JwtService jwt) {
        this.store = store;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        User user = store.userByEmail(req.email().trim().toLowerCase())
                .filter(User::isActive)
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Credenciales inválidas o usuario inactivo"));
        return new LoginResponse(jwt.issue(user), UserDto.of(user));
    }

    /** Invalida el token actual subiendo tokenVersion (cierra la sesión en todos los dispositivos). */
    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal User user) {
        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(Instant.now().toString());
        store.save(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/auth/me")
    public UserDto me(@AuthenticationPrincipal User user) {
        return UserDto.of(user);
    }
}
