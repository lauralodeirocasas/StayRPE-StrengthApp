package com.example.demo.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    // ✅ NUEVOS: Campos para actualizar datos del Usuario
    private String firstName;
    private String lastName;

    // ✅ EXISTENTES: Campos del UserProfile
    private Integer age;
    private Integer height;
    private Integer weight;
    private String sex;
    private String fitnessGoal;
    private String experienceLevel;
}