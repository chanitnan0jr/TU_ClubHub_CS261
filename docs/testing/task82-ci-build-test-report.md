# Task82 [PIPELINE-01]: GitHub Actions CI Build & Unit Tests Report

| รายการ | รายละเอียด |
|---|---|
| **Task ID / Feature** | `Task82` (`PIPELINE-01`) |
| **วันที่ตรวจสอบ** | 2026-11-02 |
| **ผู้รับผิดชอบ (Owner / Reviewer)** | สิรวิชญ์ กฤดาธิการวุฒิ (DevOps Lead / QA) |
| **Workflow Files** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`.github/workflows/api-contract.yml`](../../.github/workflows/api-contract.yml) |

---

## 1. สรุปการออกแบบและการตั้งค่า Pipeline

เพื่อให้สอดคล้องกับโครงสร้างของโปรเจกต์โดยไม่สร้าง Workflow ซ้ำซ้อนที่จะรันงานชุดเดียวกันซ้ำสองรอบในทุก PR ระบบรวมศูนย์ CI Pipeline ไว้ที่ไฟล์หลัก [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) ร่วมกับ [`.github/workflows/api-contract.yml`](../../.github/workflows/api-contract.yml):

| Job Name | Environment | ขั้นตอนที่รัน (Steps) | รายงานผลลัพธ์ (Outputs) |
|---|---|---|---|
| **Frontend CI (Lint, Test & Build)** | `ubuntu-latest`, Node.js `22` (`npm` cache) | 1. `npm ci`<br>2. `npm run lint` (`oxlint`)<br>3. `npm test` (`tsx --test tests/*.test.ts`)<br>4. `npm run build` (`tsc -b && vite build`) | แสดงสถานะใน PR Checks และเขียนสรุปลง `$GITHUB_STEP_SUMMARY` |
| **Backend CI (Compile & Verify)** | `ubuntu-latest`, Temurin JDK `21` (`maven` cache), Service `postgres:18` | 1. `chmod +x mvnw`<br>2. `./mvnw clean verify` (Compile, Unit & Integration Tests, JaCoCo Coverage) | สรุปจำนวน Tests (`Total`, `Passed`, `Failures`, `Errors`, `Skipped`) จาก Surefire XML ลง `$GITHUB_STEP_SUMMARY` และอัปโหลด Artifact `backend-test-and-coverage` |
| **OpenAPI Lint (Redocly)** | `ubuntu-latest`, Node.js `22` | `npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml` | ตรวจสอบความถูกต้องของ OpenAPI Schema และ Examples เมื่อมีการแก้ไข `docs/api/**` หรือ `redocly.yaml` |

---

## 2. หลักฐานการตรวจสอบตามเกณฑ์ตรวจรับ (Acceptance Criteria)

| เกณฑ์ตรวจรับ (AC) | หลักฐานการรันจริงบน GitHub Actions | ผลลัพธ์ |
|---|---|---|
| **AC 1: ทุก PR ที่แก้ไขโค้ดจะรัน CI ตรวจสอบอัตโนมัติ** | • PR #57 (`ec11c80`): เพิ่มขั้น `npm test` ใน `Frontend CI (Lint, Test & Build)`<br>• PR #60 (`Task77`), PR #61 (`Task76`), PR #63 (`Task80`): รันผ่านทั้ง `Frontend CI` และ `Backend CI` อัตโนมัติ | **PASS** |
| **AC 2: เมื่อ Unit Test พังหรือคอมไพล์ไม่ผ่าน CI จะแจ้งสถานะ `FAILURE` ทันที** | • PR #62 (`Task64`): เมื่อเกิด `ConflictingBeanDefinitionException` ใน Backend งาน `Backend CI (Compile & Verify)` ตกสถานะ `FAILURE` ทันทีและแจ้งเตือนบน PR | **PASS** |

---

## 3. การตั้งค่า Branch Ruleset บน `main` (`CS261-Rule`)

- ปัจจุบัน Repository มี Ruleset `CS261-Rule` (ID `24879373`) บังคับห้ามลบ Branch, ห้าม Force Push, และต้องผ่านการ Approve อย่างน้อย 1 คนก่อน Merge
- **หมายเหตุสำหรับ Repository Owner (`@chanitnan0jr`):** หากต้องการให้ GitHub บล็อกปุ่ม Merge โดยอัตโนมัติในระดับ Ruleset (นอกเหนือจากการตรวจโดย Reviewer) สามารถเปิด **Require status checks to pass** ใน `Settings -> Rules -> Rulesets -> CS261-Rule` และเลือก Check `Frontend CI (Lint, Test & Build)` กับ `Backend CI (Compile & Verify)` ได้ทันที (เนื่องจากบัญชี Collaborator ไม่มีสิทธิ์ `admin` ในการแก้ไข Ruleset ของ Repository)
