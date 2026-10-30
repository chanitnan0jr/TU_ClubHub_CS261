package com.tu.clubhub.committee.repository;

import java.time.Instant;
import java.util.List;

import com.tu.clubhub.committee.domain.ClubCommitteeAssignment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClubCommitteeAssignmentRepository extends JpaRepository<ClubCommitteeAssignment, Long> {

	// Assignments that currently grant committee rights for the club (permission matrix §2).
	// The assignment's own conditions stay on the selected row so a lock wait rechecks them.
	String EFFECTIVE_ASSIGNMENTS = """
			SELECT assignment
			FROM ClubCommitteeAssignment assignment
			WHERE assignment.status = 'ACTIVE'
			  AND assignment.permissionRole IN ('COMMITTEE', 'PRESIDENT')
			  AND assignment.revokedAt IS NULL
			  AND assignment.startsAt <= :at
			  AND :at < assignment.endsAt
			  AND assignment.membershipId IN (
				SELECT membership.id
				FROM ClubMembership membership, UserAccount account, StudentProfile student, Club club
				WHERE membership.userId = :userId
				  AND membership.clubId = :clubId
				  AND membership.status = 'ACTIVE'
				  AND membership.endedAt IS NULL
				  AND membership.joinedAt <= :at
				  AND account.id = membership.userId
				  AND account.accountStatus = 'ACTIVE'
				  AND student.userId = membership.userId
				  AND student.studentStatus = 'ACTIVE'
				  AND club.id = membership.clubId
				  AND club.status = 'ACTIVE')
			""";

	@Query(EFFECTIVE_ASSIGNMENTS)
	List<ClubCommitteeAssignment> findEffectiveAssignments(
			@Param("userId") Long userId,
			@Param("clubId") Long clubId,
			@Param("at") Instant at);

	/**
	 * Same rule, share-locking the matching assignment rows until the transaction ends: a
	 * revocation committed first leaves no match, and one started later waits for this
	 * transaction. Only assignment-row changes are serialized; account, student, membership,
	 * and club status are read as committed at check time.
	 */
	@Lock(LockModeType.PESSIMISTIC_READ)
	@Query(EFFECTIVE_ASSIGNMENTS)
	List<ClubCommitteeAssignment> lockEffectiveAssignments(
			@Param("userId") Long userId,
			@Param("clubId") Long clubId,
			@Param("at") Instant at);
}
