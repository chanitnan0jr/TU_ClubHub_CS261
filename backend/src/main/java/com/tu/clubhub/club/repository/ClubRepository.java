
package com.tu.clubhub.club.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tu.clubhub.club.domain.Club;

public interface ClubRepository extends JpaRepository<Club, Long> {

    /** Row-locks the club so concurrent profile updates (including its tag set) run one at a time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Club c WHERE c.id = :id")
    Optional<Club> findByIdForUpdate(@Param("id") Long id);

    Optional<Club> findByName(String name);

    Optional<Club> findByIdAndStatus(Long id, String status);

    List<Club> findByStatus(String status);

    List<Club> findByCategoryIdAndStatus(
        Long categoryId, String status
    );

    List<Club> findByNameContainingIgnoreCase(String name);
}
