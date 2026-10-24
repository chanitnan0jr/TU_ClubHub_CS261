# TU-ClubHub — Repository Context

ปรับปรุง: 19 ตุลาคม 2026 · สถานะ: Context จาก Source และ Configuration ปัจจุบัน ไม่ใช่ผลรันทดสอบหรือการยืนยันว่า Deploy แล้ว

ไฟล์นี้ใช้ชื่อเดิมเพื่อรักษาลิงก์จากเอกสารอื่น โดยปรับจากคำสั่งสร้าง Scaffold เป็นบริบทสำหรับทำงานต่อ อ่าน [README](../../README.md) สำหรับสถานะและวิธีรัน, [System Architecture](system-architecture.md) สำหรับแบบเป้าหมาย และ [Permission Matrix](../security/permission-matrix.md) สำหรับนโยบายสิทธิ์

## 1. ผลิตภัณฑ์และขอบเขต

TU-ClubHub รองรับนักศึกษา มธ. ในการดูชมรม สมัคร และติดตามผล กรรมการดูแลชมรมและรอบรับสมัคร ส่วน Admin มีงานสถิติและแต่งตั้งกรรมการตามขอบเขตของ Permission Matrix

Backend มี Authentication, Public Club APIs, การอัปเดตโปรไฟล์ และการสร้าง/แก้ไข/เผยแพร่/ปิดรอบแล้ว Frontend หลักยังแสดง Login, ข้อมูลผู้ใช้ และ Logout ส่วนหน้าฟีเจอร์อื่นยังต้องเชื่อมเข้ากับแอปและ API จึงยังไม่ใช่ระบบรับสมัครที่ใช้งานครบทุกขั้นตอน

## 2. โครงสร้างที่มีอยู่

```text
TU_ClubHub_CS261/
├── frontend/
│   ├── src/main.tsx, App.tsx          # AuthProvider และหน้าหลัก
│   ├── src/ClubProfileForm.tsx        # ฟอร์มและหน้า preview แยก
│   ├── src/features/
│   │   ├── auth/                     # Login / AuthContext
│   │   ├── clubs/                    # Components, hooks, API client และ mock detail
│   │   ├── recruitment/              # ฟอร์มรอบและคำถาม
│   │   └── applications/             # ฟอร์มใบสมัครต้นแบบ
│   └── tests/                        # Club-profile validation
├── backend/
│   ├── src/main/java/com/tu/clubhub/
│   │   ├── auth/, user/              # TU adapters, session, บัญชีผู้ใช้
│   │   ├── club/, recruitment/       # REST APIs, services, repositories
│   │   ├── committee/, membership/   # สิทธิ์กรรมการและข้อมูลสมาชิกภาพ
│   │   └── config/                   # Security, timeout, SPA forwarding
│   └── src/main/resources/db/migration/
│       ├── V1__init_schema.sql        # 17 ตารางธุรกิจ
│       └── V3__create_spring_session_tables.sql
├── docs/                             # Contracts, architecture, stories, diagrams, reports
├── .github/workflows/ci.yml
├── Dockerfile                        # React build → Spring Boot JAR → Java runtime
└── compose.yaml                      # app + db; มี split profile เพิ่ม
```

ยังไม่มี Backend packages สำหรับ application workflow, notification หรือ dashboard การมีตารางในฐานข้อมูลไม่ได้แปลว่ามี API ของตารางนั้นแล้ว Frontend มี Router (`src/app/AppRoutes.tsx`) และ HTTP client กลาง (`src/lib/api.ts`) แล้ว

## 3. Contract และจุดเชื่อมต่อปัจจุบัน

