# TU-ClubHub — Repository Context

ปรับปรุง: 1 พฤศจิกายน 2026 · ตรวจจาก local `main` ที่ commit `faa90df` · สถานะ: Context จาก Source, Configuration และเอกสาร ณ revision นี้ ไม่ใช่ผลรันทดสอบหรือการยืนยันว่า Deploy แล้ว

ไฟล์นี้ใช้ชื่อเดิมเพื่อรักษาลิงก์จากเอกสารอื่น โดยปรับจากคำสั่งสร้าง Scaffold เป็นบริบทสำหรับทำงานต่อ อ่าน [README](../../README.md) สำหรับสถานะและวิธีรัน, [System Architecture](system-architecture.md) สำหรับแบบเป้าหมาย และ [Permission Matrix](../security/permission-matrix.md) สำหรับนโยบายสิทธิ์

งาน Sprint 2 ให้เริ่มจาก [Task74 Analysis and Review Packet](task74-sprint2-analysis.md) สำหรับ Business Flow, Decisions, Permission และ QA scenarios แล้วดู [Task75 System Design](task75-sprint2-design.md) สำหรับข้อเสนอ API, Schema, Locking และ UI การมีเอกสารหรือการ Merge PR ไม่ใช่หลักฐานว่า Requirement ได้รับ Approval หรือ Workflow ถูก Implement แล้ว

### สถานะเอกสาร Sprint 2 และหลักฐาน Review

