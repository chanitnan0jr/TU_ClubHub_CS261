# Task84 [PIPELINE-03] — CD Staging Deployment & 2-Container Verification Report

| รายการ | รายละเอียด |
|---|---|
| **Task** | `Task84 [PIPELINE-03]` — ตั้งค่า GitHub Actions CD Workflow ติดตั้งระบบขึ้น Staging อัตโนมัติ |
| **Workflow File** | [`.github/workflows/cd-deploy.yml`](../../.github/workflows/cd-deploy.yml) |
| **Container Stack** | [`compose.yaml`](../../compose.yaml) — 2 Containers: `backend-frontend` ([`Dockerfile`](../../Dockerfile)) + `database` ([`database/Dockerfile`](../../database/Dockerfile)) |
| **Smoke Test Script** | [`scripts/smoke-test.sh`](../../scripts/smoke-test.sh) |

---

## 1. สถาปัตยกรรม 2 Docker Containers (`backend-frontend` + `database`)

ตามข้อกำหนดของรายวิชาที่ต้องรันระบบด้วย **Docker Container มากกว่า 1 Container** ระบบได้รับการจัดโครงสร้างใน [`compose.yaml`](../../compose.yaml) ออกเป็น **2 คอนเทนเนอร์หลัก** ที่แยกหน้าที่ชัดเจน:

| ลำดับ | ชื่อ Service ใน Compose | ชื่อ Container | Dockerfile | หน้าที่และการทำงาน | Healthcheck |
|---:|---|---|---|---|---|
| **1** | `database` (alias: `db`) | `tu-clubhub-db` | [`database/Dockerfile`](../../database/Dockerfile) | ฐานข้อมูล PostgreSQL 17 Alpine เก็บข้อมูลถาวรผ่าน Named Volume `postgres_data` และผูกพอร์ตเฉพาะ Loopback (`127.0.0.1:5432:5432`) | `pg_isready -U postgres -d tu_clubhub` |
| **2** | `backend-frontend` (alias: `app`) | `tu-clubhub-backend-frontend` | [`Dockerfile`](../../Dockerfile) | Multi-stage build รวม React 19 + TypeScript SPA เข้ากับ Spring Boot 4 (Java 21 JRE Alpine) รันภายใต้ผู้ใช้ Non-root (`appuser`) และรอจนกว่า `database` จะ `healthy` ก่อนเริ่มทำงาน | `wget -qO- http://127.0.0.1:8080/actuator/health \| grep -q '"status":"UP"'` |

---

## 2. การทำงานของ GitHub Actions CD Workflow (`.github/workflows/cd-deploy.yml`)

1. **Triggers (`AC-01`):**
   - ทำงานอัตโนมัติเมื่อ Merge โค้ดเข้า `main` (`push.branches: [main]`)
   - ทำงานอัตโนมัติเมื่อติด Release Tag (`push.tags: ['v*']`)
   - รองรับการรันทดสอบบน Pull Request ที่แก้ไขไฟล์ Docker/CD และรองรับการสั่งรันด้วยมือผ่าน `workflow_dispatch`
2. **Job 1 — `build-and-push`:**
   - Build Docker Image ทั้ง 2 ตัว (`tu-clubhub-database` และ `tu-clubhub-backend-frontend`) ด้วย Docker Buildx และ GitHub Actions Cache
   - Push Image ทั้ง 2 ตัวขึ้น GitHub Container Registry (`ghcr.io/<owner>/tu-clubhub-database` และ `ghcr.io/<owner>/tu-clubhub-backend-frontend`) พร้อมติดแท็ก `sha-<commit>` และ `staging`
3. **Job 2 — `deploy-staging` & Post-Deploy Health Check (`AC-02`):**
   - โหลด Image ทั้ง 2 ตัวและตรวจสอบว่า `docker compose config --services` มีครบ 2 Services (`database` และ `backend-frontend`)
   - สั่งรัน `docker compose up -d --no-build` และรอตรวจสอบสถานะ Healthcheck ของทั้ง `tu-clubhub-db` และ `tu-clubhub-backend-frontend` จนเป็น `healthy`
   - โหลดข้อมูลทดสอบด้วย `scripts/seed-dev-data.sh` (ตรวจสอบว่า Flyway Migration `V1`, `V3`, `V4`, `V5` และ Seed `V2` ทำงานสมบูรณ์)
   - รัน Post-Deploy Health Check & Smoke Test (`scripts/smoke-test.sh`) ตรวจสอบ:
     - `GET /actuator/health` -> `{"status":"UP"}`
     - หน้าแรก `/` และ SPA Deep Link `/clubs/1` -> `200 OK`
     - `GET /api/v1/public/clubs` -> `200 OK`
     - `GET /api/v1/public/clubs/999999999` -> `404 application/problem+json`
     - `GET /api/v1/auth/me` (ยังไม่ล็อกอิน -> `401`, ล็อกอินพร้อม CSRF -> `200`)
     - ยืนยันว่า `tu-clubhub-db` ผูกพอร์ต `127.0.0.1` เท่านั้น และ `tu-clubhub-backend-frontend` มีสถานะ `running`
   - หากขั้นตอนใดล้มเหลว Workflow จะดึง Container Logs ออกมาแสดง แจ้งเตือนผ่าน `::error::` ทันที และบันทึกสรุปผลลงใน `$GITHUB_STEP_SUMMARY` พร้อมอัปโหลด Artifact `staging-deployment-report`
