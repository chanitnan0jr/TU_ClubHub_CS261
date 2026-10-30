# Task83 [PIPELINE-02] ตั้งค่า GitHub Actions CI สำหรับ System Integration Tests พร้อม Database

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task83` |
| **Feature Code** | `PIPELINE-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ วรพล (DevOps) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (DevOps / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task82 (CI พื้นฐาน) และ Flyway Migration จาก Task55 |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/efbn4Fes](https://trello.com/c/efbn4Fes) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ วรพล (DevOps)
- **Reviewer:** สิรวิชญ์ (DevOps / QA)
- **Dependency:** Task82 (CI พื้นฐาน) และ Flyway Migration จาก Task55

**จุดประสงค์ & บริบทของงาน**
สร้าง Pipeline อัตโนมัติที่ยกฐานข้อมูล PostgreSQL จำลองขึ้นมา เพื่อรัน Integration Tests ครบวงจรบน GitHub Actions

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Docker Service Container:** ตั้งค่า Service Container สำหรับ PostgreSQL ใน GitHub Actions
2. **Flyway Migration Run:** ให้ CI รันสคริปต์สร้างตารางฐานข้อมูลและใส่ Seed Data อัตโนมัติ
3. **Integration Test Suite:** รันชุดทดสอบ Integration Tests ครบทุก Feature
4. **Test Report Summary:** สรุปรายงานผลการทดสอบให้แสดงบนหน้า GitHub Actions

**Artefact (ชิ้นงานที่ต้องส่ง)**
- ไฟล์ GitHub Actions Workflow (`ci-integration.yml`) พร้อม Test Report บน GitHub

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] Pipeline เริ่มรัน PostgreSQL และรัน Flyway Migration ได้สำเร็จอัตโนมัติ
- [ ] Integration Tests รันผ่านครบ 100% บน GitHub Actions
- [ ] มีสรุปผลการทดสอบ (Test Report Summary) แสดงให้เห็นบน GitHub Actions

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
