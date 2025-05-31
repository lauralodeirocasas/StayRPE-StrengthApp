package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "macrocycle_day_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MacrocycleDayPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "macrocycle_id")
    private Macrocycle macrocycle;

    @Column(name = "day_number")
    private Integer dayNumber; // 1, 2, 3, etc.

    @ManyToOne
    @JoinColumn(name = "routine_id")
    private Routine routine; // null si es día de descanso

    @Column(name = "is_rest_day")
    private Boolean isRestDay = false;
}