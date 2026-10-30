package com.tu.clubhub.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ApplicationRepository extends JpaRepository<ApplicationEntity, String> {
    
    // ดึงเฉพาะใบสมัครของ userId นั้นๆ เพื่อทำ Privacy Isolation
    List<ApplicationEntity> findByUserIdOrderBySubmittedAtDesc(String userId);
}