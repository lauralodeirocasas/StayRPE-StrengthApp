package com.example.demo.rest;

import com.example.demo.dto.CreateMacrocycleDTO;
import com.example.demo.model.Macrocycle;
import com.example.demo.model.Usuario;
import com.example.demo.repository.MacrocycleRepository;
import com.example.demo.repository.UsuarioRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/macrocycles")
public class MacrocycleController {

    private static final Logger logger = LoggerFactory.getLogger(MacrocycleController.class);

    private final MacrocycleRepository macrocycleRepository;
    private final UsuarioRepository usuarioRepository;

    public MacrocycleController(
            MacrocycleRepository macrocycleRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.macrocycleRepository = macrocycleRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // Obtener todos los macrociclos del usuario
    @GetMapping
    public ResponseEntity<List<Macrocycle>> getUserMacrocycles() {
        logger.info("Solicitando macrociclos del usuario");

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Macrocycle> macrocycles = macrocycleRepository.findByCreatedByAndIsActiveTrue(usuario);
        logger.info("Devolviendo {} macrociclos", macrocycles.size());
        return ResponseEntity.ok(macrocycles);
    }

    // Crear nuevo macrociclo
    @PostMapping
    public ResponseEntity<?> createMacrocycle(@RequestBody CreateMacrocycleDTO macrocycleDTO) {
        logger.info("Creando nuevo macrociclo: {}", macrocycleDTO.getName());

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        // Verificar límite de 3 macrociclos activos
        int activeMacrocycles = macrocycleRepository.countByCreatedByAndIsActiveTrue(usuario);
        if (activeMacrocycles >= 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 3 macrociclos activos. Archiva uno primero."));
        }

        // Validaciones básicas
        if (macrocycleDTO.getName() == null || macrocycleDTO.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es obligatorio"));
        }

        if (macrocycleDTO.getStartDate() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "La fecha de inicio es obligatoria"));
        }

        if (macrocycleDTO.getMicrocycleDurationDays() == null || macrocycleDTO.getMicrocycleDurationDays() < 1) {
            return ResponseEntity.badRequest().body(Map.of("error", "La duración del microciclo debe ser al menos 1 día"));
        }

        if (macrocycleDTO.getTotalMicrocycles() == null || macrocycleDTO.getTotalMicrocycles() < 1) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe haber al menos 1 microciclo"));
        }

        // Validación adicional: máximo razonable
        if (macrocycleDTO.getMicrocycleDurationDays() > 14) {
            return ResponseEntity.badRequest().body(Map.of("error", "Un microciclo no puede durar más de 14 días"));
        }

        if (macrocycleDTO.getTotalMicrocycles() > 52) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes tener más de 52 microciclos"));
        }

        try {
            Macrocycle macrocycle = Macrocycle.builder()
                    .name(macrocycleDTO.getName())
                    .description(macrocycleDTO.getDescription())
                    .startDate(macrocycleDTO.getStartDate())
                    .microcycleDurationDays(macrocycleDTO.getMicrocycleDurationDays())
                    .totalMicrocycles(macrocycleDTO.getTotalMicrocycles())
                    .createdBy(usuario)
                    .isActive(true)
                    .build();

            Macrocycle savedMacrocycle = macrocycleRepository.save(macrocycle);
            logger.info("Macrociclo creado con ID: {} - Duración total: {} días",
                    savedMacrocycle.getId(), savedMacrocycle.getTotalDurationDays());

            return ResponseEntity.ok(savedMacrocycle);

        } catch (Exception e) {
            logger.error("Error al crear macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al crear el macrociclo"));
        }
    }

    // Eliminar macrociclo
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMacrocycle(@PathVariable Long id) {
        logger.info("Eliminando macrociclo con ID: {}", id);

        Usuario usuario = getCurrentUser();
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        try {
            Optional<Macrocycle> macrocycleOpt = macrocycleRepository.findById(id);

            if (macrocycleOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Macrociclo no encontrado"));
            }

            Macrocycle macrocycle = macrocycleOpt.get();

            // Verificar que el macrociclo pertenece al usuario actual
            if (!macrocycle.getCreatedBy().getId().equals(usuario.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para eliminar este macrociclo"));
            }

            // Eliminar el macrociclo
            macrocycleRepository.delete(macrocycle);
            logger.info("Macrociclo eliminado correctamente: {}", macrocycle.getName());

            return ResponseEntity.ok(Map.of("message", "Macrociclo eliminado correctamente"));

        } catch (Exception e) {
            logger.error("Error al eliminar macrociclo", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al eliminar el macrociclo"));
        }
    }

    // Método auxiliar para obtener usuario actual
    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElse(null);
    }
}