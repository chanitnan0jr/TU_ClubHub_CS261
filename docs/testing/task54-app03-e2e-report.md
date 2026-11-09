# Task54 [APP-03]: End-to-End Application Submission Test Report

| รายการ | รายละเอียด |
|---|---|
| **Task ID / Feature** | `Task54` (`APP-03` — US-03 Online Application Submission E2E QA) |
| **วันที่ตรวจรับ** | 2026-11-09 |
| **ผู้รับผิดชอบ (Owner / Reviewer)** | สิรวิชญ์ กฤดาธิการวุฒิ (QA Lead) & ณัฐชนินทร์ (Boom) |
| **Dependencies** | [`Task52`](../tasks/sprint2/Task52.md) (Backend API) และ [`Task53`](../tasks/sprint2/Task53.md) (Frontend Form & Validation) |
| **สภาพแวดล้อมทดสอบ** | Java 21.0.11, PostgreSQL 17.11 (`tu_clubhub_test`), Node.js / React 19 (`tsx --test`) |

---

## 1. สรุปผลการรันชุดทดสอบ (Test Execution Summary)

| ชั้นการทดสอบ (Layer) | ชุดทดสอบ (Test Suite) | จำนวน Test Cases | ผลลัพธ์ |
|---|---|---:|---|
| **Frontend UI & Flow (`Task53`)** | [`frontend/tests/applicationFormComponent.test.ts`](../../frontend/tests/applicationFormComponent.test.ts) | 7 | **7 PASS / 0 FAIL** |
| **Frontend Validation & Payload** | [`frontend/tests/applicationValidation.test.ts`](../../frontend/tests/applicationValidation.test.ts) | 5 | **5 PASS / 0 FAIL** |
| **Frontend API Client & CSRF** | [`frontend/tests/applicationService.test.ts`](../../frontend/tests/applicationService.test.ts) | 2 | **2 PASS / 0 FAIL** |
| **Backend Request & URL Validator** | [`ApplicationSubmissionValidatorTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionValidatorTest.java) | 39 | **39 PASS / 0 FAIL** |
| **Backend Service & DB Transaction** | [`ApplicationServiceIntegrationTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationServiceIntegrationTest.java) | 53 | **53 PASS / 0 FAIL** |
| **Backend HTTP, Concurrency & Rollback (`Task52`)** | [`ApplicationSubmissionHttpIntegrationTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java) | 102 | **102 PASS / 0 FAIL** |
| **รวมทั้งหมด** | **6 ชุดทดสอบ (Frontend → HTTP/CSRF → Service → PostgreSQL)** | **208** | **208 PASS (100%)** |

---

## 2. ตารางตรวจรับตามขอบเขตงาน (E2E & Edge Case Test Matrix)

| รหัส | กรณีทดสอบ (Test Case) | ขั้นตอนและจุดตรวจสอบ (Frontend → API → Database) | หลักฐานการทดสอบ | สถานะ |
|---|---|---|---|---|
| **TC-54-01** | **Happy Path E2E Submission** | โหลดฟอร์ม `GET /api/v1/rounds/{roundId}/application-form` → กรอก `motivation`, คำตอบคำถามบังคับ, แนบลิงก์ `https://` → กดตรวจสอบ (Step 2) → ติ๊กยืนยันและกดส่ง `POST /api/v1/rounds/{roundId}/applications` (และ `/api/v1/clubs/{id}/applications`) พร้อม `X-CSRF-TOKEN` → ได้รับ `201 Created` (`status: "SUBMITTED"`) และเปลี่ยนหน้าไป `/clubs/:clubId/rounds/:roundId/apply/result` | `applicationFormComponent.test.ts`, `ApplicationSubmissionHttpIntegrationTest#clubSubmissionSelectsRequestedRoundAtOpeningWhenSeveralRoundsAreOpen` | **PASS** |
| **TC-54-02** | **Round Closed While Filling Form (`ROUND_CLOSED`)** | ผู้สมัครเปิดฟอร์มค้างไว้จนรอบรับสมัครหมดเวลาหรือถูกกรรมการสั่งปิด → เมื่อกดยืนยันส่งใบสมัคร Backend ตอบ `409 Conflict` (`reason: "ROUND_CLOSED"`) → หน้าเว็บแสดงกล่องแจ้งเตือน `"รอบรับสมัครนี้ปิดรับใบสมัครแล้ว"` โดยไม่เปลี่ยนหน้าไปหน้าสำเร็จ และไม่มีแถวถูกสร้างในฐานข้อมูล | `applicationFormComponent.test.ts` (`round closing while filling the form...`), `ApplicationSubmissionHttpIntegrationTest#waitingHttpRequestRechecksClosingTimeAfterRoundLock` | **PASS** |
| **TC-54-03** | **Special Characters & Trimmed HTTPS Links** | กรอกอักขระพิเศษภาษาไทย, อีโมจิ, เครื่องหมายคำพูด และสตริงคล้าย HTML/SQL (`<script>alert("xss")</script> & ' "-- 🚀`) พร้อมเว้นวรรคหน้า-หลังลิงก์ `https://` → ระบบตัดช่องว่างขอบนอก ส่งข้อมูลครบถ้วน บันทึกลง PostgreSQL โดยใช้ Parameterized SQL และแสดงผลบน React โดยไม่เกิด XSS | `applicationFormComponent.test.ts` (`special characters submit intact...`), `ApplicationServiceIntegrationTest` | **PASS** |
| **TC-54-04** | **Concurrent & Duplicate Submissions (`APPLICATION_ALREADY_EXISTS`)** | ปุ่มส่งใบสมัครถูกล็อก (`disabled` + `"กำลังส่งใบสมัคร..."`) ระหว่างรอผล และหากยิงคำขอพร้อมกันหลาย Thread/Session (`2` และ `5` คำขอพร้อมกัน) ระบบล็อกและ Commit สำเร็จเพียง `1` รายการ (`201 Created`) ส่วนที่เหลือได้ `409 APPLICATION_ALREADY_EXISTS` พร้อมแจ้งเตือน `"คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว"` | `applicationFormComponent.test.ts`, `ApplicationSubmissionHttpIntegrationTest#sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce` | **PASS** |
| **TC-54-05** | **Mid-Transaction Failure & Atomic Rollback** | จำลองความล้มเหลวระดับฐานข้อมูลขณะบันทึกคำตอบหรือประวัติสถานะ → Transaction ทั้งก้อนถูก Rollback 100% ไม่ทิ้งข้อมูลค้างในตารางใดๆ และผู้สมัครกดส่งซ้ำใหม่ได้สำเร็จ | `ApplicationSubmissionHttpIntegrationTest#injectedWriteFailureRollsBackAndSameStudentCanRetry` | **PASS** |

---

## 3. การตรวจสอบความถูกต้องของฐานข้อมูล (Database Audit)

ตรวจสอบผ่าน `assertComplete` และ `assertNoOrphans` ใน [`ApplicationSubmissionHttpIntegrationTest.java`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java) บน PostgreSQL 17.11:

1. **`applications`**: บันทึก `applicant_id` (จาก Session เท่านั้น ไม่รับจาก Client body), `club_id`, `round_id`, `motivation`, `status = 'SUBMITTED'`, `version = 0`, และ `submitted_at` ตรงตามเวลาธุรกรรม พร้อม Unique Constraint `(round_id, applicant_id)` ป้องกันใบสมัครซ้ำ
2. **`application_answers`**: บันทึกคำตอบครบทุกข้อที่กรอก ผูก `application_id` และ `question_id` ของรอบนั้นอย่างถูกต้อง ไม่สร้างแถวว่างสำหรับคำถามไม่บังคับที่ไม่ได้ตอบ
3. **`application_links`**: บันทึก `label`, `url` (เฉพาะ `https://` ที่ตัดช่องว่างแล้ว) และลำดับ `display_order` ครบถ้วน (สูงสุด 5 รายการ)
4. **`application_status_history`**: บันทึกประวัติเริ่มต้น 1 แถวต่อใบสมัคร โดย `from_status IS NULL`, `to_status = 'SUBMITTED'`, `actor_id = applicant_id`, และ `changed_at = submitted_at`

---

## 4. สรุปผลการตรวจรับตามเกณฑ์ (Acceptance Criteria)

- [x] **AC 1:** ทดสอบ Flow การสมัครตั้งแต่หน้าเว็บจนถึงฐานข้อมูลผ่าน 100% ข้อมูลบันทึกถูกต้องตรงกัน
- [x] **AC 2:** เมื่อรอบรับสมัครปิดระหว่างกรอก ระบบแจ้งเตือนชัดเจน (`"รอบรับสมัครนี้ปิดรับใบสมัครแล้ว"`) และไม่สร้างใบสมัครผิดเงื่อนไข
- [x] **AC 3:** ผลการทดสอบทุก Test Cases (208/208) ผ่านการตรวจรับและไม่มี Defect ตกค้าง

