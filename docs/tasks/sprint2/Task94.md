# Task94 [DEV-TOOL-01] พัฒนาระบบ Dev Mock Role Switcher และ Flag DEV บน Compose

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task94` |
| **Feature Code** | `DEV-TOOL-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ชนิตว์นันท์ (chanitnan0jr) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Mock TU Auth Client และ Docker Compose Stack (`compose.yaml`) |
| **SDLC Labels** | 3. Development (Coding), 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | - |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 5. Deployment & DevOps
- **Owner:** ชนิตว์นันท์ (chanitnan0jr)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Mock TU Auth Client และ Docker Compose Stack (`compose.yaml`)

**จุดประสงค์ & บริบทของงาน**
อำนวยความสะดวกให้ทีมพัฒนาและ QA สลับบัญชีทดสอบทั้ง 4 บทบาท (`USER`, `ADMIN`, `COMMITTEE`, `PRESIDENT`) ได้ทันทีจากหน้าเว็บผ่าน Session จริงในสภาพแวดล้อม Local Dev โดยต้องป้องกันไม่ให้เปิดใช้งานในโหมด Production หรือ Real Auth

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Domain Role & Membership Helpers:** เพิ่ม helper สำหรับกำหนด `systemRole` บน `UserAccount` และเปิดใช้งานสิทธิ์สมาชิกชมรม (`ClubMembership`, `ClubMembershipRepository`)
2. **Backend Dev Switcher API & Auth Isolation:**
   - แยก package `com.tu.clubhub.dev` ออกจาก `auth` (`DevAuthAvailability`, `DevAuthProperties`, `DevAuthController`, `DevAuthService`, `DevMockRole`)
   - เปิด endpoint `/api/v1/auth/dev/accounts` และ `/api/v1/auth/dev/switch` โดยจำกัดสิทธิ์เฉพาะเมื่อ `DEV=true`, `TU_AUTH_MODE=mock` และ active profile เป็น `dev` หรือ `test` (ห้ามใช้กับ `prod`)
   - แยก `AuthSessionEstablisher` และเตรียมบัญชี demo ทั้ง 4 บทบาทใน `MockTuAuthClient` (`applicant-demo`, `admin-demo`, `committee-demo`, `student-demo`)
3. **Frontend Floating Switcher Pill:** สร้าง component `DevRoleSwitcherPill.tsx`, เชื่อม session switching ผ่าน `AuthContext.tsx` และถอด client-only mock auth branch เดิมออก
4. **Docker Compose & Env Config:** ส่งตัวแปร `DEV` เข้า service `backend` ใน `compose.yaml` และเพิ่มคำอธิบายตัวอย่างใน `.example.env`

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ระบบ Dev Mock Role Switcher API/UI, Compose `DEV` Flag พร้อม Integration และ Component Tests (`feat/task94-dev-role-switcher`)

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] เมื่อตั้ง `DEV=true`, `TU_AUTH_MODE=mock`, `SPRING_PROFILES_ACTIVE=dev` สามารถกดสลับ role ทั้ง 4 แบบผ่าน `DevRoleSwitcherPill` และสร้าง session จริงได้
- [ ] เมื่อ `DEV=false`, `TU_AUTH_MODE=real` หรือเปิด `prod` profile ระบบปิด/ห้ามการทำงานของ Dev Switcher อย่างปลอดภัย (ผ่าน `DevAuthIntegrationTest` และ `DevAuthDisabledIntegrationTest`)
- [ ] Frontend component test (`devRoleSwitcher.test.ts`) และ `compose.yaml` ทำงานถูกต้อง

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
