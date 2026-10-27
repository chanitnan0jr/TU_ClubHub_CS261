# Task74 [SYS-ANALYSIS] สรุปความต้องการ Flow ใบสมัคร และตารางสิทธิ์ระบบ Sprint 2

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task74` |
| **Feature Code** | `SYS-ANALYSIS` |
| **สถานะบน Trello** | `Reviewing & Testing` |
| **ผู้รับผิดชอบ (Owner)** | ชนิตว์นันท์ (PO / System Analyst) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (Scrum Master / QA Lead) |
| **งานที่ต้องทำก่อน (Dependency)** | เอกสาร Requirements เดิมของ Sprint 1 |
| **SDLC Labels** | 1. Analysis & Requirements |
| **สมาชิกบนการ์ด Trello** | Chanitnan Kitnantakhun_6809616862 |
| **Trello Card Link** | [https://trello.com/c/X8EeFScz](https://trello.com/c/X8EeFScz) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 1. Requirements & Analysis
- **Owner:** ชนิตว์นันท์ (PO / System Analyst)
- **Reviewer:** สิรวิชญ์ (Scrum Master / QA Lead)
- **Dependency:** เอกสาร Requirements เดิมของ Sprint 1

**จุดประสงค์ & บริบทของงาน**
วิเคราะห์ Business Logic, State Transition ของใบสมัคร และตารางสิทธิ์ (Permission Matrix) ของระบบ TU ClubHub ใน Sprint 2 ให้ทุกคนในทีมเข้าใจตรงกันก่อนเริ่มพัฒนา

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Application State Machine:** สรุปเงื่อนไขและ State Transition ของใบสมัคร (SUBMITTED -> UNDER_REVIEW -> INTERVIEW -> ACCEPTED / REJECTED -> CONFIRMED / DECLINED)
2. **Permission Matrix:** กำหนดสิทธิ์อย่างละเอียดว่าใครทำอะไรได้บ้าง (USER, CLUB_COMMITTEE ของชมรมตนเอง, ADMIN)
3. **Business Rules:** กำหนดเงื่อนไขเวลาการรับสมัคร, การยืนยันสิทธิ์, และการสละสิทธิ์
4. **ประสานงานทีม Dev:** ประชุมสรุปเงื่อนไขให้ Frontend, Backend และ QA เข้าใจตรงกัน

**Artefact (ชิ้นงานที่ต้องส่ง)**
- เอกสารสรุป Business Flow และ Permission Matrix อนุมัติใน Repo (`docs/`)

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] เอกสาร State Machine Flow และเงื่อนไขการเปลี่ยนสถานะใบสมัครครบถ้วน
- [x] ตารางสิทธิ์ (Permission Matrix) ระบุ Action และ Role ครบทุกกรณี
- [x] ทีม Dev (Frontend/Backend) และ QA ร่วมตรวจสอบและเห็นชอบตรงกัน

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [x] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [x] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
