# Task69 [MEMBER-01] ทำ Backend API ยืนยันสิทธิ์/สละสิทธิ์ และเพิ่มเป็นสมาชิกชมรม

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task69` |
| **Feature Code** | `MEMBER-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Result API จาก Task67 และ Member Schema จาก Task55 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/QLoXKZxo](https://trello.com/c/QLoXKZxo) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Result API จาก Task67 และ Member Schema จาก Task55

**จุดประสงค์ & บริบทของงาน**
พัฒนา API ให้ผู้สมัครที่ผ่านการคัดเลือกกดยืนยันสิทธิ์หรือสละสิทธิ์ และบันทึกชื่อเข้าเป็นสมาชิกชมรมในฐานข้อมูลอัตโนมัติ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Confirm & Decline Endpoints:** พัฒนา `POST /api/v1/applications/:id/confirm` และ `/decline`
2. **Automatic Member Creation:** เมื่อกดยืนยันสิทธิ์ ให้สร้าง Record ในตาราง Club Member โดยอัตโนมัติภายใน Transaction เดียวกัน
3. **Deadline & Status Validation:** ตรวจสอบว่าต้องเป็นใบสมัครที่ผ่านการคัดเลือกและยังไม่เลยกำหนดเวลา
4. **Automated Tests:** เขียน Test กรณีการยืนยันสิทธิ์สำเร็จ, การสละสิทธิ์, และกรณีหมดเวลา

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend Confirmation API พร้อม Transaction Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ผู้สมัครที่ผ่านการคัดเลือกสามารถกดยืนยันสิทธิ์หรือสละสิทธิ์ได้ภายในเวลาที่กำหนด
- [ ] เมื่อยืนยันสิทธิ์สำเร็จ ระบบเพิ่มชื่อเข้าตารางสมาชิกชมรม (Member) ทันทีอย่างถูกต้อง
- [ ] ผู้ที่ไม่ผ่านการคัดเลือก หรือผู้ที่เลยกำหนดเวลา ไม่สามารถเรียก API นี้ได้

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
