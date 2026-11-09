# Task71 [REPORT-01] ทำ Backend API คำนวณสถิติภาพรวมสำหรับ Admin

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task71` |
| **Feature Code** | `REPORT-01` |
| **สถานะบน Trello** | `Doing` (In Review — PR #77) |
| **ผู้รับผิดชอบ (Owner)** | ณัฐชนินทร์ (Boom - Fullstack / Backend) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task79 (Role Check) และ Seed Data จาก Task55 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | boom boom|
| **Trello Card Link** | [https://trello.com/c/1YJliqm2](https://trello.com/c/1YJliqm2) |
| **Pull Request** | [PR #77](https://github.com/chanitnan0jr/TU_ClubHub_CS261/pull/77) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task79 (Role Check) และ Seed Data จาก Task55

**จุดประสงค์ & บริบทของงาน**
พัฒนา API สำหรับผู้ดูแลระบบกลาง (Admin) คำนวณตัวเลขสถิติภาพรวมทั้งมหาวิทยาลัย เช่น จำนวนผู้สมัคร, ชมรมยอดนิยม, และสัดส่วนการยืนยันสิทธิ์

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Admin Stats Endpoint:** พัฒนา `GET /api/v1/admin/dashboard/stats` รวมยอดผู้สมัคร, สถิติตามหมวดหมู่, และชมรมยอดนิยม 5 อันดับแรก
2. **Strict Admin Access:** ตรวจสอบสิทธิ์ให้เฉพาะผู้ใช้ที่มี Role ADMIN เท่านั้นที่สามารถเข้าถึงได้
3. **Query Optimization:** ใช้ Aggregation Query ที่มีประสิทธิภาพ ไม่โหลดข้อมูลทั้งหมดขึ้น Memory
4. **Automated Tests:** เขียน Test การคำนวณตัวเลขและ Test การป้องกันสิทธิ์

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend Admin Dashboard Stats API พร้อม Aggregation Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] คำนวณตัวเลขสถิติถูกต้องตรงกับข้อมูลจริงในฐานข้อมูล
- [x] จำกัดสิทธิ์เฉพาะผู้ใช้ Role ADMIN เท่านั้นที่เข้าถึงได้ (`403 Forbidden` สำหรับคนอื่น)
- [x] Query ทำงานรวดเร็ว มีประสิทธิภาพ

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [x] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
