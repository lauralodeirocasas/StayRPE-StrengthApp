package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "usuario_id", referencedColumnName = "id")
    private Usuario usuario;

    private Integer age;
    private Integer height; // en cm
    private Integer weight; // en kg

    private String sex; // nuevo campo para sexo (ejemplo: "male", "female", "other")

    @Column(name = "fitness_goal")
    private String fitnessGoal; // lose_weight, gain_muscle, improve_fitness, maintain

    @Column(name = "experience_level")
    private String experienceLevel; // beginner, intermediate, advanced

    @Column(name = "onboarding_complete")
    private boolean onboardingComplete = false;
}
