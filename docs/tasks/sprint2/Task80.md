# Task80 [AUTH-06] จัดระเบียบ Error 401/403/404 และ Response (RFC 7807)

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task80` |
| **Feature Code** | `AUTH-06` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | อริยะวีร์ (BE2 - Backend Engineer) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task74–75 (Permission Matrix และ OpenAPI Error Contract) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | ariyawe krittayabunlue |
| **Trello Card Link** | [https://trello.com/c/syjFyq7C](https://trello.com/c/syjFyq7C) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task74–75 (Permission Matrix และ OpenAPI Error Contract)

**จุดประสงค์ & บริบทของงาน**
จัดระเบียบ HTTP Error Response ให้ปลอดภัยและเป็นมาตรฐานสากล (RFC 7807 Problem Details) ป้องกันข้อมูลลับของระบบรั่วไหล และให้ Frontend ดักจับแจ้งเตือนได้ถูกต้อง

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **RFC 7807 Problem Details:** ปรับให้ Error ทุกตัวส่ง JSON รูปแบบมาตรฐาน (`type`, `title`, `status`, `detail`, `instance`)
2. **Clear HTTP Status Codes:**
   - `401 Unauthorized`: ยังไม่ได้ Login หรือ Session หมดอายุ
   - `403 Forbidden`: Login แล้วแต่ไม่มีสิทธิ์เข้าถึงข้อมูลของชมรมนี้
   - `404 Not Found`: ไม่พบข้อมูลจริง หรือข้อมูลลับที่ไม่ต้องการให้คนภายนอกรู้ว่ามี ID นี้อยู่จริง
3. **Prevent Information Leakage:** ปิดกั้นไม่ให้มี Exception Stack Trace หรือโครงสร้าง Database หลุดใน Response
4. **Isolate Test Context:** ส่ง CSRF Token ให้ถูกต้องใน Integration Test เพื่อให้มั่นใจว่ากำลังเทสต์สิทธิ์ (RBAC) จริง ไม่ใช่เทสต์เฟลเพราะติด CSRF Filter
5. **OpenAPI & Frontend Sync:** อัปเดตตัวอย่าง Error ใน Swagger และแจ้ง Frontend ให้ดักจับไปแสดงผล Alert/Toast

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับปรุง Global Exception Handler และ Security Error Contract
- ชุดทดสอบ Security & Regression Tests สำหรับการตรวจสอบสิทธิ์
- ตัวอย่าง Error Response ใน OpenAPI/Swagger และโค้ดดักจับ Error ฝั่ง Frontend

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] เรียก API โดยไม่มีสิทธิ์ ได้รับ `403 Forbidden` พร้อม JSON format มาตรฐาน RFC 7807
- [ ] เรียกข้อมูลที่ไม่พบ ได้รับ `404 Not Found`
- [ ] ตรวจสอบ Payload แล้วว่าไม่มี Stack Trace หรือข้อมูลระบบภายในหลุดออกไป
- [ ] Automated Tests สำหรับตรวจสอบสิทธิ์ (RBAC) ผ่านทั้งหมด โดยไม่ติดปัญหา CSRF Filter
- [ ] หน้า Frontend ดักจับ Error Code และแสดง Alert/Toast แจ้งเตือนผู้ใช้ได้อย่างถูกต้อง

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
