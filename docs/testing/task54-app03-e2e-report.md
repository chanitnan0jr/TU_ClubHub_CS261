# Task54 [APP-03]: End-to-End Application Submission Test Report

| รายการ | รายละเอียด |
|---|---|
| **Task ID / Feature** | `Task54` (`APP-03` — US-03 Online Application Submission E2E QA) |
| **วันที่ตรวจรับ** | 2026-11-11 |
| **ผู้รับผิดชอบ (Owner / Reviewer)** | สิรวิชญ์ กฤดาธิการวุฒิ (QA Lead) & ณัฐชนินทร์ (Boom) |
| **Dependencies** | [`Task52`](../tasks/sprint2/Task52.md) (Backend API) และ [`Task53`](../tasks/sprint2/Task53.md) (Frontend Form & Validation — PR #68) |
| **สภาพแวดล้อมทดสอบ** | Java 21.0.11, PostgreSQL 17.11 (`tu_clubhub_test` แยกจากฐานข้อมูลใช้งานจริง), Node.js / React 19 (`tsx --test`) |

---

## 1. สรุปผลการรันชุดทดสอบ (แยกตามประเภทสภาพแวดล้อม)

รายงานนี้แยกผลการทดสอบออกเป็น **3 ระดับ** เพื่อความชัดเจนระหว่างการเชื่อมต่อจริงกับฐานข้อมูลทดสอบ (`tu_clubhub_test`), ชุดทดสอบ Backend `MockMvc` + PostgreSQL, และชุดทดสอบ Frontend ที่ใช้ `stubFetch`:

| ระดับการทดสอบ | ชุดทดสอบ / สคริปต์ใน Repository | ประเภทสภาพแวดล้อม | จำนวน Test Cases | ผลลัพธ์ |
|---|---|---|---:|---|
| **1. Live Full-Stack E2E (UI → HTTP API → PostgreSQL)** | [`frontend/scripts/verify-task54-e2e.ts`](../../frontend/scripts/verify-task54-e2e.ts) | React UI (`DynamicApplicationForm`, `ApplicationResultRoutePage`, `MyApplicationsPage`) ยิง HTTP จริงพร้อม Session Cookie + CSRF ไปยัง Spring Boot (`:18080`) และ PostgreSQL 17.11 (`tu_clubhub_test`) | 1 (3 E2E Scenarios) | **1 PASS / 0 FAIL** |
| **2. Backend HTTP, Service & PostgreSQL Integration** | [`ApplicationSubmissionValidatorTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionValidatorTest.java)<br>[`ApplicationServiceIntegrationTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationServiceIntegrationTest.java)<br>[`ApplicationSubmissionHttpIntegrationTest`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java) | Unit Validator (`39`) + Spring `MockMvc` / Transactional Service เชื่อมต่อ PostgreSQL 17.11 จริง (`53 + 102 = 155`) | 194 (`39 + 53 + 102`) | **194 PASS / 0 FAIL** |
| **3. Frontend Component & Unit Tests (`stubFetch`)** | [`frontend/tests/applicationFormComponent.test.ts`](../../frontend/tests/applicationFormComponent.test.ts) (`8`)<br>[`frontend/tests/applicationValidation.test.ts`](../../frontend/tests/applicationValidation.test.ts) (`3`)<br>[`frontend/tests/applicationService.test.ts`](../../frontend/tests/applicationService.test.ts) (`2`) | JSDOM + Mocked HTTP (`stubFetch`) สำหรับตรวจ UI state, validation และ payload (`npm test` ทั้งโปรเจกต์: `149/149 PASS`) | 13 (`8 + 3 + 2`) | **13 PASS / 0 FAIL** |
| **รวมชุดทดสอบอัตโนมัติของฟีเจอร์ US-03** | **Live E2E (`1`) + Backend (`194`) + Frontend (`13`)** | - | **208 (`1 + 194 + 13`)** | **208 PASS (100%)** |

---

## 2. การตรวจรับ End-to-End จริง (Live UI → HTTP API → PostgreSQL)

สคริปต์ [`frontend/scripts/verify-task54-e2e.ts`](../../frontend/scripts/verify-task54-e2e.ts) สร้างรอบรับสมัครทดสอบใหม่ภายใต้ชมรมที่ 3 (`ชมรมเขียนโปรแกรม`) ทุกครั้งที่รันด้วยบัญชีกรรมการ `student-demo` จึงทำซ้ำได้โดยไม่ผูกกับ ID คงที่ และทดสอบด้วยบัญชีผู้สมัคร `applicant-demo` ครบ 3 สถานการณ์หลัก:

| รหัส | กรณีทดสอบ (Scenario) | ขั้นตอนและผลลัพธ์ที่ตรวจกับ API & PostgreSQL จริง | หลักฐานใน Repository | สถานะ |
|---|---|---|---|---|
| **E2E-54-01** | **Happy Path Submission + Special Characters + History Verification** | `applicant-demo` เปิดฟอร์มจริง → กรอก `motivation` และคำตอบที่มีอักขระพิเศษ (`<script>alert("xss")</script> & ' "-- 🚀`) พร้อมแนบลิงก์ที่มีช่องว่างนำหน้า/ต่อท้าย → กดยืนยันส่งจริง (`POST /api/v1/rounds/{roundId}/applications` พร้อม `X-CSRF-TOKEN` และ `SESSION` cookie) → ได้รับ `201 Created` (`status: "SUBMITTED"`) → เปลี่ยนหน้าไป `/clubs/3/rounds/{roundId}/apply/result` แสดง `"เลขที่ใบสมัคร <id> · SUBMITTED"` → กดลิงก์ไป `/profile/applications` (`MyApplicationsPage`) พบสถานะ `"รอพิจารณา"` และเรียก `GET /api/v1/me/applications/{id}` ยืนยันข้อมูลใน PostgreSQL (`applications`, `application_answers`, `application_links`, `application_status_history`) ตรงครบถ้วน | `frontend/scripts/verify-task54-e2e.ts` (Scenario 1), `ApplicationSubmissionHttpIntegrationTest` | **PASS** |
| **E2E-54-02** | **Duplicate Submission (`201` → `409 APPLICATION_ALREADY_EXISTS`)** | หลังจากส่งใบสมัครสำเร็จ (`201`) ใน `E2E-54-01` แล้ว `applicant-demo` เปิดฟอร์มรอบเดิมซ้ำ กรอกและกดส่งอีกครั้ง → Backend จริงตอบ `409 Conflict` (`reason: "APPLICATION_ALREADY_EXISTS"`) → หน้าเว็บแสดงกล่องแจ้งเตือน `"คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว"` ค้างที่หน้า `/apply` และตรวจสอบผ่าน `/api/v1/me/applications` ยืนยันว่าใน PostgreSQL ยังมีใบสมัครของรอบนั้นเพียง `1` รายการ | `frontend/scripts/verify-task54-e2e.ts` (Scenario 2), `applicationFormComponent.test.ts` (`submitting again after a 201 submission...`) | **PASS** |
| **E2E-54-03** | **Round Closed While Filling Form (`409 ROUND_CLOSED`)** | `applicant-demo` เปิดฟอร์มรอบที่ยังเปิดอยู่ กรอกข้อมูลและกดไปหน้าตรวจสอบ (Step 2) → ระหว่างนั้นกรรมการ (`student-demo`) สั่งปิดรอบจริงผ่าน `PATCH /api/v1/clubs/3/rounds/{roundId}` (`action: "CLOSE"`) → เมื่อ `applicant-demo` กดส่งใบสมัคร Backend จริงตอบ `409 Conflict` (`reason: "ROUND_CLOSED"`) → หน้าเว็บแสดงแจ้งเตือน `"รอบรับสมัครนี้ปิดรับใบสมัครแล้ว"` และตรวจสอบยืนยันว่าไม่มีแถวใบสมัครถูกสร้างใน PostgreSQL (`0` รายการ) | `frontend/scripts/verify-task54-e2e.ts` (Scenario 3), `applicationFormComponent.test.ts` (`round closing while filling the form...`), `ApplicationSubmissionHttpIntegrationTest#waitingHttpRequestRechecksClosingTimeAfterRoundLock` | **PASS** |
| **E2E-54-04** | **Concurrent Submissions & Mid-Transaction Rollback** | ยิงคำขอส่งใบสมัครพร้อมกัน `2` และ `5` คำขอใน Session เดียวและคนละ Session บน PostgreSQL จริง → Commit สำเร็จเพียง `1` รายการ (`201`) ที่เหลือได้ `409 APPLICATION_ALREADY_EXISTS`; และเมื่อจำลอง Trigger Failure ระหว่างบันทึกคำตอบหรือประวัติสถานะ ระบบ Rollback ทั้งธุรกรรม 100% ไม่ทิ้งข้อมูลกำพร้า และกดส่งใหม่สำเร็จ | `ApplicationSubmissionHttpIntegrationTest#sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce`, `#injectedWriteFailureRollsBackAndSameStudentCanRetry` | **PASS** |

---

## 3. การตรวจสอบความถูกต้องของฐานข้อมูล (Database Audit)

ตรวจสอบผ่าน `verify-task54-e2e.ts` และ `assertComplete` / `assertNoOrphans` ใน [`ApplicationSubmissionHttpIntegrationTest.java`](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java) บน PostgreSQL 17.11:

1. **`applications`**: บันทึก `applicant_id` จาก Session ที่ล็อกอินเท่านั้น (ปฏิเสธ Client identity), `club_id`, `round_id`, `motivation`, `status = 'SUBMITTED'`, `version = 0`, และ `submitted_at` พร้อม Unique Constraint `(round_id, applicant_id)`
2. **`application_answers`**: บันทึกคำตอบผูกกับ `application_id` และ `question_id` ของรอบนั้นครบถ้วน และไม่สร้างแถวว่างสำหรับคำถามไม่บังคับที่ไม่ได้กรอก (`answerText: null` ในมุมมองอ่าน)
3. **`application_links`**: บันทึก `label`, `url` (เฉพาะ `https://` ที่ตัดช่องว่างขอบนอกแล้ว) และ `display_order` ถูกต้อง
4. **`application_status_history`**: บันทึกประวัติเริ่มต้น 1 แถวต่อใบสมัคร (`from_status IS NULL`, `to_status = 'SUBMITTED'`, `actor_id = applicant_id`, `changed_at = submitted_at`)

---

## 4. วิธีรันตรวจซ้ำด้วยตนเอง (Reproducibility Guide)

> **ข้อควรระวัง:** ใช้ฐานข้อมูลทดสอบแยก (`tu_clubhub_test`) เสมอ ห้ามชี้ไปที่ฐานข้อมูลใช้งานจริง (`tu_clubhub`)

### 4.1 เตรียมฐานข้อมูลแยก `tu_clubhub_test` และรัน Backend Integration Tests (194 เคส)
```sh
docker compose up -d db
docker exec tu-clubhub-db psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'tu_clubhub_test'" | grep -q 1 || \
  docker exec tu-clubhub-db psql -U postgres -d postgres -c "CREATE DATABASE tu_clubhub_test"

cd backend
export DB_PASSWORD=tu_clubhub_dev_secret
./mvnw -Dtest="ApplicationSubmissionValidatorTest,ApplicationServiceIntegrationTest,ApplicationSubmissionHttpIntegrationTest" test
```

### 4.2 รัน Frontend Unit & Component Tests (13 เคสเฉพาะ US-03 / 149 เคสทั้งโปรเจกต์)
```sh
cd frontend
npx tsx --test tests/applicationFormComponent.test.ts tests/applicationValidation.test.ts tests/applicationService.test.ts
npm test
```

### 4.3 รัน Live Full-Stack E2E Script (`verify-task54-e2e.ts`) กับ `tu_clubhub_test`
```sh
# 1. รัน Backend บนพอร์ต 18080 โดยชี้ไปที่ฐานข้อมูลแยก tu_clubhub_test
cd backend
export DB_PASSWORD=tu_clubhub_dev_secret
./mvnw package -DskipTests -q
java -jar target/clubhub-0.0.1-SNAPSHOT.jar \
  --server.port=18080 \
  --spring.profiles.active=dev \
  --tu.auth.mode=mock \
  --spring.datasource.url=jdbc:postgresql://localhost:5432/tu_clubhub_test \
  --spring.flyway.ignore-migration-patterns="*:missing" &
BACKEND_PID=$!

# 2. รันสคริปต์ตรวจรับ E2E จากฝั่ง Frontend
cd ../frontend
APP_URL=http://127.0.0.1:18080 npx tsx --test scripts/verify-task54-e2e.ts

# 3. ปิดเซิร์ฟเวอร์ทดสอบหลังรันเสร็จ
kill $BACKEND_PID
```

---

## 5. ข้อสังเกตและรายการติดตามนอกขอบเขต PR (Known Issues & Follow-ups)

จากการทดสอบ E2E เชิงลึก พบประเด็นในโค้ดเดิมนอกขอบเขตของ PR นี้ ซึ่งบันทึกไว้เพื่อให้ทีมติดตามแยกตามโมดูล:

1. **`BUG-01` (Frontend Unicode `maxLength`):** `<textarea>` ใน [`DynamicApplicationForm.tsx`](../../frontend/src/features/applications/components/DynamicApplicationForm.tsx) กำหนด native `maxLength` ซึ่งเบราว์เซอร์นับตาม UTF-16 code units (ทำให้ Emoji 2 units ถูกตัดที่ครึ่งหนึ่งของขีดจำกัด) ขณะที่ตัวนับและ Backend นับตาม Unicode code points — *ส่งต่อทีม FE พิจารณาปรับการจำกัดความยาวช่องกรอก*
2. **`BUG-02` (Concurrent Same-Account Login):** การ Login บัญชีเดียวกันพร้อมกันหลาย Session อาจเกิด `ObjectOptimisticLockingFailureException` ที่ `UserAccountService` — *ส่งต่อทีม Auth ติดตามแยกจาก US-03*
3. **`BUG-03` (Suspended Account Mid-Form Notice):** หากบัญชีถูกระงับหลังจากเปิดฟอร์มแล้วกดส่ง คำขอ `GET /api/v1/auth/csrf` ตามด้วย `POST` ทำให้ผู้ใช้ถูกพาไปหน้า Login พร้อมข้อความเซสชันหมดอายุแทนข้อความบัญชีถูกระงับ (แต่ระบบปฏิเสธการส่งและไม่สร้างใบสมัครอย่างปลอดภัย) — *ส่งต่อทีม FE/BE ตกลงลำดับการจัดการ CSRF/Session*
4. **`GAP-01` & `DEP-01`:** บัตรข้อมูลผู้สมัครแสดงตามข้อมูลที่ `/api/v1/auth/me` ส่งกลับมาในสัญญาปัจจุบัน และหน้าค้นหาชมรม (`GET /api/v1/public/clubs`) เป็นงานของ [`Task62`](../tasks/sprint2/Task62.md) ที่กำลังพัฒนาแยกกัน โดยผู้สมัครสามารถเข้าฟอร์มผ่านหน้า Open Calls (`/open-calls`) ได้ตามปกติ
