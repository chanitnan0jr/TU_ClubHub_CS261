package com.tu.clubhub.user.service;

import java.time.Instant;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.UserAccountRepository;

@Service
public class UserAccountService {

	private final UserAccountRepository repository;
	private final TransactionTemplate transactionTemplate;

	public UserAccountService(UserAccountRepository repository, PlatformTransactionManager transactionManager) {
		this.repository = repository;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

	public UserAccount provisionAfterVerifiedLogin(String tuUsername, String displayName, String email) {
		try {
			return transactionTemplate.execute(status -> repository.findByTuUsername(tuUsername)
					.map(account -> refresh(account, displayName, email))
					.orElseGet(() -> repository.saveAndFlush(new UserAccount(
							tuUsername, displayName, email, Instant.now()))));
		} catch (DataIntegrityViolationException concurrentFirstLogin) {
			// A parallel first login may win the unique username constraint. Its
			// transaction has completed before this fresh transaction reloads it.
			Optional<UserAccount> winner = transactionTemplate.execute(
					status -> repository.findByTuUsername(tuUsername));
			if (winner.isEmpty()) {
				throw concurrentFirstLogin;
			}
			return transactionTemplate.execute(status -> refresh(
				repository.findByTuUsername(tuUsername).orElseThrow(), displayName, email));
		}
	}

	private UserAccount refresh(UserAccount account, String displayName, String email) {
		account.refreshIdentity(displayName, email, Instant.now());
		return repository.saveAndFlush(account);
	}
}
