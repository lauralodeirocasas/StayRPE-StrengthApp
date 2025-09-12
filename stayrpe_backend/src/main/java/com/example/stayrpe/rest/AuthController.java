// src/main/java/com/example/demo/rest/AuthController.java
package com.example.stayrpe.rest;

import com.example.stayrpe.jwt.JwtUtil;
import com.example.stayrpe.model.Usuario;
import com.example.stayrpe.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            AuthenticationManager authManager,
            JwtUtil jwtUtil,
            UserDetailsService uds,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userDetailsService = uds;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    //Login: devuelve token JWT
    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        logger.info("Intento de login para usuario: {}", username);

        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            String token = jwtUtil.generateToken(userDetails.getUsername());
            logger.info("Login exitoso para usuario: {}", username);
            return Map.of("token", token);
        } catch (BadCredentialsException e) {
            logger.warn("Credenciales incorrectas para usuario: {}", username);
            return Map.of("error", "Credenciales incorrectas");
        } catch (Exception e) {
            logger.error("Error durante login para usuario: {}", username, e);
            return Map.of("error", "Error al iniciar sesión");
        }
    }

    //Registro: crea un nuevo usuario
    @PostMapping("/register")
    public Map<String, String> registro(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String rawPassword = body.get("password");
        String firstName = body.get("firstName"); // Nuevo campo
        String lastName = body.get("lastName");   // Nuevo campo

        logger.info("Intento de registro para usuario: {}", username);

        if (usuarioRepository.findByUsername(username).isPresent()) {
            logger.warn("Nombre de usuario ya en uso: {}", username);
            return Map.of("error", "Ese nombre de usuario ya está en uso.");
        }

        try {
            Usuario nuevo = Usuario.builder()
                    .username(username)
                    .password(passwordEncoder.encode(rawPassword))
                    .firstName(firstName)
                    .lastName(lastName)
                    .enabled(true)
                    .roles(Collections.singleton("USER"))
                    .build();

            usuarioRepository.save(nuevo);
            logger.info("Usuario registrado correctamente: {}", username);
            return Map.of("mensaje", "Usuario registrado correctamente.");
        } catch (Exception e) {
            logger.error("Error durante registro para usuario: {}", username, e);
            return Map.of("error", "Error al registrar usuario.");
        }
    }
}