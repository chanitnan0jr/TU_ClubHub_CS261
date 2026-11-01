
package com.tu.clubhub;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles({"test", "seedtest"})
class SeedDataMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldHave10Clubs() {
        Long count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM clubs", Long.class
        );

        assertEquals(10L, count);
    }

    @Test
    void shouldHave4Categories() {
        Long count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM club_categories",
            Long.class
        );

        assertEquals(4L, count);
    }

    @Test
    void shouldSeedTheDemoAccounts() {
        String seeded = "(tu_username LIKE 'seed\\_%' OR tu_username = 'student-demo')";
        assertEquals(8L, jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE " + seeded, Long.class));
        assertEquals(1L, jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE system_role = 'ADMIN' AND " + seeded, Long.class));
        assertEquals(7L, jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE "
                + seeded.replace("tu_username", "u.tu_username"), Long.class));
        assertEquals(5L, jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM club_committee_assignments WHERE permission_role = 'PRESIDENT'", Long.class));
        assertEquals(Boolean.TRUE, jdbcTemplate.queryForObject("""
            SELECT EXISTS (SELECT 1 FROM club_committee_assignments a
                JOIN club_memberships m ON m.id = a.membership_id
                JOIN users u ON u.id = m.user_id
                JOIN clubs c ON c.id = m.club_id
                WHERE u.tu_username = 'student-demo' AND c.name = 'ชมรมเขียนโปรแกรม'
                  AND a.permission_role = 'PRESIDENT')
            """, Boolean.class));
    }
}
