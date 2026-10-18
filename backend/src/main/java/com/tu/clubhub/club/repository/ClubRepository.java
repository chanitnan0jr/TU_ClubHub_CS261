
package com.tu.clubhub.club.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tu.clubhub.club.domain.Club;

public interface ClubRepository extends JpaRepository<Club, Long> {

    Optional<Club> findByName(String name);

    Optional<Club> findByIdAndStatus(Long id, String status);

    List<Club> findByStatus(String status);

    List<Club> findByCategoryIdAndStatus(
        Long categoryId, String status
    );

    List<Club> findByNameContainingIgnoreCase(String name);
}
