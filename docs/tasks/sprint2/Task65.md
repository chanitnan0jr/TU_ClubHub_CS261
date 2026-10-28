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
| **สมาชิกบนการ์ด Trello** | - |
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
   > **หมายเหตุจาก Task75 (`openapi.yaml` Canonical Path):** ให้ใช้ Canonical Path แบบอ้างอิงตามรอบรับสมัคร คือ `GET /api/v1/rounds/{roundId}/applications`, `GET /api/v1/rounds/{roundId}/applications/{applicationId}`, และ Optional `POST /api/v1/rounds/{roundId}/applications/{applicationId}/start-review` ตาม [`docs/api/openapi.yaml`](../../api/openapi.yaml) และ [`docs/architecture/task75-sprint2-design.md`](../../architecture/task75-sprint2-design.md) โดยไม่ต้องเปิด Path Alias ซ้ำซ้อน
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
