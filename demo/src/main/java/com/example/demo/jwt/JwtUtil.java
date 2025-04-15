package com.example.demo.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {

    private final String secret = "stayrpe-super-clave-secreta"; //cambia esto en producción
    private final long expiration = 1000 * 60 * 60 * 24; //24 horas

    private final Algorithm algorithm = Algorithm.HMAC256(secret);

    // ✅ Genera token con username como sujeto
    public String generateToken(String username) {
        return JWT.create()
                .withSubject(username)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + expiration))
                .sign(algorithm);
    }

    //Extrae el username del token
    public String extractUsername(String token) {
        return JWT.require(algorithm).build().verify(token).getSubject();
    }

    //Comprueba si el token es válido
    public boolean isTokenValid(String token) {
        try {
            JWT.require(algorithm).build().verify(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
