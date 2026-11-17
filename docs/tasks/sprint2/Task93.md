# Task93 [UI-HOTFIX-01] ปรับดีไซน์ UI หลัก แก้ปัญหาข้อมูลหน้าสมัคร และรองรับรูปชมรมแบบ Local

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task93` |
| **Feature Code** | `UI-HOTFIX-01` |
| **สถานะบน Trello** | `To Do` |
| **ผู้รับผิดชอบ (Owner)** | ชนิตว์นันท์ (chanitnan0jr) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (SE / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | Core UI ของ Sprint 1 & Sprint 2 (Club Search, Club Detail, Apply, My Applications, Admin Dashboard) |
| **SDLC Labels** | 2. System & UI Design, 3. Development (Coding) |
| **สมาชิกบนการ์ด Trello** | - |
| **Trello Card Link** | - |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 2. System & UI Design + 3. Development (Coding)
- **Owner:** ชนิตว์นันท์ (chanitnan0jr)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Core UI ของ Sprint 1 & Sprint 2 (Club Search, Club Detail, Apply, My Applications, Admin Dashboard)

**จุดประสงค์ & บริบทของงาน**
ปรับปรุง UX/UI ของหน้าหลักทั้งหมดให้สอดคล้องกันทั้งระบบ พร้อมแก้ไข Bug ฝั่ง Frontend (Navbar, Club Discovery, Category ID Filter, Hardcoded Round Defaults, รูปภาพชมรมแบบ Local และหน้าประวัติใบสมัคร/Dashboard)

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **Public Navbar & Club Discovery Redesign:** ปรับ Public Top Bar / Sticky Header, โหลดฟอนต์ Manrope, รองรับ `fullBleed` layout, ปรับตัวกรองหมวดหมู่ให้ใช้ Category ID, และออกแบบหน้าค้นหา/รายละเอียด/จัดการชมรม (`ClubSearchPage`, `ClubDetailPage`, `ClubManageRoutePage`) ใหม่ พร้อมรวมหน้าเปิดรับสมัครเข้ามาไว้ในหน้าชมรมแทน `OpenCallsPage`
2. **Local Club & Activity Images:** เพิ่มการรองรับ path รูปภาพแบบ `/images/...` ทั้งใน DB Migration, Backend API (`ClubService`, `PublicClubController`, `PublicClubService`, DTOs) และเพิ่มไฟล์ภาพชมรม/กิจกรรมแบบ WebP พร้อมตั้งค่า Nginx caching และ validation (`ImageUrlField`, `clubProfileValidation.ts`)
3. **Applications & Admin Dashboard Redesign + Bugfix:** ลบค่า hardcode ของ round defaults (`RecruitmentRoundForm.tsx`), แก้ความถูกต้องของข้อมูลหน้าสมัคร/ค้นหาพร้อมบันทึกสรุปจุดที่ปรับแก้ ([frontend-hardcode-overengineering-audit.md](../../testing/frontend-hardcode-overengineering-audit.md)), และปรับดีไซน์ `DynamicApplicationForm`, `MyApplicationsPage`, `ApplicationCard`, `ApplicantIdentityGrid` รวมถึง `CentralDashboardPage` (`DataCharts`, `StatCards`)
4. **Icon Migration & Cleanup:** ย้ายมาใช้ icon set มาตรฐานแทน custom SVG/icons เดิม, เพิ่ม `PageHeaderBanner.tsx`, และลบไฟล์/CSS เก่าที่ไม่ได้ใช้งานออก

**Artefact (ชิ้นงานที่ต้องส่ง)**
- PR ปรับดีไซน์ UI หลัก, รองรับรูปชมรมแบบ Local, DB Migration และแก้ไข Bug ฝั่ง Frontend พร้อม Component Tests (`feat/task93-ui-hotfix-01`)

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] หน้าหลัก Public Navbar, Club Search/Detail/Manage, Applications และ Admin Dashboard แสดงผลตามดีไซน์ใหม่และใช้ Category ID / Round Data จาก API จริงโดยไม่มีค่า hardcode ค้างอยู่
- [ ] ระบบรองรับ path รูปภาพชมรมแบบ local `/images/...` ทั้งใน Flyway Migration (`V7`), Backend validation และแสดงผลรูปชมรม/กิจกรรม WebP ผ่าน Nginx ได้ถูกต้อง
- [ ] Frontend build, lint และ unit/component tests ผ่านครบถ้วนหลังย้ายไอคอนและลบ dead code

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
