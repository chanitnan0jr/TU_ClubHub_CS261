# Task73 [RELEASE-05] ตรวจรับระบบรวม End-to-End และเตรียมพร้อมส่งมอบ Sprint 2

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task73` |
| **Feature Code** | `RELEASE-05` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (QA Lead) ร่วมกับทีมทั้ง 7 คน |
| **ผู้ตรวจรับ (Reviewer)** | ชนิตว์นันท์ (PO) & สมาชิกทุกคน |
| **งานที่ต้องทำก่อน (Dependency)** | ทุก Feature Tasks (Task62–72) ต้องเสร็จสิ้นเรียบร้อย |
| **SDLC Labels** | 4. Testing & QA, 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/CrQUam4X](https://trello.com/c/CrQUam4X) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 4. Testing & QA
- **Owner:** สิรวิชญ์ (QA Lead) ร่วมกับทีมทั้ง 7 คน
- **Reviewer:** ชนิตว์นันท์ (PO) & สมาชิกทุกคน
- **Dependency:** ทุก Feature Tasks (Task62–72) ต้องเสร็จสิ้นเรียบร้อย

**จุดประสงค์ & บริบทของงาน**
ทดสอบโฟลว์การทำงานจริงทุกฟีเจอร์ของ Sprint 2 ตั้งแต่ต้นจนจบ (End-to-End Test) และเตรียมความพร้อมสำหรับการนำเสนอผลงานให้อาจารย์

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **End-to-End Testing:** ทดสอบ Flow ทั้งหมด: ค้นหาชมรม -> ดูประวัติใบสมัคร -> กรรมการตรวจและประกาศผล -> ผู้สมัครยืนยันสิทธิ์ -> ดูสถิติบน Dashboard
2. **Bug Triage & Verification:** ตรวจสอบว่าไม่มีบักระดับ Critical หรือ Major หลงเหลืออยู่ในระบบ
3. **Release Notes & Demo Script:** เขียนสรุปสิ่งส่งมอบ (Release Notes) และเตรียมขั้นตอนการสาธิต (Demo Script) สำหรับพรีเซนต์

**Artefact (ชิ้นงานที่ต้องส่ง)**
- เอกสาร End-to-End Test Report
- เอกสาร Release Notes ของ Sprint 2
- Demo Script สำหรับการนำเสนออาจารย์

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ทดสอบ Flow การทำงานของ Sprint 2 ครบถ้วนทุกฟีเจอร์ และไม่มีบักระดับ Critical ตกค้าง
- [ ] มีเอกสาร Release Notes สรุปผลงานของ Sprint 2 อย่างเป็นทางการ
- [ ] เตรียมขั้นตอน Demo Script สำหรับการนำเสนออาจารย์เรียบร้อย

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
