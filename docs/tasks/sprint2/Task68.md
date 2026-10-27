# Task68 [RESULT-02] พัฒนาหน้าจอประเมินคะแนนและกดยืนยันประกาศผล

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task68` |
| **Feature Code** | `RESULT-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ภูบดี (FE1 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task67 (Result API) และ Task66 (Review UI) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/buiXkPO3](https://trello.com/c/buiXkPO3) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task67 (Result API) และ Task66 (Review UI)

**จุดประสงค์ & บริบทของงาน**
สร้างหน้าจอให้กรรมการกดเลือกผลการคัดเลือก ใส่หมายเหตุ และกดปุ่มประกาศผลพร้อมกล่องเตือนยืนยัน ป้องกันการเผลอกดประกาศผลผิดพลาด

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Evaluation Form UI:** ทำปุ่ม/Dropdown ให้กรรมการเลือกผล (ผ่าน, ไม่ผ่าน, ตัวสำรอง) พร้อมช่องใส่หมายเหตุ
2. **Publish Confirmation Modal:** ทำปุ่ม "ประกาศผลการคัดเลือก" พร้อมหน้าต่างยืนยัน (Confirmation Modal) ชัดเจน
3. **Result Status Indicator:** แสดงป้ายแจ้งว่าผลการคัดเลือกอยู่ในสถานะ "ฉบับร่าง (Draft)" หรือ "ประกาศผลแล้ว (Published)"

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าจอประเมินผลและกดยืนยันประกาศผล พร้อม Component Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] กรรมการสามารถเลือกบันทึกผลการคัดเลือกและกรอกหมายเหตุได้สะดวก
- [ ] มีกล่องข้อความเตือนยืนยันอย่างชัดเจนก่อนกดประกาศผล เพื่อป้องกันข้อผิดพลาด

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
