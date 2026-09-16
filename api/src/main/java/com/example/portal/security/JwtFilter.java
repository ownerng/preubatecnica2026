package com.example.portal.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.portal.Store;
import com.example.portal.model.User;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Valida el JWT y RECARGA el usuario desde DynamoDB en cada request: si está inactivo o el
 * tokenVersion no coincide con el claim `tv`, no se autentica y el entry point responde 401.
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final Store store;

    public JwtFilter(JwtService jwt, Store store) {
        this.jwt = jwt;
        this.store = store;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            Claims claims = jwt.parse(header.substring(7));
            if (claims != null) {
                User user = store.user(claims.getSubject()).orElse(null);
                Integer tv = claims.get("tv", Integer.class);
                if (user != null && user.isActive() && tv != null && tv == user.getTokenVersion()) {
                    var auth = new UsernamePasswordAuthenticationToken(user, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        chain.doFilter(request, response);
    }
}
