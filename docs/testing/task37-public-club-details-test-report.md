# รายงานผลการทดสอบหน้ารายละเอียดชมรมและประกาศรับสมัครสาธารณะ (Public Club Details & Announcements Test Report)

- **รหัสงาน (Task ID):** `Task37:U02-QA-1`
- **User Story:** `US-02 (View Club Details & Announcements)`
- **Success Criteria:** `SC-02 (การเข้าถึงข้อมูลสาธารณะและความถูกต้องของรอบรับสมัคร)`
- **เอกสารข้อกำหนด (User Story Specification):** [`docs/stories/US-02.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/stories/US-02.md)
- **ชุดทดสอบอัตโนมัติ (Automated Test Suite):** [`backend/src/test/java/com/tu/clubhub/club/controller/PublicClubDetailsE2ETest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/club/controller/PublicClubDetailsE2ETest.java)
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **Sprint:** Sprint 1
- **วันที่ทดสอบ:** 20 ตุลาคม พ.ศ. 2569
- **สถานะการทดสอบ:** **PASSED (100%)** ✅

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Objectives)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกผลการทดสอบระดับระบบและบูรณาการครบวงจร (Automated Integration / E2E Testing) สำหรับงาน **`Task37:U02-QA-1`** ภายใต้ User Story **`US-02: ดูรายละเอียดชมรมและประกาศรับสมัคร (View Club Details & Announcements)`** โดยอ้างอิงเกณฑ์การตรวจรับ `AC-01` ถึง `AC-06` กฎเกณฑ์ทางธุรกิจ `BR-01` ถึง `BR-07` และกรณีทดสอบ `TC-02-01` ถึง `TC-02-07` ตามที่กำหนดไว้ใน [`docs/stories/US-02.md`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/docs/stories/US-02.md)

วัตถุประสงค์หลักของการทดสอบ:
1. **Direct Public Access:** ยืนยันว่าผู้ใช้งานทั่วไป (นักศึกษา/ผู้เยี่ยมชม) ที่ยังไม่ได้เข้าสู่ระบบ (Anonymous) สามารถเปิดดูข้อมูลชมรม วัตถุประสงค์ กิจกรรม รูปภาพ และช่องทางติดต่อผ่าน URL สาธารณะได้โดยตรง โดยไม่มีการบังคับ Login (`AC-01`, `BR-01`)
2. **Active Round & Navigation:** ยืนยันว่าระบบแสดงเฉพาะประกาศรับสมัครของรอบที่เผยแพร่แล้ว (`PUBLISHED`) และกำลังเปิดรับสมัครอยู่จริงตามเวลา Server พร้อมทั้งแสดงคุณสมบัติและส่งมอบ `targetRoundId` ไปยังขั้นตอนการสมัครได้อย่างถูกต้อง (`AC-02`, `BR-04`)
3. **Draft & Internal Data Leak Prevention:** ยืนยันว่า Public API และหน้ารายละเอียดชมรมไม่มีการรั่วไหลของรอบฉบับร่าง (`DRAFT`) รอบที่ปิดรับแล้ว หรือข้อมูลภายใน (เช่น ใบสมัคร, ข้อมูลผู้สมัคร, บันทึกกรรมการ) ออกสู่สาธารณะโดยเด็ดขาด (`AC-04`, `BR-06`)
4. **Graceful Fallback & Null Safety:** ยืนยันว่าเมื่อรูปภาพภายนอกโหลดไม่ได้ หรือชมรมไม่ได้ระบุ URL รูปภาพ ระบบจะสลับไปใช้รูปภาพเริ่มต้น (Fallback Placeholder) โดยที่องค์ประกอบอื่น ๆ ยังทำงานได้สมบูรณ์ และช่องทางติดต่อที่ไม่ได้ระบุจะถูกซ่อนอย่างถูกต้อง ไม่แสดง Broken Link (`AC-05`, `BR-07`)
5. **Robust Error Handling:** ยืนยันว่าการเรียกชมรมที่ไม่มีอยู่จริง หรือชมรมที่ไม่อนุญาตให้เผยแพร่ (`INACTIVE`) จะตอบกลับด้วย HTTP `404 Not Found` ตามมาตรฐาน RFC 7807 Problem Details และ Frontend แสดงหน้าจอแจ้งเตือนที่เหมาะสม ไม่แครช (`AC-06`, `BR-02`)

