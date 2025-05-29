package com.example.demo.rest;

import com.example.demo.dto.ExerciseDTO;
import com.example.demo.dto.ExerciseResponse;
import com.example.demo.model.Exercise;
import com.example.demo.model.Usuario;
import com.example.demo.repository.ExerciseRepository;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/exercises")
public class ExerciseController {

    private static final Logger logger = LoggerFactory.getLogger(ExerciseController.class);

    private final ExerciseRepository exerciseRepository;
    private final UsuarioRepository usuarioRepository;

    public ExerciseController(
            ExerciseRepository exerciseRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.exerciseRepository = exerciseRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // Obtener todos los ejercicios disponibles para el usuario autenticado
    @GetMapping
    public ResponseEntity<List<ExerciseResponse>> getAllExercises() {
        logger.info("Solicitando todos los ejercicios");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioOpt.get();
        List<Exercise> exercises = exerciseRepository.findAvailableExercisesForUser(usuario);

        List<ExerciseResponse> response = exercises.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        logger.info("Devolviendo {} ejercicios", response.size());
        return ResponseEntity.ok(response);
    }

    // Obtener ejercicios filtrados por músculo
    @GetMapping("/muscle/{muscle}")
    public ResponseEntity<List<ExerciseResponse>> getExercisesByMuscle(@PathVariable String muscle) {
        logger.info("Solicitando ejercicios para músculo: {}", muscle);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioOpt.get();
        List<Exercise> exercises = exerciseRepository.findByMuscleAndAvailableForUser(muscle, usuario);

        List<ExerciseResponse> response = exercises.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Obtener solo ejercicios predefinidos
    @GetMapping("/predefined")
    public ResponseEntity<List<ExerciseResponse>> getPredefinedExercises() {
        logger.info("Solicitando ejercicios predefinidos");

        List<Exercise> exercises = exerciseRepository.findByIsCustomFalse();
        List<ExerciseResponse> response = exercises.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Obtener ejercicios personalizados del usuario
    @GetMapping("/custom")
    public ResponseEntity<List<ExerciseResponse>> getCustomExercises() {
        logger.info("Solicitando ejercicios personalizados");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioOpt.get();
        List<Exercise> exercises = exerciseRepository.findByIsCustomTrueAndCreatedBy(usuario);

        List<ExerciseResponse> response = exercises.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Crear un ejercicio personalizado
    @PostMapping("/custom")
    public ResponseEntity<?> createCustomExercise(@RequestBody ExerciseDTO exerciseDTO) {
        logger.info("Creando ejercicio personalizado: {}", exerciseDTO.getName());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();

        try {
            Exercise exercise = Exercise.builder()
                    .name(exerciseDTO.getName())
                    .muscle(exerciseDTO.getMuscle())
                    .muscleGroup(exerciseDTO.getMuscleGroup())
                    .description(exerciseDTO.getDescription())
                    .isCustom(true)
                    .createdBy(usuario)
                    .build();

            Exercise savedExercise = exerciseRepository.save(exercise);
            ExerciseResponse response = convertToResponse(savedExercise);

            logger.info("Ejercicio personalizado creado con ID: {}", savedExercise.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error al crear ejercicio personalizado", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al crear el ejercicio"));
        }
    }

    // Buscar ejercicios por nombre
    @GetMapping("/search")
    public ResponseEntity<List<ExerciseResponse>> searchExercises(@RequestParam String name) {
        logger.info("Buscando ejercicios con nombre: {}", name);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Usuario usuario = usuarioOpt.get();

        // Primero obtenemos todos los ejercicios disponibles para el usuario
        List<Exercise> allExercises = exerciseRepository.findAvailableExercisesForUser(usuario);

        // Filtramos por nombre
        List<Exercise> filteredExercises = allExercises.stream()
                .filter(exercise -> exercise.getName().toLowerCase().contains(name.toLowerCase()))
                .collect(Collectors.toList());

        List<ExerciseResponse> response = filteredExercises.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Eliminar ejercicio personalizado
    @DeleteMapping("/custom/{id}")
    public ResponseEntity<?> deleteCustomExercise(@PathVariable Long id) {
        logger.info("Eliminando ejercicio personalizado con ID: {}", id);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();

        Optional<Exercise> exerciseOpt = exerciseRepository.findById(id);
        if (exerciseOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ejercicio no encontrado"));
        }

        Exercise exercise = exerciseOpt.get();

        // Verificar que el ejercicio sea personalizado y pertenezca al usuario
        if (!exercise.isCustom() || !exercise.getCreatedBy().getId().equals(usuario.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "No tienes permisos para eliminar este ejercicio"));
        }

        try {
            exerciseRepository.delete(exercise);
            logger.info("Ejercicio personalizado eliminado correctamente");
            return ResponseEntity.ok(Map.of("mensaje", "Ejercicio eliminado correctamente"));
        } catch (Exception e) {
            logger.error("Error al eliminar ejercicio personalizado", e);
            return ResponseEntity.badRequest().body(Map.of("error", "Error al eliminar el ejercicio"));
        }
    }

    // Método auxiliar para convertir Exercise a ExerciseResponse
    private ExerciseResponse convertToResponse(Exercise exercise) {
        return ExerciseResponse.builder()
                .id(exercise.getId())
                .name(exercise.getName())
                .muscle(exercise.getMuscle())
                .muscleGroup(exercise.getMuscleGroup())
                .description(exercise.getDescription())
                .isCustom(exercise.isCustom())
                .createdByUsername(exercise.isCustom() && exercise.getCreatedBy() != null ?
                        exercise.getCreatedBy().getUsername() : null)
                .build();
    }
}