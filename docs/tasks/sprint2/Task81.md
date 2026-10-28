# Task81 [CLUB-03] จัดการสิทธิ์แก้ไขโปรไฟล์ชมรม (ซ่อนปุ่ม & Route Guard)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task81` |
| **Feature Code** | `CLUB-03` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ณัฐชนินทร์ (Boom) & ภูบดี (FE1) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task75 (API Contract) และ Guard เดิม |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/Es9c6g0c](https://trello.com/c/Es9c6g0c) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom) & ภูบดี (FE1)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task75 (API Contract) และ Guard เดิม

**จุดประสงค์ & บริบทของงาน**
ป้องกันไม่ให้ผู้ใช้ทั่วไปมองเห็นปุ่มแก้ไขหรือแอบพิมพ์ URL เข้าหน้าแก้ไขข้อมูลชมรม โดยแสดงปุ่มเฉพาะกรรมการชมรมที่มีสิทธิ์จริงเท่านั้น

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Permission Flag in API:** ปรับ API ให้ส่ง Flag เช่น `canEditProfile: true/false` กลับมาพร้อมข้อมูลชมรม
2. **Conditional Button Rendering:** ฝั่ง Frontend ซ่อนปุ่ม "แก้ไขข้อมูลชมรม" หาก `canEditProfile` เป็น false
3. **Route Guard:** ใส่ Navigation Guard ป้องกันไม่ให้เข้าถึง URL `/clubs/:id/edit` โดยตรง หากไม่มีสิทธิ์
4. **Backend Enforcement:** ตรวจสอบสิทธิ์ซ้ำที่ฝั่ง Backend ตอนกด Save ข้อมูล

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR เพิ่มฟิลด์สิทธิ์ใน API + Frontend Permission Guard และการซ่อนปุ่มแก้ไข

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] กรรมการชมรมมองเห็นปุ่มแก้ไขและสามารถเปิดหน้าฟอร์มแก้ไขข้อมูลได้ตามปกติ
- [ ] นักศึกษาทั่วไปมองไม่เห็นปุ่มแก้ไข และหากพิมพ์ URL ตรงๆ จะถูกบล็อก/Redirect ทันที
- [ ] Backend ปฏิเสธการบันทึกข้อมูล หากผู้ยิงคำขอไม่มีสิทธิ์ของชมรมนั้น

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
