# Task57 [AUTH-01] ทดสอบเชื่อมต่อ TU Login จริงและ Session บน Staging

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task57` |
| **Feature Code** | `AUTH-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1) & สิรวิชญ์ (QA / DevOps) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task76 (ต้องทำ Student Profile ให้เสร็จก่อน) |
| **SDLC Labels** | 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/YG9WeIMP](https://trello.com/c/YG9WeIMP) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 4. Testing & QA
- **Owner:** วรพล (BE1) & สิรวิชญ์ (QA / DevOps)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task76 (ต้องทำ Student Profile ให้เสร็จก่อน)

**จุดประสงค์ & บริบทของงาน**
ทดสอบการเข้าสู่ระบบด้วยบัญชีนักศึกษาจริงของมหาวิทยาลัยธรรมศาสตร์บนสภาพแวดล้อม Staging เพื่อยืนยันว่าระบบเชื่อมต่อกับ TU API จริงได้สมบูรณ์

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Staging Environment Setup:** ตั้งค่า Environment Variables และ API Key สำหรับ TU Auth บน Staging
2. **Live Login Flow Testing:** ทดสอบ Login ด้วยบัญชีจริงของนักศึกษา, ตรวจสอบการสร้าง Session/Cookie, และทดสอบการ Logout
3. **Test Logging & Report:** บันทึกผลการทดสอบและข้อสังเกตลงใน Test Report

**Artefact (ชิ้นงานที่ต้องส่ง)**
- รายงานผลการทดสอบการเชื่อมต่อ TU API จริงบนระบบ Staging

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] สามารถ Login ด้วยบัญชีนักศึกษา มธ. จริงบน Staging และดึงข้อมูล Profile ได้สมบูรณ์
- [ ] ระบบออก Cookie และ Session ได้อย่างปลอดภัย และสามารถกด Logout ได้ถูกต้อง

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
