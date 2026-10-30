# Task78 [AUTH-04] ป้องกันการแก้สิทธิ์กรรมการชมรมชนกัน (Concurrency Lock)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task78` |
| **Feature Code** | `AUTH-04` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Member Assignment Data Model จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/305vvsPC](https://trello.com/c/305vvsPC) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Member Assignment Data Model จาก Task75

**จุดประสงค์ & บริบทของงาน**
ป้องกันข้อมูลสิทธิ์เพี้ยนหากมี Admin สองคนเปิดหน้าจอพร้อมกันแล้วกดแก้ไข/แต่งตั้ง/ปลดสิทธิ์กรรมการชมรมในเสี้ยววินาทีเดียวกัน (Race Condition)

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Database Locking:** ใช้ Transaction Locking (เช่น `@Version` Optimistic Lock หรือ Pessimistic Lock) ในตาราง Assignment/Club Member
2. **Atomic Modification:** จัดลำดับการบันทึกข้อมูลและการตัดสิทธิ์ให้เป็น Transaction เดียวกัน
3. **Concurrency Testing:** เขียน Automated Test จำลองการส่งคำขอแก้ไขสิทธิ์พร้อมกันหลายๆ Threads เพื่อพิสูจน์ว่าข้อมูลไม่เพี้ยน

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR จัดการ Lock ใน Assignment Service พร้อม Concurrent Multi-threaded Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ทดสอบยิง Request แก้ไขสิทธิ์พร้อมกัน ข้อมูลผลลัพธ์ในฐานข้อมูลถูกต้องเสมอ ไม่เกิด Race Condition
- [ ] หากเกิดข้อขัดแย้ง (Conflict) ระบบส่ง Error แจ้งเตือนอย่างถูกต้อง และข้อมูลไม่เสียหาย

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
