package com.tu.clubhub.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tu.clubhub.user.domain.UserAccount;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

	Optional<UserAccount> findByTuUsername(String tuUsername);
}
