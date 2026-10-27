# Task54 [APP-03] ตรวจรับกระบวนการส่งใบสมัครจากหน้าจอถึงฐานข้อมูล (E2E Test)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task54` |
| **Feature Code** | `APP-03` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ณัฐชนินทร์ (Boom) & สิรวิชญ์ (QA Lead) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (QA Lead) |
| **งานที่ต้องทำก่อน (Dependency)** | Task52 (Backend API) และ Task53 (Frontend Form) |
| **SDLC Labels** | 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/JzyJS9c6](https://trello.com/c/JzyJS9c6) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom) & สิรวิชญ์ (QA Lead)
- **Reviewer:** สิรวิชญ์ (QA Lead)
- **Dependency:** Task52 (Backend API) และ Task53 (Frontend Form)

**จุดประสงค์ & บริบทของงาน**
ทดสอบโฟลว์การสมัครชมรมตั้งแต่การกรอกข้อมูลหน้าจอเว็บ ไปจนถึงการจัดเก็บลงฐานข้อมูลจริง เพื่อยืนยันความสมบูรณ์และถูกต้องของกระบวนการทั้งหมด (End-to-End Test)

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **End-to-End Flow Verification:** ทดสอบกรอกฟอร์มจริงผ่านหน้าเว็บ ตรวจสอบการส่งข้อมูล และตรวจสอบข้อมูลใน Database
2. **Edge Case Testing:** ทดสอบกรณีรอบรับสมัครปิดระหว่างกำลังกรอก, กรอกข้อมูลอักขระพิเศษ, และการส่งพร้อมกัน
3. **Database Audit:** ตรวจสอบความครบถ้วนของข้อมูลในตาราง `applications`, `answers`, และ `application_history`
4. **Test Documentation:** บันทึกผลการทดสอบ Test Cases (Pass/Fail) ลงใน Test Report

**Artefact (ชิ้นงานที่ต้องส่ง)**
- รายงานผลการตรวจรับ End-to-End Application Submission Test Report

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ทดสอบ Flow การสมัครตั้งแต่หน้าเว็บจนถึงฐานข้อมูลผ่าน 100% ข้อมูลบันทึกถูกต้องตรงกัน
- [ ] เมื่อรอบรับสมัครปิดระหว่างกรอก ระบบแจ้งเตือนชัดเจนและไม่สร้างใบสมัครผิดเงื่อนไข
- [ ] ผลการทดสอบทุก Test Cases ผ่านการตรวจรับและไม่มี Defect ตกค้าง

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตงานและ Data/API Contract ชัดเจน ตรงตามข้อตกลงทีม
- [ ] พัฒนาและทดสอบผ่านครบตามเกณฑ์ Acceptance Criteria เฉพาะของการ์ด
- [ ] แนบ Pull Request, ผลการทดสอบ (Unit/Integration Tests), และ Artefact ครบถ้วน
- [ ] CI Pipeline รันผ่าน 100% (ทั้ง Frontend และ Backend)
- [ ] ผ่านการ Code Review จาก Reviewer และแก้ไขข้อเสนอแนะครบถ้วน
- [ ] Merge โค้ดเข้า Branch หลักเรียบร้อย พร้อมอัปเดตเอกสารที่เกี่ยวข้อง
