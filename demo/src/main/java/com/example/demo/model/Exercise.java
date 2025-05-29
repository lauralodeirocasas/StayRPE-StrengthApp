package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "exercises")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Nombre del ejercicio

    @Column(nullable = false)
    private String muscle; // Músculo que trabaja (chest, back, legs, shoulders, arms, core, etc.)

    @Column(name = "is_custom")
    private boolean isCustom = false; // true si es personalizado, false si es predefinido

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private Usuario createdBy; // Usuario que creó el ejercicio personalizado (null para predefinidos)

    @Column(columnDefinition = "TEXT")
    private String description; // Descripción opcional del ejercicio

    @Column(name = "muscle_group")
    private String muscleGroup; // Grupo muscular más amplio (upper_body, lower_body, full_body)
}