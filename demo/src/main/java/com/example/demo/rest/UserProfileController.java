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
import org.springframework.transaction.annotation.Transactional;
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
    @Transactional // ✅ CLAVE: Asegura que todo se guarde o nada
    public ResponseEntity<?> createOrUpdateProfile(@RequestBody UserProfileDTO profileDTO) {
        logger.info("Recibida solicitud para crear/actualizar perfil: {}", profileDTO);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        logger.info("Usuario autenticado: {}", username);

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            logger.error("Usuario no encontrado: {}", username);
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        logger.info("Usuario encontrado: {}", usuario.getId());

        try {
            // ✅ NUEVO: Actualizar datos básicos del Usuario (nombre y apellido)
            if (profileDTO.getFirstName() != null && !profileDTO.getFirstName().trim().isEmpty()) {
                usuario.setFirstName(profileDTO.getFirstName().trim());
                logger.info("Actualizando firstName: {}", profileDTO.getFirstName());
            }

            if (profileDTO.getLastName() != null && !profileDTO.getLastName().trim().isEmpty()) {
                usuario.setLastName(profileDTO.getLastName().trim());
                logger.info("Actualizando lastName: {}", profileDTO.getLastName());
            }

            // Guardar cambios en Usuario
            usuarioRepository.save(usuario);
            logger.info("Datos de Usuario actualizados correctamente");

            // ✅ EXISTENTE: Actualizar UserProfile
            Optional<UserProfile> existingProfile = userProfileRepository.findByUsuario(usuario);
            UserProfile profile;

            if (existingProfile.isPresent()) {
                logger.info("Actualizando perfil existente para usuario: {}", usuario.getId());
                profile = existingProfile.get();
            } else {
                logger.info("Creando nuevo perfil para usuario: {}", usuario.getId());
                profile = new UserProfile();
                profile.setUsuario(usuario);
            }

            // Actualizar campos del perfil
            profile.setAge(profileDTO.getAge());
            profile.setHeight(profileDTO.getHeight());
            profile.setWeight(profileDTO.getWeight());
            profile.setSex(profileDTO.getSex());
            profile.setFitnessGoal(profileDTO.getFitnessGoal());
            profile.setExperienceLevel(profileDTO.getExperienceLevel());
            profile.setOnboardingComplete(true);

            userProfileRepository.save(profile);
            logger.info("Perfil guardado correctamente para usuario: {}", usuario.getId());

            // ✅ RESPUESTA: Incluir datos actualizados de Usuario
            UserProfileResponse response = UserProfileResponse.builder()
                    .username(usuario.getUsername())
                    .firstName(usuario.getFirstName()) // ✅ Datos actualizados
                    .lastName(usuario.getLastName())   // ✅ Datos actualizados
                    .age(profile.getAge())
                    .height(profile.getHeight())
                    .weight(profile.getWeight())
                    .sex(profile.getSex())
                    .fitnessGoal(profile.getFitnessGoal())
                    .experienceLevel(profile.getExperienceLevel())
                    .onboardingComplete(profile.isOnboardingComplete())
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al actualizar perfil y usuario: ", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al actualizar la información"));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        logger.info("Solicitando perfil para usuario: {}", username);

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            logger.error("Usuario no encontrado: {}", username);
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        logger.info("Usuario encontrado: {}", usuario.getId());

        Optional<UserProfile> profileOpt = userProfileRepository.findByUsuario(usuario);

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
                    .sex(profile.getSex())
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