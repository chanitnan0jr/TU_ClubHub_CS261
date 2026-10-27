# Task66 [REVIEW-02] พัฒนาหน้าจอดูรายชื่อและตรวจใบสมัครสำหรับกรรมการ

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task66` |
| **Feature Code** | `REVIEW-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ภูบดี (FE1 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task65 (Review API) และ UI Wireframe จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/Xep2Ru2D](https://trello.com/c/Xep2Ru2D) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task65 (Review API) และ UI Wireframe จาก Task75

**จุดประสงค์ & บริบทของงาน**
สร้างหน้าจอให้กรรมการชมรมตรวจใบสมัคร อ่านคำตอบ และดูไฟล์แนบของผู้สมัครได้อย่างสะดวก รวดเร็ว

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Applications Table UI:** ตารางแสดงรายชื่อผู้สมัคร, วันที่สมัคร, สถานะปัจจุบัน, และตัวกรองสถานะ
2. **Application Detail Modal / Page:** หน้าจอเปิดตรวจคำตอบที่ผู้สมัครกรอก พร้อมปุ่มดาวน์โหลด/ดูไฟล์แนบ
3. **Empty & Error States:** แสดงข้อความเมื่อยังไม่มีผู้สมัคร หรือเมื่อเกิดข้อผิดพลาดในการโหลดข้อมูล

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าจอตารางและหน้ารายละเอียดตรวจใบสมัครสำหรับกรรมการ พร้อม Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] กรรมการสามารถดูตารางรายชื่อผู้สมัครและกรองตามสถานะได้อย่างถูกต้อง
- [ ] คลิกดูรายละเอียดคำตอบและเอกสารแนบของผู้สมัครแต่ละคนได้สะดวกและครบถ้วน

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
