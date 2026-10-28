package com.tu.clubhub.committee.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.service.ClubService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Permission matrix §7.4 on PostgreSQL with two real transactions: a club write and an
 * assignment revocation that conflict on the assignment row. Covers only assignment-row
 * changes; account, student, membership, and club status changes are not serialized.
 */
@SpringBootTest(properties = {
		"spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_test}",
		"spring.datasource.username=postgres",
		"spring.datasource.password=${DB_PASSWORD}",
		"spring.flyway.enabled=true",
		"spring.flyway.locations=classpath:db/migration",
		"spring.jpa.hibernate.ddl-auto=validate",
		"spring.session.jdbc.initialize-schema=never",
		"tu.auth.mode=mock"
})
@ActiveProfiles("test")
class CommitteeRevocationConcurrencyIntegrationTest {

	private static final String ORIGINAL_NAME = "Original club name";

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ClubService clubService;

	@Autowired
	private PlatformTransactionManager transactionManager;

	private final ExecutorService pool = Executors.newFixedThreadPool(2);
	private TransactionTemplate tx;
	private Long userId;
	private String username;
	private Long categoryId;
	private Long clubId;
	private Long membershipId;
	private Long assignmentId;

	@BeforeEach
	void createCommittee() {
		tx = new TransactionTemplate(transactionManager);
		String suffix = UUID.randomUUID().toString();
		OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
		username = "committee-" + suffix;
		userId = jdbc.queryForObject(
				"INSERT INTO users (tu_username, display_name) VALUES (?, 'Committee') RETURNING id",
				Long.class, username);
		jdbc.update("INSERT INTO student_profiles (user_id, student_code, student_status) VALUES (?, ?, 'ACTIVE')",
				userId, "C-" + suffix.substring(0, 16));
		categoryId = jdbc.queryForObject("INSERT INTO club_categories (name) VALUES (?) RETURNING id",
				Long.class, "category-" + suffix);
		clubId = jdbc.queryForObject(
				"INSERT INTO clubs (category_id, name, description, created_by) VALUES (?, ?, 'Club', ?) RETURNING id",
				Long.class, categoryId, ORIGINAL_NAME, userId);
		membershipId = jdbc.queryForObject("""
				INSERT INTO club_memberships (club_id, user_id, status, joined_at)
				VALUES (?, ?, 'ACTIVE', ?) RETURNING id
				""", Long.class, clubId, userId, now.minusDays(1));
		assignmentId = jdbc.queryForObject("""
				INSERT INTO club_committee_assignments
				    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
				VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?) RETURNING id
				""", Long.class, membershipId, now.minusDays(1), now.plusDays(1), userId);
	}

	@AfterEach
	void cleanUp() {
		pool.shutdownNow();
		jdbc.update("DELETE FROM club_committee_assignments WHERE id = ?", assignmentId);
		jdbc.update("DELETE FROM club_memberships WHERE id = ?", membershipId);
		jdbc.update("DELETE FROM clubs WHERE id = ?", clubId);
		jdbc.update("DELETE FROM club_categories WHERE id = ?", categoryId);
		jdbc.update("DELETE FROM student_profiles WHERE user_id = ?", userId);
		jdbc.update("DELETE FROM users WHERE id = ?", userId);
	}

	@Test
	void revocationCommittedWhileTheWriteWaitsIsSeenAndTheWriteIsRejected() throws Exception {
		CountDownLatch revoked = new CountDownLatch(1);
		CountDownLatch commitRevocation = new CountDownLatch(1);
		Future<?> revocation = pool.submit(() -> tx.executeWithoutResult(status -> {
			revokeAssignment();
			revoked.countDown();
			await(commitRevocation);
		}));
		await(revoked);

		Future<?> write = pool.submit(asCommittee(() -> clubService.updateClub(clubId, request("Changed name"))));
		awaitLockWaiter();
		commitRevocation.countDown();
		revocation.get(10, TimeUnit.SECONDS);

		ExecutionException failure = assertThrows(ExecutionException.class, () -> write.get(10, TimeUnit.SECONDS));
		assertInstanceOf(AccessDeniedException.class, failure.getCause());
		assertEquals(ORIGINAL_NAME, clubName());
	}

	@Test
	void writeThatHoldsTheLockFirstFinishesBeforeTheRevocation() throws Exception {
		CountDownLatch checked = new CountDownLatch(1);
		CountDownLatch commitWrite = new CountDownLatch(1);
		Future<?> write = pool.submit(asCommittee(() -> tx.executeWithoutResult(status -> {
			clubService.updateClub(clubId, request("Changed name"));
			checked.countDown();
			await(commitWrite);
		})));
		await(checked);

		Future<?> revocation = pool.submit(() -> tx.executeWithoutResult(status -> revokeAssignment()));
		awaitLockWaiter();
		assertFalse(revocation.isDone(), "revocation waits for the write that passed its check");
		commitWrite.countDown();
		write.get(10, TimeUnit.SECONDS);
		revocation.get(10, TimeUnit.SECONDS);

		assertEquals("Changed name", clubName());
		assertEquals("REVOKED", jdbc.queryForObject(
				"SELECT status FROM club_committee_assignments WHERE id = ?", String.class, assignmentId));
	}

	private void revokeAssignment() {
		jdbc.update("""
				UPDATE club_committee_assignments
				SET status = 'REVOKED', revoked_at = now(), revoked_by = ?, revocation_reason = 'test'
				WHERE id = ?
				""", userId, assignmentId);
	}

	// Waits until a session in this database is blocked on a row lock.
	private void awaitLockWaiter() throws InterruptedException {
		for (int i = 0; i < 200; i++) {
			Integer waiting = jdbc.queryForObject("""
					SELECT count(*) FROM pg_stat_activity
					WHERE datname = current_database() AND wait_event_type = 'Lock'
					""", Integer.class);
			if (waiting != null && waiting > 0) {
				return;
			}
			Thread.sleep(50);
		}
		throw new AssertionError("no transaction waited on the assignment lock");
	}

	private Runnable asCommittee(Runnable action) {
		return () -> {
			SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
					new ClubHubPrincipal(userId, username, "USER"), null, List.of()));
			try {
				action.run();
			} finally {
				SecurityContextHolder.clearContext();
			}
		};
	}

	private String clubName() {
		return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
	}

	private static ClubUpdateRequestDto request(String name) {
		return new ClubUpdateRequestDto(name, "Club", null, null, null, null, null, null, null);
	}

	private static void await(CountDownLatch latch) {
		try {
			if (!latch.await(10, TimeUnit.SECONDS)) {
				throw new AssertionError("timed out waiting for the other transaction");
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new AssertionError(e);
		}
	}
}