---

## 2. ขอบเขตและสถาปัตยกรรมชุดทดสอบ (Test Scope & Architecture)

การทดสอบแบ่งออกเป็น 2 ส่วนหลักที่ทำงานสอดประสานกัน:

### 2.1 Backend Automated Integration Test Suite
พัฒนาชุดทดสอบ [`PublicClubDetailsE2ETest.java`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/backend/src/test/java/com/tu/clubhub/club/controller/PublicClubDetailsE2ETest.java) ในระดับ Spring Boot Integration Test โดยเปิดใช้งาน Security Filter Chain เต็มรูปแบบ:
- **Endpoints ที่ทดสอบ:**
  - `GET /api/v1/public/clubs/{id}`
  - `GET /api/v1/public/clubs/{id}/recruitment-rounds`
- **Data Isolation:** ใช้การจำลองข้อมูลแบบ Transactional Rollback ในหน่วยความจำ ทำให้การทดสอบแต่ละเคสเป็นอิสระต่อกัน (Zero Test Pollution)
- **Security Check:** จำลองคำขอแบบ Anonymous (ไม่มี Session Cookie, ไม่มี CSRF, ไม่มี Principal) เพื่อพิสูจน์การเข้าถึงแบบสาธารณะที่แท้จริง

### 2.2 Frontend Integration & Component Verification
ตรวจสอบการทำงานของ [`ClubDetailPage.tsx`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/frontend/src/features/clubs/components/ClubDetailPage.tsx) และ [`clubService.ts`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/frontend/src/features/clubs/services/clubService.ts):
- การจัดการ Fallback รูปภาพผ่าน Event `onError={() => setImgSrc(DEFAULT_COVER_IMAGE)}`
- การซ่อนช่องทาง Social Media ล่วงหน้าด้วยฟังก์ชัน `formatUrl` ป้องกัน `https://undefined`
- การตรวจสอบสถานะการเปิดรับสมัคร `!club.activeRound.isClosed` และการนำทางผ่าน `handleApplyClick` ด้วย ID จริง

---

## 3. เมทริกซ์ความครอบคลุมและผลการทดสอบ (Test Traceability Matrix)

