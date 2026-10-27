# Task72 [REPORT-02] พัฒนาหน้า Central Dashboard แสดงกราฟและสถิติภาพรวม

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task72` |
| **Feature Code** | `REPORT-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | เขมจิรา (FE2 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task71 (Report API) และ UI Wireframe จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | Khem |
| **Trello Card Link** | [https://trello.com/c/HeYEYWBE](https://trello.com/c/HeYEYWBE) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task71 (Report API) และ UI Wireframe จาก Task75

**จุดประสงค์ & บริบทของงาน**
สร้างหน้า Dashboard สรุปข้อมูลสำหรับผู้บริหาร/Admin แสดงตัวชี้วัดและแผนภูมิกราฟที่เข้าใจง่าย สวยงาม

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Stat Cards UI:** การ์ดสรุปตัวเลขสำคัญ (ยอดผู้สมัครทั้งหมด, ชมรมที่เปิดรับ, อัตราการยืนยันสิทธิ์)
2. **Data Charts:** แผนภูมิกราฟแท่ง/วงกลม แสดงสถิติผู้สมัครตามหมวดหมู่ชมรม และชมรมยอดนิยม
3. **Admin Route Protection:** บล็อกไม่ให้ผู้ใช้ทั่วไปมองเห็นหรือพิมพ์ URL แอบเข้าหน้านี้ได้

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าเว็บ Central Dashboard สำหรับ Admin พร้อม Component Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] แสดงตัวเลขสถิติและแผนภูมิกราฟถูกต้องตรงตามข้อมูลจาก API
- [ ] แผนภูมิตอบสนองสวยงาม โหลดข้อมูลได้อย่างราบรื่น
- [ ] ผู้ใช้ทั่วไปที่ไม่ใช่ Admin ไม่สามารถเข้าถึงหน้านี้ได้

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
