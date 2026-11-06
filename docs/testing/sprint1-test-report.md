# Sprint 1 Test Report (Task48:U03-QA-2)

เทียบผลทดสอบกับ Acceptance Criteria ของ Story ใน Sprint 1 ณ วันที่ 1 พ.ย. 2026 ที่ commit `ad2468a`

**หลักฐานที่ใช้:**
- CI บน `main` (backend `mvnw verify` กับ PostgreSQL และ frontend `lint`/`test`/`build`)
- ชุดทดสอบในเครื่องที่ commit นี้: backend 427 tests และ frontend 48 tests ผ่านทั้งหมด
- รายงานย่อยที่ลิงก์ไว้ในแต่ละแถว
- การทดสอบผ่านเบราว์เซอร์ใน [U03 flow report](task48-u03-flow-report.md) บน [ระบบที่ติดตั้งด้วย Docker Compose](task47-deployment-report.md)

## สรุป

| Story | SP | ผล | ที่ยังขาด |
|---|---:|---|---|
| US-02 ดูรายละเอียดชมรม | 2 | **ผ่าน 4/6, AC-02 และ AC-05 บางส่วน** | AC-02 การ์ดรอบยังไม่แสดงรายละเอียด/คุณสมบัติ, AC-05 โลโก้ยังไม่มีรูปสำรอง (ทบทวน 6 พ.ย.) |
| US-03 ส่งใบสมัคร | 8 | **ผ่าน 5/6, AC-06 บางส่วน** | AC-06 ส่วน "แสดงในหน้าประวัติทันที" ต้องใช้ US-04 (`/me/applications` ยังไม่ทำ) |
| US-06 แก้ไขโปรไฟล์ชมรม | 5 | **ผ่าน 4/5, AC-01 บางส่วน** | AC-01 ยังแก้หมวดหมู่และแท็กไม่ได้ |
| US-07 จัดการรอบรับสมัคร | 3 | **ผ่าน 4/5, AC-01 บางส่วน** | AC-01 สร้างและเผยแพร่ผ่าน UI ได้แล้ว แต่ยังไม่มี UI แก้ไขหรือปิดรอบ (มีแค่ API) |
| US-08 คำถามคัดเลือก | 2 | **ผ่านครบ 5/5** | ยังไม่มี reason `QUESTION_HAS_ANSWERS` แยก (ยกไปทำใน Task51) |

## รายละเอียดราย AC

