# รายงานผลการออกแบบและทดสอบระบบการยืนยันตัวตนและจัดการเซสชัน (Authentication & Session Management Test Report)

- **รหัสงาน (Task ID):** `Task03:U03-QA-1`
- **User Story:** `US-03 (Account & Access Management / Authentication & Session Lifecycle)`
- **Success Criteria:** `SC-06 (การควบคุมสิทธิ์และเงื่อนไขการสมัคร/เข้าใช้งาน)`
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **Sprint:** Sprint 1
- **วันที่ทดสอบ:** 17 ตุลาคม พ.ศ. 2569
- **สถานะการทดสอบ:** **PASSED (100%)** ✅

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Objectives)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกการออกแบบกรณีทดสอบ (Test Design), สเปกการทดสอบ (Test Specifications) และผลการรันชุดทดสอบอัตโนมัติ (Automated Test Execution Results) สำหรับงาน `Task03:U03` ในส่วนของระบบการยืนยันตัวตน (TU Authentication), การสร้างบัญชีผู้ใช้ภายในอัตโนมัติ (Account Provisioning), การรักษาความปลอดภัยด้วย Spring Session JDBC, การป้องกัน CSRF, การหมุนเวียน Session ID (Session Fixation Protection), การบังคับใช้อายุสูงสุดของเซสชัน (Absolute Session Timeout 8 ชั่วโมง) และการออกจากระบบ (Logout Lifecycle)

---

## 2. ขอบเขตการทดสอบ (Scope of Testing)

การทดสอบครอบคลุมทั้งในระดับ **Integration Testing** (จำลอง End-to-End API Call ผ่าน `MockMvc` เชื่อมโยงกับ Security Filter Chain, Session Repository และ Database) และ **Unit Testing** (ตรวจสอบการทำงานของ Security Filters และ Clocks) ประกอบด้วย Endpoints ดังนี้:

1. `GET /api/v1/auth/csrf` — ดึงหรือเริ่มต้น CSRF Token และ Anonymous Session
2. `POST /api/v1/auth/login` — ยืนยันตัวตนผ่าน TU Authentication, หมุนเวียน Session ID, บันทึก Local Account และส่งมอบ Fresh CSRF Token
3. `GET /api/v1/auth/me` — ตรวจสอบสถานะและข้อมูลของผู้ใช้งานปัจจุบันที่เข้าสู่ระบบ
4. `POST /api/v1/auth/logout` — ยกเลิกและทำลาย Session ในระบบ พร้อมเคลียร์ Security Context
5. `AbsoluteSessionTimeoutFilter` — กรองและตรวจจับเซสชันที่มีอายุเกิน 8 ชั่วโมง และบังคับ Invalidate ทันที

---

## 3. สภาพแวดล้อมและเครื่องมือที่ใช้ทดสอบ (Test Environment)

| องค์ประกอบ | รายละเอียด |
|---|---|
| **Runtime & Language** | OpenJDK 21 (Temurin / Adoptium 21.0.11), Java 21 bytecode |
| **Framework** | Spring Boot 4.x, Spring Security 7.x, Spring Session JDBC |
| **Testing Tools** | JUnit 5 (Jupiter), Spring Test Framework (`MockMvc`), AssertJ |
| **Active Profile** | `test` (`spring.flyway.enabled=false`, in-memory H2 DB for test isolation) |
| **Auth Adapter Mode** | `tu.auth.mode=mock` (จำลอง TU Authentication API ตามข้อกำหนดสถาปัตยกรรม ไม่เรียกบริการภายนอกจริงใน CI) |

---

## 4. เมทริกซ์กรณีทดสอบ (Test Case Matrix)

