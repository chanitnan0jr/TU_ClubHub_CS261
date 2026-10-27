# Task55 [RELEASE-01] เตรียมสคริปต์ Database Migration และข้อมูลจำลอง (Seed Data)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task55` |
| **Feature Code** | `RELEASE-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1) & ณัฐชนินทร์ (Boom - Fullstack / Backend) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (QA / DevOps) |
| **งานที่ต้องทำก่อน (Dependency)** | Database Schema จาก Task75 |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | 34Woraphon Pupatanun, boom boom |
| **Trello Card Link** | [https://trello.com/c/In5ZiJvm](https://trello.com/c/In5ZiJvm) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 5. Deployment & DevOps
- **Owner:** วรพล (BE1) & ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (QA / DevOps)
- **Dependency:** Database Schema จาก Task75

**จุดประสงค์ & บริบทของงาน**
จัดเตรียมโครงสร้างฐานข้อมูลและข้อมูลจำลอง (Mock/Seed Data) ที่สมบูรณ์ เพื่อให้ทุกคนในทีมสามารถนำไปใช้ทดสอบระบบ Sprint 2 ได้ทันทีโดยไม่ต้องรอกรอกข้อมูลมือ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Flyway Migration:** เขียนสคริปต์ `.sql` สำหรับสร้างหรืออัปเดตตารางฐานข้อมูลให้ตรงกับ ERD ของ Sprint 2
2. **Seed Data:** จัดทำข้อมูลจำลองครบวงจร: ข้อมูลชมรม, บัญชีกรรมการชมรม, รอบรับสมัคร, และใบสมัครตัวอย่างที่มีสถานะต่าง ๆ (รอตรวจ, ผ่าน, ไม่ผ่าน) สำหรับทดสอบ US-04, 05, 09, 10
3. **Data Privacy Check:** ตรวจสอบว่าในไฟล์ Seed Data ต้องไม่มีรหัสผ่านจริงของนักศึกษา มธ.

**Artefact (ชิ้นงานที่ต้องส่ง)**
- สคริปต์ Flyway Migration (`V...__*.sql`)
- สคริปต์ชุดข้อมูลทดสอบ Seed Data พร้อมวิธีรันใน README

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] รัน Flyway Migration บน Database ใหม่แล้วผ่าน 100% สามารถรันซ้ำได้ (Idempotent)
- [ ] มีชุดข้อมูลจำลองสำหรับชมรม, กรรมการ, และใบสมัครครบทุกสถานะ พร้อมใช้ทดสอบทันที
- [ ] ตรวจสอบแล้วว่าไม่มีข้อมูลความลับหรือรหัสผ่านจริงในชุด Seed Data

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
