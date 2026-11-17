# Task56 [RELEASE-02] ติดตั้งระบบทดสอบและผ่าน Smoke Test บน Staging

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task56` |
| **Feature Code** | `RELEASE-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (QA / DevOps) & วรพล |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Workflow จาก Task84 และ fixture/seed สำหรับการตรวจชั่วคราว; ไม่ต้องมี server จริงตามที่ผู้ร้องขอระบุ |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/5BcWYA6t](https://trello.com/c/5BcWYA6t) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (QA / DevOps) & วรพล
- **Reviewer:** สิรวิชญ์ (QA)
- **Dependency:** Workflow จาก Task84 และ fixture/seed สำหรับการตรวจชั่วคราว; ไม่ต้องมี server จริงตามที่ผู้ร้องขอระบุ

**จุดประสงค์ & บริบทของงาน**
ตรวจสอบความพร้อมของเซิร์ฟเวอร์ Staging และรัน Smoke Test เพื่อยืนยันว่าระบบทำงานพื้นฐานได้สมบูรณ์

**ขอบเขตที่ผู้ร้องขอระบุภายหลัง:** ใช้ GitHub Actions runner และ Compose ชั่วคราว ไม่ต้องมี server จริง ผลตรวจจึงไม่ยืนยัน Staging ถาวรหรือ URL สาธารณะ ให้ Owner/Reviewer ยืนยันเกณฑ์ของ Task56 ก่อนปิด โดยเก็บข้อความและ checkbox เดิมไว้ด้านล่าง

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Environment Verification:** ตรวจสอบ Database, Container, และ Environment Variables บน Staging
2. **Smoke Test Execution:** ทดสอบ Endpoint พื้นฐาน, หน้าแรกของเว็บ, และ Health Check
3. **Execution Log:** บันทึกผล Smoke Test ลงใน Test Log

**Artefact (ชิ้นงานที่ต้องส่ง)**
- [บันทึกผลการรัน Smoke Test บน Staging Environment](../../testing/task56-staging-smoke-test-report.md)

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] คอนเทนเนอร์และฐานข้อมูลรันขึ้นอย่างเสถียรบน Staging
- [x] Health Check Endpoint ตอบกลับสถานะ UP
- [x] สามารถเข้าถึงหน้าแรกของเว็บไซต์ได้โดยไม่มี Error 500

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
