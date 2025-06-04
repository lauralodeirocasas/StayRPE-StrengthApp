package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO para enviar al frontend toda la información de un día específico,
 * incluyendo rutina original + customizaciones aplicadas.
 *
 * Ejemplo de respuesta al frontend:
 * {
 *   "absoluteDay": 15,
 *   "actualDate": "2024-04-23",
 *   "routineName": "Push Upper Body",
 *   "hasCustomizations": true,
 *   "totalCustomizations": 2,
 *   "exercises": [
 *     {
 *       "routineExerciseId": 456,
 *       "exerciseName": "Press Banca",
 *       "exerciseMuscle": "Pecho",
 *       "order": 1,
 *       "sets": [
 *         {
 *           "setId": 123,
 *           "setNumber": 1,
 *           "originalRepsMin": 8,
 *           "originalRepsMax": 12,
 *           "originalWeight": 60.0,
 *           "customRepsMin": 6,
 *           "customRepsMax": 8,
 *           "customWeight": 70.0,
 *           "isCustomized": true
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayCustomizationResponse {

    /**
     * Día absoluto del macrociclo (1, 2, 3...).
     */
    private Integer absoluteDay;

    /**
     * Fecha real que corresponde a este día absoluto.
     */
    private LocalDate actualDate;

    /**
     * Nombre de la rutina que corresponde a este día.
     */
    private String routineName;

    /**
     * Descripción de la rutina (opcional).
     */
    private String routineDescription;

    /**
     * Indica si este día tiene al menos una customización.
     */
    private boolean hasCustomizations;

    /**
     * Número total de series customizadas en este día.
     */
    private Integer totalCustomizations;

    /**
     * Lista de ejercicios de la rutina con sus series (originales + customizadas).
     */
    private List<ExerciseCustomization> exercises;

    /**
     * Información de un ejercicio específico dentro de la rutina del día.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExerciseCustomization {

        /**
         * ID del ejercicio dentro de la rutina.
         */
        private Long routineExerciseId;

        /**
         * ID del ejercicio base.
         */
        private Long exerciseId;

        /**
         * Nombre del ejercicio.
         */
        private String exerciseName;

        /**
         * Músculo que trabaja el ejercicio.
         */
        private String exerciseMuscle;

        /**
         * Orden del ejercicio en la rutina (1, 2, 3...).
         */
        private Integer order;

        /**
         * Número total de series de este ejercicio.
         */
        private Integer numberOfSets;

        /**
         * Descanso entre series en segundos.
         */
        private Integer restBetweenSets;

        /**
         * Notas del ejercicio a nivel general.
         */
        private String exerciseNotes;

        /**
         * Lista de series de este ejercicio.
         */
        private List<SetInfo> sets;

        /**
         * Indica si este ejercicio tiene al menos una serie customizada.
         */
        private boolean hasCustomizedSets;

        /**
         * Número de series customizadas en este ejercicio.
         */
        private Integer customizedSetsCount;
    }

    /**
     * Información de una serie específica (original + customizada).
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SetInfo {

        /**
         * ID de la serie.
         */
        private Long setId;

        /**
         * Número de la serie (1, 2, 3...).
         */
        private Integer setNumber;

        // ===== DATOS ORIGINALES =====

        /**
         * Repeticiones mínimas originales.
         */
        private Integer originalRepsMin;

        /**
         * Repeticiones máximas originales.
         */
        private Integer originalRepsMax;

        /**
         * Peso original en kilogramos.
         */
        private Double originalWeight;

        /**
         * RIR original.
         */
        private Integer originalRir;

        /**
         * RPE original.
         */
        private Integer originalRpe;

        /**
         * Notas originales.
         */
        private String originalNotes;

        // ===== DATOS CUSTOMIZADOS =====

        /**
         * Repeticiones mínimas customizadas (null si no está customizado).
         */
        private Integer customRepsMin;

        /**
         * Repeticiones máximas customizadas (null si no está customizado).
         */
        private Integer customRepsMax;

        /**
         * Peso customizado (null si no está customizado).
         */
        private Double customWeight;

        /**
         * RIR customizado (null si no está customizado).
         */
        private Integer customRir;

        /**
         * RPE customizado (null si no está customizado).
         */
        private Integer customRpe;

        /**
         * Notas customizadas (null si no están customizadas).
         */
        private String customNotes;

        /**
         * Indica si esta serie tiene al menos una customización.
         */
        private boolean isCustomized;

        // ===== DATOS EFECTIVOS =====

        /**
         * Repeticiones mínimas efectivas (customizadas si existen, originales si no).
         */
        private Integer effectiveRepsMin;

        /**
         * Repeticiones máximas efectivas (customizadas si existen, originales si no).
         */
        private Integer effectiveRepsMax;

        /**
         * Peso efectivo (customizado si existe, original si no).
         */
        private Double effectiveWeight;

        /**
         * RIR efectivo (customizado si existe, original si no).
         */
        private Integer effectiveRir;

        /**
         * RPE efectivo (customizado si existe, original si no).
         */
        private Integer effectiveRpe;

        /**
         * Notas efectivas (customizadas si existen, originales si no).
         */
        private String effectiveNotes;

        /**
         * Calcula y establece los valores efectivos basándose en customizaciones.
         * Este método se llama automáticamente al construir el objeto.
         */
        public void calculateEffectiveValues() {
            // Básicos
            effectiveRepsMin = customRepsMin != null ? customRepsMin : originalRepsMin;
            effectiveRepsMax = customRepsMax != null ? customRepsMax : originalRepsMax;
            effectiveWeight = customWeight != null ? customWeight : originalWeight;
            effectiveNotes = (customNotes != null && !customNotes.trim().isEmpty()) ? customNotes : originalNotes;

            // ---- Aquí el FIX lógico SOLO-UNO: ----
            if (customRpe != null) {
                // Si hay customRpe, solo RPE
                effectiveRpe = customRpe;
                effectiveRir = null;
            } else if (customRir != null) {
                // Si hay customRir, solo RIR
                effectiveRir = customRir;
                effectiveRpe = null;
            } else if (originalRpe != null && originalRpe > 0) {
                effectiveRpe = originalRpe;
                effectiveRir = null;
            } else if (originalRir != null && originalRir >= 0) {
                effectiveRir = originalRir;
                effectiveRpe = null;
            } else {
                effectiveRir = null;
                effectiveRpe = null;
            }

            // Determinar si está customizada
            isCustomized = customRepsMin != null ||
                    customRepsMax != null ||
                    customWeight != null ||
                    customRir != null ||
                    customRpe != null ||
                    (customNotes != null && !customNotes.trim().isEmpty());
        }


        /**
         * Genera una descripción legible de la serie.
         * Ejemplo: "8-12 reps × 60kg (RIR 2)"
         */
        public String getSetDescription() {
            StringBuilder desc = new StringBuilder();

            // Reps
            if (effectiveRepsMin != null && effectiveRepsMax != null) {
                if (effectiveRepsMin.equals(effectiveRepsMax)) {
                    desc.append(effectiveRepsMin).append(" reps");
                } else {
                    desc.append(effectiveRepsMin).append("-").append(effectiveRepsMax).append(" reps");
                }
            }

            // Peso
            if (effectiveWeight != null) {
                desc.append(" × ").append(effectiveWeight).append("kg");
            }

            // Intensidad
            if (effectiveRir != null && effectiveRir > 0) {
                desc.append(" (RIR ").append(effectiveRir).append(")");
            } else if (effectiveRpe != null && effectiveRpe > 0) {
                desc.append(" (@").append(effectiveRpe).append(" RPE)");
            }

            return desc.toString();
        }

        /**
         * Genera una descripción de qué se modificó.
         * Ejemplo: "Peso: 60kg → 70kg, Reps: 8-12 → 6-8"
         */
        public String getCustomizationDescription() {
            if (!isCustomized) {
                return null;
            }

            StringBuilder desc = new StringBuilder();

            // Cambios en peso
            if (customWeight != null && !customWeight.equals(originalWeight)) {
                desc.append("Peso: ").append(originalWeight).append("kg → ").append(customWeight).append("kg");
            }

            // Cambios en reps
            if (customRepsMin != null || customRepsMax != null) {
                if (desc.length() > 0) desc.append(", ");
                desc.append("Reps: ");

                if (originalRepsMin != null && originalRepsMax != null) {
                    if (originalRepsMin.equals(originalRepsMax)) {
                        desc.append(originalRepsMin);
                    } else {
                        desc.append(originalRepsMin).append("-").append(originalRepsMax);
                    }
                }

                desc.append(" → ");

                Integer newMin = customRepsMin != null ? customRepsMin : originalRepsMin;
                Integer newMax = customRepsMax != null ? customRepsMax : originalRepsMax;

                if (newMin != null && newMax != null) {
                    if (newMin.equals(newMax)) {
                        desc.append(newMin);
                    } else {
                        desc.append(newMin).append("-").append(newMax);
                    }
                }
            }

            // Cambios en intensidad
            if (customRir != null && !customRir.equals(originalRir)) {
                if (desc.length() > 0) desc.append(", ");
                desc.append("RIR: ").append(originalRir).append(" → ").append(customRir);
            }

            if (customRpe != null && !customRpe.equals(originalRpe)) {
                if (desc.length() > 0) desc.append(", ");
                desc.append("RPE: ").append(originalRpe).append(" → ").append(customRpe);
            }

            return desc.toString();
        }
    }

    /**
     * Calcula estadísticas del día.
     */
    public void calculateStatistics() {
        if (exercises == null) {
            hasCustomizations = false;
            totalCustomizations = 0;
            return;
        }

        int customizationCount = 0;

        for (ExerciseCustomization exercise : exercises) {
            if (exercise.getSets() != null) {
                int exerciseCustomizations = 0;

                for (SetInfo set : exercise.getSets()) {
                    set.calculateEffectiveValues();
                    if (set.isCustomized()) {
                        customizationCount++;
                        exerciseCustomizations++;
                    }
                }

                exercise.setHasCustomizedSets(exerciseCustomizations > 0);
                exercise.setCustomizedSetsCount(exerciseCustomizations);
            }
        }

        hasCustomizations = customizationCount > 0;
        totalCustomizations = customizationCount;
    }

    /**
     * Obtiene el resumen del día para mostrar en el calendario.
     * Ejemplo: "Push Upper - 3 series modificadas"
     */
    public String getDaySummary() {
        StringBuilder summary = new StringBuilder();

        if (routineName != null) {
            summary.append(routineName);
        }

        if (hasCustomizations && totalCustomizations != null && totalCustomizations > 0) {
            summary.append(" - ").append(totalCustomizations).append(" series modificadas");
        }

        return summary.toString();
    }
}