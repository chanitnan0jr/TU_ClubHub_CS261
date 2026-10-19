# รายงานผลการทดสอบระบบจัดการโปรไฟล์ชมรม (Club Profile Management E2E Test Report)

- **รหัสงาน (Task ID):** `Task13:U06-QA-1`
- **User Story:** `US-06 (Club Profile Management)`
- **Success Criteria:** `SC-06 (การควบคุมสิทธิ์และเงื่อนไขการสมัคร/เข้าใช้งาน)`
- **เอกสารอ้างอิงกรณีทดสอบ (Test Specification):** [`docs/testing/task08-club-profile-test-cases.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/testing/task08-club-profile-test-cases.md)
- **ชุดทดสอบอัตโนมัติ (Automated Test Suite):** [`backend/src/test/java/com/tu/clubhub/club/controller/ClubProfileUpdateIntegrationTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/club/controller/ClubProfileUpdateIntegrationTest.java)
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **Sprint:** Sprint 1
- **วันที่ทดสอบ:** 19 ตุลาคม พ.ศ. 2569
- **สถานะการทดสอบ:** **PASSED (100%)** ✅

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Objectives)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกผลการทดสอบระดับบูรณาการและระบบครบวงจร (Automated Integration / E2E Testing) สำหรับงาน **`Task13:U06-QA-1`** ภายใต้ User Story **`US-06 (Club Profile Management)`** โดยอ้างอิงกรณีทดสอบมาตรฐาน `TC-06-01` ถึง `TC-06-07` ตามที่กำหนดไว้ใน [`docs/testing/task08-club-profile-test-cases.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/testing/task08-club-profile-test-cases.md)

วัตถุประสงค์หลักของการทดสอบ:
1. ยืนยันความถูกต้องของการแก้ไขข้อมูลพื้นฐานชมรม (ชื่อ, คำอธิบาย, วัตถุประสงค์, ข้อมูลติดต่อ, ช่องทางโซเชียลมีเดีย, รูปภาพโปรไฟล์ และรูปภาพแบนเนอร์)
2. ยืนยันความปลอดภัยและการควบคุมสิทธิ์ตามกฎบทบาทและวาระของกรรมการชมรม (Active Committee & President Authorization) ป้องกันการยกระดับสิทธิ์ข้ามชมรม (Zero Cross-Club Privilege Escalation)
3. ยืนยันการป้องกันการแก้ไขฟิลด์สงวน (Immutable / Protected Fields) เช่น `category_id`, `status`, `affiliation_level`, `affiliation_name`, `created_by` เพื่อรักษาความสมบูรณ์ของข้อมูลตามกฎมหาวิทยาลัยธรรมศาสตร์
4. ยืนยันการตรวจสอบความถูกต้องของข้อมูลนำเข้า (Data Validation & URL Whitelisting) สำหรับ HTTPS scheme, Whitelisted Social Media Domains (Facebook, Instagram) และ Email Format
5. ยืนยันความสอดคล้องของโครงสร้าง Response ข้อผิดพลาดตามมาตรฐาน **RFC 7807 Problem Details** พร้อม Stable Error Codes สำหรับการนำไปเชื่อมต่อกับ Frontend

---

## 2. ขอบเขตและสถาปัตยกรรมชุดทดสอบ (Test Scope & Architecture)

ชุดทดสอบอัตโนมัติถูกพัฒนาขึ้นในระดับ Spring Boot Integration Test โดยเปิดใช้งาน Spring Security Filter Chain และ CSRF Token เต็มรูปแบบ เสมือนการเรียกใช้งานจริงจาก Web Client:
- **Test Class:** [`ClubProfileUpdateIntegrationTest`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/club/controller/ClubProfileUpdateIntegrationTest.java)
- **Configuration:** `@SpringBootTest`, `@AutoConfigureMockMvc(addFilters = true)`, `@ActiveProfiles("test")`, `@Transactional`
- **Data Isolation:** จำลองข้อมูลผู้ใช้ สมาชิกชมรม วาระกรรมการ และข้อมูลชมรมแยกแต่ละกรณีทดสอบ พร้อม Rollback อัตโนมัติ

---

## 3. เมทริกซ์ความครอบคลุมและผลการทดสอบ (Test Traceability Matrix)

| รหัสกรณีทดสอบ | ชุดข้อย่อย | รายละเอียดกรณีทดสอบ (Test Scenario) | ข้อมูลนำเข้า (Payload / Conditions) | ผลลัพธ์ที่คาดหวัง | รหัส HTTP / Code | ผลลัพธ์จริง | สถานะ |
|:---:|:---:|---|---|---|:---:|:---:|:---:|
| **TC-06-01** | 1A | แก้ไขชื่อ คำอธิบาย และวัตถุประสงค์สำเร็จ | PUT `/api/v1/clubs/41` โดย Active Committee, มี CSRF, ข้อมูลชื่อ-คำอธิบายภาษาไทย | HTTP 200, ฟิลด์อัปเดตลง DB, ฟิลด์สงวนคงเดิม | `200 OK` | `200 OK`, DB persisted, Immutable fields preserved | **PASS** ✅ |
| **TC-06-02** | 2A | แก้ไข URL รูปภาพโปรไฟล์และแบนเนอร์ HTTPS | HTTPS URLs (`https://images.unsplash.com/...`) | HTTP 200, บันทึก URL ลง DB | `200 OK` | `200 OK`, imageUrl & bannerUrl updated | **PASS** ✅ |
| **TC-06-03** | 3A | ปฏิเสธ Image URL ที่เป็น HTTP ธรรมดา (Insecure Scheme) | `http://example.com/logo.png` | HTTP 400, ปฏิเสธเนื่องจากไม่ใช่ HTTPS | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: imageUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-03** | 3B | ปฏิเสธ Image URL ที่เป็น FTP Scheme | `ftp://example.com/banner.png` | HTTP 400, ปฏิเสธ Scheme ไม่ปลอดภัย | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: bannerUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-03** | 3C | ปฏิเสธ Image URL ที่มี Embedded Credentials (User-Info) | `https://user:pass@example.com/image.png` | HTTP 400, ป้องกัน SSRF / Credential Leak | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: imageUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-03** | 3D | ปฏิเสธ Image URL ที่ผิดรูปแบบ (Malformed URL) | `not-a-valid-url` | HTTP 400, ปฏิเสธ URL string ผิดไวยากรณ์ | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: imageUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-04** | 4A | บันทึก Social Media และ Email ที่ถูกต้องสำเร็จ | Facebook & Instagram HTTPS URLs, valid email | HTTP 200, บันทึกลง DB สำเร็จ | `200 OK` | `200 OK`, social URLs & email updated | **PASS** ✅ |
| **TC-06-04** | 4B | ปฏิเสธ Facebook URL ปลอมแปลง / นอกโดเมน | `https://fakebook.com/tuclub` | HTTP 400, ไม่อยู่ใน Domain Whitelist | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: facebookUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-04** | 4C | ปฏิเสธ Instagram URL ปลอมแปลง / นอกโดเมน | `https://instascam.com/tuclub` | HTTP 400, ไม่อยู่ใน Domain Whitelist | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: instagramUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-04** | 4D | ปฏิเสธ Social URL ที่ระบุ Non-standard Port | `https://www.facebook.com:8080/tuclub` | HTTP 400, ไม่อนุญาต custom port | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: facebookUrl`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-04** | 4E | ปฏิเสธ Email ผิดรูปแบบ (Malformed Email) | `invalid-email-string` | HTTP 400, ไม่ตรงตามมาตรฐาน RFC 5322 | `400 Bad Request`<br>`VALIDATION_FAILED` | HTTP 400, `field: contactEmail`, `code: VALIDATION_FAILED` | **PASS** ✅ |
| **TC-06-05** | 5A | ผู้ใช้ที่ยังไม่ได้เข้าสู่ระบบ (Unauthenticated) | เรียก PUT `/api/v1/clubs/41` โดยไม่มี Session | HTTP 401 Unauthorized | `401 Unauthorized`<br>`AUTHENTICATION_REQUIRED` | HTTP 401, RFC 7807 Problem Details | **PASS** ✅ |
| **TC-06-05** | 5B | สมาชิกชมรมทั่วไปที่ไม่มี Assignment กรรมการ | เรียก PUT `/api/v1/clubs/41` โดย Ordinary Member | HTTP 403 Forbidden | `403 Forbidden`<br>`ACCESS_DENIED` | HTTP 403, `code: ACCESS_DENIED` | **PASS** ✅ |
| **TC-06-05** | 5C | กรรมการของชมรมอื่นพยายามแก้ไขชมรมเป้าหมาย | เรียก PUT `/api/v1/clubs/41` โดยมีสิทธิ์เฉพาะชมรม 42 | HTTP 403 Forbidden (Cross-club privilege denied) | `403 Forbidden`<br>`ACCESS_DENIED` | HTTP 403, `code: ACCESS_DENIED` | **PASS** ✅ |
| **TC-06-05** | 5D | กรรมการที่หมดวาระการดำรงตำแหน่งแล้ว (Expired Term) | เรียก PUT `/api/v1/clubs/41` โดย `ends_at` อยู่ในอดีต | HTTP 403 Forbidden | `403 Forbidden`<br>`ACCESS_DENIED` | HTTP 403, `code: ACCESS_DENIED` | **PASS** ✅ |
| **TC-06-05** | 5E | คำขอที่ไม่มี CSRF Token หรือ Token ไม่ถูกต้อง | เรียก PUT `/api/v1/clubs/41` โดยละเว้น `.with(csrf())` | HTTP 403 Forbidden (CSRF filter denial) | `403 Forbidden` | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-06-06** | 6A | รหัสชมรมไม่ใช่ตัวเลขฐานสิบ (Non-decimal ID) | PUT `/api/v1/clubs/abc` | HTTP 400 Bad Request | `400 Bad Request`<br>`INVALID_RESOURCE_ID` | HTTP 400, `code: INVALID_RESOURCE_ID` | **PASS** ✅ |
| **TC-06-06** | 6B | รหัสชมรมเป็นจำนวนลบ (Negative ID) | PUT `/api/v1/clubs/-1` | HTTP 400 Bad Request | `400 Bad Request`<br>`INVALID_RESOURCE_ID` | HTTP 400, `code: INVALID_RESOURCE_ID` | **PASS** ✅ |
| **TC-06-06** | 6C | รหัสชมรมไม่มีอยู่จริงในระบบ (Unknown Club ID) | PUT `/api/v1/clubs/999999` | HTTP 403 หรือ 404 (Security Barrier ปฏิเสธ) | `403 Forbidden` หรือ `404 Not Found` | HTTP 403 / 404 ปลอดภัย ไม่เกิด 500 | **PASS** ✅ |
| **TC-06-07** | 7A | ล้างค่าฟิลด์ทางเลือกด้วย `null` สำเร็จ | ส่งค่า `null` ใน `contactUrl`, `facebookUrl`, `imageUrl` ฯลฯ | HTTP 200, ฟิลด์ทางเลือกใน DB ถูกล้างเป็น null | `200 OK` | `200 OK`, optional fields nulled, status preserved | **PASS** ✅ |
| **TC-06-07** | 7C | คำขอด้วย HTTP Method ที่ไม่รองรับ (DELETE) | DELETE `/api/v1/clubs/41` โดยกรรมการชมรม | HTTP 405 Method Not Allowed พร้อม Header `Allow: PUT` | `405 Method Not Allowed`<br>Header: `Allow: PUT` | HTTP 405, Header `Allow: PUT` | **PASS** ✅ |

---

## 4. บันทึกผลการรันชุดทดสอบอัตโนมัติ (Automated Test Execution Log)

```text
-------------------------------------------------------------------------------
Test set: com.tu.clubhub.club.controller.ClubProfileUpdateIntegrationTest
-------------------------------------------------------------------------------
[INFO] Running TC-06-01: แก้ไขชื่อ คำอธิบาย และวัตถุประสงค์สำเร็จ
- updateBasicInfoSuccess: SUCCESS (0.967 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.967 s

[INFO] Running TC-06-02: ระบุ URL รูปภาพโปรไฟล์และแบนเนอร์ HTTPS ที่ถูกต้อง
- updateImageUrlsSuccess: SUCCESS (0.040 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.040 s

[INFO] Running TC-06-03: ปฏิเสธ URL รูปภาพที่ไม่ใช่ HTTPS หรือผิดรูปแบบ
- rejectUserInfoInUrl: SUCCESS (0.052 s)
- rejectHttpImageUrl: SUCCESS (0.036 s)
- rejectMalformedUrl: SUCCESS (0.058 s)
- rejectFtpImageUrl: SUCCESS (0.050 s)
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.196 s

[INFO] Running TC-06-04: ตรวจสอบ Social Media และ Email
- rejectInvalidEmail: SUCCESS (0.040 s)
- rejectInvalidInstagramDomain: SUCCESS (0.033 s)
- rejectNonStandardPortOnSocial: SUCCESS (0.033 s)
- validSocialAndEmailSuccess: SUCCESS (0.034 s)
- rejectInvalidFacebookDomain: SUCCESS (0.024 s)
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.192 s

[INFO] Running TC-06-05: ตรวจสอบการควบคุมสิทธิ์ (Security & Authorization)
- committeeOfOtherClubReturns403: SUCCESS (0.030 s)
- missingCsrfReturns403: SUCCESS (0.024 s)
- expiredCommitteeReturns403: SUCCESS (0.034 s)
- ordinaryMemberReturns403: SUCCESS (0.023 s)
- unauthenticatedReturns401: SUCCESS (0.019 s)
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.152 s

[INFO] Running TC-06-06: รหัสชมรมผิดรูปแบบหรือไม่พบข้อมูลชมรม
- negativeIdReturns400: SUCCESS (0.021 s)
- nonDecimalIdReturns400: SUCCESS (0.022 s)
- clubNotFoundReturns403Or404: SUCCESS (0.023 s)
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.086 s

[INFO] Running TC-06-07: ล้างข้อมูลฟิลด์ไม่บังคับและ HTTP Method ไม่ถูกต้อง
- unsupportedMethodReturns405: SUCCESS (0.020 s)
- nullifyOptionalFieldsSuccess: SUCCESS (0.025 s)
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.060 s

[INFO] Results:
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS (Total time: 10.710 s)
```

---

## 5. การตรวจสอบความสอดคล้องตามมาตรฐาน (Standards Compliance)

1. **RFC 7807 Problem Details Compliance:**
   - ในทุกกรณีที่คำขอผิดพลาด (Validation Error, Unauthorized, Forbidden, Bad Request) ระบบตอบกลับด้วย Content-Type `application/problem+json` พร้อมโครงสร้างฟิลด์ครบถ้วน ได้แก่ `type`, `title`, `status`, `detail`, `instance`, `code`, และ `fieldErrors`
   - Stable Error Codes มีความชัดเจนและสม่ำเสมอ เช่น `VALIDATION_FAILED`, `AUTHENTICATION_REQUIRED`, `ACCESS_DENIED`, `INVALID_RESOURCE_ID`
2. **Security & Data Isolation (Zero Privilege Escalation):**
   - กรรมการจากชมรมหนึ่งไม่สามารถแทรกแซงหรือแก้ไขข้อมูลของชมรมอื่นได้ทุกกรณี (HTTP 403 `ACCESS_DENIED`)
   - นักศึกษาทั่วไปที่ไม่มีตำแหน่งกรรมการในวาระปัจจุบันถูกปฏิเสธสิทธิ์ (HTTP 403 `ACCESS_DENIED`)
   - ระบบปฏิเสธคำขอที่ไม่มีหรือมี CSRF Token ไม่ถูกต้อง (HTTP 403 Forbidden)
3. **Mass Assignment Protection & Data Integrity:**
   - การแก้ไขโปรไฟล์ไม่สามารถดัดแปลงฟิลด์สงวนของระบบ (`category_id`, `status`, `affiliation_level`, `affiliation_name`, `created_by`) ค่าเดิมในฐานข้อมูลยังคงอยู่ครบถ้วนหลังการบันทึก
4. **Cache Invalidation & Freshness:**
   - Response ของ API ระบุ Header `Cache-Control: no-store` หรือฝั่ง Client มีการ Invalidate cache ส่งผลให้ข้อมูลที่อัปเดตแสดงผลทันที

---

## 6. รายงานข้อสังเกตและข้อบกพร่อง (Bug Report & QA Observations)

| รหัสข้อบกพร่อง (Bug ID) | ระดับความรุนแรง (Severity) | หัวข้อ (Summary) | รายละเอียดและการวิเคราะห์ (Details & Impact) | คำแนะนำสำหรับรอบถัดไป (Recommendation) |
|---|:---:|---|---|---|
| **BUG-06-01** | **Low (Minor / Observation)** | Response Body สำหรับ HTTP 405 Method Not Allowed เป็นค่าว่าง | เมื่อ Client ส่ง HTTP Method ที่ไม่รองรับ (เช่น `DELETE` หรือ `PATCH` ไปยัง `/api/v1/clubs/{id}`) Spring Boot ส่งคืนสถานะ `405 Method Not Allowed` พร้อม Header `Allow: PUT` ถูกต้องตาม HTTP RFC ทว่า Response Body เป็นค่าว่าง (ไม่มี Problem Details JSON) เนื่องจาก `ClubExceptionHandler` มีการระบุ Annotation `@RestControllerAdvice(assignableTypes = {ClubController.class, ...})` ซึ่ง DispatcherServlet ของ Spring MVC จะไม่เรียกใช้ Advice นี้หากยังไม่สามารถจับคู่ Route ไปยัง Handler Method ใดๆ ได้ | พิจารณากำหนด Global ExceptionHandler หรือ Custom ErrorController สำหรับจัดการ HTTP Method Not Allowed และ 404 Route-level เพื่อให้ส่งคืน RFC 7807 Problem Details อย่างสม่ำเสมอทั่วทั้งแอปพลิเคชัน |

---

## 7. สรุปผลการประเมิน (Conclusion)

ชุดทดสอบอัตโนมัติสำหรับงาน **`Task13:U06-QA-1`** ได้ดำเนินการครอบคลุมกรณีทดสอบ `TC-06-01` ถึง `TC-06-07` ครบถ้วนทุกข้อ ผลการทดสอบผ่านการรับรอง **100% (21 Passed / 0 Failed)** ทั้งในด้าน Business Logic, Security Authorization, Input Validation และ Data Integrity ระบบบริหารจัดการโปรไฟล์ชมรมมีความพร้อมสำหรับการใช้งานจริงบนสภาพแวดล้อม Production
