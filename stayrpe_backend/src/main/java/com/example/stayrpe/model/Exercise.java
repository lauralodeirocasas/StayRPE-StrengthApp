package com.example.stayrpe.model;

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
    private String name;

    @Column(nullable = false)
    private String muscle;

    @Column(name = "is_custom")
    private boolean isCustom = false;

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private Usuario createdBy;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "muscle_group")
    private String muscleGroup;
}