package com.example.stayrpe.dto;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class UserProfileResponse {
    private String username;
    private String firstName;
    private String lastName;
    private Integer age;
    private Integer height;
    private Integer weight;
    private String sex;
    private String fitnessGoal;
    private String experienceLevel;
    private boolean onboardingComplete;
}
