# รายงานผลการทดสอบการจัดการคำถามคัดเลือกของรอบรับสมัคร (Application Question Management Test Report)

- **รหัสงาน (Task ID):** `Task29:U08-QA-1`
- **User Story:** `US-08 (จัดการคำถามคัดเลือกของรอบรับสมัคร - Application Question Management)`
- **Success Criteria:** `SC-03 (การจัดการรับสมัครของกรรมการ)` และ `SC-06 (การควบคุมสิทธิ์และเงื่อนไขการสมัคร)`
- **เอกสารข้อกำหนด (User Story Specification):** [`docs/stories/US-08.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/stories/US-08.md)
- **ชุดทดสอบอัตโนมัติหลัก (Primary QA Test Suite):** [`backend/src/test/java/com/tu/clubhub/recruitment/controller/ApplicationQuestionManagementQATest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/recruitment/controller/ApplicationQuestionManagementQATest.java)
- **ชุดทดสอบบูรณาการสนับสนุน (Supporting Backend Test Suites):**
  - [`backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityIntegrationTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityIntegrationTest.java)
  - [`backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityTest.java)
  - [`backend/src/test/java/com/tu/clubhub/recruitment/controller/ApplicationQuestionSecurityIntegrationTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/recruitment/controller/ApplicationQuestionSecurityIntegrationTest.java)
  - [`backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionServiceTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionServiceTest.java)
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **Sprint:** Sprint 1
- **วันที่ทดสอบ:** 20 ตุลาคม พ.ศ. 2569
- **สถานะการทดสอบ:** **PASSED (100%)** ✅

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Objectives)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกผลการทดสอบระดับระบบและบูรณาการครบวงจร (Automated Integration / E2E Testing) สำหรับงาน **`Task29:U08-QA-1`** ภายใต้ User Story **`US-08: จัดการคำถามคัดเลือกของรอบรับสมัคร (Application Question Management)`** โดยอ้างอิงเกณฑ์การตรวจรับ `AC-01` ถึง `AC-05` กฎเกณฑ์ทางธุรกิจ `BR-01` ถึง `BR-07` และกรณีทดสอบตามที่กำหนดไว้ใน [`docs/stories/US-08.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/stories/US-08.md)

วัตถุประสงค์หลักของการทดสอบ:
1. **Question Lifecycle CRUD:** ยืนยันว่ากรรมการชมรมสามารถเพิ่ม แก้ไข ลบ และเรียกดูชุดคำถามคัดเลือกแบบข้อความในรอบรับสมัครสถานะฉบับร่าง (`DRAFT`) ของชมรมตนเองได้อย่างถูกต้อง (`AC-01`, `BR-01`)
2. **Data Validation & Required Flag:** ยืนยันว่าระบบปฏิเสธคำถามที่มีข้อความว่างเปล่า (`""`) หรือมีแต่ช่องว่าง (`"   "`) และรองรับการกำหนดสถานะบังคับตอบ (`isRequired: true/false`) ได้อย่างถูกต้องตามข้อกำหนด (`AC-02`, `BR-02`, `BR-03`)
3. **Display Order & Reordering:** ยืนยันว่าการจัดเรียงลำดับคำถาม (`PUT /order`) สามารถสลับตำแหน่งคำถามได้โดยคง ID เดิม และเมื่อมีการลบคำถามข้อกลาง ลำดับที่เหลือจะถูกจัดเรียงต่อเนื่อง (Compacted) โดยอัตโนมัติ (`AC-03`, `BR-04`)
4. **Invalid Order Rejection & Rollback:** ยืนยันว่าชุดคำขอจัดเรียงลำดับที่มี ID ซ้ำ ไม่ครบ ข้ามรอบ หรือผิดรูปแบบ จะถูกปฏิเสธด้วย HTTP 400 Bad Request และข้อมูลเดิมไม่ถูกเปลี่ยนแปลง (`AC-03`, `BR-07`)
5. **Data Integrity & Cascade Protection:** ยืนยันว่าเมื่อรอบรับสมัครมีใบสมัครอ้างอิงอยู่แล้ว (`hasApplications == true`) ระบบจะล็อกไม่ให้เพิ่ม แก้ไข ลบ หรือจัดเรียงคำถามเด็ดขาด (HTTP 409 Conflict) เพื่อป้องกันข้อมูลใบสมัครและคำตอบเดิมเสียหาย (`AC-04`, `BR-05`, นโยบายความปลอดภัย)
6. **Cross-Round & Cross-Club Isolation:** ยืนยันว่าการแก้ไขหรืออ้างอิงคำถามข้ามรอบหรือข้ามชมรมจะถูกปฏิเสธด้วย HTTP 404 Not Found หรือ 400 Bad Request ไม่มีการกระทบข้อมูลข้ามบริบท (`AC-05`, `BR-06`)
7. **Security & Authorization:** ยืนยันการป้องกันสิทธิ์ตามมาตรฐานระบบ ทั้งการปฏิเสธผู้ใช้ที่ไม่ได้ Login (401), ปฏิเสธคำขอที่ไม่มี CSRF Token (403), ปฏิเสธผู้ใช้ทั่วไปหรือกรรมการต่างชมรม (403), และป้องกันผลประโยชน์ทับซ้อนกรณีที่กรรมการยื่นใบสมัครในรอบนั้นเอง (403) (`BR-01`)

---

## 2. ขอบเขตและสถาปัตยกรรมชุดทดสอบ (Test Scope & Architecture)

การทดสอบในรอบ QA นี้ครอบคลุมการตรวจสอบทุกเลเยอร์ของระบบ:
1. **HTTP Controller & Security Filter Chain (`ApplicationQuestionManagementQATest.java`):**
   - รันบนสภาพแวดล้อม `@SpringBootTest` ร่วมกับ `@AutoConfigureMockMvc`
   - ตรวจสอบผ่าน Spring Security Filter Chain เสมือนจริง ครอบคลุม Authentication, Session Context, CSRF Protection (`X-CSRF-TOKEN`), และ RFC 7807 Problem Details
2. **Database Integrity & Transactional Rollback (`ApplicationQuestionIntegrityIntegrationTest.java`):**
   - รันบน PostgreSQL จำลองโครงสร้างจริงพร้อม Flyway Migrations
   - ตรวจสอบการคงสภาพของข้อมูลในตาราง `recruitment_rounds`, `application_questions`, `applications`, `application_answers`, และ `application_status_history`
3. **Service Business Logic & Exception Translation (`ApplicationQuestionIntegrityTest.java` & `ApplicationQuestionService.java`):**
   - ตรวจสอบการแปลงข้อยกเว้นจาก Spring Repository (`InvalidDataAccessApiUsageException`) เป็น HTTP 400/409 ตามมาตรฐาน

---

## 3. เมทริกซ์ความครอบคลุมและผลการทดสอบ (Test Traceability Matrix)

| รหัสทดสอบ | ข้อย่อย | รายละเอียดกรณีทดสอบ (Test Scenario) | เงื่อนไข / ข้อมูลนำเข้า | ผลลัพธ์ที่คาดหวัง | สถานะ HTTP / Response | ผลลัพธ์จริง | ผลการตรวจ |
|:---:|:---:|---|---|---|:---:|:---:|:---:|
| **TC-08-01** | 1A | กรรมการชมรมเพิ่มคำถามข้อความใหม่ | POST `/api/v1/rounds/10/questions` พร้อม Header CSRF และ Body | บันทึกสำเร็จ คืนค่า Location header และ JSON ข้อมูลคำถาม | `201 Created` | `201 Created`, Location header ถูกต้อง | **PASS** ✅ |
| **TC-08-01** | 1B | กรรมการชมรมแก้ไขข้อความคำถามและ Required | PUT `/api/v1/rounds/10/questions/41` พร้อม Body ใหม่ | บันทึกสำเร็จ คืนค่าข้อมูลคำถามที่อัปเดต | `200 OK` | `200 OK`, ข้อมูลอัปเดตถูกต้อง | **PASS** ✅ |
| **TC-08-01** | 1C | กรรมการชมรมลบคำถามที่ไม่มีคำตอบอ้างอิง | DELETE `/api/v1/rounds/10/questions/41` พร้อม Header CSRF | ลบคำถามสำเร็จ ไม่ส่งเนื้อหากลับ | `204 No Content` | `204 No Content`, Body ว่าง | **PASS** ✅ |
| **TC-08-01** | 1D | กรรมการชมรมเรียกดูรายการคำถามทั้งหมดในรอบ | GET `/api/v1/rounds/10/questions` | ได้รับรายการคำถามเรียงตามลำดับ displayOrder | `200 OK` | `200 OK`, รายการครบถ้วน | **PASS** ✅ |
| **TC-08-02** | 2A | ข้อความคำถามเป็นค่าว่างหรือมีแต่ช่องว่าง | POST ข้อความ `""` หรือ `"   "` | ปฏิเสธคำขอ แจ้งเตือนข้อความไม่ถูกต้อง | `400 Bad Request` | `400 Bad Request`, Validation ปฏิเสธ | **PASS** ✅ |
| **TC-08-02** | 2B | คำขอไม่ระบุฟิลด์ `isRequired` (`null`) | POST Body ไม่มีฟิลด์ `isRequired` | ปฏิเสธคำขอ แจ้งเตือนฟิลด์จำเป็น | `400 Bad Request` | `400 Bad Request`, Validation ปฏิเสธ | **PASS** ✅ |
| **TC-08-02** | 2C | รหัสรอบรับสมัคร หรือรหัสคำถามติดลบ | GET `/rounds/-1/questions` หรือ DELETE `/rounds/10/questions/-99` | ปฏิเสธรหัสที่ไม่เป็นจำนวนเต็มบวก | `400 Bad Request` | `400 Bad Request` | **PASS** ✅ |
| **TC-08-02** | 2D | ส่ง JSON ผิดรูปแบบ (Malformed JSON) | POST Body เป็น String `{ invalid json` | ปฏิเสธรูปแบบ JSON ไม่ถูกต้อง | `400 Bad Request` | `400 Bad Request` | **PASS** ✅ |
| **TC-08-03** | 3A | จัดเรียงลำดับคำถามใหม่สำเร็จ | PUT `/rounds/10/questions/order` ด้วย `["43", "41", "42"]` | ส่งคืนรายการคำถามตามลำดับใหม่ และคง ID เดิม | `200 OK` | `200 OK`, ลำดับเปลี่ยนถูกต้อง | **PASS** ✅ |
| **TC-08-04** | 4A | ส่งรายการ questionIds ซ้ำกัน หรือไม่ครบถ้วน | PUT `/rounds/10/questions/order` ด้วย `["41", "41"]` | ปฏิเสธคำขอ แจ้งเตือนต้องระบุทุกคำถามข้อละครั้งเดียว | `400 Bad Request` | `400 Bad Request` | **PASS** ✅ |
| **TC-08-04** | 4B | ส่งรายการ questionIds ที่มี ID ผิดรูปแบบ | PUT `/rounds/10/questions/order` ด้วย `["abc"]` หรือ `["-1"]` | ปฏิเสธค่าที่ไม่ใช่ตัวเลขบวก | `400 Bad Request` | `400 Bad Request` | **PASS** ✅ |
| **TC-08-05** | 5A | พยายามสร้างคำถามในรอบที่มีใบสมัครแล้ว | POST `/rounds/10/questions` ขณะที่รอบมีใบสมัคร | ปฏิเสธการแก้ไขคำถามเพื่อรักษาข้อมูลใบสมัคร | `409 Conflict` | `409 Conflict`, ล็อกข้อมูลสำเร็จ | **PASS** ✅ |
| **TC-08-05** | 5B | พยายามแก้ไขคำถามในรอบที่มีใบสมัครแล้ว | PUT `/rounds/10/questions/41` ขณะที่รอบมีใบสมัคร | ปฏิเสธการแก้ไขคำถาม | `409 Conflict` | `409 Conflict`, ล็อกข้อมูลสำเร็จ | **PASS** ✅ |
| **TC-08-05** | 5C | พยายามลบคำถามในรอบที่มีใบสมัครแล้ว | DELETE `/rounds/10/questions/41` ขณะที่รอบมีใบสมัคร | ปฏิเสธการลบคำถาม | `409 Conflict` | `409 Conflict`, ล็อกข้อมูลสำเร็จ | **PASS** ✅ |
| **TC-08-05** | 5D | พยายามจัดเรียงลำดับในรอบที่มีใบสมัครแล้ว | PUT `/rounds/10/questions/order` ขณะที่รอบมีใบสมัคร | ปฏิเสธการจัดเรียงลำดับคำถาม | `409 Conflict` | `409 Conflict`, ล็อกข้อมูลสำเร็จ | **PASS** ✅ |
| **TC-08-06** | 6A | ส่ง ID คำถามของรอบอื่นมาแก้ไขในรอบนี้ | PUT `/rounds/10/questions/999` (ID ของรอบอื่น) | ไม่พบคำถามในรอบนี้ ตอบ 404 | `404 Not Found` | `404 Not Found`, ไม่กระทบรอบอื่น | **PASS** ✅ |
| **TC-08-07** | 7A | ผู้ใช้ไม่ได้ Login (Anonymous) เข้าถึง Endpoint | GET `/rounds/10/questions` โดยไม่มีการยืนยันตัวตน | ปฏิเสธการเข้าถึง แจ้งเตือนต้อง Login | `401 Unauthorized` | `401 Unauthorized` | **PASS** ✅ |
| **TC-08-07** | 7B | ส่งคำขอแก้ไขข้อมูลโดยไม่มี CSRF Token | POST หรือ DELETE โดยไม่มี Header `X-CSRF-TOKEN` | ปฏิเสธคำขอด้วยมาตรการป้องกัน CSRF | `403 Forbidden` | `403 Forbidden` (`CSRF_INVALID`) | **PASS** ✅ |
| **TC-08-07** | 7C | ผู้ใช้ทั่วไปที่ไม่ใช่กรรมการชมรมเป้าหมาย | GET `/rounds/10/questions` ด้วยสิทธิ์นักศึกษาทั่วไป | ปฏิเสธการเข้าถึงเนื่องจากไม่มีสิทธิ์กรรมการ | `403 Forbidden` | `403 Forbidden` (`ACCESS_DENIED`) | **PASS** ✅ |
| **TC-08-07** | 7D | กรรมการที่ยื่นใบสมัครในรอบนั้นเอง (Self-Application) | GET `/rounds/10/questions` โดยกรรมการที่เป็นผู้สมัคร | ปฏิเสธเพื่อป้องกัน Conflict of Interest | `403 Forbidden` | `403 Forbidden` (`ACCESS_DENIED`) | **PASS** ✅ |
| **TC-08-07** | 7E | รอบรับสมัครที่ปิดตัวแล้ว หรือไม่ใช่สถานะ DRAFT | POST `/rounds/10/questions` ในรอบที่ไม่อยู่ในสถานะแก้ไขได้ | ปฏิเสธการแก้ไขคำถามในรอบที่ไม่ใช่ DRAFT | `409 Conflict` | `409 Conflict` | **PASS** ✅ |

---

## 4. บันทึกผลการรันชุดทดสอบอัตโนมัติ (Automated Test Execution Log)

```text
-------------------------------------------------------------------------------
Test set: com.tu.clubhub.recruitment.controller.ApplicationQuestionManagementQATest
-------------------------------------------------------------------------------
[INFO] Running TC-08-01: เพิ่ม แก้ไข ลบ และเรียกดูคำถามข้อความในรอบที่แก้ไขได้ (AC-01, BR-01)
- committeeCanCreateQuestion: SUCCESS (0.771 s)
- committeeCanUpdateQuestion: SUCCESS
- committeeCanDeleteQuestion: SUCCESS
- committeeCanListQuestions: SUCCESS
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.771 s

[INFO] Running TC-08-02: ตรวจสอบความถูกต้องของข้อมูล (Validation & Constraints) (AC-02, BR-02, BR-03)
- blankQuestionTextIsRejected: SUCCESS (0.165 s)
- nullIsRequiredIsRejected: SUCCESS
- negativeOrZeroIdsAreRejected: SUCCESS
- malformedJsonIsRejected: SUCCESS
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.165 s

[INFO] Running TC-08-03: การจัดเรียงลำดับคำถามและการคง ID เดิม (AC-03, BR-04)
- committeeCanReorderQuestions: SUCCESS (0.045 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.045 s

[INFO] Running TC-08-04: ปฏิเสธชุดลำดับที่ผิดพลาด (AC-03, BR-07)
- invalidQuestionIdsListIsRejected: SUCCESS (0.046 s)
- malformedQuestionIdInListIsRejected: SUCCESS
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.046 s

[INFO] Running TC-08-05: ป้องกันการแก้ไข ลบ หรือจัดเรียงเมื่อมีใบสมัครแล้ว (AC-04, BR-05, Policy)
- cannotCreateQuestionWhenRoundHasApplications: SUCCESS (0.063 s)
- cannotUpdateQuestionWhenRoundHasApplications: SUCCESS
- cannotDeleteQuestionWhenRoundHasApplications: SUCCESS
- cannotReorderQuestionsWhenRoundHasApplications: SUCCESS
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.063 s

[INFO] Running TC-08-06: การแยกแยะขอบเขตข้อมูลข้ามรอบ (AC-05, BR-06)
- foreignQuestionIdReturns404: SUCCESS (0.038 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.038 s

[INFO] Running TC-08-07: การควบคุมสิทธิ์และความปลอดภัย (BR-01, Pre-conditions)
- unauthenticatedUserCannotAccess: SUCCESS (0.071 s)
- missingCsrfTokenIsRejected: SUCCESS
- nonCommitteeCannotAccessQuestions: SUCCESS
- committeeApplicantCannotManageQuestions: SUCCESS
- nonDraftRoundCannotEditQuestions: SUCCESS
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.071 s

[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  13.714 s
[INFO] ------------------------------------------------------------------------
```

---

## 5. การประเมินความมั่นคงปลอดภัยและการปกป้องข้อมูล (Security & Data Integrity Assessment)

1. **การป้องกัน Race Condition & Data Clash ในการ Reorder:**
   - ฐานข้อมูล PostgreSQL มีข้อกำหนด `UNIQUE(round_id, display_order)` เพื่อป้องกันคำถามชนกัน ระบบใช้เทคนิค Two-pass Update ผ่านค่าชั่วคราวที่เป็นจำนวนบวก ทำให้การสลับตำแหน่งเกิดขึ้นได้อย่างราบรื่นและปลอดภัย
2. **Data Immutability เมื่อมีใบสมัครอ้างอิง:**
   - ยืนยันว่าการล็อกชุดคำถามเมื่อมีใบสมัครในรอบแล้ว (`requireEditable`) ป้องกันการเปลี่ยนแปลงข้อความคำถาม ลำดับคำถาม หรือการลบคำถาม ทำให้ข้อมูลใบสมัคร คำตอบ และประวัติการคัดเลือกของผู้สมัครไม่มีความคลาดเคลื่อนหรือสูญหาย
3. **Strict Self-Review Prohibition:**
   - การตรวจสอบ `hasApplicationByApplicant` สกัดกั้นไม่ให้กรรมการชมรมที่ยื่นใบสมัครในรอบรับสมัครของตนเองสามารถเข้ามาดูหรือแก้ไขคำถามคัดเลือกได้ ป้องกันปัญหาความได้เปรียบเสียเปรียบในการแข่งขันอย่างสมบูรณ์

---

## 6. สรุปผลการทดสอบและการตรวจรับ (Conclusion & QA Sign-off)

- **อัตราการผ่านการทดสอบ (Pass Rate):** **100% (21/21 Test Scenarios Passed)**
- **ความสอดคล้องกับ Acceptance Criteria:** ครอบคลุมครบถ้วนตั้งแต่ `AC-01` ถึง `AC-05`
- **ความมั่นคงปลอดภัย (Security & Integrity):** ผ่านเกณฑ์การตรวจรับด้านความปลอดภัย สิทธิ์กรรมการ การป้องกัน CSRF และการล็อกข้อมูลเมื่อมีใบสมัคร
- **ผลการตรวจรับ:** **APPROVED ✅ ผ่านเกณฑ์การตรวจรับสำหรับ Task29:U08-QA-1 พร้อมส่งมอบเข้าสู่ Main**

ลงชื่อ: **สิรวิชญ์ กฤดาธิการวุฒิ**  
(QA / Tester & DevOps / Scrum Master)
