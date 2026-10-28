# Task62 [CLUB-01] ทำ Backend API ค้นหาและกรองชมรม (Public API)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task62` |
| **Feature Code** | `CLUB-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | OpenAPI Spec จาก Task75 และ Seed Data จาก Task55 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/VY017bis](https://trello.com/c/VY017bis) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** OpenAPI Spec จาก Task75 และ Seed Data จาก Task55

**จุดประสงค์ & บริบทของงาน**
พัฒนา Backend API สำหรับค้นหาและกรองข้อมูลชมรม ให้บุคคลทั่วไปสามารถเรียกดูข้อมูลชมรมที่เปิดรับสมัครได้อย่างสะดวก รวดเร็ว

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Search & Filter Endpoint:** พัฒนา `GET /api/v1/clubs` รองรับการค้นหาตามชื่อชมรม, หมวดหมู่ชมรม, และสถานะการเปิดรับสมัคร
   > **หมายเหตุจาก Task75 (`openapi.yaml` Canonical Path):** ให้ใช้ Canonical Path `GET /api/v1/public/clubs` (พร้อม `GET /api/v1/public/club-categories` และ `GET /api/v1/public/interest-tags`) ตาม [`docs/api/openapi.yaml`](../../api/openapi.yaml) และ [`docs/architecture/task75-sprint2-design.md`](../../architecture/task75-sprint2-design.md) เพื่อให้ตรงกับ `PublicRoutes.java` โดยไม่ต้องเปิด Path Alias ซ้ำซ้อน
2. **Pagination & Sorting:** รองรับการแบ่งหน้า (page, size) และการเรียงลำดับ
3. **Performance Optimization:** เขียน Query ที่มีประสิทธิภาพ และใส่ Index ที่จำเป็น
4. **Automated Tests:** เขียน Unit Test และ Integration Test ตรวจสอบเงื่อนไขการค้นหาและกรอง

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR พัฒนา Club Search Controller, Service, Repository พร้อมชุด Automated Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ค้นหาตามชื่อชมรมได้ทั้งภาษาไทยและภาษาอังกฤษ และผลลัพธ์ตรงกับเงื่อนไข
- [ ] กรองตามหมวดหมู่ชมรมและสถานะการเปิดรับสมัครได้ถูกต้อง
- [ ] ระบบแบ่งหน้า (Pagination) ทำงานถูกต้อง และตอบสนองรวดเร็ว

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
