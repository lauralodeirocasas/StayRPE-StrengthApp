package com.example.demo.service;

import com.example.demo.dto.DayCustomizationRequest;
import com.example.demo.dto.DayCustomizationResponse;
import com.example.demo.model.*;
import com.example.demo.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio para manejar la lógica de customización de días específicos en macrociclos.
 *
 * Responsabilidades principales:
 * - Calcular qué rutina corresponde a un día absoluto
 * - Aplicar customizaciones sobre rutinas base
 * - Guardar y eliminar customizaciones
 * - Convertir entre entidades y DTOs
 */
@Service
@Transactional
public class MacrocycleCustomizationService {

    private static final Logger logger = LoggerFactory.getLogger(MacrocycleCustomizationService.class);

    private final MacrocycleDayCustomizationRepository customizationRepository;
    private final MacrocycleDayPlanRepository dayPlanRepository;
    private final RoutineExerciseRepository routineExerciseRepository;
    private final ExerciseSetRepository exerciseSetRepository;

    public MacrocycleCustomizationService(
            MacrocycleDayCustomizationRepository customizationRepository,
            MacrocycleDayPlanRepository dayPlanRepository,
            RoutineExerciseRepository routineExerciseRepository,
            ExerciseSetRepository exerciseSetRepository
    ) {
        this.customizationRepository = customizationRepository;
        this.dayPlanRepository = dayPlanRepository;
        this.routineExerciseRepository = routineExerciseRepository;
        this.exerciseSetRepository = exerciseSetRepository;
    }

    // =========================================================================
    // MÉTODOS PRINCIPALES DE LA API
    // =========================================================================

    /**
     * Obtiene la información completa de un día específico, incluyendo customizaciones.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto (1, 2, 3...)
     * @return DayCustomizationResponse con toda la información del día
     */
    public DayCustomizationResponse getDayCustomization(Macrocycle macrocycle, Integer absoluteDay) {
        logger.info("Obteniendo customización del día {} del macrociclo {}", absoluteDay, macrocycle.getId());

        // 1. Validar que el día está dentro del rango del macrociclo
        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        // 2. Calcular qué día del microciclo corresponde y obtener la rutina
        DayPlanInfo dayPlanInfo = calculateDayPlanInfo(macrocycle, absoluteDay);

        if (dayPlanInfo.isRestDay()) {
            logger.info("El día {} es día de descanso", absoluteDay);
            return buildRestDayResponse(macrocycle, absoluteDay, dayPlanInfo);
        }

        if (dayPlanInfo.getRoutine() == null) {
            logger.warn("El día {} no tiene rutina asignada", absoluteDay);
            return buildNoRoutineResponse(macrocycle, absoluteDay, dayPlanInfo);
        }

        // 3. Obtener la rutina completa con ejercicios y series
        List<RoutineExercise> routineExercises = routineExerciseRepository
                .findByRoutineIdOrderByOrder(dayPlanInfo.getRoutine().getId());

        // 4. Obtener las customizaciones existentes para este día
        List<MacrocycleDayCustomization> customizations = customizationRepository
                .findByMacrocycleAndAbsoluteDayWithDetails(macrocycle, absoluteDay);

        // 5. Construir la respuesta combinando rutina original + customizaciones
        return buildDayCustomizationResponse(macrocycle, absoluteDay, dayPlanInfo, routineExercises, customizations);
    }

