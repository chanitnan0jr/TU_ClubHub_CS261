package com.tu.clubhub.user;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.service.UserAccountService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/** Uses an isolated PostgreSQL database so concurrent transactions use real row locks. */
@SpringBootTest
@ActiveProfiles({"test", "seedtest"})
class UserAccountConcurrencyIntegrationTest {
    @Autowired UserAccountService service;
    @Autowired JdbcTemplate jdbc;
    private String username;

    @BeforeEach
    void setup() {
        username = "tc" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE tu_username = ?)", username);
        jdbc.update("DELETE FROM users WHERE tu_username = ?", username);
    }

    @Test
    void existingAccountSupportsConcurrentVerifiedLogins() throws Exception {
        provision();
        assertConcurrentLogins();
    }

    @Test
    void firstLoginSupportsConcurrentVerifiedLogins() throws Exception {
        assertConcurrentLogins();
    }

    private UserAccount provision() {
        return service.provisionAfterVerifiedLogin(username, "Test student", "student@example.test",
                new UserAccountService.StudentIdentity(username, "Faculty", "Department", "ACTIVE"));
    }

    private void assertConcurrentLogins() throws Exception {
        int workers = 4;
        var start = new CyclicBarrier(workers);
        var executor = Executors.newFixedThreadPool(workers);
        try {
            List<Future<UserAccount>> results = new ArrayList<>();
            for (int i = 0; i < workers; i++) {
                results.add(executor.submit(() -> {
                    start.await(10, TimeUnit.SECONDS);
                    return provision();
                }));
            }
            Long id = results.getFirst().get(20, TimeUnit.SECONDS).getId();
            for (Future<UserAccount> result : results) assertEquals(id, result.get(20, TimeUnit.SECONDS).getId());
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM users WHERE tu_username = ?", Integer.class, username));
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM student_profiles WHERE user_id = ?", Integer.class, id));
            assertEquals("USER", jdbc.queryForObject("SELECT system_role FROM users WHERE id = ?", String.class, id));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM club_memberships WHERE user_id = ?", Integer.class, id));
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(20, TimeUnit.SECONDS);
        }
    }
}
