package com.tu.clubhub.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tu.clubhub.user.domain.StudentProfile;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
}
