# รายงานผลการทดสอบการตรวจสิทธิ์ระดับชมรมและวาระกรรมการ (Club Committee Security Test Report)

- **รหัสงาน (Task ID):** `Task04:U06-QA-1`
- **User Story:** `US-06 (Club Profile Management & Committee Authorization)`
- **Success Criteria:** `SC-06 (การควบคุมสิทธิ์และเงื่อนไขการสมัคร/เข้าใช้งาน)`
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **Sprint:** Sprint 1
- **วันที่ทดสอบ:** 17 ตุลาคม พ.ศ. 2569
- **สถานะการทดสอบ:** **PASSED (100%)** ✅

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Objectives)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกการออกแบบกรณีทดสอบ (Test Design) และผลการรันชุดทดสอบอัตโนมัติ (Automated Integration Tests) สำหรับงาน **`Task04:U06-QA-1`** ในการตรวจสอบกลไกการอนุญาตสิทธิ์ระดับชมรม (Club-level & Term-scoped Committee Authorization) ผ่าน Custom Annotation `@RequireClubCommittee` และ SpEL Evaluator `ClubSecurity.isCommittee(#clubId)` ตามข้อกำหนดความปลอดภัยและข้อบังคับมหาวิทยาลัยธรรมศาสตร์ว่าด้วยกิจกรรมนักศึกษา

เป้าหมายสำคัญคือการยืนยันว่า:
1. ป้องกันไม่ให้กรรมการชมรมอื่นเข้าถึงหรือแก้ไขข้อมูลของชมรมที่ตนไม่ได้รับมอบหมาย (HTTP 403 `ACCESS_DENIED`)
2. ป้องกันไม่ให้นักศึกษาทั่วไปหรือสมาชิกธรรมดาเข้าถึงฟังก์ชันของกรรมการชมรม (HTTP 403 `ACCESS_DENIED`)
3. ป้องกันกรรมการที่หมดวาระแล้ว (Expired Term) หรือวาระยังไม่เริ่มต้น (Future Term) เข้าถึงฟังก์ชันกรรมการ (HTTP 403 `ACCESS_DENIED`)
4. ป้องกันกรรมการที่ถูกเพิกถอนสิทธิ์ (`REVOKED`) หรือสมาชิกภาพสิ้นสุดลง (`ended_at IS NOT NULL` หรือสถานะไม่ใช่ `ACTIVE`) ใช้งานสิทธิ์กรรมการ (HTTP 403 `ACCESS_DENIED`)
5. ป้องกันบัญชีผู้ใช้ที่ถูกระงับสิทธิ์ (`SUSPENDED`) ใช้งานสิทธิ์กรรมการ (HTTP 403 `ACCESS_DENIED`)
6. ผู้ใช้ที่ไม่ได้เข้าสู่ระบบต้องถูกปฏิเสธด้วย HTTP 401 `AUTHENTICATION_REQUIRED`
7. ทุก Response ข้อผิดพลาดต้องสอดคล้องตามมาตรฐาน **RFC 7807 Problem Details**

---

## 2. ตารางเมทริกซ์สิทธิ์การเข้าถึง (Permission Matrix)

| บทบาท / สถานะผู้ใช้งาน | สถานะสมาชิกภาพ | สถานะการมอบหมาย | วาระการดำรงตำแหน่ง | ผลการประเมินสิทธิ์ | รหัสสถานะ HTTP ที่คาดหวัง |
|---|---|---|---|:---:|:---:|
| กรรมการชมรม (Active Committee) | `ACTIVE` | `ACTIVE` (`COMMITTEE`) | อยู่ในช่วงวาระ (`starts_at <= now < ends_at`) | **อนุญาต** | `200 OK` |
| ประธานชมรม (Active President) | `ACTIVE` | `ACTIVE` (`PRESIDENT`) | อยู่ในช่วงวาระ (`starts_at <= now < ends_at`) | **อนุญาต** | `200 OK` |
| กรรมการชมรมอื่น (Other Club Committee) | `ACTIVE` (ชมรมอื่น) | `ACTIVE` (ชมรมอื่น) | อยู่ในช่วงวาระ | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| สมาชิกชมรมทั่วไป (Ordinary Member) | `ACTIVE` | ไม่มี Assignment | - | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| กรรมการที่หมดวาระแล้ว (Expired Appointment) | `ACTIVE` | `ACTIVE` | หมดวาระแล้ว (`now >= ends_at`) | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| กรรมการที่วาระยังไม่เริ่ม (Future Appointment) | `ACTIVE` | `ACTIVE` | ยังไม่เริ่มวาระ (`now < starts_at`) | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| กรรมการที่ถูกเพิกถอนสิทธิ์ (Revoked) | `ACTIVE` | `REVOKED` | - | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| สมาชิกภาพสิ้นสุดลง (Ended Membership) | `ACTIVE` (มี `ended_at`) | `ACTIVE` | อยู่ในช่วงวาระ | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| สถานะสมาชิกไม่ใช่ ACTIVE (Inactive Member) | `INACTIVE` | `ACTIVE` | อยู่ในช่วงวาระ | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| บทบาทไม่ได้รับอนุญาต (e.g. Advisor) | `ACTIVE` | `ACTIVE` (`ADVISOR`) | อยู่ในช่วงวาระ | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| บัญชีถูกระงับ (Suspended User Account) | `ACTIVE` | `ACTIVE` | อยู่ในช่วงวาระ แต่ Account ถูกระงับ | **ปฏิเสธ** | `403 ACCESS_DENIED` |
| ผู้ใช้ไม่ระบุตัวตน (Unauthenticated) | - | - | - | **ปฏิเสธ** | `401 AUTHENTICATION_REQUIRED` |
| ไม่ระบุ Club ID / Club ID ไม่มีอยู่จริง | - | - | - | **ปฏิเสธ** | `403 ACCESS_DENIED` หรือ `404 NOT_FOUND` |

