# Task82 [PIPELINE-01] ตั้งค่า GitHub Actions CI สำหรับ Build และรัน Unit Tests

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task82` |
| **Feature Code** | `PIPELINE-01` |
| **สถานะบน Trello** | `Done` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ ณัฐชนินทร์ (Boom) |
| **ผู้ตรวจรับ (Reviewer)** | สิรวิชญ์ (DevOps / QA) |
| **งานที่ต้องทำก่อน (Dependency)** | คำสั่ง Build/Test ของ Frontend และ Backend ใน Task75 |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | Sirawich Kridatikanwut_6809660027 |
| **Trello Card Link** | [https://trello.com/c/zDhfHLjO](https://trello.com/c/zDhfHLjO) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ ณัฐชนินทร์ (Boom)
- **Reviewer:** สิรวิชญ์ (DevOps / QA)
- **Dependency:** คำสั่ง Build/Test ของ Frontend และ Backend ใน Task75

**จุดประสงค์ & บริบทของงาน**
สร้าง Pipeline อัตโนมัติเพื่อตรวจสอบโค้ดและรัน Unit Tests ทุกครั้งที่มีการเปิด Pull Request ป้องกันไม่ให้โค้ดที่มีข้อผิดพลาดถูก Merge เข้าสู่ระบบ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **GitHub Actions Workflow:** ใช้ Canonical Workflow [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) (และ [`.github/workflows/api-contract.yml`](../../../.github/workflows/api-contract.yml) สำหรับตรวจ OpenAPI) แทนการสร้างไฟล์ `ci-build-test.yml` ซ้ำซ้อน
2. **Frontend CI:** ตรวจสอบโค้ด (`npm ci`), รัน Linter (`npm run lint` / `oxlint`), รัน Automated Unit Tests (`npm test`), และ Build (`npm run build` / `tsc -b && vite build`)
3. **Backend CI:** คอมไพล์โค้ด Java 21 และรัน Maven Tests พร้อม JaCoCo Coverage (`./mvnw clean verify`) และสรุปผลลง `$GITHUB_STEP_SUMMARY`
4. **PR Status Check:** ตรวจสอบสถานะ CI บน Pull Request และกำหนด Branch Ruleset บน `main`

**Artefact (ชิ้นงานที่ต้องส่ง)**
- ไฟล์ GitHub Actions Workflow ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)) พร้อมรายงานผลการรัน CI ([`docs/testing/task82-ci-build-test-report.md`](../../testing/task82-ci-build-test-report.md))

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [x] ทุก Pull Request ที่เปิดขึ้นมา ระบบจะรัน CI ตรวจสอบโค้ดโดยอัตโนมัติ
- [x] หากมี Unit Test พัง หรือโค้ดคอมไพล์ไม่ผ่าน CI จะแจ้งเตือนและบล็อกการ Merge ทันที

### Definition of Done (Checklist กลาง)

- [x] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [x] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [x] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [x] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [x] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [x] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
