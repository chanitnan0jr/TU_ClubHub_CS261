# Task82 [PIPELINE-01] ตั้งค่า GitHub Actions CI สำหรับ Build และรัน Unit Tests

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task82` |
| **Feature Code** | `PIPELINE-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ ณัฐชนินทร์ (Boom) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (DevOps / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | คำสั่ง Build/Test ของ Frontend และ Backend ใน Task75 |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | Sirawich Kridatikanwut_6809660027 |
| **Trello Card Link** | [https://trello.com/c/zDhfHLjO](https://trello.com/c/zDhfHLjO) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ ณัฐชนินทร์ (Boom)
- **Reviewer:** สิรวิชญ์ (DevOps / QA)
- **Dependency:** คำสั่ง Build/Test ของ Frontend และ Backend ใน Task75

**จุดประสงค์ & บริบทของงาน**
สร้าง Pipeline อัตโนมัติเพื่อตรวจสอบโค้ดและรัน Unit Tests ทุกครั้งที่มีการเปิด Pull Request ป้องกันไม่ให้โค้ดที่มีข้อผิดพลาดถูก Merge เข้าสู่ระบบ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **GitHub Actions Workflow:** เขียน workflow `.github/workflows/ci-build-test.yml`
2. **Frontend CI:** ตรวจสอบโค้ด, รัน Linter, และรัน Jest/Vitest Automated Tests
3. **Backend CI:** คอมไพล์โค้ด Java/Kotlin, รัน Gradle/Maven Unit Tests
4. **PR Status Check:** ตั้งค่าให้ Pull Request ต้องผ่าน CI จึงจะสามารถ Merge ได้

**Artefact (ชิ้นงานที่ต้องส่ง)**
- ไฟล์ GitHub Actions Workflow (`ci-build-test.yml`) พร้อมผลการรัน CI บน PR

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ทุก Pull Request ที่เปิดขึ้นมา ระบบจะรัน CI ตรวจสอบโค้ดโดยอัตโนมัติ
- [ ] หากมี Unit Test พัง หรือโค้ดคอมไพล์ไม่ผ่าน CI จะแจ้งเตือนและบล็อกการ Merge ทันที

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
