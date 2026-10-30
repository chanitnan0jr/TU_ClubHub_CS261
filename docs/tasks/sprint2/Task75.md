# Task75 [SYS-DESIGN] ออกแบบ API Contract, Database Schema และหน้าจอร่วมกัน

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task75` |
| **Feature Code** | `SYS-DESIGN` |
| **สถานะบน Trello** | `Doing` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (SE / System Architect) ร่วมกับทีม Backend & Frontend |
| **ผู้ตรวจรับ (Reviewer)** | ชนิตว์นันท์ (PO / SA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task74 (ต้องได้ Requirements และ Permission Matrix ก่อน) |
| **SDLC Labels** | 2. System & UI Design |
| **สมาชิกบนการ์ด Trello** | Sirawich Kridatikanwut_6809660027 |
| **Trello Card Link** | [https://trello.com/c/cauHoZZ5](https://trello.com/c/cauHoZZ5) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 2. System & Architecture Design
- **Owner:** สิรวิชญ์ (SE / System Architect) ร่วมกับทีม Backend & Frontend
- **Reviewer:** ชนิตว์นันท์ (PO / SA)
- **Dependency:** Task74 (ต้องได้ Requirements และ Permission Matrix ก่อน)

**จุดประสงค์ & บริบทของงาน**
กำหนดข้อตกลงทางเทคนิค (Contract) ร่วมกันระหว่าง Frontend และ Backend เพื่อให้ทั้งสองฝ่ายสามารถเริ่มเขียนโค้ดคู่ขนานกันได้ทันทีโดยไม่ต้องรอโค้ดเสร็จ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **OpenAPI / Swagger Spec:** ออกแบบ API Endpoints ทั้งหมดของ Sprint 2 พร้อม Request/Response Body และ Query Parameters
2. **Database Schema & ERD:** ออกแบบ Entity และตารางที่ต้องเพิ่ม/ปรับปรุง (สิทธิ์, สถิติ, การยืนยันสมาชิก)
3. **Error Handling Standard:** กำหนดรูปแบบ Error Response กลางตาม RFC 7807 Problem Details
4. **UI Wireframe Contract:** ตกลงหน้าจอและ Component ร่วมกับทีม Frontend

**Artefact (ชิ้นงานที่ต้องส่ง)**
- ไฟล์ OpenAPI Specification (`openapi.yaml` / Swagger)
- แผนภาพ ERD และ Database Schema Specification
- UI Component & Wireframe Contract

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] OpenAPI Spec ระบุ Endpoint ครบทุกฟีเจอร์ใน Sprint 2 พร้อมตัวอย่าง Response
- [ ] Database Schema และความสัมพันธ์ระหว่างตารางผ่านการรีวิวเรียบร้อย
- [ ] กำหนดมาตรฐาน Error Response RFC 7807 ชัดเจนตรงกัน
- [ ] ทีม Frontend และ Backend ตกลง Data Structure ตรงกัน 100%

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
