package com.tu.clubhub.application;

import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = {
        "spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_migration_verify}",
        "spring.datasource.username=postgres",
        "spring.datasource.password=${DB_PASSWORD}",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.session.jdbc.initialize-schema=never",
        "spring.datasource.hikari.maximum-pool-size=2",
        "spring.datasource.hikari.minimum-idle=0",
        "tu.auth.mode=mock"
})
@ActiveProfiles("test")
class ApplicationMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayCreatesAllFourApplicationTables() {
        List<String> tables = List.of(
                "applications",
                "application_answers",
                "application_links",
                "application_status_history"
        );

        for (String table : tables) {
            Boolean exists = jdbcTemplate.queryForObject(
                    "SELECT to_regclass(?) IS NOT NULL",
                    Boolean.class,
                    "public." + table
            );
            assertEquals(Boolean.TRUE, exists, "Missing table: " + table);
        }
    }

    @Test
    void applicationsHasUniqueIndexForRoundAndApplicant() {
        Integer matchingConstraints = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM pg_constraint constraint_row
                JOIN pg_class table_row
                    ON table_row.oid = constraint_row.conrelid
                JOIN pg_namespace schema_row
                    ON schema_row.oid = table_row.relnamespace
                JOIN pg_index index_row
                    ON index_row.indexrelid = constraint_row.conindid
                WHERE schema_row.nspname = 'public'
                  AND table_row.relname = 'applications'
                  AND constraint_row.conname = 'uq_applications_round_applicant'
                  AND constraint_row.contype = 'u'
                  AND index_row.indisunique
                  AND pg_get_constraintdef(constraint_row.oid)
                      = 'UNIQUE (round_id, applicant_id)'
                """, Integer.class);

        assertEquals(1, matchingConstraints,
                "Expected a unique index backed constraint on (round_id, applicant_id)");
    }

    @Test
    void copiedUniqueIndexRejectsSameRoundButAllowsAnotherRound() {
        // Use a temporary copy to exercise the actual index definition without
        // creating persistent test data or needing foreign-key fixtures.
        // LIKE INCLUDING ALL copies indexes but not foreign keys.
        jdbcTemplate.execute((ConnectionCallback<Void>) connection -> {
            try (Statement statement = connection.createStatement()) {
                statement.execute("""
                        CREATE TEMP TABLE application_unique_probe
                        (LIKE public.applications INCLUDING ALL)
                        """);
                try {
                    statement.executeUpdate("""
                            INSERT INTO application_unique_probe
                                (round_id, club_id, applicant_id, motivation)
                            VALUES (101, 201, 301, 'test application')
                            """);

                    SQLException duplicateError =
                            org.junit.jupiter.api.Assertions.assertThrows(
                                    SQLException.class,
                                    () -> statement.executeUpdate("""
                                            INSERT INTO application_unique_probe
                                                (round_id, club_id, applicant_id, motivation)
                                            VALUES (101, 201, 301, 'duplicate application')
                                            """)
                            );
                    assertEquals("23505", duplicateError.getSQLState(),
                            "A duplicate round/applicant pair must be rejected");

                    int inserted = statement.executeUpdate("""
                            INSERT INTO application_unique_probe
                                (round_id, club_id, applicant_id, motivation)
                            VALUES (102, 201, 301, 'another round')
                            """);
                    assertEquals(1, inserted,
                            "The same applicant should be allowed in another round");
                } finally {
                    statement.execute("DROP TABLE IF EXISTS pg_temp.application_unique_probe");
                }
            }
            return null;
        });
    }
}
