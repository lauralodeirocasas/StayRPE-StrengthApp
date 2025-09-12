package com.example.stayrpe.service;

import com.example.stayrpe.dto.DayCustomizationRequest;
import com.example.stayrpe.dto.DayCustomizationResponse;
import com.example.stayrpe.model.*;
import com.example.stayrpe.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

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

    public DayCustomizationResponse getDayCustomization(Macrocycle macrocycle, Integer absoluteDay) {
        logger.info("Obteniendo customización del día {} del macrociclo {}", absoluteDay, macrocycle.getId());

        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        DayPlanInfo dayPlanInfo = calculateDayPlanInfo(macrocycle, absoluteDay);

        if (dayPlanInfo.isRestDay()) {
            logger.info("El día {} es día de descanso", absoluteDay);
            return buildRestDayResponse(macrocycle, absoluteDay, dayPlanInfo);
        }

        if (dayPlanInfo.getRoutine() == null) {
            logger.warn("El día {} no tiene rutina asignada", absoluteDay);
            return buildNoRoutineResponse(macrocycle, absoluteDay, dayPlanInfo);
        }

        List<RoutineExercise> routineExercises = routineExerciseRepository
                .findByRoutineIdOrderByOrder(dayPlanInfo.getRoutine().getId());

        List<MacrocycleDayCustomization> customizations = customizationRepository
                .findByMacrocycleAndAbsoluteDayWithDetails(macrocycle, absoluteDay);

        return buildDayCustomizationResponse(macrocycle, absoluteDay, dayPlanInfo, routineExercises, customizations);
    }

    public void saveCustomizationsSelective(Macrocycle macrocycle, DayCustomizationRequest request) {
        logger.info("Guardando customizaciones selectivas para el día {} del macrociclo {}",
                request.getAbsoluteDay(), macrocycle.getId());

        if (!request.isValid()) {
            String validationErrors = request.getValidationErrors();
            logger.error("Request de customización inválida: {}", validationErrors);
            throw new IllegalArgumentException("Request de customización inválida: " + validationErrors);
        }

        validateAbsoluteDayInRange(macrocycle, request.getAbsoluteDay());

        DayPlanInfo dayPlanInfo = calculateDayPlanInfo(macrocycle, request.getAbsoluteDay());
        if (dayPlanInfo.isRestDay() || dayPlanInfo.getRoutine() == null) {
            throw new IllegalArgumentException("No se puede customizar un día de descanso o sin rutina");
        }

        int savedCount = 0;
        int deletedCount = 0;

        for (DayCustomizationRequest.SetCustomization setCustomization : request.getSetCustomizations()) {
            try {
                Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(setCustomization.getExerciseSetId());
                if (exerciseSetOpt.isEmpty()) {
                    logger.warn("Serie no encontrada: {}, omitiendo...", setCustomization.getExerciseSetId());
                    continue;
                }

                ExerciseSet exerciseSet = exerciseSetOpt.get();

                if (setCustomization.hasAnyCustomization()) {
                    saveOrUpdateSetCustomization(macrocycle, request.getAbsoluteDay(), setCustomization);
                    savedCount++;
                    logger.debug("Guardada/actualizada customización para serie {}", setCustomization.getExerciseSetId());
                } else {
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
            }
        }

        logger.info("Customizaciones procesadas exitosamente para el día {}: {} guardadas/actualizadas, {} eliminadas (reset)",
                request.getAbsoluteDay(), savedCount, deletedCount);
    }

    public void saveCustomizations(Macrocycle macrocycle, DayCustomizationRequest request) {
        logger.info("Guardando customizaciones para el día {} del macrociclo {}",
                request.getAbsoluteDay(), macrocycle.getId());

        saveCustomizationsSelective(macrocycle, request);
    }

    public void resetDayCustomizations(Macrocycle macrocycle, Integer absoluteDay) {
        logger.info("Reseteando customizaciones del día {} del macrociclo {}", absoluteDay, macrocycle.getId());

        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        long deletedCount = customizationRepository.countByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);
        customizationRepository.deleteByMacrocycleAndAbsoluteDay(macrocycle, absoluteDay);

        logger.info("Se eliminaron {} customizaciones del día {}", deletedCount, absoluteDay);
    }

    public void resetSetCustomization(Macrocycle macrocycle, Integer absoluteDay, Long exerciseSetId) {
        logger.info("Reseteando customización de la serie {} en el día {} del macrociclo {}",
                exerciseSetId, absoluteDay, macrocycle.getId());

        validateAbsoluteDayInRange(macrocycle, absoluteDay);

        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(exerciseSetId);
        if (exerciseSetOpt.isEmpty()) {
            throw new IllegalArgumentException("Serie no encontrada: " + exerciseSetId);
        }

        ExerciseSet exerciseSet = exerciseSetOpt.get();

        boolean hasCustomization = customizationRepository.existsByMacrocycleAndAbsoluteDayAndExerciseSet(
                macrocycle, absoluteDay, exerciseSet);

        if (hasCustomization) {
            customizationRepository.deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
                    macrocycle, absoluteDay, exerciseSet);
            logger.info("Customización eliminada exitosamente para la serie {}", exerciseSetId);
        } else {
            logger.info("La serie {} no tenía customización en el día {}", exerciseSetId, absoluteDay);
        }
    }

    public void resetAllCustomizations(Macrocycle macrocycle) {
        logger.info("Reseteando TODAS las customizaciones del macrociclo {}", macrocycle.getId());

        long deletedCount = customizationRepository.countByMacrocycle(macrocycle);
        customizationRepository.deleteByMacrocycle(macrocycle);

        logger.info("Se eliminaron {} customizaciones del macrociclo {}", deletedCount, macrocycle.getId());
    }

    public List<Integer> getCustomizedDays(Macrocycle macrocycle) {
        logger.info("Obteniendo días customizados del macrociclo {}", macrocycle.getId());

        List<Integer> customizedDays = customizationRepository.findCustomizedDaysByMacrocycle(macrocycle);

        logger.info("Macrociclo {} tiene {} días customizados: {}",
                macrocycle.getId(), customizedDays.size(), customizedDays);

        return customizedDays;
    }

    public DayPlanInfo calculateDayPlanInfo(Macrocycle macrocycle, Integer absoluteDay) {
        int dayOfMicrocycle = ((absoluteDay - 1) % macrocycle.getMicrocycleDurationDays()) + 1;

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

    private LocalDate calculateActualDate(Macrocycle macrocycle, Integer absoluteDay) {
        return macrocycle.getStartDate().plusDays(absoluteDay - 1);
    }

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

    private void saveOrUpdateSetCustomization(Macrocycle macrocycle, Integer absoluteDay,
                                              DayCustomizationRequest.SetCustomization setCustomization) {

        if (!setCustomization.isValid()) {
            logger.error("Customización inválida para serie {}: datos no válidos", setCustomization.getExerciseSetId());
            throw new IllegalArgumentException("Customización inválida para serie " + setCustomization.getExerciseSetId());
        }

        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(setCustomization.getExerciseSetId());
        if (exerciseSetOpt.isEmpty()) {
            throw new IllegalArgumentException("Serie no encontrada: " + setCustomization.getExerciseSetId());
        }

        ExerciseSet exerciseSet = exerciseSetOpt.get();

        Optional<MacrocycleDayCustomization> existingCustomization = customizationRepository
                .findByMacrocycleAndAbsoluteDayAndExerciseSet(macrocycle, absoluteDay, exerciseSet);

        MacrocycleDayCustomization customization;

        if (existingCustomization.isPresent()) {
            customization = existingCustomization.get();
            logger.debug("Actualizando customización existente para serie {}", setCustomization.getExerciseSetId());
        } else {
            customization = MacrocycleDayCustomization.builder()
                    .macrocycle(macrocycle)
                    .absoluteDay(absoluteDay)
                    .routineExercise(exerciseSet.getRoutineExercise())
                    .exerciseSet(exerciseSet)
                    .build();
            logger.debug("Creando nueva customización para serie {}", setCustomization.getExerciseSetId());
        }

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
            customization.setCustomRpe(null);
        }
        if (setCustomization.getCustomRpe() != null) {
            customization.setCustomRpe(setCustomization.getCustomRpe());
            customization.setCustomRir(null);
        }
        if (setCustomization.getCustomNotes() != null) {
            customization.setCustomNotes(setCustomization.getCustomNotes());
        }

        if (!customization.hasAnyCustomization()) {
            logger.warn("La customización para serie {} no tiene valores después de aplicar cambios",
                    setCustomization.getExerciseSetId());
            return;
        }

        customizationRepository.save(customization);
        logger.debug("Customización guardada exitosamente para serie {}", setCustomization.getExerciseSetId());
    }

    private void deleteSetCustomization(Macrocycle macrocycle, Integer absoluteDay, Long exerciseSetId) {
        Optional<ExerciseSet> exerciseSetOpt = exerciseSetRepository.findById(exerciseSetId);
        if (exerciseSetOpt.isPresent()) {
            customizationRepository.deleteByMacrocycleAndAbsoluteDayAndExerciseSet(
                    macrocycle, absoluteDay, exerciseSetOpt.get());
            logger.debug("Eliminada customización para serie {}", exerciseSetId);
        }
    }

    private DayCustomizationResponse buildDayCustomizationResponse(
            Macrocycle macrocycle, Integer absoluteDay, DayPlanInfo dayPlanInfo,
            List<RoutineExercise> routineExercises, List<MacrocycleDayCustomization> customizations) {

        Map<Long, MacrocycleDayCustomization> customizationMap = customizations.stream()
                .collect(Collectors.toMap(
                        c -> c.getExerciseSet().getId(),
                        c -> c
                ));

        List<DayCustomizationResponse.ExerciseCustomization> exercises = routineExercises.stream()
                .map(routineExercise -> buildExerciseCustomization(routineExercise, customizationMap))
                .collect(Collectors.toList());

        DayCustomizationResponse response = DayCustomizationResponse.builder()
                .absoluteDay(absoluteDay)
                .actualDate(dayPlanInfo.getActualDate())
                .routineName(dayPlanInfo.getRoutine().getName())
                .routineDescription(dayPlanInfo.getRoutine().getDescription())
                .exercises(exercises)
                .build();

        response.calculateStatistics();

        return response;
    }

    private DayCustomizationResponse.ExerciseCustomization buildExerciseCustomization(
            RoutineExercise routineExercise, Map<Long, MacrocycleDayCustomization> customizationMap) {

        List<ExerciseSet> exerciseSets = exerciseSetRepository
                .findByRoutineExerciseIdOrderBySetNumber(routineExercise.getId());

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

    private DayCustomizationResponse.SetInfo buildSetInfo(ExerciseSet exerciseSet, MacrocycleDayCustomization customization) {
        DayCustomizationResponse.SetInfo.SetInfoBuilder builder = DayCustomizationResponse.SetInfo.builder()
                .setId(exerciseSet.getId())
                .setNumber(exerciseSet.getSetNumber())
                .originalRepsMin(exerciseSet.getTargetRepsMin())
                .originalRepsMax(exerciseSet.getTargetRepsMax())
                .originalWeight(exerciseSet.getTargetWeight())
                .originalRir(exerciseSet.getRir())
                .originalRpe(exerciseSet.getRpe())
                .originalNotes(exerciseSet.getNotes());

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