package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayCustomizationResponse {

    private Integer absoluteDay;
    private LocalDate actualDate;
    private String routineName;
    private String routineDescription;
    private boolean hasCustomizations;
    private Integer totalCustomizations;
    private List<ExerciseCustomization> exercises;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExerciseCustomization {

        private Long routineExerciseId;
        private Long exerciseId;
        private String exerciseName;
        private String exerciseMuscle;
        private Integer order;
        private Integer numberOfSets;
        private Integer restBetweenSets;
        private String exerciseNotes;
        private List<SetInfo> sets;
        private boolean hasCustomizedSets;
        private Integer customizedSetsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SetInfo {

        private Long setId;
        private Integer setNumber;
        private Integer originalRepsMin;
        private Integer originalRepsMax;
        private Double originalWeight;
        private Integer originalRir;
        private Integer originalRpe;
        private String originalNotes;
        private Integer customRepsMin;
        private Integer customRepsMax;
        private Double customWeight;
        private Integer customRir;
        private Integer customRpe;
        private String customNotes;
        private boolean isCustomized;
        private Integer effectiveRepsMin;
        private Integer effectiveRepsMax;
        private Double effectiveWeight;
        private Integer effectiveRir;
        private Integer effectiveRpe;
        private String effectiveNotes;

        public void calculateEffectiveValues() {
            effectiveRepsMin = customRepsMin != null ? customRepsMin : originalRepsMin;
            effectiveRepsMax = customRepsMax != null ? customRepsMax : originalRepsMax;
            effectiveWeight = customWeight != null ? customWeight : originalWeight;
            effectiveNotes = (customNotes != null && !customNotes.trim().isEmpty()) ? customNotes : originalNotes;

            if (customRpe != null) {
                effectiveRpe = customRpe;
                effectiveRir = null;
            } else if (customRir != null) {
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

            isCustomized = customRepsMin != null ||
                    customRepsMax != null ||
                    customWeight != null ||
                    customRir != null ||
                    customRpe != null ||
                    (customNotes != null && !customNotes.trim().isEmpty());
        }

        public String getSetDescription() {
            StringBuilder desc = new StringBuilder();

            if (effectiveRepsMin != null && effectiveRepsMax != null) {
                if (effectiveRepsMin.equals(effectiveRepsMax)) {
                    desc.append(effectiveRepsMin).append(" reps");
                } else {
                    desc.append(effectiveRepsMin).append("-").append(effectiveRepsMax).append(" reps");
                }
            }

            if (effectiveWeight != null) {
                desc.append(" × ").append(effectiveWeight).append("kg");
            }

            if (effectiveRir != null && effectiveRir > 0) {
                desc.append(" (RIR ").append(effectiveRir).append(")");
            } else if (effectiveRpe != null && effectiveRpe > 0) {
                desc.append(" (@").append(effectiveRpe).append(" RPE)");
            }

            return desc.toString();
        }

        public String getCustomizationDescription() {
            if (!isCustomized) {
                return null;
            }

            StringBuilder desc = new StringBuilder();

            if (customWeight != null && !customWeight.equals(originalWeight)) {
                desc.append("Peso: ").append(originalWeight).append("kg → ").append(customWeight).append("kg");
            }

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