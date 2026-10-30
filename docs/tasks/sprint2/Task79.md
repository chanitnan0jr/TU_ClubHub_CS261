# Task79 [AUTH-05] อัปเดตสิทธิ์ผู้ใช้แบบเรียลไทม์ (Real-time Role Sync ใน /me)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task79` |
| **Feature Code** | `AUTH-05` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | วรพล (BE1 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE) |
| **งานที่ต้องทำก่อน (Dependency)** | Role Contract จาก Task75 (ทำก่อน Admin API Task71) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | [https://trello.com/c/RQczRQYO](https://trello.com/c/RQczRQYO) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Role Contract จาก Task75 (ทำก่อน Admin API Task71)

**จุดประสงค์ & บริบทของงาน**
แก้ปัญหาระบบจำสิทธิ์เก่าค้างไว้ใน Session โดยปรับปรุง Endpoint `/api/v1/auth/me` และระบบตรวจสอบสิทธิ์ให้ดึง Role ล่าสุดจากฐานข้อมูลเสมอ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Dynamic Role Fetching:** ปรับปรุง `/api/v1/auth/me` ให้อ่าน Role และ Assignment ล่าสุดจาก Database ไม่ใช้ค่า Cache เก่า
2. **Real-time Authorization Check:** ปรับตัวตรวจสิทธิ์ (Security Interceptor) ให้ Re-check สิทธิ์ผู้ใช้จริงจาก Database ในการเรียก API ที่สำคัญ
3. **Role Boundary Enforcement:** ตรวจสอบไม่ให้ผู้ใช้ Role ADMIN ก้าวก่ายสิทธิ์ของกรรมการชมรมโดยไม่ได้รับอนุญาต

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับปรุง Auth Me Service และ Security Authority Resolver พร้อม Tests

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] เมื่อแก้ไข Role ใน Database ผู้ใช้จะได้รับสิทธิ์ใหม่ทันทีในการเรียก `/api/v1/auth/me`
- [ ] หากผู้ใช้ถูกปลดสิทธิ์ จะไม่สามารถเรียก API ของกรรมการชมรมได้อีก แม้ Session เดิมยังไม่หมดอายุ

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