| รายการ | หลักฐานและสิ่งที่ยังต้องตรวจ |
|---|---|
| Task74 | [PR #58](https://github.com/chanitnan0jr/TU_ClubHub_CS261/pull/58) Merge แล้วเมื่อ 28 ต.ค. 2026 เวลาไทย แต่ Review Ledger ใน [Task74 §8](task74-sprint2-analysis.md#8-วิธีตรวจงานและหลักฐาน-review) ยังระบุ Pending และข้อความใน packet ที่ว่า PR ยังไม่ Merge เป็นบันทึกเก่า; GitHub PR reviews ที่ตรวจวันที่ 1 พ.ย. 2026 ไม่พบ Review submission |
| Task74 card snapshot | [Task74 card ใน Repo](../tasks/sprint2/Task74.md) ติ๊ก Checklist ครบและยังเขียน `INTERVIEW` ใน Flow ขณะที่ [Decision Log](system-architecture.md#s2-decision-log) ตัดออกจาก MVP และ Ledger ยังรอ Review จึงต้องให้ Owner/Reviewer ตรวจหลักฐานและปรับสถานะให้ตรงกันก่อนสรุปการปิดงาน |
| Task75 | [PR #59](https://github.com/chanitnan0jr/TU_ClubHub_CS261/pull/59) Merge แล้ว; [เอกสาร Task75](task75-sprint2-design.md) ระบุ Ready for PO / Team Review และยังไม่ติ๊ก Schema review กับ FE/BE sign-off ส่วน GitHub มี `CHANGES_REQUESTED` กับ revision ก่อนการแก้ไข จึงต้องตรวจผล Review และหลักฐาน Sign-off ที่ revision ปัจจุบัน |
| Stories แยกการบันทึก/ประกาศผล | [S2-DECISION-DRAFT และ S2-PUBLICATION-DRAFT](../stories/sprint2/selection-results-draft.md) เป็นรหัสชั่วคราว โดยชนิตว์นันท์ดูแล Scope; เลข Story จริง การรับเข้า Sprint และผู้พัฒนา FE/BE ยังต้องยืนยัน ไม่ถือว่ารวมงานเขียนใน US-09 |

[ดัชนี Task ใน Repo](../tasks/sprint2/README.md) เป็น snapshot ของการ์ด ไม่ใช่สถานะ Trello แบบเรียลไทม์; ตรวจบอร์ดและหลักฐาน Review จริงก่อนเปลี่ยนสถานะงาน

## 1. ผลิตภัณฑ์และขอบเขต

TU-ClubHub รองรับนักศึกษา มธ. ในการดูชมรม สมัคร และติดตามผล กรรมการดูแลชมรมและรอบรับสมัคร ส่วน Admin มีงานสถิติและแต่งตั้งกรรมการตามขอบเขตของ Permission Matrix

Backend มี Authentication, Public Club APIs, การอัปเดตโปรไฟล์, การจัดการรอบ/คำถามบางส่วน และ API ส่งใบสมัครแล้ว Frontend หลักมี Login, ข้อมูลผู้ใช้, Logout, หน้ารายละเอียดชมรม, แก้โปรไฟล์ และจัดการคำถามที่เชื่อม API แล้ว ส่วนฟอร์มรอบและใบสมัครยังต้องเชื่อมเข้ากับแอปและ API จึงยังไม่ใช่ระบบรับสมัครที่ใช้งานครบทุกขั้นตอน

## 2. โครงสร้างที่มีอยู่

```text
TU_ClubHub_CS261/
├── frontend/
│   ├── src/main.tsx, App.tsx          # AuthProvider และ Router
│   ├── src/ClubProfileForm.tsx        # ฟอร์มและหน้า preview แยก
│   ├── src/features/
│   │   ├── auth/                     # Login / AuthContext
│   │   ├── clubs/                    # Components, hooks และ API client ข้อมูลชมรม
│   │   ├── recruitment/              # ฟอร์มรอบและคำถาม
│   │   └── applications/             # ฟอร์มใบสมัครต้นแบบ
│   └── tests/                        # Unit tests ของ validation, clients และ routing helpers
├── backend/
│   ├── src/main/java/com/tu/clubhub/
│   │   ├── auth/, user/              # TU adapters, session, บัญชีผู้ใช้
│   │   ├── club/, recruitment/       # REST APIs, services, repositories
│   │   ├── application/              # Submission controller/service/repository
│   │   ├── committee/, membership/   # สิทธิ์กรรมการและข้อมูลสมาชิกภาพ
│   │   └── config/                   # Security, timeout, SPA forwarding
│   └── src/main/resources/db/migration/
│       ├── V1__init_schema.sql        # 17 ตารางธุรกิจ
│       └── V3__create_spring_session_tables.sql
├── docs/                             # Contracts, architecture, stories, diagrams, reports
├── .github/workflows/                # App CI และ OpenAPI contract lint
├── Dockerfile                        # React build → Spring Boot JAR → Java runtime
└── compose.yaml                      # app + db; มี split profile เพิ่ม
```

Backend มี handler ส่งใบสมัคร แต่ยังไม่มี handlers สำหรับอ่าน/พิจารณาใบสมัคร ประกาศผล ตอบรับ/สละสิทธิ์ notification หรือ dashboard การมีตารางในฐานข้อมูลไม่ได้แปลว่ามี API ของตารางนั้นแล้ว Frontend มี Router (`src/app/AppRoutes.tsx`) และ HTTP client กลาง (`src/lib/api.ts`) แล้ว

## 3. Contract และจุดเชื่อมต่อปัจจุบัน

| ส่วน | สถานะและงานต่อ |
|---|---|
| Auth | `/api/v1/auth/csrf`, `login`, `me`, `logout` มี handler และหน้า Login เรียกใช้แล้ว; Real TU adapter มีโค้ด แต่การเข้าถึงบริการจริงต้องยืนยันในสภาพแวดล้อมส่งมอบ |
| Public club | `GET /api/v1/public/clubs/{id}` และ `.../{id}/recruitment-rounds` อ่าน DB แล้ว; หน้า `/clubs/:clubId` แสดงข้อมูลจากสอง API นี้; ค้นหา/รายการชมรม หมวดหมู่ และ tags มีใน Public Routes แต่ยังไม่มี handler |
| Club editor | `PUT /api/v1/clubs/{clubId}` มีแล้ว; GET path เดียวกันยังไม่มี handler หน้า `/clubs/:clubId/edit` จึงเติมค่าจาก public profile; category/tags ยังอ่านอย่างเดียว |
| Recruitment | POST/PUT และ PATCH `PUBLISH`/`CLOSE` มีแล้ว พร้อมข้อห้ามจัดการรอบที่ตนสมัคร และ response ตาม schema `Round`; GET list/detail และ `CANCEL` ยังไม่ทำ; ฟอร์มยังไม่มีการเชื่อมใช้งานใน App |
| Questions | บันทึกผ่าน `questions` ใน POST/PUT ของรอบ และจัดการรายข้อผ่าน `/api/v1/rounds/{roundId}/questions` (Backend และ `questionApi.ts` ใช้ path เดียวกัน); error เป็น Problem body แต่ 409 ยังใช้ `RESOURCE_CONFLICT` แทนรหัสเฉพาะเช่น `QUESTION_HAS_ANSWERS` |
| Submission | `POST /api/v1/rounds/{roundId}/applications` มี [controller](../../backend/src/main/java/com/tu/clubhub/application/controller/ApplicationController.java) และ [transactional service](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationService.java) ตาม [API Contract §11](../api/API_v1.md#11-application-submission); GET application form และ frontend client/integration ยังไม่มี; `Location` ใน response ชี้ไปยัง applicant detail ที่ยังไม่มี handler |
| History / review / confirmation / Admin | Task75 และ [OpenAPI](../api/openapi.yaml) มี Design/Contract ที่ระบุ `pending` สำหรับประวัติใบสมัคร การอ่าน/ตัดสิน/ประกาศผล ตอบรับ/สละสิทธิ์ และ dashboard; ยังไม่มี handler สำหรับ Workflow เหล่านี้ |

ใช้ [API_v1.md](../api/API_v1.md) และ [openapi.yaml](../api/openapi.yaml) สำหรับ Auth/Clubs/Submission; ใช้ [rounds.openapi.yaml](../api/rounds.openapi.yaml) สำหรับรอบและคำถาม ไม่สร้าง Contract จาก path ชั่วคราวใน UI

## 4. ข้อมูลและใบสมัคร

[Flyway migrations](../../backend/src/main/resources/db/migration) เป็นแหล่งอ้างอิง Schema ที่ใช้งาน ส่วน [DBML](../database/TU-ClubHub-ERD-Updated.dbml) อธิบายโมเดล ไม่มี migration สำหรับ Seed ข้อมูลชมรมหรือกรรมการ และไม่มี V2 ในชุดปัจจุบัน

Service ส่งใบสมัครบันทึกตารางเดิมใน Transaction เดียว:

| Request / ข้อมูล Server | ตาราง |
|---|---|
| `motivation`, ผู้สมัครจาก Session, รอบ/ชมรม, `SUBMITTED`, เวลา Server | `applications` |
| `answers[].questionId`, `answers[].answerText` | `application_answers` |
| `links[].label`, `links[].url`, ลำดับจาก Array เริ่มที่ 1 | `application_links` |
| ประวัติแรก `NULL → SUBMITTED` และผู้ดำเนินการ | `application_status_history` |

`application_links` มี `url VARCHAR(2048)`, `label VARCHAR(200)`, `display_order` และ `application_id` อยู่แล้ว จึงไม่ต้องเพิ่มคอลัมน์แนบลิงก์ Contract กำหนดเหตุผล 1–2,000 ตัวอักษร, ลิงก์ 0–5 รายการ และความยาวคำตอบตาม `application_questions.max_length` เก็บเฉพาะ HTTPS URL โดยไม่อัปโหลดหรือดาวน์โหลดเอกสาร

สถานะเริ่มต้นคือ `SUBMITTED` แสดงเป็น “รอพิจารณา (Pending)” ใช้ Unique `(round_id, applicant_id)` และไม่ให้สมัครรอบเดิมซ้ำหลังถอน เพดานสมาชิกภาพคือ 5 ชมรมทุกประเภทที่บันทึกในระบบและมีผลอยู่ ไม่นับใบสมัครค้างเป็นสมาชิก และไม่มีโควตาใบสมัครค้างแยกต่างหาก Submission ตรวจสมาชิกที่มีผลอยู่; นโยบายยืนยันสิทธิ์ใน [T74-D07](system-architecture.md#t74-d07) ให้ปฏิเสธการยืนยันใหม่เมื่อมีแถวสมาชิกเดิมทุกสถานะ ยกเว้น Retry ของการยืนยันเดิม แต่ confirmation ยังไม่มี implementation

Submission จับ lock ตามลำดับผู้สมัคร → student profile → ชมรม → รอบ → คำถาม → สมาชิกภาพ และอ่านเวลา Server หลังได้ lock รอบ; รอบและคำถามใช้ shared lock ใน [ApplicationRepository](../../backend/src/main/java/com/tu/clubhub/application/repository/ApplicationRepository.java) ดูรายละเอียดและขอบเขตการแข่งขันกับงานอื่นใน [Task75 §4.2](task75-sprint2-design.md)

## 5. Authentication และสิทธิ์

- Browser ใช้ Session cookie และ CSRF; Backend เรียก TU API ด้วย Application-Key ฝั่ง Server
- Session idle timeout เริ่มต้น 30 นาที; absolute timeout 8 ชั่วโมงกำหนดใน `AbsoluteSessionTimeoutFilter` ยังไม่มีตัวแปร `SESSION_ABSOLUTE_TIMEOUT`
- `dev` ใช้ mock adapter โดยค่าเริ่มต้น บัญชี `student-demo` / `tu-clubhub-demo`; mock mode ใช้ได้เฉพาะ dev/test และห้ามใช้กับ prod
- Login บันทึก `users` และสร้าง/อัปเดต `student_profiles` สำหรับบัญชีนักศึกษาจากสถานะที่ TU adapter ยืนยันใน Transaction เดียว; ไม่สร้าง membership, committee assignment หรือ global role ให้โดยอัตโนมัติ การยืนยัน mapping กับ TU จริงยังค้าง; `role` จาก `/auth/me` ยังอิง principal ของ session ไม่ใช่หลักฐานสิทธิ์กรรมการหรือการตรวจ ADMIN ล่าสุดจาก DB
- ทุก authenticated request ตรวจ Account Status อีกครั้ง; บัญชีที่ไม่ Active ถูกยกเลิก Session และได้รับ `403 ACCOUNT_NOT_ALLOWED` สำหรับ protected request; [PublicRoutes](../../backend/src/main/java/com/tu/clubhub/config/PublicRoutes.java) รวม whitelist แบบ HTTP method + path และการมี path ใน whitelist ไม่ได้หมายความว่า handler พร้อมใช้งาน
- Committee guard ตรวจ account/student/club Active, membership Active ที่ `joined_at <= now` และไม่สิ้นสุด, assignment Active ไม่ถูกถอน และ `starts_at <= now < ends_at` แล้ว งานเขียนมี assignment-row lock และรอบ/คำถามมี self-review check; ยังขาด PRESIDENT-only guard และ application/result workflows ส่วน lock นี้ไม่ได้ serialize การเปลี่ยน account/student/membership/club ทุกสถานะ
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
| Frontend tests | Script `test` ใช้ Node test runner กับทุกไฟล์ `tests/*.test.ts`; ไม่มี `test:run`; app CI มีขั้น `npm test` |
| Backend | Maven Wrapper; `./mvnw clean verify` สร้าง test/JaCoCo reports |
| App CI | [ci.yml](../../.github/workflows/ci.yml) ใช้ Frontend lint/test/build และ Backend verify; มี PostgreSQL 18 service และใช้ mock TU; tests มี H2/PostgreSQL; workflow ข้าม docs/Markdown-only ผ่าน path filters |
| API contract CI | [api-contract.yml](../../.github/workflows/api-contract.yml) ใช้ Redocly lint OpenAPI สองไฟล์เมื่อเปลี่ยน `docs/api/**`, `redocly.yaml` หรือ workflow นั้น; `no-invalid-media-type-examples` เป็น error ตาม [redocly.yaml](../../redocly.yaml) |

[รายงานเดิม](../testing) อ้างอิงวันที่หรือ revision ของแต่ละงาน ไม่ใช่ผลตรวจของ Source ปัจจุบัน

## 8. งานต่อจาก Context นี้

1. ให้ Owner/Reviewer เทียบสถานะ Task74 ระหว่าง card, Review Ledger และ PR; บันทึกหลักฐาน FE/BE/QA และ Approval จริง รวมถึงแก้ Flow ที่ยังมี `INTERVIEW` ใน card เมื่อได้รับการยืนยัน
2. ทบทวน Task75 และ [Decision Log](system-architecture.md#s2-decision-log) ร่วม FE/BE/QA โดยเฉพาะ Schema/DTO sign-off, ความถี่และการกู้คืน expiry worker, นิยาม dashboard และสอง Draft Stories; อย่าถือว่า US-09 แบบ read-only ครอบคลุมงานตัดสิน/ประกาศผล
3. เชื่อมฟอร์มรอบและใบสมัครเข้ากับ Routes/Pages และ DTO/API; พัฒนา application-form GET และ applicant-detail GET ตาม Contract ที่ผ่าน Review โดยรักษา Submission และ SD-05 ให้ตรงกัน
4. ยืนยัน student-status mapping กับ TU จริง และทำช่องว่างสิทธิ์ตาม Matrix รวม PRESIDENT guard และ current ADMIN role check
5. ทำ committee reads, cancellation และ frontend รอบตาม `rounds.openapi.yaml`; ทำ Workflow ประวัติ ผลคัดเลือก ตอบรับ/สละสิทธิ์ และ Admin ตาม Contract/Scope ที่ผ่าน Review

เมื่อแก้งาน ให้ปรับสถานะใน README, Contract, Story และ Diagram ที่เกี่ยวข้องร่วมกัน ไม่ทำเครื่องหมายเสร็จจากการมี Schema หรือ UI ต้นแบบเพียงอย่างเดียว