| ส่วน | สถานะและงานต่อ |
|---|---|
| Auth | `/api/v1/auth/csrf`, `login`, `me`, `logout` มี handler และหน้า Login เรียกใช้แล้ว; Real TU adapter มีโค้ด แต่การเข้าถึงบริการจริงต้องยืนยันในสภาพแวดล้อมส่งมอบ |
| Public club | `GET /api/v1/public/clubs/{id}` และ `.../{id}/recruitment-rounds` อ่าน DB แล้ว; หน้า `/clubs/:clubId` แสดงข้อมูลจากสอง API นี้ |
| Club editor | `PUT /api/v1/clubs/{clubId}` มีแล้ว; GET path เดียวกันยังไม่มี handler หน้า `/clubs/:clubId/edit` จึงเติมค่าจาก public profile; category/tags ยังอ่านอย่างเดียว |
| Recruitment | POST/PUT และ PATCH `PUBLISH`/`CLOSE` มีแล้ว พร้อมข้อห้ามจัดการรอบที่ตนสมัคร และ response ตาม schema `Round`; GET list/detail และ `CANCEL` ยังไม่ทำ; ฟอร์มยังไม่มีการเชื่อมใช้งานใน App |
| Questions | บันทึกผ่าน `questions` ใน POST/PUT ของรอบ และจัดการรายข้อผ่าน `/api/v1/rounds/{roundId}/questions` (Backend และ `questionApi.ts` ใช้ path เดียวกัน); error เป็น Problem body แต่ 409 ยังใช้ `RESOURCE_CONFLICT` แทนรหัสเฉพาะเช่น `QUESTION_HAS_ANSWERS` |
| Submission | [API Contract §11](../api/API_v1.md#11-application-submission) และ [OpenAPI](../api/openapi.yaml) กำหนดแล้ว; DynamicApplicationForm ใช้ข้อมูลตัวอย่างและยังไม่ส่ง API |
| History / review / confirmation / Admin | ยังต้องมี Contract และ implementation ของ workflow; path สำหรับอ่านใบสมัครใน §11 เป็นการจองสำหรับ US-04 |

ใช้ [API_v1.md](../api/API_v1.md) และ [openapi.yaml](../api/openapi.yaml) สำหรับ Auth/Clubs/Submission; ใช้ [rounds.openapi.yaml](../api/rounds.openapi.yaml) สำหรับรอบและคำถาม ไม่สร้าง Contract จาก path ชั่วคราวใน UI

## 4. ข้อมูลและใบสมัคร

[Flyway migrations](../../backend/src/main/resources/db/migration) เป็นแหล่งอ้างอิง Schema ที่ใช้งาน ส่วน [DBML](../database/TU-ClubHub-ERD-Updated.dbml) อธิบายโมเดล ไม่มี migration สำหรับ Seed ข้อมูลชมรมหรือกรรมการ และไม่มี V2 ในชุดปัจจุบัน

Contract ส่งใบสมัครใช้ตารางเดิมใน Transaction เดียว:

| Request / ข้อมูล Server | ตาราง |
|---|---|
| `motivation`, ผู้สมัครจาก Session, รอบ/ชมรม, `SUBMITTED`, เวลา Server | `applications` |
| `answers[].questionId`, `answers[].answerText` | `application_answers` |
| `links[].label`, `links[].url`, ลำดับจาก Array เริ่มที่ 1 | `application_links` |
| ประวัติแรก `NULL → SUBMITTED` และผู้ดำเนินการ | `application_status_history` |

`application_links` มี `url VARCHAR(2048)`, `label VARCHAR(200)`, `display_order` และ `application_id` อยู่แล้ว จึงไม่ต้องเพิ่มคอลัมน์แนบลิงก์ Contract กำหนดเหตุผล 1–2,000 ตัวอักษร, ลิงก์ 0–5 รายการ และความยาวคำตอบตาม `application_questions.max_length` เก็บเฉพาะ HTTPS URL โดยไม่อัปโหลดหรือดาวน์โหลดเอกสาร

สถานะเริ่มต้นคือ `SUBMITTED` แสดงเป็น “รอพิจารณา (Pending)” ใช้ Unique `(round_id, applicant_id)` และไม่ให้สมัครรอบเดิมซ้ำหลังถอน เพดานสมาชิกภาพคือ 5 ชมรมทุกประเภทที่บันทึกในระบบและมีผลอยู่ ไม่นับใบสมัครค้างเป็นสมาชิก และไม่มีโควตาใบสมัครค้างแยกต่างหาก การยืนยันสิทธิ์ในอนาคตต้องตรวจเพดานซ้ำ

## 5. Authentication และสิทธิ์

- Browser ใช้ Session cookie และ CSRF; Backend เรียก TU API ด้วย Application-Key ฝั่ง Server
- Session idle timeout เริ่มต้น 30 นาที; absolute timeout 8 ชั่วโมงกำหนดใน `AbsoluteSessionTimeoutFilter` ยังไม่มีตัวแปร `SESSION_ABSOLUTE_TIMEOUT`
- `dev` ใช้ mock adapter โดยค่าเริ่มต้น บัญชี `student-demo` / `tu-clubhub-demo`; mock mode ใช้ได้เฉพาะ dev/test และห้ามใช้กับ prod
- Login provision เฉพาะ `users`; ไม่สร้าง `student_profiles`, membership หรือ committee assignment ให้โดยอัตโนมัติ `role` จาก `/auth/me` คือ global `USER`/`ADMIN` และไม่ใช่หลักฐานสิทธิ์กรรมการ
- Committee guard ตรวจ account, membership, assignment, การถอนสิทธิ์ และ `starts_at <= now < ends_at` แล้ว แต่ยังขาด student Active, club Active และ `joined_at` รวมถึง PRESIDENT/self-review guards ของ workflow ที่เกี่ยวข้อง
- ใช้ [ช่องว่าง implementation ใน Permission Matrix](../security/permission-matrix.md#9-สถานะ-implementation-และงานที่ต้องตามนโยบาย) เป็นรายการงานด้านสิทธิ์; นโยบาย Active/Term Date ถูกกำหนดแล้ว

## 6. วิธีรันและ Configuration

คำสั่งและตัวแปรที่ใช้งานอยู่ดู [README](../../README.md#development-setup) และ [Local demo](../deployment/local-demo.md) Runtime ใช้ Java 21, Spring Boot 4.1.1, React 19, TypeScript 6, Vite 8 และ Tailwind 4 ตาม manifests/lockfile

- Local development: Vite `5173` proxy `/api` ไป Spring Boot `8080`; ใช้ `/actuator/health` ที่ Backend โดยตรง
- Compose ปกติ: `app` เสิร์ฟ Frontend ที่ Build รวมใน JAR และใช้ `db` PostgreSQL 17
- Split demo: ระบุ services `db backend frontend` เพื่อไม่ Start `app` ซ้ำ; Nginx เสิร์ฟ Frontend และ proxy `/api`
- Root `.env` ใช้กับ Compose; JVM ที่รันตรงต้อง export ตัวแปรเอง หากเปลี่ยนชื่อ DB/ผู้ใช้/พอร์ตให้ตั้ง `SPRING_DATASOURCE_*` ให้ตรง
- Render ยังเป็น Deployment target; ไม่มีผล Deploy ในเอกสารนี้

## 7. Build และ CI ที่มีอยู่

| ส่วน | คำสั่ง / ขอบเขต |
|---|---|
| Frontend | `npm ci`, `npm run dev`, `npm run lint`, `npm run build`, `npm test`, `npm run preview` |
| TypeScript | `npm run build` เรียก `tsc -b` ก่อน Vite; ไม่มี script `typecheck` |
| Frontend tests | Script `test` ใช้ Node test runner กับ club-profile validation; ไม่มี `test:run` และ CI ยังไม่ได้เรียก `npm test` |
| Backend | Maven Wrapper; `./mvnw clean verify` สร้าง test/JaCoCo reports |
| CI | Frontend lint/build, Backend verify; มี PostgreSQL 18 service และใช้ mock TU; tests มี H2 และ PostgreSQL ทั้ง `seedtest` และ recruitment integration |
| Documentation | Workflow มี path filters ข้ามการเปลี่ยนเฉพาะ docs/Markdown |

[รายงานเดิม](../testing) อ้างอิงวันที่หรือ revision ของแต่ละงาน ไม่ใช่ผลตรวจของ Source ปัจจุบัน

## 8. งานต่อจาก Context นี้

1. เชื่อม Routes/Pages เข้ากับ App และแทน mock ด้วย DTO/API ตาม Contract รวมถึงจัดการ GET โปรไฟล์ที่ยังขาด
2. ทำ student-status integration และช่องว่างสิทธิ์ตาม Matrix
3. ทำ Submission endpoint ตาม §11 พร้อมการบันทึก 4 ตาราง; รักษา Contract และ SD-05 ให้ตรงกัน
4. ทำ committee reads, cancellation และ frontend รอบ/คำถามตาม `rounds.openapi.yaml`
5. กำหนด Contract ของประวัติใบสมัคร ผลคัดเลือก ยืนยัน/สละสิทธิ์ และ Admin ก่อนเชื่อม workflow เหล่านั้น

เมื่อแก้งาน ให้ปรับสถานะใน README, Contract, Story และ Diagram ที่เกี่ยวข้องร่วมกัน ไม่ทำเครื่องหมายเสร็จจากการมี Schema หรือ UI ต้นแบบเพียงอย่างเดียว
