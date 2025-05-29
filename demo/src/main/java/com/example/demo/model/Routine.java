package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "routines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Nombre de la rutina

    @Column(columnDefinition = "TEXT")
    private String description; // Descripción de la rutina

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private Usuario createdBy; // Usuario que creó la rutina

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active")
    private boolean isActive = true; // Si está activa o archivada

    // Relación con los ejercicios de la rutina
    @OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RoutineExercise> routineExercises;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}