    /**
     * 🔥 MÉTODO SIMPLIFICADO: Guarda las customizaciones de forma selectiva.
     * - Si hay customización: guarda/actualiza en BD
     * - Si NO hay customización: elimina de BD (reset)
     *
     * @param macrocycle El macrociclo
     * @param request La request con las customizaciones a aplicar
     */
    public void saveCustomizationsSelective(Macrocycle macrocycle, DayCustomizationRequest request) {
        logger.info("Guardando customizaciones selectivas para el día {} del macrociclo {}",
                request.getAbsoluteDay(), macrocycle.getId());

        // 1. Validar la request
        if (!request.isValid()) {
            String validationErrors = request.getValidationErrors();
            logger.error("Request de customización inválida: {}", validationErrors);
            throw new IllegalArgumentException("Request de customización inválida: " + validationErrors);
        }

        // 2. Validar que el día está en rango
        validateAbsoluteDayInRange(macrocycle, request.getAbsoluteDay());

        // 3. Verificar que el día tiene una rutina (no es día de descanso)
        DayPlanInfo dayPlanInfo = calculateDayPlanInfo(macrocycle, request.getAbsoluteDay());
        if (dayPlanInfo.isRestDay() || dayPlanInfo.getRoutine() == null) {
            throw new IllegalArgumentException("No se puede customizar un día de descanso o sin rutina");
        }

        // 4. 🔥 PROCESAMIENTO CORRECTO: Para cada serie en la request
        int savedCount = 0;
        int deletedCount = 0;

        for (DayCustomizationRequest.SetCustomization setCustomization : request.getSetCustomizations()) {
            try {
                // Verificar que la serie existe
                Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(setCustomization.getExerciseSetId());
                if (exerciseSetOpt.isEmpty()) {
                    logger.warn("Serie no encontrada: {}, omitiendo...", setCustomization.getExerciseSetId());
                    continue;
                }

                ExerciseSet exerciseSet = exerciseSetOpt.get();

                if (setCustomization.hasAnyCustomization()) {
                    // 🔥 CASO 1: HAY CUSTOMIZACIÓN → Guardar/actualizar en BD
                    saveOrUpdateSetCustomization(macrocycle, request.getAbsoluteDay(), setCustomization);
                    savedCount++;
                    logger.debug("Guardada/actualizada customización para serie {}", setCustomization.getExerciseSetId());
                } else {
                    // 🔥 CASO 2: NO HAY CUSTOMIZACIÓN → Eliminar de BD (RESET)
                    boolean existedBefore = customizationRepository.existsByMacrocycleAndAbsoluteDayAndExerciseSet(
                            macrocycle, request.getAbsoluteDay(), exerciseSet);

                    if (existedBefore) {
                        customizationRepository.deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
                                macrocycle, request.getAbsoluteDay(), exerciseSet);
                        deletedCount++;
                        logger.debug("Eliminada customización para serie {} (RESET)", setCustomization.getExerciseSetId());
                    } else {
                        logger.debug("Serie {} sin customización previa - no acción requerida", setCustomization.getExerciseSetId());
                    }
                }

            } catch (Exception e) {
                logger.error("Error procesando customización para serie {}: {}",
                        setCustomization.getExerciseSetId(), e.getMessage());
                // Continuar con la siguiente customización en lugar de fallar completamente
            }
        }

