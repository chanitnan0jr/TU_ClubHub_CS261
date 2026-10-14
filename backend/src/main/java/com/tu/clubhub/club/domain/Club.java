
package com.tu.clubhub.club.domain;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "clubs")
public class Club {

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setObjectives(String objectives) {
        this.objectives = objectives;
    }

    public void setContactUrl(String contactUrl) {
        this.contactUrl = contactUrl;
    }

    public void setFacebookUrl(String facebookUrl) {
        this.facebookUrl = facebookUrl;
    }

    public void setInstagramUrl(String instagramUrl) {
        this.instagramUrl = instagramUrl;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public void setAffiliationLevel(String affiliationLevel) {
        this.affiliationLevel = affiliationLevel;
    }

    public void setAffiliationName(String affiliationName) {
        this.affiliationName = affiliationName;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getObjectives() {
        return objectives;
    }

    public String getContactUrl() {
        return contactUrl;
    }

    public String getFacebookUrl() {
        return facebookUrl;
    }

    public String getInstagramUrl() {
        return instagramUrl;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getAffiliationLevel() {
        return affiliationLevel;
    }

    public String getAffiliationName() {
        return affiliationName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public String getStatus() {
        return status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "name", nullable = false, unique = true, length = 200)
    private String name;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "objectives", columnDefinition = "TEXT")
    private String objectives;

    @Column(name = "contact_url", length = 2048)
    private String contactUrl;

    @Column(name = "facebook_url", length = 2048)
    private String facebookUrl;

    @Column(name = "instagram_url", length = 2048)
    private String instagramUrl;

    @Column(name = "contact_email", length = 254)
    private String contactEmail;

    @Column(name = "affiliation_level", length = 30)
    private String affiliationLevel;

    @Column(name = "affiliation_name", length = 200)
    private String affiliationName;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "banner_url", length = 2048)
    private String bannerUrl;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public Club() {
    }

    public Club(Long categoryId, String name,
            String description, Long createdBy) {
    this.categoryId = java.util.Objects.requireNonNull(categoryId);
    this.name = java.util.Objects.requireNonNull(name);
    this.description = java.util.Objects.requireNonNull(description);
    this.createdBy = java.util.Objects.requireNonNull(createdBy);
    }

}
