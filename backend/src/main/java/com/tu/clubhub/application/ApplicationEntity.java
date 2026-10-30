package com.tu.clubhub.application;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications")
public class ApplicationEntity {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "club_id", nullable = false)
    private String clubId;

    @Column(name = "club_name", nullable = false)
    private String clubName;

    @Column(name = "academic_year")
    private String academicYear;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "portfolio_url")
    private String portfolioUrl;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "interview_date")
    private LocalDateTime interviewDate;

    public ApplicationEntity() {}

    public ApplicationEntity(String id, String userId, String clubId, String clubName, String academicYear, 
                             String status, LocalDateTime submittedAt, String reason, String portfolioUrl, 
                             String note, LocalDateTime interviewDate) {
        this.id = id;
        this.userId = userId;
        this.clubId = clubId;
        this.clubName = clubName;
        this.academicYear = academicYear;
        this.status = status;
        this.submittedAt = submittedAt;
        this.reason = reason;
        this.portfolioUrl = portfolioUrl;
        this.note = note;
        this.interviewDate = interviewDate;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getClubId() { return clubId; }
    public void setClubId(String clubId) { this.clubId = clubId; }

    public String getClubName() { return clubName; }
    public void setClubName(String clubName) { this.clubName = clubName; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getInterviewDate() { return interviewDate; }
    public void setInterviewDate(LocalDateTime interviewDate) { this.interviewDate = interviewDate; }
}