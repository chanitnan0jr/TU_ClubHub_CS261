
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
}
