package com.tu.clubhub.membership.repository;

import com.tu.clubhub.membership.domain.ClubMembership;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubMembershipRepository extends JpaRepository<ClubMembership, Long> {
}