| รหัสทดสอบ | กรณีทดสอบ (Test Case Description) | ระดับการทดสอบ | อินพุต / ข้อมูลทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลการทดสอบ |
|:---:|---|:---:|---|---|:---:|
| **TC-AUTH-01** | Login สำเร็จด้วยข้อมูลที่ถูกต้อง (First-time Login Provisioning & Session Rotation) | Integration | `username: student-demo`<br>`password: tu-clubhub-demo`<br>พร้อม CSRF Token ที่ถูกต้อง | HTTP 200, Session Cookie ถูกหมุนเวียน (Rotated), ได้รับ Fresh CSRF, สร้างบัญชีผู้ใช้ 1 บัญชีใน DB | **PASS** ✅ |
| **TC-AUTH-02** | Login ล้มเหลวเนื่องจากรหัสผ่านไม่ถูกต้อง (Invalid Credentials) | Integration | `username: student-demo`<br>`password: wrong-password`<br>พร้อม CSRF Token | HTTP 401 `AUTHENTICATION_FAILED`, ไม่มีการสร้าง Session สำหรับผู้ใช้ และไม่มีการบันทึกบัญชีลง DB | **PASS** ✅ |
| **TC-AUTH-03** | Login ถูกปฏิเสธเมื่อไม่แนบ CSRF Token หรือ Token ไม่ถูกต้อง | Integration | CSRF Header ผิดพลาด หรือไม่ได้แนบ CSRF | HTTP 403 `CSRF_INVALID`, คำขอถูกระงับที่ Filter Chain | **PASS** ✅ |
| **TC-AUTH-04** | Login ถูกปฏิเสธเมื่อส่ง Payload ว่างหรือไม่ครบถ้วน (Malformed Request) | Integration | `{}` หรือ `{"username": "student-demo"}` | HTTP 400 `VALIDATION_FAILED`, พร้อมรายละเอียดฟิลด์ที่ขาดใน `fieldErrors` | **PASS** ✅ |
| **TC-AUTH-05** | ดึงข้อมูลผู้ใช้ปัจจุบันเมื่อมี Session ถูกต้อง (`GET /api/v1/auth/me`) | Integration | Session Cookie ของผู้ใช้ที่ผ่านการ Login แล้ว | HTTP 200 พร้อมแสดง `id` และ `role: "USER"` | **PASS** ✅ |
| **TC-AUTH-06** | ดึงข้อมูลผู้ใช้ปัจจุบันโดยไม่มี Session (Unauthenticated Access) | Integration | คำขอไม่มี Cookie หรือ Session ใดๆ | HTTP 401 `AUTHENTICATION_REQUIRED`, ส่งกลับ RFC 7807 Problem Details | **PASS** ✅ |
| **TC-AUTH-07** | ออกจากระบบสำเร็จและทำลาย Session (`POST /api/v1/auth/logout`) | Integration | Session Cookie และ Fresh CSRF Token ของ Session นั้น | HTTP 204 No Content, Session ในระบบถูก Invalidate (เรียก `/me` ซ้ำต้องได้ 401) | **PASS** ✅ |
| **TC-AUTH-08** | ออกจากระบบไม่สำเร็จเมื่อ CSRF Token ผิดพลาด และไม่ทำลาย Session | Integration | Session Cookie แต่ส่ง `X-CSRF-TOKEN: invalid-token` | HTTP 403 `CSRF_INVALID`, เซสชันของผู้ใช้ยังคงอยู่ (เรียก `/me` ยังได้ 200) | **PASS** ✅ |
| **TC-AUTH-09** | ปฏิเสธการเข้าถึงเมื่อเซสชันหมดอายุตามเวลาสัมบูรณ์ 8 ชม. (Absolute Timeout) | Integration / Filter | Session ที่มี `authenticatedAtEpochMilli` เกิน 8 ชั่วโมง | HTTP 401 `AUTHENTICATION_REQUIRED` ("Your session has expired. Sign in again.") และ Session ถูกทำลาย | **PASS** ✅ |
| **TC-AUTH-10** | อนุญาตให้ Session ที่หมดอายุแล้วสามารถ Bootstrap Fresh CSRF ได้ | Integration / Filter | `GET /api/v1/auth/csrf` โดยแนบ Cookie ของ Session ที่หมดอายุ | HTTP 200, Session เก่าถูกเคลียร์ และสร้าง Fresh CSRF Token ชุดใหม่สำหรับล็อกอินใหม่ | **PASS** ✅ |

---

## 5. รายละเอียดผลการรันชุดทดสอบ (Automated Test Execution Log)

ชุดทดสอบอัตโนมัติถูกจัดเก็บและรันผ่าน Maven Surefire ในไฟล์:
- [`backend/src/test/java/com/tu/clubhub/auth/AuthSessionIntegrationTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/auth/AuthSessionIntegrationTest.java)
- [`backend/src/test/java/com/tu/clubhub/config/AbsoluteSessionTimeoutFilterTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/config/AbsoluteSessionTimeoutFilterTest.java)

