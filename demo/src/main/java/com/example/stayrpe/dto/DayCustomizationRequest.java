package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayCustomizationRequest {

    private Integer absoluteDay;
    private List<SetCustomization> setCustomizations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SetCustomization {

        private Long exerciseSetId;
        private Integer customRepsMin;
        private Integer customRepsMax;
        private Double customWeight;
        private Integer customRir;
        private Integer customRpe;
        private String customNotes;

        public boolean hasAnyCustomization() {
            return customRepsMin != null ||
                    customRepsMax != null ||
                    customWeight != null ||
                    customRir != null ||
                    customRpe != null ||
                    (customNotes != null && !customNotes.trim().isEmpty());
        }

        public boolean isValid() {
            if (!hasAnyCustomization()) {
                return true;
            }

            if (customRepsMin != null && customRepsMin <= 0) {
                return false;
            }

            if (customRepsMax != null && customRepsMax <= 0) {
                return false;
            }

            if (customRepsMin != null && customRepsMax != null && customRepsMin > customRepsMax) {
                return false;
            }

            if (customWeight != null && customWeight < 0) {
                return false;
            }

            if (customRir != null) {
                if (customRir < 0 || customRir > 10) {
                    return false;
                }
                if (customRpe != null) {
                    return false;
                }
            }

            if (customRpe != null) {
                if (customRpe < 1 || customRpe > 10) {
                    return false;
                }
                if (customRir != null) {
                    return false;
                }
            }

            return true;
        }
    }

    public boolean isValid() {
        if (absoluteDay == null || absoluteDay <= 0) {
            return false;
        }

        if (setCustomizations == null || setCustomizations.isEmpty()) {
            return true;
        }

        for (SetCustomization customization : setCustomizations) {
            if (customization.getExerciseSetId() == null) {
                return false;
            }

            if (!customization.isValid()) {
                return false;
            }
        }

        return true;
    }

    public int getCustomizationCount() {
        return setCustomizations != null ? setCustomizations.size() : 0;
    }

    public boolean isSetBeingCustomized(Long exerciseSetId) {
        if (setCustomizations == null || exerciseSetId == null) {
            return false;
        }

        return setCustomizations.stream()
                .anyMatch(customization -> exerciseSetId.equals(customization.getExerciseSetId()));
    }

    public SetCustomization getCustomizationForSet(Long exerciseSetId) {
        if (setCustomizations == null || exerciseSetId == null) {
            return null;
        }

        return setCustomizations.stream()
                .filter(customization -> exerciseSetId.equals(customization.getExerciseSetId()))
                .findFirst()
                .orElse(null);
    }

    public String getValidationErrors() {
        StringBuilder errors = new StringBuilder();

        if (absoluteDay == null || absoluteDay <= 0) {
            errors.append("absoluteDay debe ser mayor a 0; ");
        }

        if (setCustomizations != null) {
            for (int i = 0; i < setCustomizations.size(); i++) {
                SetCustomization customization = setCustomizations.get(i);

                if (customization.getExerciseSetId() == null) {
                    errors.append(String.format("setCustomization[%d].exerciseSetId es null; ", i));
                }

                if (!customization.isValid()) {
                    errors.append(String.format("setCustomization[%d] no es válida: ", i));

                    if (customization.getCustomRepsMin() != null && customization.getCustomRepsMin() <= 0) {
                        errors.append("customRepsMin <= 0; ");
                    }
                    if (customization.getCustomRepsMax() != null && customization.getCustomRepsMax() <= 0) {
                        errors.append("customRepsMax <= 0; ");
                    }
                    if (customization.getCustomRepsMin() != null && customization.getCustomRepsMax() != null &&
                            customization.getCustomRepsMin() > customization.getCustomRepsMax()) {
                        errors.append("customRepsMin > customRepsMax; ");
                    }
                    if (customization.getCustomWeight() != null && customization.getCustomWeight() < 0) {
                        errors.append("customWeight < 0; ");
                    }
                    if (customization.getCustomRir() != null && (customization.getCustomRir() < 0 || customization.getCustomRir() > 10)) {
                        errors.append("customRir fuera de rango 0-10; ");
                    }
                    if (customization.getCustomRpe() != null && (customization.getCustomRpe() < 1 || customization.getCustomRpe() > 10)) {
                        errors.append("customRpe fuera de rango 1-10; ");
                    }
                    if (customization.getCustomRir() != null && customization.getCustomRpe() != null) {
                        errors.append("no se pueden customizar RIR y RPE a la vez; ");
                    }
                }
            }
        }

        return !errors.isEmpty() ? errors.toString() : "No hay errores de validación";
    }
}