# Task70 [MEMBER-02] พัฒนาหน้าจอให้ผู้สมัครกดยืนยันสิทธิ์หรือสละสิทธิ์

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task70` |
| **Feature Code** | `MEMBER-02` |
| **สถานะบน Trello** | `Doing` (In Review — PR #83) |
| **ผู้รับผิดชอบ (Owner)** | เขมจิรา (FE2 - Frontend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Task69 (Member API) และ Task64 (Application Tracking UI) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | Khem|
| **Trello Card Link** | [https://trello.com/c/coUzzxER](https://trello.com/c/coUzzxER) |
| **Pull Request** | [PR #83](https://github.com/chanitnan0jr/TU_ClubHub_CS261/pull/83) |
| **Test Reports** | [`docs/testing/qa-task70.md`](../../testing/qa-task70.md) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task69 (Member API) และ Task64 (Application Tracking UI)

**จุดประสงค์ & บริบทของงาน**
สร้าง UI บนหน้าติดตามใบสมัคร เพื่อให้ผู้ที่ผ่านการคัดเลือกสามารถกดยืนยันสิทธิ์หรือสละสิทธิ์ได้อย่างชัดเจนและปลอดภัย

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Action Buttons:** แสดงปุ่ม "ยืนยันสิทธิ์เข้าชมรม" และ "สละสิทธิ์" เฉพาะใบสมัครที่สถานะผ่านการคัดเลือก
2. **Confirmation Dialog:** กล่องแจ้งเตือนยืนยันก่อนส่งคำขอ ย้ำว่าเมื่อยืนยันแล้วจะไม่สามารถเปลี่ยนใจได้
3. **Post-action UI:** อัปเดตหน้าจอทันทีหลังกดยืนยันสิทธิ์ แสดงสถานะ "เป็นสมาชิกชมรมเรียบร้อยแล้ว"

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR หน้าจอยืนยันสิทธิ์/สละสิทธิ์ บนหน้าติดตามใบสมัคร พร้อม Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] ปุ่มยืนยันสิทธิ์และสละสิทธิ์จะแสดงเฉพาะใบสมัครที่อยู่ในสถานะผ่านการคัดเลือกเท่านั้น
- [x] มีกล่องยืนยัน (Confirmation Modal) ชัดเจนก่อนส่งคำขอ เพื่อป้องกันการกดพลาด
- [x] หลังทำรายการสำเร็จ หน้าจออัปเดตสถานะทันทีโดยไม่ต้อง Refresh หน้าเว็บ

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