        logger.info("Customizaciones procesadas exitosamente para el día {}: {} guardadas/actualizadas, {} eliminadas (reset)",
                request.getAbsoluteDay(), savedCount, deletedCount);
    }

    /**
     * 🔥 MÉTODO CORREGIDO: Guarda las customizaciones de un día específico.
     * Ahora usa el enfoque selectivo para evitar borrar customizaciones no mencionadas.
     *
     * @param macrocycle El macrociclo
     * @param request La request con las customizaciones a aplicar
     */
    public void saveCustomizations(Macrocycle macrocycle, DayCustomizationRequest request) {
        logger.info("Guardando customizaciones para el día {} del macrociclo {}",
                request.getAbsoluteDay(), macrocycle.getId());

        // 🔥 FIX: Usar el método selectivo en lugar del anterior problemático
        saveCustomizationsSelective(macrocycle, request);
    }

    /**
     * Resetea todas las customizaciones de un día específico.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto a resetear
     */
    public void resetDayCustomizations(Macrocycle macrocycle, Integer absoluteDay) {
        logger.info("Reseteando customizaciones del día {} del macrociclo {}", absoluteDay, macrocycle.getId());

        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        long deletedCount = customizationRepository.countByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);
        customizationRepository.deleteByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);

        logger.info("Se eliminaron {} customizaciones del día {}", deletedCount, absoluteDay);
    }

    /**
     * 🔥 NUEVO: Resetea la customización de una serie específica.
     * Elimina la fila de macrocycle_day_customizations para esa serie.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @param exerciseSetId El ID de la serie a resetear
     */
    public void resetSetCustomization(Macrocycle macrocycle, Integer absoluteDay, Long exerciseSetId) {
        logger.info("Reseteando customización de la serie {} en el día {} del macrociclo {}",
                exerciseSetId, absoluteDay, macrocycle.getId());

        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        // Verificar que la serie existe
        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(exerciseSetId);
        if (exerciseSetOpt.isEmpty()) {
            throw new IllegalArgumentException("Serie no encontrada: " + exerciseSetId);
        }

        ExerciseSet exerciseSet = exerciseSetOpt.get();

        // Verificar si existe customización para esta serie
        boolean hasCustomization = customizationRepository.existsByMacrocycleAndAbsoluteDayAndExerciseSet(
                macrocycle, absoluteDay, exerciseSet);

        if (hasCustomization) {
            // Eliminar la customización
            customizationRepository.deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
                    macrocycle, absoluteDay, exerciseSet);
            logger.info("Customización eliminada exitosamente para la serie {}", exerciseSetId);
        } else {
            logger.info("La serie {} no tenía customización en el día {}", exerciseSetId, absoluteDay);
        }
    }

    /**
     * Resetea TODAS las customizaciones de un macrociclo.
     * SE LLAMA AUTOMÁTICAMENTE al desactivar el macrociclo.
     *
     * @param macrocycle El macrociclo cuyas customizaciones se resetearán
     */
    public void resetAllCustomizations(Macrocycle macrocycle) {
        logger.info("Reseteando TODAS las customizaciones del macrociclo {}", macrocycle.getId());

        long deletedCount = customizationRepository.countByMacrocycle(macrocycle);
        customizationRepository.deleteByMacrocycle(macrocycle);

        logger.info("Se eliminaron {} customizaciones del macrociclo {}", deletedCount, macrocycle.getId());
    }

    /**
     * Obtiene la lista de días que tienen customizaciones en un macrociclo.
     *
     * @param macrocycle El macrociclo
     * @return Lista de días absolutos que tienen customizaciones
     */
    public List<Integer> getCustomizedDays(Macrocycle macrocycle) {
        logger.info("Obteniendo días customizados del macrociclo {}", macrocycle.getId());

        List<Integer> customizedDays = customizationRepository.findCustomizedDaysByMacrocycle(macrocycle);

        logger.info("Macrociclo {} tiene {} días customizados: {}",
                macrocycle.getId(), customizedDays.size(), customizedDays);

        return customizedDays;
    }

    // =========================================================================
    // MÉTODOS AUXILIARES PARA CÁLCULOS
    // =========================================================================

    /**
     * Calcula qué rutina corresponde a un día absoluto del macrociclo.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto (1, 2, 3...)
     * @return DayPlanInfo con la información del día
     */
    public DayPlanInfo calculateDayPlanInfo(Macrocycle macrocycle, Integer absoluteDay) {
        // 1. Calcular qué día del microciclo corresponde
        int dayOfMicrocycle = ((absoluteDay - 1) % macrocycle.getMicrocycleDurationDays()) + 1;

        // 2. Buscar el plan para ese día del microciclo
        List<MacrocycleDayPlan> dayPlans = dayPlanRepository.findByMacrocycleOrderByDayNumber(macrocycle);

        MacrocycleDayPlan dayPlan = dayPlans.stream()
                .filter(plan -> plan.getDayNumber().equals(dayOfMicrocycle))
                .findFirst()
                .orElse(null);

        if (dayPlan == null) {
            logger.warn("No se encontró plan para el día {} del microciclo", dayOfMicrocycle);
            return DayPlanInfo.builder()
                    .absoluteDay(absoluteDay)
                    .dayOfMicrocycle(dayOfMicrocycle)
                    .actualDate(calculateActualDate(macrocycle, absoluteDay))
                    .isRestDay(false)
                    .routine(null)
                    .build();
        }

        return DayPlanInfo.builder()
                .absoluteDay(absoluteDay)
                .dayOfMicrocycle(dayOfMicrocycle)
                .actualDate(calculateActualDate(macrocycle, absoluteDay))
                .isRestDay(dayPlan.getIsRestDay())
                .routine(dayPlan.getRoutine())
                .build();
    }

    /**
     * Calcula la fecha real que corresponde a un día absoluto del macrociclo.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto
     * @return La fecha real
     */
    private LocalDate calculateActualDate(Macrocycle macrocycle, Integer absoluteDay) {
        return macrocycle.getStartDate().plusDays(absoluteDay - 1);
    }

    /**
     * Valida que un día absoluto esté dentro del rango del macrociclo.
     *
     * @param macrocycle El macrociclo
     * @param absoluteDay El día absoluto a validar
     * @throws IllegalArgumentException si el día está fuera de rango
     */
    private void validateAbsoluteDayInRange(Macrocycle macrocycle, Integer absoluteDay) {
        if (absoluteDay == null || absoluteDay <= 0) {
            throw new IllegalArgumentException("El día absoluto debe ser mayor a 0");
        }

        Integer totalDays = macrocycle.getTotalDurationDays();
        if (totalDays != null && absoluteDay > totalDays) {
            throw new IllegalArgumentException(
                    String.format("El día %d está fuera del rango del macrociclo (1-%d)",
                            absoluteDay, totalDays));
        }
    }

    // =========================================================================
    // MÉTODOS PARA GUARDAR/ELIMINAR CUSTOMIZACIONES
    // =========================================================================

    /**
     * 🔥 MÉTODO MEJORADO: Guarda o actualiza la customización de una serie específica.
     * Ahora maneja mejor los casos edge y valida los datos.
     */
    private void saveOrUpdateSetCustomization(Macrocycle macrocycle, Integer absoluteDay,
                                              DayCustomizationRequest.SetCustomization setCustomization) {

        // Validar que la customización es válida
        if (!setCustomization.isValid()) {
            logger.error("Customización inválida para serie {}: datos no válidos", setCustomization.getExerciseSetId());
            throw new IllegalArgumentException("Customización inválida para serie " + setCustomization.getExerciseSetId());
        }

        // Buscar la serie
        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(setCustomization.getExerciseSetId());
        if (exerciseSetOpt.isEmpty()) {
            throw new IllegalArgumentException("Serie no encontrada: " + setCustomization.getExerciseSetId());
        }

        ExerciseSet exerciseSet = exerciseSetOpt.get();

        // Buscar si ya existe una customización para esta serie
        Optional<MacrocycleDayCustomization> existingCustomization = customizationRepository
                .findByMacrocycleAndAbsoluteDayAndExerciseSet(macrocycle, absoluteDay, exerciseSet);

        MacrocycleDayCustomization customization;

        if (existingCustomization.isPresent()) {
            // Actualizar customización existente
            customization = existingCustomization.get();
            logger.debug("Actualizando customización existente para serie {}", setCustomization.getExerciseSetId());
        } else {
            // Crear nueva customización
            customization = MacrocycleDayCustomization.builder()
                    .macrocycle(macrocycle)
                    .absoluteDay(absoluteDay)
                    .routineExercise(exerciseSet.getRoutineExercise())
                    .exerciseSet(exerciseSet)
                    .build();
            logger.debug("Creando nueva customización para serie {}", setCustomization.getExerciseSetId());
        }

        // 🔥 APLICAR VALORES: Solo aplicar los campos que realmente tienen valor
        if (setCustomization.getCustomRepsMin() != null) {
            customization.setCustomRepsMin(setCustomization.getCustomRepsMin());
        }
        if (setCustomization.getCustomRepsMax() != null) {
            customization.setCustomRepsMax(setCustomization.getCustomRepsMax());
        }
        if (setCustomization.getCustomWeight() != null) {
            customization.setCustomWeight(setCustomization.getCustomWeight());
        }
        if (setCustomization.getCustomRir() != null) {
            customization.setCustomRir(setCustomization.getCustomRir());
            // Si se establece RIR, limpiar RPE
            customization.setCustomRpe(null);
        }
        if (setCustomization.getCustomRpe() != null) {
            customization.setCustomRpe(setCustomization.getCustomRpe());
            // Si se establece RPE, limpiar RIR
            customization.setCustomRir(null);
        }
        if (setCustomization.getCustomNotes() != null) {
            customization.setCustomNotes(setCustomization.getCustomNotes());
        }

        // 🔥 VALIDACIÓN FINAL: Verificar que la customización resultante es válida
        if (!customization.hasAnyCustomization()) {
            logger.warn("La customización para serie {} no tiene valores después de aplicar cambios",
                    setCustomization.getExerciseSetId());
            return; // No guardar customizaciones vacías
        }

        customizationRepository.save(customization);
        logger.debug("Customización guardada exitosamente para serie {}", setCustomization.getExerciseSetId());
    }

    /**
     * Elimina la customización de una serie específica.
     */
    private void deleteSetCustomization(Macrocycle macrocycle, Integer absoluteDay, Long exerciseSetId) {
        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(exerciseSetId);
        if (exerciseSetOpt.isPresent()) {
            customizationRepository.deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
                    macrocycle, absoluteDay, exerciseSetOpt.get());
            logger.debug("Eliminada customización para serie {}", exerciseSetId);
        }
    }

    // =========================================================================
    // MÉTODOS PARA CONSTRUIR RESPONSES
    // =========================================================================

    /**
     * Construye la response completa para un día con rutina.
     */
    private DayCustomizationResponse buildDayCustomizationResponse(
            Macrocycle macrocycle, Integer absoluteDay, DayPlanInfo dayPlanInfo,
            List<RoutineExercise> routineExercises, List<MacrocycleDayCustomization> customizations) {

        // Crear mapa de customizaciones por serie para acceso rápido
        Map<Long, MacrocycleDayCustomization> customizationMap = customizations.stream()
                .collect(Collectors.toMap(
                        c -> c.getExerciseSet().getId(),
                        c -> c
                ));

        // Construir lista de ejercicios con sus series
        List<DayCustomizationResponse.ExerciseCustomization> exercises = routineExercises.stream()
                .map(routineExercise -> buildExerciseCustomization(routineExercise, customizationMap))
                .collect(Collectors.toList());

        // Construir response
        DayCustomizationResponse response = DayCustomizationResponse.builder()
                .absoluteDay(absoluteDay)
                .actualDate(dayPlanInfo.getActualDate())
                .routineName(dayPlanInfo.getRoutine().getName())
                .routineDescription(dayPlanInfo.getRoutine().getDescription())
                .exercises(exercises)
                .build();

        // Calcular estadísticas
        response.calculateStatistics();

        return response;
    }

    /**
     * Construye la customización de un ejercicio específico.
     */
    private DayCustomizationResponse.ExerciseCustomization buildExerciseCustomization(
            RoutineExercise routineExercise, Map<Long, MacrocycleDayCustomization> customizationMap) {

        // Obtener todas las series del ejercicio
        List<ExerciseSet> exerciseSets = exerciseSetRepository
                .findByRoutineExerciseIdOrderBySetNumber(routineExercise.getId());

        // Construir información de cada serie
        List<DayCustomizationResponse.SetInfo> sets = exerciseSets.stream()
                .map(exerciseSet -> buildSetInfo(exerciseSet, customizationMap.get(exerciseSet.getId())))
                .collect(Collectors.toList());

        return DayCustomizationResponse.ExerciseCustomization.builder()
                .routineExerciseId(routineExercise.getId())
                .exerciseId(routineExercise.getExercise().getId())
                .exerciseName(routineExercise.getExercise().getName())
                .exerciseMuscle(routineExercise.getExercise().getMuscle())
                .order(routineExercise.getOrder())
                .numberOfSets(routineExercise.getNumberOfSets())
                .restBetweenSets(routineExercise.getRestBetweenSets())
                .exerciseNotes(routineExercise.getNotes())
                .sets(sets)
                .build();
    }

    /**
     * Construye la información de una serie específica.
     */
    private DayCustomizationResponse.SetInfo buildSetInfo(ExerciseSet exerciseSet, MacrocycleDayCustomization customization) {
        DayCustomizationResponse.SetInfo.SetInfoBuilder builder = DayCustomizationResponse.SetInfo.builder()
                .setId(exerciseSet.getId())
                .setNumber(exerciseSet.getSetNumber())
                // Datos originales
                .originalRepsMin(exerciseSet.getTargetRepsMin())
                .originalRepsMax(exerciseSet.getTargetRepsMax())
                .originalWeight(exerciseSet.getTargetWeight())
                .originalRir(exerciseSet.getRir())
                .originalRpe(exerciseSet.getRpe())
                .originalNotes(exerciseSet.getNotes());

        // Datos customizados (si existen)
        if (customization != null) {
            builder.customRepsMin(customization.getCustomRepsMin())
                    .customRepsMax(customization.getCustomRepsMax())
                    .customWeight(customization.getCustomWeight())
                    .customRir(customization.getCustomRir())
                    .customRpe(customization.getCustomRpe())
                    .customNotes(customization.getCustomNotes());
        }

        DayCustomizationResponse.SetInfo setInfo = builder.build();
        setInfo.calculateEffectiveValues();

        return setInfo;
    }

    /**
     * Construye response para día de descanso.
     */
    private DayCustomizationResponse buildRestDayResponse(Macrocycle macrocycle, Integer absoluteDay, DayPlanInfo dayPlanInfo) {
        return DayCustomizationResponse.builder()
                .absoluteDay(absoluteDay)
                .actualDate(dayPlanInfo.getActualDate())
                .routineName("Día de Descanso")
                .routineDescription("Día destinado a la recuperación")
                .hasCustomizations(false)
                .totalCustomizations(0)
                .exercises(Collections.emptyList())
                .build();
    }

    /**
     * Construye response para día sin rutina asignada.
     */
    private DayCustomizationResponse buildNoRoutineResponse(Macrocycle macrocycle, Integer absoluteDay, DayPlanInfo dayPlanInfo) {
        return DayCustomizationResponse.builder()
                .absoluteDay(absoluteDay)
                .actualDate(dayPlanInfo.getActualDate())
                .routineName("Sin Rutina Asignada")
                .routineDescription("Este día no tiene rutina asignada")
                .hasCustomizations(false)
                .totalCustomizations(0)
                .exercises(Collections.emptyList())
                .build();
    }

    // =========================================================================
    // CLASE AUXILIAR PARA INFORMACIÓN DEL DÍA
    // =========================================================================

    /**
     * Clase auxiliar para encapsular la información de un día específico.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class DayPlanInfo {
        private Integer absoluteDay;
        private Integer dayOfMicrocycle;
        private LocalDate actualDate;
        private boolean isRestDay;
        private Routine routine;
    }
}