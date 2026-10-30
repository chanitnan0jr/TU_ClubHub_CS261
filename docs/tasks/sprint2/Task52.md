# Task52 [APP-01] ทำ Backend API ส่งใบสมัครและบันทึกประวัติเริ่มต้น

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task52` |
| **Feature Code** | `APP-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Application Data Model จาก Task75 และ Recruitment Question จาก Task51 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/xMYk2zNW](https://trello.com/c/xMYk2zNW) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Application Data Model จาก Task75 และ Recruitment Question จาก Task51

**จุดประสงค์ & บริบทของงาน**
พัฒนา Backend API สำหรับรับข้อมูลการสมัครชมรม บันทึกคำตอบคำถามคัดเลือก เอกสารแนบ และบันทึกประวัติสถานะเริ่มต้นของใบสมัครลงฐานข้อมูลอย่างปลอดภัย

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Submission Endpoint:** พัฒนา `POST /api/v1/clubs/:id/applications` ตรวจสอบสถานะรอบรับสมัครว่ายังเปิดอยู่หรือไม่
2. **Atomic Transaction:** บันทึกใบสมัคร, คำตอบคำถามคัดเลือก (ข้อความ/ลิงก์), ข้อมูลผู้สมัคร, และประวัติสถานะเริ่มต้น (`SUBMITTED`) ให้อยู่ใน Database Transaction เดียวกัน
3. **Duplicate Prevention:** ตรวจสอบและป้องกันไม่ให้นักศึกษาส่งใบสมัครซ้ำในรอบรับสมัครเดียวกัน
4. **Validation:** ตรวจสอบความถูกต้องของข้อมูล (คำถามบังคับ Required ห้ามว่าง, ตรวจรูปแบบลิงก์)
5. **Automated Tests:** เขียน Unit Test และ Integration Test ครอบคลุมทั้งกรณีสมัครสำเร็จและกรณีส่งข้อมูลผิดเงื่อนไข

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend Application Submission Controller, Service, Repository พร้อมชุด Automated Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ส่งข้อมูลการสมัครถูกต้อง ข้อมูลใบสมัคร คำตอบ และประวัติเริ่มต้นถูกบันทึกลงฐานข้อมูลครบถ้วน
- [ ] หากรอบรับสมัครปิดแล้ว หรือผู้สมัครส่งใบสมัครซ้ำในรอบเดิม ระบบส่ง Error ปฏิเสธอย่างถูกต้อง
- [ ] หากข้อมูลไม่ผ่านการตรวจสอบ (เช่น ข้ามคำถามบังคับ) ระบบ Rollback ไม่ทิ้งข้อมูลตกค้างในฐานข้อมูล

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตงานและ Data/API Contract ชัดเจน ตรงตามข้อตกลงทีม
- [ ] พัฒนาและทดสอบผ่านครบตามเกณฑ์ Acceptance Criteria เฉพาะของการ์ด
- [ ] แนบ Pull Request, ผลการทดสอบ (Unit/Integration Tests), และ Artefact ครบถ้วน
- [ ] CI Pipeline รันผ่าน 100% (ทั้ง Frontend และ Backend)
- [ ] ผ่านการ Code Review จาก Reviewer และแก้ไขข้อเสนอแนะครบถ้วน
- [ ] Merge โค้ดเข้า Branch หลักเรียบร้อย พร้อมอัปเดตเอกสารที่เกี่ยวข้อง
