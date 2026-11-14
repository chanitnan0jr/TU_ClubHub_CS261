# Task67 [RESULT-01] ทำ Backend API บันทึกผลการคัดเลือกและประกาศผล

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task67` |
| **Feature Code** | `RESULT-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task65 และ Permission Matrix จาก Task74 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/FI0N4S2e](https://trello.com/c/FI0N4S2e) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task65 และ Permission Matrix จาก Task74

**จุดประสงค์ & บริบทของงาน**
พัฒนา API ให้กรรมการชมรมบันทึกผลการคัดเลือก (ผ่าน/ไม่ผ่าน/ตัวสำรอง) และสั่งประกาศผลอย่างปลอดภัย มีการควบคุมการเผยแพร่ข้อมูลอย่างถูกต้อง

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Evaluation Endpoint:** พัฒนา API บันทึกผลการคัดเลือกและหมายเหตุรายบุคคลหรือรายกลุ่ม
2. **Publish Result Endpoint:** พัฒนา API สำหรับกดยืนยันประกาศผล (Publish Results) อย่างเป็นทางการ
3. **Draft Status Control:** ผลการคัดเลือกในสถานะ Draft จะยังไม่ถูกเปิดเผยต่อนักศึกษาจนกว่าจะกด Publish
4. **Audit Logging:** บันทึกประวัติว่ากรรมการท่านใดเป็นผู้บันทึกผลและประกาศผลเมื่อเวลาใด

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend Evaluation & Publish Result API พร้อม Automated Tests

---

## 2. รายการตรวจสอบ (Checklists)

### Implementation handoff — 2026-11-13

พัฒนาใน branch `feat/task67-result-publishing` ตาม [API contract §15](../../api/API_v1.md#15-selection-decisions-and-publication-task67)
และ [review/test packet](../../testing/task67-selection-results.md) ผู้ใช้ยืนยันให้ยึด
`ACCEPTED/REJECTED` ตาม docs เดิม (**ยังไม่รองรับตัวสำรอง**) และ batch แบบ atomic
มี evaluation editor GET แยกจาก Task65 read DTO และเพิ่ม durable audit ใน V6
สถานะ checklist ด้านล่างยังไม่ใช่หลักฐานว่า CI, PO/Reviewer หรือ merge ผ่านแล้ว

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] บันทึกผลการคัดเลือกได้ถูกต้อง และสถานะใบสมัครเปลี่ยนตามที่กำหนด
- [x] ผลการคัดเลือกจะยังไม่แสดงต่อนักศึกษาจนกว่ากรรมการจะกดยืนยันประกาศผล (Publish)
- [x] มี Audit Log บันทึกประวัติการบันทึกและประกาศผลอย่างครบถ้วน

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [x] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
