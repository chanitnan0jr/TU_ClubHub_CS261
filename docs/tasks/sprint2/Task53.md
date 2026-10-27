# Task53 [APP-02] พัฒนาหน้าจอและฟอร์มส่งใบสมัครชมรม (Validation & UI)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task53` |
| **Feature Code** | `APP-02` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ภูบดี (FE1 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task52 (Application API) และ UI Wireframe จาก Task75 |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | Phubordee Srithan |
| **Trello Card Link** | [https://trello.com/c/XcEGL2lj](https://trello.com/c/XcEGL2lj) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task52 (Application API) และ UI Wireframe จาก Task75

**จุดประสงค์ & บริบทของงาน**
สร้างหน้าจอแบบฟอร์มกรอกใบสมัครชมรมที่มีระบบตรวจสอบความถูกต้องของข้อมูล (Client-side Validation) ใช้งานง่าย แสดงข้อผิดพลาดชัดเจน และป้องกันการกดส่งซ้ำ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Dynamic Form UI:** ดึงคำถามคัดเลือกของชมรมมาแสดงผลเป็นแบบฟอร์ม (Text, Textarea, File/URL Link)
2. **Form Validation:** ตรวจสอบช่องที่จำเป็น (Required), ตรวจสอบความยาวตัวอักษร, และตรวจรูปแบบ URL ลิงก์ผลงาน
3. **Submit State & Feedback:** แสดง Loading Spinner ขณะกำลังส่ง และ Disable ปุ่มเพื่อป้องกันการกดเบิ้ล (Double Submit)
4. **Result Alert & Redirect:** แสดง Modal/Toast เมื่อส่งสำเร็จ และ Redirect ไปยังหน้ารายการใบสมัครของตนเอง (US-04)

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าจอและแบบฟอร์มส่งใบสมัครชมรม พร้อม Frontend Component Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] ฟอร์มแสดงคำถามคัดเลือกครบถ้วน และตรวจสอบช่องบังคับกรอกได้อย่างถูกต้องก่อนส่ง
- [ ] ป้องกันการกดปุ่มส่งซ้ำ (Double Submit) ขณะที่ระบบกำลังประมวลผลคำขอ
- [ ] เมื่อส่งสำเร็จ ระบบแสดงข้อความยืนยันและนำทางไปยังหน้าติดตามสถานะใบสมัคร (US-04) ได้อย่างราบรื่น

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตงานและ Data/API Contract ชัดเจน ตรงตามข้อตกลงทีม
- [ ] พัฒนาและทดสอบผ่านครบตามเกณฑ์ Acceptance Criteria เฉพาะของการ์ด
- [ ] แนบ Pull Request, ผลการทดสอบ (Unit/Integration Tests), และ Artefact ครบถ้วน
- [ ] CI Pipeline รันผ่าน 100% (ทั้ง Frontend และ Backend)
- [ ] ผ่านการ Code Review จาก Reviewer และแก้ไขข้อเสนอแนะครบถ้วน
- [ ] Merge โค้ดเข้า Branch หลักเรียบร้อย พร้อมอัปเดตเอกสารที่เกี่ยวข้อง