---

## 3. เมทริกซ์กรณีทดสอบ (Test Case Matrix)

ชุดทดสอบถูกจัดทำใน [`backend/src/test/java/com/tu/clubhub/committee/security/CommitteeMethodSecurityIntegrationTest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/committee/security/CommitteeMethodSecurityIntegrationTest.java) ครอบคลุม 16 กรณีทดสอบ:

| รหัสทดสอบ | กรณีทดสอบ (Test Case Description) | วิธีการทดสอบ | ผลลัพธ์ที่คาดหวัง | ผลการทดสอบ |
|:---:|---|---|---|:---:|
| **TC-SEC-01** | กรรมการประจำชมรมเข้าถึงชมรมที่ตนดูแล | เรียก PUT `/api/v1/test/clubs/41` โดยผู้ใช้มี Assignment ชมรม 41 ในวาระปัจจุบัน | HTTP 200 OK | **PASS** ✅ |
| **TC-SEC-02** | ประธานชมรม (PRESIDENT) เข้าถึงชมรมที่ตนดูแล | เรียก PUT `/api/v1/test/clubs/41` โดยผู้ใช้มีสิทธิ์ PRESIDENT ในวาระปัจจุบัน | HTTP 200 OK | **PASS** ✅ |
| **TC-SEC-03** | กรรมการของชมรมอื่นพยายามเข้าถึงชมรมเป้าหมาย | เรียก PUT `/api/v1/test/clubs/41` แต่ผู้ใช้มี Assignment เฉพาะชมรม 42 | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-04** | สมาชิกชมรมทั่วไปที่ไม่มี Assignment กรรมการ | เรียก PUT `/api/v1/test/clubs/41` แต่มีเพียง ClubMembership ธรรมดา | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-05** | กรรมการที่หมดวาระการดำรงตำแหน่งแล้ว (Expired Term) | เรียก PUT `/api/v1/test/clubs/41` โดย `ends_at` อยู่ในอดีต | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-06** | กรรมการที่วาระยังไม่เริ่มต้น (Future Term) | เรียก PUT `/api/v1/test/clubs/41` โดย `starts_at` อยู่ในอนาคต | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-07** | กรรมการที่ถูกเพิกถอนสิทธิ์ (`status = 'REVOKED'`) | เรียก PUT `/api/v1/test/clubs/41` หลังถูกเพิกถอนสิทธิ์ | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-08** | กรรมการที่สมาชิกภาพในชมรมถูกระงับ (`membership.status = 'INACTIVE'`) | มี Assignment แต่สถานะสมาชิกภาพไม่ใช่ ACTIVE | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-09** | กรรมการที่สมาชิกภาพในชมรมสิ้นสุดลง (`ended_at IS NOT NULL`) | มี Assignment แต่สมาชิกภาพสิ้นสุดลงแล้ว | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-10** | ผู้มีบทบาทอื่นในชมรมที่ไม่ใช่กรรมการ (e.g. ADVISOR) | มี Assignment แต่ `permission_role = 'ADVISOR'` | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-11** | บัญชีผู้ใช้ถูกสั่งระงับสิทธิ์ (`users.account_status = 'SUSPENDED'`) | ผู้ใช้มีตำแหน่งกรรมการ แต่บัญชีมหาวิทยาลัยถูกระงับ | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-12** | ผู้ใช้ที่ยังไม่ได้เข้าสู่ระบบ (Unauthenticated User) | เรียก PUT `/api/v1/test/clubs/41` โดยไม่มี Session Authentication | HTTP 401 Unauthorized | **PASS** ✅ |
| **TC-SEC-13** | รหัสชมรมไม่มีอยู่จริงในระบบ (Unknown Club ID) | เรียก PUT `/api/v1/test/clubs/999999` | HTTP 403 Forbidden | **PASS** ✅ |
| **TC-SEC-14** | การเรียกใช้งาน `ClubSecurity.isCommittee()` ด้วย Parameter พิเศษ | ทดสอบส่ง `clubId = null` หรือ Anonymous Authentication ตรงไปยัง Bean | คืนค่า `false` เสมอ | **PASS** ✅ |
| **TC-SEC-15** | การเรียก Path ที่ไม่ระบุ Club ID ใน URL Route | เรียก PUT `/api/v1/test/clubs` | HTTP 404 Not Found (ไม่เกิด 500 Error) | **PASS** ✅ |
| **TC-SEC-16** | ตรวจสอบโครงสร้างข้อผิดพลาด 403 ตามมาตรฐาน RFC 7807 | ตรวจ Response Header และ JSON Body ของคำขอที่ถูกปฏิเสธ | Content-Type `problem+json`, `code: ACCESS_DENIED`, มี `traceId` | **PASS** ✅ |

---

## 4. รายละเอียดผลการรันชุดทดสอบ (Automated Test Execution Log)

```text
[INFO] Running com.tu.clubhub.committee.security.CommitteeMethodSecurityIntegrationTest
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.274 s
- activeCommitteeCanAccessAssignedClub: SUCCESS
- activePresidentCanAccessAssignedClub: SUCCESS
- committeeOfAnotherClubIsForbidden: SUCCESS
- ordinaryClubMemberWithoutCommitteeAssignmentIsForbidden: SUCCESS
- expiredAppointmentDoesNotAuthorize: SUCCESS
- futureAppointmentDoesNotAuthorize: SUCCESS
- revokedAppointmentDoesNotAuthorize: SUCCESS
- inactiveMembershipDoesNotAuthorizeEvenWithActiveAssignment: SUCCESS
- endedMembershipDoesNotAuthorizeEvenWithActiveAssignment: SUCCESS
- unauthorizedRoleSuchAsAdvisorDoesNotAuthorize: SUCCESS
- suspendedAccountCannotUseCommitteeAssignment: SUCCESS
- unauthenticatedUserIsUnauthorized: SUCCESS
- unknownClubIdIsForbidden: SUCCESS
- nullClubIdAndMissingOrAnonymousAuthenticationReturnFalse: SUCCESS
- missingClubIdRouteDoesNotCauseAnInternalServerError: SUCCESS
- forbiddenResponseMatchesRfc7807ProblemDetailsContract: SUCCESS
```

---

## 5. การตรวจสอบความสอดคล้องตามเกณฑ์ตรวจรับ (Acceptance Criteria Verification)

1. **SC-06: การควบคุมสิทธิ์และเงื่อนไขชมรม:**
   - กรรมการชมรม A ไม่สามารถเข้าถึงหรือแก้ไขข้อมูลของชมรม B ได้ทุกกรณี (Zero Cross-Club Privilege Escalation)
   - สมาชิกทั่วไปไม่มีสิทธิ์แก้ไขข้อมูลชมรม
   - วาระของกรรมการถูกตรวจเช็กแบบ Real-time ตามช่วงเวลา (`clock.instant()`) ไม่สามารถใช้สิทธิ์ย้อนหลังหรือล่วงหน้าได้
2. **RFC 7807 Problem Details Compliance:**
   - การปฏิเสธสิทธิ์ (403 Forbidden) ส่งคืน Payload ในรูปแบบ `application/problem+json` พร้อม Stable Code `ACCESS_DENIED`, ข้อความ `detail` ที่ปลอดภัย และ `traceId` สำหรับสืบค้นปัญหา
3. **Data Integrity & Account Status:**
   - บัญชีที่ถูกระงับสิทธิ์ (`SUSPENDED`) หรือสมาชิกที่พ้นสภาพ (`ended_at IS NOT NULL`) จะสูญเสียสิทธิ์ในการจัดการชมรมทันที

---

## 6. สรุปผลการประเมิน (Conclusion)

ชุดทดสอบอัตโนมัติสำหรับงาน **`Task04:U06-QA-1`** ครอบคลุมกฎธุรกิจความปลอดภัยครบถ้วนทุกกรณี โค้ดผ่านการทดสอบ 100% ปราศจากข้อผิดพลาด (16 Passed / 0 Failed) ระบบมีความมั่นคงปลอดภัยและพร้อมสำหรับการนำไปใช้งานจริงในโมดูล `club` และโมดูลอื่นๆ ต่อไป
