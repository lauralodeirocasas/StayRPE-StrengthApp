package com.example.stayrpe.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.TokenExpiredException;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    private final String secret = "stayrpe-super-clave-secreta";

    private final long expiration = 1000L * 60 * 60 * 24 * 30; // 30 días

    private final Algorithm algorithm = Algorithm.HMAC256(secret);

    public String generateToken(String username) {
        return JWT.create()
                .withSubject(username)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + expiration))
                .sign(algorithm);
    }

    public String extractUsername(String token) {
        try {
            return JWT.require(algorithm).build().verify(token).getSubject();
        } catch (TokenExpiredException e) {
            logger.warn("Token expirado: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error procesando token: {}", e.getMessage());
            throw e;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            JWT.require(algorithm).build().verify(token);
            return true;
        } catch (TokenExpiredException e) {
            logger.warn("Token expirado en validación: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            logger.error("Token inválido: {}", e.getMessage());
            return false;
        }
    }
}