# Task64 [APP-04] พัฒนาระบบติดตามสถานะและประวัติใบสมัครของตนเอง

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task64` |
| **Feature Code** | `APP-04` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | เขมจิรา (FE2) & ณัฐชนินทร์ (Boom - Fullstack / Backend) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Application Seed Data จาก Task55 และ API Contract จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | Khem |
| **Trello Card Link** | [https://trello.com/c/odsZQcGt](https://trello.com/c/odsZQcGt) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2) & ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Application Seed Data จาก Task55 และ API Contract จาก Task75

**จุดประสงค์ & บริบทของงาน**
ให้นักศึกษาสามารถเปิดดูประวัติและติดตามสถานะใบสมัครชมรมทั้งหมดของตนเองได้อย่างสะดวก ทราบผลและขั้นตอนต่อไปได้ทันที

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **My Applications API:** พัฒนา `GET /api/v1/applications/my` ดึงเฉพาะใบสมัครของนักศึกษาที่ล็อกอินอยู่
   > **หมายเหตุจาก Task75 (`openapi.yaml` Canonical Path):** ให้ใช้ Canonical Path `GET /api/v1/me/applications` และ `GET /api/v1/me/applications/{applicationId}` ตาม [`docs/api/openapi.yaml`](../../api/openapi.yaml) และ [`docs/architecture/task75-sprint2-design.md`](../../architecture/task75-sprint2-design.md) (สอดคล้องกับ Header `Location` ของ `POST /api/v1/rounds/{roundId}/applications`) โดยไม่ต้องเปิด Path Alias ซ้ำซ้อน
2. **Application Status UI:** พัฒนาหน้าเว็บแสดงการ์ดใบสมัครแต่ละชมรม พร้อมป้ายสถานะ (รอตรวจ, นัดสัมภาษณ์, ผ่าน, ไม่ผ่าน)
3. **Timeline / Detail View:** แสดงรายละเอียดวันที่ส่ง, หมายเหตุจากกรรมการ, และขั้นตอนถัดไป
4. **Privacy Isolation:** ตรวจสอบอย่างรัดกุมไม่ให้เห็นข้อมูลใบสมัครของนักศึกษาคนอื่น

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR Backend API ดึงประวัติใบสมัคร + หน้าเว็บแสดงผลประวัติใบสมัคร พร้อม Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] นักศึกษาที่ล็อกอินสามารถดูประวัติใบสมัครชมรมทั้งหมดของตนเองได้ครบถ้วน
- [ ] สถานะใบสมัครและข้อความผลการคัดเลือกแสดงผลตรงตามข้อมูลในฐานข้อมูล
- [ ] ไม่สามารถมองเห็นข้อมูลใบสมัครของนักศึกษาคนอื่นได้โดยเด็ดขาด

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
