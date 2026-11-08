# Task65 [REVIEW-01] ทำ Backend API รายการและรายละเอียดผู้สมัครสำหรับกรรมการ

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task65` |
| **Feature Code** | `REVIEW-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task74–75 (Permission Matrix) และ Seed Data จาก Task55 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | ariyawe krittayabunlue|
| **Trello Card Link** | [https://trello.com/c/f990dC8q](https://trello.com/c/f990dC8q) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task74–75 (Permission Matrix) และ Seed Data จาก Task55

**จุดประสงค์ & บริบทของงาน**
พัฒนา API สำหรับกรรมการชมรมเปิดดูรายชื่อผู้สมัครและตรวจคำตอบของผู้สมัครแต่ละคนอย่างปลอดภัยตามสิทธิ์ชมรมตนเอง

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Club Applications List API:** พัฒนา `GET /api/v1/clubs/:id/applications` รองรับการกรองตามสถานะและรอบรับสมัคร
2. **Application Detail API:** พัฒนา `GET /api/v1/clubs/:id/applications/:appId` เพื่อดูคำตอบและเอกสารแนบของผู้สมัคร
   > **Requester decision 2026-11-08 / Pending Team Review:** ยืนยันให้ใช้ `GET /api/v1/clubs/{id}/applications` (มี optional `roundId` filter) และ `GET /api/v1/clubs/{id}/applications/{appId}` ตามการ์ดนี้ แทน round-scoped GET ที่ยังไม่ implement ใน Task75 เดิม ไม่สร้าง GET alias และตัด `reviews`, `internalComment`, ข้อมูลผู้ประเมิน/decision actors ออกจาก read DTO ตาม [API §13](../../api/API_v1.md#13-committee-application-reads-task65) ส่วน Optional `start-review` และ decision writes ยังเป็นงานแยก ไม่ได้ implement ใน Task65
3. **Club Committee Security Check:** ตรวจสอบสิทธิ์เข้มงวดให้ดูได้เฉพาะผู้สมัครของชมรมที่ตนเองเป็นกรรมการเท่านั้น
4. **Automated Tests:** เขียน Test ตรวจสอบการเข้าถึงทั้งกรณีที่มีสิทธิ์และไม่มีสิทธิ์

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend Application Review API พร้อมชุด Automated Permission Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] กรรมการชมรมดึงรายการและคำตอบของผู้สมัครในชมรมตนเองได้ครบถ้วน
- [ ] กรรมการชมรมอื่นหรือผู้ใช้ทั่วไป ไม่สามารถเข้าถึงข้อมูลผู้สมัครได้ (`403 Forbidden`)

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
