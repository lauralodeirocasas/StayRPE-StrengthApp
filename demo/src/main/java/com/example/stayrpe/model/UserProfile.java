package com.example.stayrpe.model;

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
    private Integer height;
    private Integer weight;
    private String sex;

    @Column(name = "fitness_goal")
    private String fitnessGoal;

    @Column(name = "experience_level")
    private String experienceLevel;

    @Column(name = "onboarding_complete")
    private boolean onboardingComplete = false;
}