| Story / AC | ผล | หลักฐาน |
|---|---|---|
| US-02 AC-01 ดูข้อมูลสาธารณะโดยไม่ Login | Pass | [task37](task37-public-club-details-test-report.md) TC-02-01 |
| US-02 AC-02 แสดงรอบที่เปิดและปุ่มไปสมัคร | บางส่วน | ปุ่มสมัครใช้งานได้ (task37 TC-02-02, flow ขั้น 4–5) แต่การ์ดรอบแสดงแค่ชื่อรอบกับช่วงเวลา ไม่มีรายละเอียด คุณสมบัติ และกำหนดประกาศผล เพราะ Public API ไม่ส่งฟิลด์เหล่านี้ (ทบทวน 6 พ.ย.) |
| US-02 AC-03 ไม่มีรอบเปิดต้องแจ้งชัดเจน | Pass | ทดสอบผ่านเบราว์เซอร์ 1 พ.ย.: `/clubs/1` แสดง "ไม่มีรอบรับสมัครในขณะนี้" |
| US-02 AC-04 ไม่เปิดเผยรอบร่าง | Pass | task37 TC-02-04/05 |
| US-02 AC-05 รูปโหลดไม่ได้ใช้รูปเริ่มต้น | บางส่วน | แบนเนอร์มี `onError` เปลี่ยนเป็นรูปเริ่มต้น แต่โลโก้ชมรมไม่มี ถ้าลิงก์โลโก้เสียจะเห็นรูปแตก (ทบทวนโค้ด 6 พ.ย.; task37 TC-02-06 ทดสอบเฉพาะกรณีไม่มีรูป) |
| US-02 AC-06 ชมรมไม่มีอยู่หรือไม่เผยแพร่แสดง 404 | Pass | task37 TC-02-07 |
| US-03 AC-01 – AC-05 | Pass | [TC-03-01..08](task45-u03-qa-test-cases.md) ทั้งเทสต์อัตโนมัติและผ่านเบราว์เซอร์ |
| US-03 AC-06 บันทึกครบ สถานะรอพิจารณา และเห็นในหน้าประวัติ | บางส่วน | บันทึกครบเป็น `SUBMITTED` (flow ขั้น 5) แต่ยังไม่มีหน้าประวัติ (US-04) |
| US-06 AC-01 แก้ข้อมูลชมรม | บางส่วน | [task13](task13-club-profile-test-report.md) และ flow ขั้น 2 แก้ชื่อ คำอธิบาย วัตถุประสงค์ ช่องทางติดต่อได้ แต่ยังแก้หมวดหมู่และแท็กไม่ได้ |
| US-06 AC-02 – AC-03 ตรวจ HTTPS และรูปแบบช่องทางติดต่อ | Pass | task13 TC-06-03 ขึ้นไป และ `clubProfileValidation.test.ts` |
| US-06 AC-04 ตรวจสิทธิ์กรรมการและวาระทุกครั้ง | Pass | [task04](task04-club-committee-security-test-report.md) และ `CommitteeRevocationConcurrencyIntegrationTest` |
| US-06 AC-05 หน้าสาธารณะอัปเดตทันที | Pass | task13 และ flow ขั้น 4 (คำอธิบายใหม่แสดงทันที) |
| US-07 AC-01 สร้าง แก้ไข เผยแพร่ ปิดรอบ | บางส่วน | API ครบ (`RecruitmentRoundServiceTest`, `RecruitmentRoundControllerTest`) และ UI สร้างกับเผยแพร่ได้ (flow ขั้น 3) แต่ยังไม่มี UI แก้ไขหรือปิดรอบ |
| US-07 AC-02 เปิดต้องก่อนปิด | Pass | backend ตรวจใน `RoundWriteRequest` และ `RecruitmentRoundService` (ตรวจจากโค้ด ยังไม่มี backend test เฉพาะกฎนี้) และ `recruitmentValidation.test.ts` |
| US-07 AC-03 รอบที่เปิดอยู่แสดงบนหน้าชมรม | Pass | flow ขั้น 4 |
| US-07 AC-04 ปิดก่อนกำหนดแล้วหยุดรับทันที | Pass | flow ขั้น 6 และ `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock` |
| US-07 AC-05 ไม่ใช่กรรมการได้ 403 | Pass | `RecruitmentRoundApplicantRestrictionIntegrationTest` และ `RecruitmentRoundControllerTest` |
| US-08 AC-01 – AC-02 เพิ่ม แก้ ลบ เรียง และบังคับตอบ | Pass | [task29](task29-application-questions-test-report.md) 21/21 และ [การตรวจหา defect](task29-question-defect-review.md) (แก้ข้อความใน UI 2 จุดแล้ว) |
| US-08 AC-03 ฟอร์มแสดงตามลำดับ | Pass | `applicationFormListsTextQuestionsInOrderWithoutCsrfOrWrites` และ flow ขั้น 5 |
| US-08 AC-04 ลบคำถามที่มีคำตอบไม่ได้ | Pass | `ApplicationQuestionIntegrityIntegrationTest` (ได้ 409 แต่ยังไม่มี reason เฉพาะ) |
| US-08 AC-05 ไม่กระทบรอบอื่น | Pass | task29 TC-08-06 |

## สิ่งที่ยังไม่ได้ทดสอบ

- **Login กับ TU จริง (Task48:U03-BE-1):** ต้องมี Application-Key และบัญชีจริง การทดสอบทั้งหมดในรายงานนี้ใช้ mock มี log ของการเรียก TU แล้ว (`RealTuAuthClient`) แต่ยังไม่ได้ยิงจริง
- **การติดตั้งบนเซิร์ฟเวอร์ที่คนอื่นเข้าถึงได้:** ทดสอบบนเครื่องสาธิตของทีมเท่านั้น

## Defect ที่พบใน Sprint นี้

แก้แล้วทั้งหมด ดูรายการใน [U03 flow report](task48-u03-flow-report.md) และ [security review](task46-submission-security-review.md)
