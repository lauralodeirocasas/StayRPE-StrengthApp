package com.example.stayrpe.config;

import com.example.stayrpe.jwt.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/login", "/publico", "/register").permitAll()  // 🔓 acceso libre
                        .requestMatchers("/admin").hasRole("ADMIN")                      // 🔐 solo admin
                        .requestMatchers("/exercises/**").authenticated()                // 🔐 ejercicios requieren autenticación
                        .requestMatchers("/routines/**").authenticated()                 // 🔐 rutinas requieren autenticación
                        .requestMatchers("/user/**").authenticated()                     // 🔐 perfil de usuario requiere autenticación
                        .anyRequest().authenticated()                                   // 🔐 el resto, token
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)  // 🔍 agrega el filtro JWT
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // 🔐 encripta contraseñas
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}