| รหัสทดสอบ | ข้อย่อย | รายละเอียดกรณีทดสอบ (Test Scenario) | เงื่อนไข / ข้อมูลนำเข้า | ผลลัพธ์ที่คาดหวัง | สถานะ HTTP / Response | ผลลัพธ์จริง | ผลการตรวจ |
|:---:|:---:|---|---|---|:---:|:---:|:---:|
| **TC-02-01** | 1A | ผู้ใช้ไม่ Login เข้าถึงข้อมูลสาธารณะของชมรมได้โดยตรง | Anonymous GET `/api/v1/public/clubs/51` | ได้รับข้อมูลชมรมครบถ้วน ไม่ส่งฟิลด์ภายใน เช่น `version`, `created_by` | `200 OK` | `200 OK`, เฉพาะฟิลด์สาธารณะถูกส่งออก | **PASS** ✅ |
| **TC-02-02** | 2A | ชมรมมีรอบที่เปิดรับสมัครจริง (Active Published Round) | GET `/api/v1/public/clubs/51/recruitment-rounds` (รอบ Published, `opens_at <= now < closes_at`) | แสดงรายการรอบที่เปิดอยู่ พร้อม ID, ชื่อรอบ, กำหนดการเปิด-ปิด | `200 OK`, `totalElements: 1` | `200 OK`, ได้รับข้อมูลรอบถูกต้อง | **PASS** ✅ |
| **TC-02-03** | 3A | กรองรอบในอนาคตที่ยังไม่เปิดรับออกจาก Public API | รอบ Published ที่ `now < opens_at` | ไม่ปรากฏในรายการรอบเปิดรับสาธารณะ | `200 OK`, `totalElements: 0` | `200 OK`, กรองรอบอนาคตออกสมบูรณ์ | **PASS** ✅ |
| **TC-02-03** | 3B | กรองรอบในอดีตที่หมดเวลาแล้วออกจาก Public API | รอบ Published ที่ `closes_at <= now` | ไม่ปรากฏในรายการรอบเปิดรับสาธารณะ | `200 OK`, `totalElements: 0` | `200 OK`, กรองรอบที่หมดเวลาออก | **PASS** ✅ |
| **TC-02-03** | 3C | กรองรอบที่ถูกปิดรับก่อนกำหนดด้วยมือ (`closed_at IS NOT NULL`) | รอบ Published ที่กรรมการกดปิดรับ | ไม่ปรากฏในรายการรอบเปิดรับสาธารณะ | `200 OK`, `totalElements: 0` | `200 OK`, กรองรอบที่ปิดด้วยมือออก | **PASS** ✅ |
| **TC-02-04** | 4A | ชมรมมีเฉพาะรอบฉบับร่าง (`DRAFT`) | รอบที่มีสถานะ `DRAFT` | ส่งคืนรายการว่าง (`items: []`) ไม่เปิดเผยชื่อหรือจำนวนรอบ Draft | `200 OK`, `totalElements: 0` | `200 OK`, ไม่รั่วไหลข้อมูล Draft | **PASS** ✅ |
| **TC-02-05** | 5A | ชมรมมีทั้งรอบ Published และ Draft พร้อมกัน | รอบ Published (1 รอบ) + รอบ Draft (1 รอบ) | ส่งเฉพาะรอบ Published, กรองรอบ Draft ออก 100% | `200 OK`, `totalElements: 1` | `200 OK`, แสดงเฉพาะรอบที่เปิดรับจริง | **PASS** ✅ |
| **TC-02-06** | 6A | ฟิลด์รูปภาพและช่องทางติดต่อทางเลือกเป็น `null` | ชมรมที่มี `image_url: null`, `facebook_url: null` ฯลฯ | โหลดโปรไฟล์ได้ปกติ ฟิลด์เป็น `null` UI สลับไปใช้ Fallback Image | `200 OK` | `200 OK`, ระบบทำงานได้ต่อเนื่อง ไม่ Error | **PASS** ✅ |
| **TC-02-07** | 7A | เปิดดูชมรมที่ไม่มีรหัสในระบบ (Unknown Club ID) | GET `/api/v1/public/clubs/999999` | ตอบกลับ 404 พร้อม RFC 7807 Problem Details | `404 Not Found`<br>`code: CLUB_NOT_FOUND` | `404 Not Found`, ข้อความไม่พบข้อมูล | **PASS** ✅ |
| **TC-02-07** | 7B | เปิดดูชมรมที่มีสถานะระงับ/ปิดตัว (`INACTIVE`) | GET `/api/v1/public/clubs/52` (สถานะ `INACTIVE`) | ปฏิเสธการเข้าถึงสาธารณะ ตอบ 404 เสมือนไม่มีชมรม | `404 Not Found`<br>`code: CLUB_NOT_FOUND` | `404 Not Found`, ซ่อนชมรม INACTIVE | **PASS** ✅ |
| **TC-02-07** | 7C | ดึงรอบรับสมัครของชมรมที่ไม่มีอยู่จริง | GET `/api/v1/public/clubs/999999/recruitment-rounds` | ตอบกลับ 404 Not Found | `404 Not Found`<br>`code: CLUB_NOT_FOUND` | `404 Not Found` | **PASS** ✅ |

---

## 4. บันทึกผลการรันชุดทดสอบอัตโนมัติ (Automated Test Execution Log)

