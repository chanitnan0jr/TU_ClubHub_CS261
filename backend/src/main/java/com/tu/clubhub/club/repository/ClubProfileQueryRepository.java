package com.tu.clubhub.club.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.tu.clubhub.club.dto.ClubResponseDto.ClubCategoryDto;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubTagDto;
import com.tu.clubhub.club.dto.ClubResponseDto.PublicRecruitmentRoundDto;

@Repository
public class ClubProfileQueryRepository {

    private final JdbcTemplate jdbcTemplate;

    public ClubProfileQueryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // อ่านหมวดหมู่ของชมรม
    public ClubCategoryDto findCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }

        List<ClubCategoryDto> categories = jdbcTemplate.query(
                """
                SELECT id, name
                FROM club_categories
                WHERE id = ?
                """,
                (rs, rowNum) -> new ClubCategoryDto(
                        rs.getString("id"),
                        rs.getString("name")
                ),
                categoryId
        );

        return categories.isEmpty() ? null : categories.get(0);
    }

    // อ่านแท็กของชมรม
    public List<ClubTagDto> findTags(Long clubId) {
        return jdbcTemplate.query(
                """
                SELECT t.id, t.name
                FROM tags t
                JOIN club_tags ct ON ct.tag_id = t.id
                WHERE ct.club_id = ?
                ORDER BY t.id
                """,
                (rs, rowNum) -> new ClubTagDto(
                        rs.getString("id"),
                        rs.getString("name")
                ),
                clubId
        );
    }

    // อ่านเฉพาะรอบรับสมัครที่เผยแพร่แล้ว
    public List<PublicRecruitmentRoundDto> findPublishedRounds(
            Long clubId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id, name, opens_at, closes_at, closed_at
                FROM recruitment_rounds
                WHERE club_id = ?
                  AND publication_status = 'PUBLISHED'
                ORDER BY opens_at, id
                """,
                (rs, rowNum) -> new PublicRecruitmentRoundDto(
                        rs.getString("id"),
                        rs.getString("name"),
                        toInstant(rs.getTimestamp("opens_at")),
                        toInstant(rs.getTimestamp("closes_at")),
                        toInstant(rs.getTimestamp("closed_at"))
                ),
                clubId
        );
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}