package com.example.demo.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * DTO para recibir las customizaciones que el usuario quiere aplicar a un día específico.
 *
 * Ejemplo de uso desde el frontend:
 * {
 *   "absoluteDay": 15,
 *   "setCustomizations": [
 *     {
 *       "exerciseSetId": 123,
 *       "customRepsMin": 6,
 *       "customRepsMax": 8,
 *       "customWeight": 70.0,
 *       "customRir": 1
 *     }
 *   ]
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayCustomizationRequest {

    /**
     * Día absoluto del macrociclo que se quiere customizar (1, 2, 3...).
     */
    private Integer absoluteDay;

    /**
     * Lista de customizaciones para series específicas.
     * Solo se incluyen las series que el usuario efectivamente modificó.
     */
    private List<SetCustomization> setCustomizations;

    /**
     * Customización de una serie específica.
     * Solo se incluyen los campos que el usuario modificó.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SetCustomization {

        /**
         * ID de la serie que se está customizando.
         * Corresponde a ExerciseSet.id
         */
        private Long exerciseSetId;

        /**
         * Repeticiones mínimas personalizadas.
         * NULL = no modificar, mantener original
         */
        private Integer customRepsMin;

        /**
         * Repeticiones máximas personalizadas.
         * NULL = no modificar, mantener original
         */
        private Integer customRepsMax;

        /**
         * Peso personalizado en kilogramos.
         * NULL = no modificar, mantener original
         */
        private Double customWeight;

        /**
         * RIR (Reps in Reserve) personalizado.
         * NULL = no modificar, mantener original
         */
        private Integer customRir;

        /**
         * RPE (Rate of Perceived Exertion) personalizado.
         * NULL = no modificar, mantener original
         */
        private Integer customRpe;

        /**
         * Notas personalizadas para esta serie.
         * NULL o vacío = no modificar, mantener original
         */
        private String customNotes;

        /**
         * Verifica si esta customización tiene al menos un campo modificado.
         * @return true si hay al menos una customización, false si todos son null
         */
        public boolean hasAnyCustomization() {
            return customRepsMin != null ||
                    customRepsMax != null ||
                    customWeight != null ||
                    customRir != null ||
                    customRpe != null ||
                    (customNotes != null && !customNotes.trim().isEmpty());
        }

        /**
         * 🔥 MÉTODO CORREGIDO: Validación más permisiva que acepta valores válidos
         * @return true si los valores son válidos, false si hay errores
         */
        public boolean isValid() {
            // ✅ CAMBIO: No validar si no hay customización - esto es válido
            if (!hasAnyCustomization()) {
                return true; // Es válido enviar una serie sin customizaciones (para reset)
            }

            // Validar reps mínimas solo si están presentes
            if (customRepsMin != null && customRepsMin <= 0) {
                return false;
            }

            // Validar reps máximas solo si están presentes
            if (customRepsMax != null && customRepsMax <= 0) {
                return false;
            }

            // Validar que reps min <= reps max SOLO si ambos están presentes
            if (customRepsMin != null && customRepsMax != null && customRepsMin > customRepsMax) {
                return false;
            }

            // Validar peso solo si está presente
            if (customWeight != null && customWeight < 0) {
                return false;
            }

            // ✅ CAMBIO: Validación más flexible para RIR
            if (customRir != null) {
                if (customRir < 0 || customRir > 10) { // Expandido rango para ser más permisivo
                    return false;
                }
                // Si hay RIR customizado, no debe haber RPE customizado
                if (customRpe != null) {
                    return false; // No se pueden customizar ambos a la vez
                }
            }

            // ✅ CAMBIO: Validación más flexible para RPE
            if (customRpe != null) {
                if (customRpe < 1 || customRpe > 10) {
                    return false;
                }
                // Si hay RPE customizado, no debe haber RIR customizado
                if (customRir != null) {
                    return false; // No se pueden customizar ambos a la vez
                }
            }

            return true;
        }
    }

    /**
     * 🔥 MÉTODO CORREGIDO: Validación más permisiva de la request completa
     * @return true si es válida, false si hay errores
     */
    public boolean isValid() {
        // Validar día absoluto
        if (absoluteDay == null || absoluteDay <= 0) {
            return false;
        }

        // ✅ CAMBIO: Permitir request sin customizaciones (para reset completo de día)
        if (setCustomizations == null || setCustomizations.isEmpty()) {
            return true; // Es válido enviar una request vacía
        }

        // Validar cada customización individual
        for (SetCustomization customization : setCustomizations) {
            // ✅ CAMBIO: Validar que el exerciseSetId no sea null
            if (customization.getExerciseSetId() == null) {
                return false;
            }

            // ✅ CAMBIO: Solo validar la customización individual si no es válida
            if (!customization.isValid()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Obtiene el número de series que se están customizando.
     * @return Número de series con customizaciones
     */
    public int getCustomizationCount() {
        return setCustomizations != null ? setCustomizations.size() : 0;
    }

    /**
     * Verifica si una serie específica está siendo customizada.
     * @param exerciseSetId ID de la serie a verificar
     * @return true si la serie está en la lista de customizaciones
     */
    public boolean isSetBeingCustomized(Long exerciseSetId) {
        if (setCustomizations == null || exerciseSetId == null) {
            return false;
        }

        return setCustomizations.stream()
                .anyMatch(customization -> exerciseSetId.equals(customization.getExerciseSetId()));
    }

    /**
     * Obtiene la customización de una serie específica.
     * @param exerciseSetId ID de la serie
     * @return SetCustomization si existe, null si no
     */
    public SetCustomization getCustomizationForSet(Long exerciseSetId) {
        if (setCustomizations == null || exerciseSetId == null) {
            return null;
        }

        return setCustomizations.stream()
                .filter(customization -> exerciseSetId.equals(customization.getExerciseSetId()))
                .findFirst()
                .orElse(null);
    }

    /**
     * 🔥 NUEVO: Método para debug que ayuda a identificar qué está fallando en la validación
     * @return String describiendo los problemas de validación encontrados
     */
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

        return errors.length() > 0 ? errors.toString() : "No hay errores de validación";
    }
}