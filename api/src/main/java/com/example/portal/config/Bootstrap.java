package com.example.portal.config;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.portal.Store;
import com.example.portal.model.User;

/** Crea tablas en local y siembra las cuentas demo si la tabla de usuarios está vacía. */
@Configuration
public class Bootstrap {

    private static final Logger log = LoggerFactory.getLogger(Bootstrap.class);

    @Bean
    ApplicationRunner initData(Store store, PasswordEncoder encoder,
                               @Value("${CREATE_TABLES:false}") boolean createTables,
                               @Value("${SEED_DEMO:false}") boolean seedDemo) {
        return args -> {
            if (createTables) {
                store.createTablesIfMissing();
                log.info("Tablas verificadas/creadas");
            }
            if (seedDemo && store.usersEmpty()) {
                store.save(demoUser("Admin Demo", "admin@demo.local", "Admin123!", "ADMIN", encoder));
                store.save(demoUser("Usuario Demo", "usuario@demo.local", "Usuario123!", "USER", encoder));
                log.info("Cuentas demo creadas: admin@demo.local / usuario@demo.local");
            }
        };
    }

    private User demoUser(String name, String email, String password, String role, PasswordEncoder encoder) {
        User u = new User();
        u.setId(UUID.randomUUID().toString());
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(role);
        u.setActive(true);
        u.setTokenVersion(1);
        u.setCreatedAt(Instant.now().toString());
        u.setUpdatedAt(u.getCreatedAt());
        return u;
    }
}
