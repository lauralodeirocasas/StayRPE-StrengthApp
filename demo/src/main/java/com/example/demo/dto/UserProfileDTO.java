package com.example.demo.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private Integer age;
    private Integer height;
    private Integer weight;
    private String sex; // nuevo campo sexo
    private String fitnessGoal;
    private String experienceLevel;
}