### ผลการรัน `AuthSessionIntegrationTest` (8 Tests):
```text
[INFO] Running com.tu.clubhub.auth.AuthSessionIntegrationTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 11.45 s -- in com.tu.clubhub.auth.AuthSessionIntegrationTest
- loginRotatesSessionAndReturnsFreshCsrfThatWorksForMeAndLogout: SUCCESS
- loginRejectsMissingOrInvalidCsrfToken: SUCCESS
- invalidCredentialsDoNotProvisionAnAccountOrSession: SUCCESS
- unauthenticatedAccessToMeReturnsUnauthorized: SUCCESS
- logoutRejectsMissingOrInvalidCsrfTokenAndKeepsSessionActive: SUCCESS
- loginRejectsEmptyOrMalformedPayload: SUCCESS
- sessionTimeoutRejectsProtectedAccessAfterEightHours: SUCCESS
- sessionTimeoutStillAllowsFreshCsrfBootstrap: SUCCESS
```

### ผลการรัน `AbsoluteSessionTimeoutFilterTest` (4 Tests):
```text
[INFO] Running com.tu.clubhub.config.AbsoluteSessionTimeoutFilterTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.022 s -- in com.tu.clubhub.config.AbsoluteSessionTimeoutFilterTest
- invalidatesAuthenticatedSessionsAfterEightHours: SUCCESS
- invalidatesExpiredSessionButAllowsFreshCsrfBootstrap: SUCCESS
- allowsNonExpiredAuthenticatedSession: SUCCESS
- ignoresUnauthenticatedSessionWithoutLoginAttribute: SUCCESS
```

---

## 6. การตรวจสอบตามเกณฑ์ตรวจรับ (Acceptance Criteria Verification)

| ข้อกำหนดตาม Project Proposal / Backlog | การดำเนินการและหลักฐาน | สถานะ |
|---|---|:---:|
| **SC-06: ป้องกัน Session Fixation** | มีการหมุนเวียน Session ID เมื่อผู้ใช้เข้าสู่ระบบสำเร็จ (`ChangeSessionIdAuthenticationStrategy`) พร้อมออก CSRF Token ใหม่ | ผ่าน ✅ |
| **SC-06: การควบคุมอายุ Session (Absolute Timeout)** | บังคับตัดเซสชันทุก 8 ชั่วโมงอย่างเข้มงวด (`AbsoluteSessionTimeoutFilter`) แม้จะมีการส่งคำขอเข้ามาเรื่อยๆ เพื่อความปลอดภัยของเครื่องสาธารณะ | ผ่าน ✅ |
| **CSRF Lifecycle ป้องกันการปลอมแปลงคำขอ** | มีการตรวจสอบ CSRF Token ทุกคำขอที่เป็น state-changing methods (`POST /login`, `POST /logout`) หาก Token ไม่ตรงจะถูกปฏิเสธทันทีด้วย HTTP 403 `CSRF_INVALID` | ผ่าน ✅ |
| **Data Integrity & Account Isolation** | ตรวจสอบว่าระบบสร้างบัญชี local user เฉพาะกรณีที่ยืนยันตัวตนสำเร็จเท่านั้น และรหัสผ่านผิดจะไม่สร้างขยะข้อมูลในระบบ | ผ่าน ✅ |
| **RFC 7807 Compliance** | ทุก Response ข้อผิดพลาด (400, 401, 403) ส่งออกในฟอร์แมต `application/problem+json` พร้อม stable codes และ traceId | ผ่าน ✅ |

---

## 7. สรุปผลการประเมิน (Conclusion)

การทดสอบสำหรับงาน **`Task03:U03-QA-1`** ประสบความสำเร็จครบถ้วนทุกข้อกำหนด โค้ดผ่านการทดสอบอัตโนมัติ 100% ปราศจากข้อผิดพลาด (Zero Failures / Zero Errors) สอดคล้องตามมาตรฐานความปลอดภัยระดับสูงของระบบสารสนเทศมหาวิทยาลัยธรรมศาสตร์ และพร้อมส่งมอบรวมเข้าสู่กิ่งหลัก `main`
