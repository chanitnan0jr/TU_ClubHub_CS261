# Task63 [CLUB-02] พัฒนาหน้าค้นหาและกรองชมรม (Frontend UI)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task63` |
| **Feature Code** | `CLUB-02` |
| **สถานะบน Trello** | `Doing` (In Review — PR #71) |
| **ผู้รับผิดชอบ (Owner)** | ภูบดี (FE1 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task62 (Club Search API) และ UI Wireframe จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | Phubordee Srithan |
| **Trello Card Link** | [https://trello.com/c/2lhyMkQN](https://trello.com/c/2lhyMkQN) |
| **Pull Request** | [PR #71](https://github.com/chanitnan0jr/TU_ClubHub_CS261/pull/71) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task62 (Club Search API) และ UI Wireframe จาก Task75

**จุดประสงค์ & บริบทของงาน**
สร้างหน้าจอค้นหาและแสดงรายการชมรมที่ใช้งานง่าย สวยงาม แสดงผลการค้นหาได้ทันที และรองรับทั้งหน้าจอมือถือและคอมพิวเตอร์

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Search & Filter UI:** สร้างช่องค้นหาข้อความ, Dropdown เลือกหมวดหมู่ชมรม, และ Toggle ตัวกรองสถานะรับสมัคร
2. **Club Cards Grid:** แสดงผลชมรมเป็นการ์ดที่สวยงาม แสดงโลโก้, ชื่อ, คำอธิบายสั้น, และป้ายสถานะ
3. **State Handling:** แสดงสถานะ Loading ระหว่างดึงข้อมูล และ Empty State เมื่อค้นหาไม่พบข้อมูล
4. **Responsive Design:** ปรับแต่งให้แสดงผลได้สวยงามบนทุกขนาดหน้าจอ

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าจอค้นหาและกรองชมรม พร้อม Frontend Component Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] ผู้ใช้สามารถพิมพ์ค้นหาและเลือกตัวกรองแล้วผลลัพธ์อัปเดตอย่างถูกต้อง
- [x] คลิกที่การ์ดชมรมเพื่อเปิดดูหน้ารายละเอียดชมรมได้
- [x] แสดงผล Responsive ใช้งานได้ดีทั้งบนมือถือและคอมพิวเตอร์

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [x] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
