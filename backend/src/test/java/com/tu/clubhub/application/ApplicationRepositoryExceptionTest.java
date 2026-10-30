package com.tu.clubhub.application;

import com.tu.clubhub.application.repository.ApplicationRepository;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;
import org.springframework.dao.DuplicateKeyException;

import static org.junit.jupiter.api.Assertions.*;

class ApplicationRepositoryExceptionTest {
    private static final String TARGET = "uq_applications_round_applicant";

    @Test
    void classifiesConstraintMetadataEvenWhenLocalizedMessageOmitsItsName() {
        var sql = postgres("23505", TARGET, "ข้อมูลซ้ำ กรุณาตรวจสอบรายการเดิม");
        assertFalse(sql.getMessage().contains(TARGET));
        assertEquals(TARGET, sql.getServerErrorMessage().getConstraint());
        assertTrue(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("insert failed", sql)));
    }

    @Test
    void doesNotClassifyAnotherConstraintEvenIfItsMessageMentionsTheTarget() {
        var sql = postgres("23505", "another_unique_key", "Example text mentions \"" + TARGET + "\"");
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("insert failed", sql)));
    }

    @Test
    void requiresUniqueViolationSqlStateAndStructuredConstraintMetadata() {
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("insert failed",
                postgres("23503", TARGET, "Foreign key failure"))));
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("insert failed",
                new SQLException("duplicate \"" + TARGET + "\"", "23505"))));
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("insert failed",
                postgres("23505", null, "No constraint metadata"))));
    }

    private static PSQLException postgres(String state, String constraint, String message) {
        String fields = "SERROR\0C" + state + "\0M" + message + "\0"
                + (constraint == null ? "" : "n" + constraint + "\0") + "\0";
        return new PSQLException(new ServerErrorMessage(fields), false);
    }
}
