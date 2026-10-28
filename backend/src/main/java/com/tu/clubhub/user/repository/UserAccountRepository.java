package com.tu.clubhub.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tu.clubhub.user.domain.UserAccount;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

	Optional<UserAccount> findByTuUsername(String tuUsername);

	@Query("SELECT account.accountStatus FROM UserAccount account WHERE account.id = :id")
	Optional<String> findAccountStatusById(@Param("id") Long id);
}
