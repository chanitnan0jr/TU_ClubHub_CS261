package com.tu.clubhub.user.service;

import java.time.Instant;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.tu.clubhub.user.domain.StudentProfile;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.StudentProfileRepository;
import com.tu.clubhub.user.repository.UserAccountRepository;

@Service
public class UserAccountService {

	/** Student data TU verified at login; studentCode is the TU username, kept as a string. */
	public record StudentIdentity(String studentCode, String facultyName, String departmentName, String studentStatus) {
	}

	private final UserAccountRepository repository;
	private final StudentProfileRepository profileRepository;
	private final TransactionTemplate transactionTemplate;

	public UserAccountService(
			UserAccountRepository repository,
			StudentProfileRepository profileRepository,
			PlatformTransactionManager transactionManager) {
		this.repository = repository;
		this.profileRepository = profileRepository;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

	/**
	 * Saves the account and its student profile in one transaction, so a failed profile write
	 * also fails the login. {@code student} is null for a non-student TU account.
	 */
	public UserAccount provisionAfterVerifiedLogin(
			String tuUsername, String displayName, String email, StudentIdentity student) {
		try {
			return transactionTemplate.execute(status -> syncStudentProfile(repository.findByTuUsername(tuUsername)
					.map(account -> refresh(account, displayName, email))
					.orElseGet(() -> repository.saveAndFlush(new UserAccount(
							tuUsername, displayName, email, Instant.now()))), student));
		} catch (DataIntegrityViolationException concurrentFirstLogin) {
			// A parallel first login may win the unique username constraint. Its
			// transaction has completed before this fresh transaction reloads it.
			Optional<UserAccount> winner = transactionTemplate.execute(
					status -> repository.findByTuUsername(tuUsername));
			if (winner.isEmpty()) {
				throw concurrentFirstLogin;
			}
			return transactionTemplate.execute(status -> syncStudentProfile(refresh(
				repository.findByTuUsername(tuUsername).orElseThrow(), displayName, email), student));
		}
	}

	private UserAccount refresh(UserAccount account, String displayName, String email) {
		account.refreshIdentity(displayName, email, Instant.now());
		return repository.saveAndFlush(account);
	}

	// Records only what TU verified; login never creates memberships, committee assignments, or roles.
	private UserAccount syncStudentProfile(UserAccount account, StudentIdentity student) {
		Instant now = Instant.now();
		Optional<StudentProfile> existing = profileRepository.findById(account.getId());
		if (student != null) {
			StudentProfile profile = existing.orElseGet(() -> new StudentProfile(account.getId(), student.studentCode()));
			profile.sync(student.facultyName(), student.departmentName(), student.studentStatus(), now);
			profileRepository.saveAndFlush(profile);
		} else {
			// A former student now signing in as another account type must not keep an old ACTIVE status.
			existing.ifPresent(profile -> {
				profile.markUnknown(now);
				profileRepository.saveAndFlush(profile);
			});
		}
		return account;
	}
}
