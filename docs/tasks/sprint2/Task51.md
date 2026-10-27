# Task51 [RECRUIT-01] แก้บักระบบคำถามคัดเลือก (ห้ามแก้/ลบคำถามที่มีคำตอบแล้ว)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task51` |
| **Feature Code** | `RECRUIT-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | โค้ดระบบคำถามคัดเลือก (US-08) จาก Sprint 1 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/aYz9CpAs](https://trello.com/c/aYz9CpAs) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** โค้ดระบบคำถามคัดเลือก (US-08) จาก Sprint 1

**จุดประสงค์ & บริบทของงาน**
ป้องกันข้อมูลคำตอบของผู้สมัครเพี้ยน โดยล็อกไม่ให้กรรมการแก้ไขหรือลบคำถามคัดเลือก หากมีผู้สมัครเริ่มตอบคำถามเข้ามาในระบบแล้ว

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Backend Validation:** ตรวจสอบใน Backend ก่อนลบหรือแก้ไขคำถาม หากพบคำตอบในฐานข้อมูลแล้ว ให้คืนข้อผิดพลาด `409 Conflict` (reason: `QUESTION_HAS_ANSWERS`)
2. **Frontend Error Handling:** ดักจับ Error Code นี้และแสดงกล่องข้อความเตือนผู้ใช้เข้าใจง่าย
3. **Automated Tests:** เขียน Unit Test และ Integration Test ครอบคลุมกรณีการแก้ไขคำถามที่มีคำตอบแล้วและยังไม่มีคำตอบ
4. **Documentation:** อัปเดต README / API Docs สำหรับกรณี Error นี้

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR แก้ไข Backend Validation และ Frontend Alert พร้อม Automated Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ยิง API แก้ไขหรือลบคำถามที่มีคนตอบแล้ว ได้รับ `409 Conflict` (reason: `QUESTION_HAS_ANSWERS`)
- [ ] คำถามที่ยังไม่มีใครตอบ สามารถแก้ไข ลบ หรือจัดเรียงลำดับได้ตามปกติ
- [ ] หน้า Frontend แสดงกล่องข้อความแจ้งเตือนอย่างชัดเจนเมื่อพบ Error นี้

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
