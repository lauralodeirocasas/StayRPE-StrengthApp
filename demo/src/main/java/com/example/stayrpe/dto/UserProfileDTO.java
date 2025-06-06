package com.example.stayrpe.dto;

import lombok.Data;

@Data
public class UserProfileDTO {
    private String firstName;
    private String lastName;
    private Integer age;
    private Integer height;
    private Integer weight;
    private String sex;
    private String fitnessGoal;
    private String experienceLevel;
}