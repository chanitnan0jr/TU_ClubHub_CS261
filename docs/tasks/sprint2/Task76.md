# Task76 [AUTH-02] ดึงข้อมูลนักศึกษาจาก TU API บันทึกเป็น Student Profile

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task76` |
| **Feature Code** | `AUTH-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task74–75 (Profile Contract และ TU Login Flow เดิม) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | 34Woraphon Pupatanun |
| **Trello Card Link** | [https://trello.com/c/IasSbhS7](https://trello.com/c/IasSbhS7) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task74–75 (Profile Contract และ TU Login Flow เดิม)

**จุดประสงค์ & บริบทของงาน**
ปรับระบบ TU Login ให้ดึงและบันทึกข้อมูล Student Profile ลงฐานข้อมูลอย่างถูกต้องสมบูรณ์ ป้องกันข้อมูลสูญหายและแยกแยะประเภทบัญชีอย่างรัดกุม

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Student ID Preservation:** รักษาเลข 0 นำหน้าของรหัสนักศึกษา (เช่น `066...`) ไม่ให้ถูกแปลงเป็นตัวเลขแล้วเลข 0 หาย
2. **Account Type Handling:** ตรวจสอบสถานะบัญชี หากเป็นบุคลากร/อาจารย์ (employee) ต้องไม่สร้าง Student Profile ในระบบ
3. **Atomic Login Transaction:** หากการบันทึก User หรือ Student Profile ล้มเหลว ต้อง Rollback และไม่อนุญาตให้สร้าง Session สำเร็จ
4. **Automated Mock Tests:** เขียน Test ครอบคลุมกรณี: นักศึกษาล็อกอินครั้งแรก, นักศึกษาเดิมล็อกอินซ้ำ, และบัญชีบุคลากร

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับปรุง TU Auth Service และ Student Profile Mapper พร้อมชุด Automated Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ล็อกอินด้วยบัญชีนักศึกษาใหม่ สร้าง Student Profile ใน DB สำเร็จ และเลข 0 นำหน้าไม่หาย
- [ ] บัญชีบุคลากร (employee) ไม่ถูกสร้างเป็น Student Profile ในระบบ
- [ ] หากบันทึกข้อมูลไม่สำเร็จ ระบบไม่ออก Session และไม่ปล่อยให้เข้าสู่ระบบได้

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
