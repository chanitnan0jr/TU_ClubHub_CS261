# Task95 [MAINT-01] ปรับโครงสร้าง Backend Refactor, Sync เอกสาร และอัปเดตชุด Test

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task95` |
| **Feature Code** | `MAINT-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ชนิตว์นันท์ (chanitnan0jr) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Task93 (UI & Club Discovery Updates) และ Task94 (Dev Role Switcher) |
| **SDLC Labels** | 3. Development (Coding), 4. Testing & QA |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | - |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ชนิตว์นันท์ (chanitnan0jr)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task93 (UI & Club Discovery Updates) และ Task94 (Dev Role Switcher)

**จุดประสงค์ & บริบทของงาน**
ลดความซ้ำซ้อนของโค้ดฝั่ง Backend (Pagination, Exception Handling, Lock Timeout, Dependencies), อัปเดตเอกสารสถาปัตยกรรม/OpenAPI/ERD ให้ตรงกับระบบล่าสุด และปรับชุดทดสอบให้ผ่าน CI ทั้ง Integration และ Browser E2E

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Backend Cleanup & Shared Helpers:**
   - ลบไฟล์ `.gitkeep` ที่ไม่ใช้แล้ว และถอด dependency Lombok ที่ไม่ได้ใช้งานออกจาก `backend/pom.xml`
   - แยก `PageResponse.java`, `LockTimeouts.java` และขยาย `ApiExceptionHandler.java` เพื่อลดโค้ดซ้ำซ้อนในโมดูล `application`, `club`, `committee`, `dashboard`, `recruitment`
2. **Documentation & OpenAPI Sync:**
   - อัปเดต `docs/api/openapi.yaml` และ `docs/api/API_v1.md` ให้ตรงกับ API และ DTO ล่าสุด
   - ซิงก์ `README.md`, `frontend/README.md`, `docs/architecture/scaffold-context.md`, `system-architecture.md`, `task75-sprint2-design.md`, `docs/database/TU-ClubHub-ERD-Updated.dbml`, `docs/deployment/local-demo.md`, `docs/security/permission-matrix.md` และ `docs/stories/sprint1/US-07.md`
3. **Test Alignment:**
   - ปรับ `PublicClubSearchIntegrationTest` และ `PublicClubSearchBoundaryIntegrationTest` ให้รองรับฟิลด์ `lastRecruitmentClosedAt` และ seed data ปัจจุบัน
   - ปรับ selector ปุ่ม Add link ใน Playwright E2E (`frontend/scripts/verify-task54-browser.mjs`) ให้สอดคล้องกับ UI ใหม่

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับโครงสร้าง Backend Refactor, อัปเดต OpenAPI/เอกสารประกอบ และปรับ Test Suite ให้ผ่าน CI (`refactor/task95-maint-01`)

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] Backend แยก `PageResponse`, `LockTimeouts` และ `ApiExceptionHandler` เรียบร้อยและผ่าน `./mvnw test` โดยไม่มี unused Lombok dependency
- [ ] เอกสาร `openapi.yaml` ผ่าน Redocly lint และคู่มือ/ERD/README สอดคล้องกับโค้ดปัจจุบัน
- [ ] Test ทั้ง `PublicClubSearch*`, `DevAuth*`, Frontend Vitest และ `verify-task54-browser.mjs` ผ่าน CI

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
