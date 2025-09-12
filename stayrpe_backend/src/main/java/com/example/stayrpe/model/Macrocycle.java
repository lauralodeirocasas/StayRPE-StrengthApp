package com.example.stayrpe.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "macrocycles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Macrocycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private Usuario createdBy;

    @Column(name = "is_archived")
    private boolean isArchived = false;

    @Column(name = "is_currently_active")
    private boolean isCurrentlyActive = false;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "microcycle_duration_days")
    private Integer microcycleDurationDays;

    @Column(name = "total_microcycles")
    private Integer totalMicrocycles;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return !isArchived;
    }

    public LocalDate getEndDate() {
        if (startDate != null && microcycleDurationDays != null && totalMicrocycles != null) {
            int totalDays = microcycleDurationDays * totalMicrocycles;
            return startDate.plusDays(totalDays - 1);
        }
        return null;
    }

    public Integer getTotalDurationDays() {
        if (microcycleDurationDays != null && totalMicrocycles != null) {
            return microcycleDurationDays * totalMicrocycles;
        }
        return null;
    }

    public boolean isCompleted() {
        LocalDate endDate = getEndDate();
        if (endDate != null) {
            return LocalDate.now().isAfter(endDate);
        }
        return false;
    }

    public boolean isInProgress() {
        if (startDate != null) {
            LocalDate today = LocalDate.now();
            LocalDate endDate = getEndDate();
            return !today.isBefore(startDate) && (endDate == null || !today.isAfter(endDate));
        }
        return false;
    }
}