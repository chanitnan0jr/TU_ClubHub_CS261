# Task77 [AUTH-03] กำหนด Security Route Whitelist รวมศูนย์ API สาธารณะ

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task77` |
| **Feature Code** | `AUTH-03` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ณัฐชนินทร์ (Boom - Fullstack / Backend) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / DevOps) |
| **งานที่ต้องทำก่อน (Dependency)** | Public Route Contract จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | boom boom |
| **Trello Card Link** | [https://trello.com/c/kzEW8vKG](https://trello.com/c/kzEW8vKG) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE / DevOps)
- **Dependency:** Public Route Contract จาก Task75

**จุดประสงค์ & บริบทของงาน**
จัดระเบียบเส้นทาง API ทั้งหมดใน Spring Security ให้ปลอดภัย โดยล็อกทุก Endpoint ให้ต้อง Login ยกเว้นเฉพาะ Public API ที่อนุญาตให้คนทั่วไปเข้าถึงได้จริง ๆ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Centralize Whitelist:** รวมศูนย์รายการ Public Route ใน `SecurityConfig` ให้เหลือเฉพาะที่จำเป็น (เช่น ค้นหาชมรม `/api/v1/clubs`, ข้อมูลชมรม, และ `/actuator/health`)
2. **Enforce Authentication:** กำหนดให้เส้นทาง API อื่น ๆ ทั้งหมดต้องผ่าน Authentication เสมอ
3. **Verify DevOps Healthcheck:** ตรวจสอบว่า Endpoint สำหรับตรวจสอบสถานะระบบ (`/actuator/health`) ยังทำงานได้ปกติสำหรับระบบ Deployment
4. **Security Tests:** เขียน Test จำลองการเรียก API ทั้งแบบ Public และแบบที่ต้อง Login

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับปรุง `SecurityConfig` พร้อมชุด Automated Route Security Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] API ที่อยู่ใน Whitelist สามารถเข้าถึงได้โดยไม่ต้อง Login
- [ ] API อื่น ๆ ทั้งหมด หากไม่แนบ Session/Token จะได้รับ `401 Unauthorized` ทันที
- [ ] เส้นทาง `/actuator/health` ใช้งานได้สำหรับ DevOps Health Check

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
