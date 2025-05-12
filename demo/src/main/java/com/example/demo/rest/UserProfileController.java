// UserProfileController.java
package com.example.demo.rest;

import com.example.demo.dto.UserProfileDTO;
import com.example.demo.dto.UserProfileResponse;
import com.example.demo.model.UserProfile;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UserProfileRepository;
import com.example.demo.repository.UsuarioRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/user")
public class UserProfileController {

    private static final Logger logger = LoggerFactory.getLogger(UserProfileController.class);

    private final UserProfileRepository userProfileRepository;
    private final UsuarioRepository usuarioRepository;

    public UserProfileController(
            UserProfileRepository userProfileRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/profile")
    public ResponseEntity<?> createOrUpdateProfile(@RequestBody UserProfileDTO profileDTO) {
        logger.info("Recibida solicitud para crear/actualizar perfil: {}", profileDTO);

        // Obtener el usuario autenticado
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        logger.info("Usuario autenticado: {}", username);

        // Buscar el usuario en la base de datos
        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            logger.error("Usuario no encontrado: {}", username);
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        logger.info("Usuario encontrado: {}", usuario.getId());

        // Buscar si ya existe un perfil para este usuario
        Optional<UserProfile> existingProfile = userProfileRepository.findByUsuario(usuario);
        UserProfile profile;

        if (existingProfile.isPresent()) {
            // Actualizar perfil existente
            logger.info("Actualizando perfil existente para usuario: {}", usuario.getId());
            profile = existingProfile.get();
        } else {
            // Crear nuevo perfil
            logger.info("Creando nuevo perfil para usuario: {}", usuario.getId());
            profile = new UserProfile();
            profile.setUsuario(usuario);
        }

        // Actualizar datos del perfil
        profile.setAge(profileDTO.getAge());
        profile.setHeight(profileDTO.getHeight());
        profile.setWeight(profileDTO.getWeight());
        profile.setFitnessGoal(profileDTO.getFitnessGoal());
        profile.setExperienceLevel(profileDTO.getExperienceLevel());
        profile.setOnboardingComplete(true);

        // Guardar perfil
        userProfileRepository.save(profile);
        logger.info("Perfil guardado correctamente para usuario: {}", usuario.getId());

        // Construir respuesta
        UserProfileResponse response = UserProfileResponse.builder()
                .username(usuario.getUsername())
                .firstName(usuario.getFirstName())
                .lastName(usuario.getLastName())
                .age(profile.getAge())
                .height(profile.getHeight())
                .weight(profile.getWeight())
                .fitnessGoal(profile.getFitnessGoal())
                .experienceLevel(profile.getExperienceLevel())
                .onboardingComplete(profile.isOnboardingComplete())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        // Obtener el usuario autenticado
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        logger.info("Solicitando perfil para usuario: {}", username);

        // Buscar el usuario en la base de datos
        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            logger.error("Usuario no encontrado: {}", username);
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        logger.info("Usuario encontrado: {}", usuario.getId());

        // Buscar el perfil del usuario
        Optional<UserProfile> profileOpt = userProfileRepository.findByUsuario(usuario);

        // Construir respuesta
        UserProfileResponse.UserProfileResponseBuilder responseBuilder = UserProfileResponse.builder()
                .username(usuario.getUsername())
                .firstName(usuario.getFirstName())
                .lastName(usuario.getLastName());

        if (profileOpt.isPresent()) {
            UserProfile profile = profileOpt.get();
            logger.info("Perfil encontrado para usuario: {}", usuario.getId());
            responseBuilder
                    .age(profile.getAge())
                    .height(profile.getHeight())
                    .weight(profile.getWeight())
                    .fitnessGoal(profile.getFitnessGoal())
                    .experienceLevel(profile.getExperienceLevel())
                    .onboardingComplete(profile.isOnboardingComplete());
        } else {
            logger.info("No se encontró perfil para usuario: {}", usuario.getId());
            responseBuilder.onboardingComplete(false);
        }

        return ResponseEntity.ok(responseBuilder.build());
    }
}