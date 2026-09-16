package com.example.portal.web;

import com.example.portal.model.Note;
import com.example.portal.model.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class Dtos {

    private Dtos() {}

    public static final String ROLES = "ADMIN|USER";
    public static final String STATUSES = "PENDIENTE|EN_CURSO|HECHO";

    public record UserDto(String id, String name, String email, String role, boolean active) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive());
        }
    }

    public record NoteDto(String id, String title, String text, String status, int x, int y,
                          String createdAt, String updatedAt) {
        public static NoteDto of(Note n) {
            return new NoteDto(n.getId(), n.getTitle(), n.getText(), n.getStatus(), n.getX(), n.getY(),
                    n.getCreatedAt(), n.getUpdatedAt());
        }
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record LoginResponse(String token, UserDto user) {}

    public record CreateUserRequest(
            @NotBlank @Size(min = 1, max = 100) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8) String password,
            @NotBlank @Pattern(regexp = ROLES) String role) {}

    public record UpdateUserRequest(
            @NotBlank @Size(min = 1, max = 100) String name,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = ROLES) String role,
            @Size(min = 8) String password) {}

    public record StatusRequest(@NotNull Boolean active) {}

    public record CreateNoteRequest(
            @NotBlank @Size(min = 1, max = 120) String title,
            @Size(max = 2000) String text,
            @Pattern(regexp = STATUSES) String status,
            @NotNull @Min(0) Integer x,
            @NotNull @Min(0) Integer y) {}

    public record UpdateNoteRequest(
            @NotBlank @Size(min = 1, max = 120) String title,
            @Size(max = 2000) String text,
            @NotBlank @Pattern(regexp = STATUSES) String status) {}

    public record PositionRequest(@NotNull @Min(0) Integer x, @NotNull @Min(0) Integer y) {}
}