```text
-------------------------------------------------------------------------------
Test set: com.tu.clubhub.club.controller.PublicClubDetailsE2ETest
-------------------------------------------------------------------------------
[INFO] Running TC-02-01: ผู้ใช้ไม่ได้ Login เปิดดูข้อมูลสาธารณะของชมรมได้โดยไม่ต้องยืนยันตัวตน
- anonymousCanAccessPublicProfile: SUCCESS (0.842 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.842 s

[INFO] Running TC-02-02: แสดงรอบรับสมัครที่เปิดอยู่ และมีข้อมูลสำหรับนำทางไปสมัคร
- activePublishedRoundIsReturned: SUCCESS (0.046 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.046 s

[INFO] Running TC-02-03: กรองรอบในอนาคต รอบที่หมดเขต และรอบที่ปิดรับด้วยมือออกจาก Public API
- excludesNonActiveRounds: SUCCESS (0.052 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.052 s

[INFO] Running TC-02-04: ชมรมไม่มีรอบรับสมัคร หรือมีเฉพาะรอบ Draft ต้องส่งคืนรายการว่าง
- draftOnlyReturnsEmptyList: SUCCESS (0.041 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.041 s

[INFO] Running TC-02-05: ส่งเฉพาะรอบ Published ที่เปิดรับอยู่ และแยกแยะข้อมูล Draft ออกอย่างสมบูรณ์
- mixedPublishedAndDraftOnlyReturnsPublished: SUCCESS (0.044 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.044 s

[INFO] Running TC-02-06: รองรับฟิลด์ทางเลือกเป็น null (รูปภาพ, ช่องทางติดต่อ) โดยระบบทำงานได้ต่อเนื่อง
- nullOptionalFieldsHandledGracefully: SUCCESS (0.053 s)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.053 s

[INFO] Running TC-02-07: ชมรมไม่มีอยู่จริง หรือมีสถานะ INACTIVE ต้องตอบ 404 Not Found
- nonExistentClubReturns404: SUCCESS (0.035 s)
- inactiveClubReturns404: SUCCESS (0.032 s)
- roundsForNonExistentClubReturns404: SUCCESS (0.032 s)
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.099 s

[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

---

## 5. การตรวจสอบความเข้ากันได้ของ Frontend (Frontend UI & UX Verification)

จากการตรวจสอบ Component [`ClubDetailPage.tsx`](file:///c:/Users/siraw/Documents/University/CS261_Project/TU_ClubHub_CS261/frontend/src/features/clubs/components/ClubDetailPage.tsx) ที่ได้รับการอนุมัติใน PR #45:
1. **Fallback Image Mechanism (`AC-05`, `BR-07`):**
   - มีการกำหนด State `imgSrc` เริ่มต้นด้วย `DEFAULT_COVER_IMAGE` และผูก Event `onError={() => setImgSrc(DEFAULT_COVER_IMAGE)}` เพื่อรองรับกรณีที่ URL รูปภาพโหลดไม่ขึ้น โดยที่เนื้อหาส่วนอื่น ๆ ไม่ได้รับผลกระทบ
2. **Conditional Contact Display (`AC-01`):**
   - ใช้ฟังก์ชัน `formatUrl` และเงื่อนไข `{(facebookUrl || instagramUrl || emailUrl) && ...}` เพื่อซ่อนช่องทางติดต่อที่ไม่มีข้อมูลจริง ป้องกันปัญหา Broken Link (`https://undefined`)
3. **Dynamic Action Navigation (`AC-02`, `BR-04`):**
   - ปุ่มสมัครเข้าร่วมชมรมดึง ID รอบจริงจาก `club.activeRound.id` ส่งต่อไปยังฟังก์ชัน `onNavigateToApplication(targetRoundId)` ได้อย่างถูกต้อง พร้อมทั้งแสดงกล่องแจ้งเตือน "ไม่มีรอบรับสมัครในขณะนี้" เมื่อไม่มีรอบเปิดรับ

---

## 6. สรุปผลการทดสอบและการตรวจรับ (Conclusion & QA Sign-off)

- **อัตราการผ่านการทดสอบ (Pass Rate):** **100% (9/9 Test Scenarios)**
- **ความสอดคล้องกับ Acceptance Criteria:** ครอบคลุมครบถ้วนตั้งแต่ `AC-01` ถึง `AC-06`
- **ความมั่นคงปลอดภัย (Security & Integrity):** ไม่มีข้อมูลภายในหรือรอบ Draft รั่วไหลออกสู่ Public Endpoints
- **ผลการตรวจรับ:** **APPROVED ✅ ผ่านเกณฑ์การตรวจรับสำหรับ Task37:U02-QA-1 พร้อมส่งมอบเข้าสู่ Main**

ลงชื่อ: **สิรวิชญ์ กฤดาธิการวุฒิ**  
(QA / Tester & DevOps / Scrum Master)
