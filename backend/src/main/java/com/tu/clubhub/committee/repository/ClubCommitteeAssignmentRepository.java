package com.tu.clubhub.committee.repository;

import java.time.Instant;

import com.tu.clubhub.committee.domain.ClubCommitteeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClubCommitteeAssignmentRepository extends JpaRepository<ClubCommitteeAssignment, Long> {

	@Query(value = """
			SELECT CASE WHEN EXISTS (
				SELECT 1
				FROM club_committee_assignments assignment
				JOIN club_memberships membership ON membership.id = assignment.membership_id
				JOIN users account ON account.id = membership.user_id
				WHERE membership.user_id = :userId
				  AND membership.club_id = :clubId
				  AND membership.status = 'ACTIVE'
				  AND membership.ended_at IS NULL
				  AND assignment.status = 'ACTIVE'
				  AND assignment.permission_role IN ('COMMITTEE', 'PRESIDENT')
				  AND assignment.revoked_at IS NULL
				  AND assignment.starts_at <= :at
				  AND :at < assignment.ends_at
				  AND account.account_status = 'ACTIVE'
			) THEN TRUE ELSE FALSE END
			""", nativeQuery = true)
	boolean existsEffectiveAssignment(
			@Param("userId") Long userId,
			@Param("clubId") Long clubId,
			@Param("at") Instant at);
}
