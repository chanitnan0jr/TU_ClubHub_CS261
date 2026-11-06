# Task83 [PIPELINE-02]: System Integration Tests & Database CI Pipeline Report

| รายการ | รายละเอียด |
|---|---|
| **Task ID / Feature** | `Task83` (`PIPELINE-02`) |
| **วันที่จัดทำ** | 2026-11-06 |
| **ผู้รับผิดชอบ (Owner / Reviewer)** | สิรวิชญ์ กฤดาธิการวุฒิ (DevOps Lead / QA) ร่วมกับ วรพล ภู่พัฒนันท์ (DevOps) |
| **Workflow File** | [`.github/workflows/ci-integration.yml`](../../.github/workflows/ci-integration.yml) |
| **Dependencies** | [`Task82`](../tasks/sprint2/Task82.md) (CI พื้นฐาน) และ [`Task55`](../tasks/sprint2/Task55.md) (Flyway Migration & Sprint 2 Seed Data) |

---

## 1. ภาพรวมการออกแบบ Pipeline (`ci-integration.yml`)

Pipeline [`.github/workflows/ci-integration.yml`](../../.github/workflows/ci-integration.yml) ถูกออกแบบมาเพื่อรันการทดสอบระดับ System Integration ครบวงจรร่วมกับฐานข้อมูล PostgreSQL จริงบน GitHub Actions โดยแบ่งขั้นตอนการทำงานตามขอบเขตงาน (Actionable Scope) ทั้ง 4 ข้อดังนี้:

| ลำดับ | ขอบเขตงาน (Actionable Scope) | การตั้งค่าใน `.github/workflows/ci-integration.yml` |
|---|---|---|
| **1** | **Docker Service Container** | ยก `postgres:17-alpine` (ตรงกับ [`compose.yaml`](../../compose.yaml)) สร้างฐานข้อมูล `tu_clubhub_test` บนพอร์ต `5432` พร้อม Healthcheck `pg_isready -U postgres -d tu_clubhub_test` |
| **2** | **Flyway Migration & Seed Data Run** | • รัน Flyway Migrations อัตโนมัติ (`V1__init_schema.sql`, `V2__seed_test_data.sql`, `V3__create_spring_session_tables.sql`) ผ่านโปรไฟล์ `seedtest`<br>• ตรวจสอบตาราง `flyway_schema_history`<br>• รัน [`sprint2_seed.sql`](../../backend/src/main/resources/db/seed/sprint2_seed.sql) ซ้ำ 2 รอบเพื่อตรวจความสามารถในการรันซ้ำ (Idempotency)<br>• รัน [`verify_sprint2_seed.sql`](../../backend/src/test/resources/db/seed/verify_sprint2_seed.sql) (`ON_ERROR_STOP=1`) เพื่อยืนยันข้อมูลจำลองทั้ง 6 สถานะ (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`) และสถานะสมาชิกชมรม |
| **3** | **Integration Test Suite** | รัน `./mvnw clean verify -Dtest="SeedDataMigrationTest,*IntegrationTest,*E2ETest,*QATest"` ครอบคลุมทุก Feature (Authentication, Session & Rate Limit, Public Club & Categories/Tags, Club Profile Update, Committee Security & Revocation Concurrency, Recruitment Rounds, Screening Questions, Application Submission, Problem Details & Security Hardening) |
| **4** | **Test Report Summary** | ประมวลผลไฟล์ `target/surefire-reports/TEST-*.xml` และ `target/seed-verification/summary.log` เพื่อเขียนรายงานสรุปลง `$GITHUB_STEP_SUMMARY` แสดงทั้งตารางภาพรวม, สถานะ Flyway & Sprint 2 Seed Verification, และตารางแยกผลลัพธ์ราย Test Suite พร้อมอัปโหลด Artifact `system-integration-test-report` |

---

## 2. รายการชุดทดสอบ Integration Tests ที่รันใน Pipeline

| หมวดหมู่ฟีเจอร์ (Feature Area) | ชุดทดสอบที่รัน (`src/test/java/com/tu/clubhub/**`) |
|---|---|
| **Database Schema & Seed Migration** | `SeedDataMigrationTest`, `ApplicationMigrationIntegrationTest` |
| **Authentication, Session & TU API** | `AuthSessionIntegrationTest`, `CurrentUserAssignmentsIntegrationTest`, `LoginRateLimitIntegrationTest`, `StudentProfileLoginIntegrationTest` |
| **Club Profile, Categories & Public Directory** | `ClubCategoryTagIntegrationTest`, `ClubProfileUpdateIntegrationTest`, `PublicClubControllerIntegrationTest`, `PublicClubDetailsE2ETest`, `PublicClubErrorHandlingIntegrationTest` |
| **Committee RBAC & Concurrency** | `CommitteeMethodSecurityIntegrationTest`, `CommitteeRevocationConcurrencyIntegrationTest` |
| **Recruitment Rounds & Screening Questions** | `RecruitmentRoundServiceIntegrationTest`, `RecruitmentRoundReadIntegrationTest`, `RecruitmentRoundApplicantRestrictionIntegrationTest`, `ApplicationQuestionManagementQATest`, `ApplicationQuestionSecurityIntegrationTest`, `ApplicationQuestionIntegrityIntegrationTest` |
| **Online Application Submission (`US-03`)** | `ApplicationServiceIntegrationTest`, `ApplicationSubmissionHttpIntegrationTest` |
| **API Security, Problem Details & SPA Routing** | `ApiProblemDetailsIntegrationTest`, `ApiSecurityProblemIntegrationTest`, `RouteSecurityIntegrationTest`, `SpaRoutingIntegrationTest`, `HealthEndpointIntegrationTest` |

---

## 3. การตรวจสอบตามเกณฑ์ตรวจรับ (Acceptance Criteria Verification)

| เกณฑ์ตรวจรับ (Acceptance Criteria) | วิธีการตรวจสอบ | ผลลัพธ์ |
|---|---|---|
| **AC 1: Pipeline เริ่มรัน PostgreSQL และรัน Flyway Migration ได้สำเร็จอัตโนมัติ** | ตรวจสอบขั้นตอน `Verify PostgreSQL service container readiness`, การรัน Flyway (`V1`, `V2`, `V3`) และการรัน `sprint2_seed.sql` (2-pass) + `verify_sprint2_seed.sql` | **PASS** |
| **AC 2: Integration Tests รันผ่านครบ 100% บน GitHub Actions** | ตรวจสอบผลลัพธ์ของขั้น `Run System Integration Test Suite & Flyway Migrations` (`Failures: 0`, `Errors: 0`) | **PASS** |
| **AC 3: มีสรุปผลการทดสอบ (Test Report Summary) แสดงให้เห็นบน GitHub Actions** | ตรวจสอบตารางสรุปในหน้า GitHub Actions Step Summary (`$GITHUB_STEP_SUMMARY`) และไฟล์ Artifact `system-integration-test-report` | **PASS** |
