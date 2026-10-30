package com.tu.clubhub.application;

import java.time.LocalDateTime;

public class ApplicationResponseDto {
    private String id;
    private String clubId;
    private String clubName;
    private String academicYear;
    private String status; // PENDING, INTERVIEW, PASSED, REJECTED, CONFIRMED, WAIVED
    private LocalDateTime submittedAt;
    private String reason;
    private String portfolioUrl;
    private String note;
    private LocalDateTime interviewDate;

    public ApplicationResponseDto() {}

    public ApplicationResponseDto(String id, String clubId, String clubName, String academicYear, 
                                  String status, LocalDateTime submittedAt, String reason, 
                                  String portfolioUrl, String note, LocalDateTime interviewDate) {
        this.id = id;
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