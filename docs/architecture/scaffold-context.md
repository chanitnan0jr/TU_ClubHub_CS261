# TU-ClubHub — Monorepo Scaffold Context

วันที่: 11 ตุลาคม 2026 · สถานะ: ข้อกำหนดสำหรับสร้าง Scaffold ยังไม่ใช่รายงานว่าโค้ดถูกสร้างหรือทดสอบแล้ว

เอกสารนี้ใช้ส่งให้ Coding Agent หรือทีมพัฒนาได้ทั้งไฟล์ อ่านร่วมกับ [System architecture](system-architecture.md), [API contract](../api/API_v1.md), [OpenAPI specification](../api/openapi.yaml) และ [ERD ที่เสนอ](../database/TU-ClubHub-ERD-Updated.dbml)

## 1. บทบาทและเป้าหมายของผู้สร้าง Scaffold

คุณเป็น Software Engineer ที่สร้างฐานโครงการ TU-ClubHub ให้ทีม 7 คนพัฒนาต่อได้ เป้าหมายคือ Repository ที่ติดตั้ง Build ทดสอบ และรันด้วย Docker Compose ได้ พร้อมโครงสร้างที่เข้าใจง่ายสำหรับสมาชิกมือใหม่

ให้สร้างโครงสร้างและ Foundation ที่ระบุด้านล่าง โดยไม่ขยายเป็นการพัฒนาครบทุก User Story อย่ารายงานว่า Feature เสร็จหากมีเพียงหน้าว่างหรือ API Stub

ก่อนแก้ Repository ที่มีอยู่ ให้อ่าน README, AGENTS.md, API Contract, ERD, package manifests และ Migration เดิมก่อน รักษางานเดิมและไม่เปลี่ยน Stack หรือรูปแบบ Auth โดยพลการ ถ้าพบความขัดแย้งให้บันทึกและดำเนินส่วนที่ไม่ขึ้นกับข้อขัดแย้งต่อ

## 2. บริบทของผลิตภัณฑ์

TU-ClubHub เป็นเว็บค้นหาชมรมและจัดการรับสมัครสมาชิกของมหาวิทยาลัยธรรมศาสตร์

| ผู้ใช้ | ความสามารถ |
|---|---|
| นักศึกษา | ค้นหาชมรม อ่านประกาศ สมัคร ดูสถานะ และยืนยันหรือสละสิทธิ์ |
| กรรมการชมรม | แก้โปรไฟล์ จัดการรอบและคำถาม ตรวจใบสมัคร และดำเนินการคัดเลือกตามสิทธิ์ |
| เจ้าหน้าที่ส่วนกลาง | ดูสถิติและภาพรวมส่วนกลาง |

กรรมการเป็นสิทธิ์ตามชมรมและช่วงวาระ ไม่ใช่ Global Role ที่แก้ได้ทุกชมรม ผู้ได้รับการคัดเลือกยังไม่เป็นสมาชิกจนยืนยันสิทธิ์สำเร็จ

ไม่มี File Upload: ใบสมัครเก็บ HTTPS URL ของเอกสาร/Portfolio รูปชมรมใช้ HTTPS URL หรือรูปเริ่มต้นในเว็บ Backend ไม่ดาวน์โหลดไฟล์หรือ Fetch Preview จาก URL เหล่านี้อัตโนมัติ

## 3. ข้อตัดสินใจที่ต้องรักษา

| ส่วน | ข้อกำหนด |
|---|---|
| Repository | Monorepo เดียว: `frontend/`, `backend/`, `docs/` |
| Frontend | React + TypeScript + Vite + Tailwind CSS, CSR, Feature-based |
| Backend | Java 21 + Spring Boot 4.x, Maven Wrapper |
| โครง Backend | Feature-based modular monolith, หนึ่ง Spring Boot process / หนึ่ง Maven module ในช่วงเริ่มต้น |
| Persistence | PostgreSQL, Spring Data JPA สำหรับข้อมูลธุรกิจ, Flyway |
| Session | Spring Security + Spring Session JDBC ใน PostgreSQL |
| Authentication | TU Authentication API; สร้างบัญชีภายในเมื่อยืนยันตัวตนสำเร็จครั้งแรก |
| API | REST, `/api/v1`, JSON, DTO แยกจาก Entity |
| Local | Vite dev server + Spring Boot + PostgreSQL หรือ Compose สำหรับแอปที่ Build แล้ว |
| Delivery | Render Web Service หนึ่งบริการ + Render PostgreSQL |
| Static assets | Multi-stage Docker build นำ React dist รวมเข้า Spring Boot |
| CI | GitHub Actions: backend verify, frontend lint/typecheck/tests/build |

ไม่เพิ่ม JWT, Redis, Kafka, Microservices, Micro-frontends, BFF, Object Storage, Nginx แยกบริการ, Nx หรือ Turborepo เป็นค่าเริ่มต้น ไม่มีความจำเป็นจาก Scope ปัจจุบัน

### Dependency policy

ตรวจ Compatibility และ Security ของเวอร์ชันจริงก่อนสร้าง เลือก release ที่เสถียรและเข้ากับ baseline แล้วตรึงเวอร์ชันใน manifests, lockfile, Maven Wrapper และ Docker base images ห้ามใส่ `latest`, SNAPSHOT หรือคาดเดาเลขเวอร์ชัน

โครงการใช้ Spring Boot 4.x เป็น baseline; เวอร์ชัน patch ที่ใช้งานจริงต้องตรึงไว้ใน `backend/pom.xml` ตรวจ Compatibility ของ Dependency และ Starter กับ Spring Boot 4 ก่อนเพิ่มทุกครั้ง หากจะเปลี่ยน Major Version ให้บันทึกเหตุผลและผลกระทบในเอกสารสถาปัตยกรรมก่อนแก้ manifests

ใช้ npm พร้อม `package-lock.json`; เลือก Node.js LTS ที่เข้ากับ Vite รุ่นที่เลือกและบันทึกใน `.nvmrc` เลือก PostgreSQL major เดียวกันสำหรับ Local, CI และ Render ตามที่ใช้งานได้จริง บันทึกทั้งหมดใน `docs/architecture/versions.md`

## 4. โครงสร้าง Repository ที่ต้องสร้าง

| Path | หน้าที่ |
|---|---|
| `README.md` | Setup, run, test, build และข้อจำกัดปัจจุบัน |
| `backend/pom.xml` | Dependencies และ Build Backend |
| `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/` | Maven Wrapper |
| `backend/src/main/java/com/tuclubhub/` | Source Backend |
| `backend/src/main/resources/` | Configuration และ Flyway SQL |
| `backend/src/test/` | Tests และ test resources |
| `frontend/package.json`, `frontend/package-lock.json` | Dependencies และ Scripts |
| `frontend/src/`, `frontend/public/` | Source และ Static Assets |
| `.github/workflows/ci.yml` | Pull Request / main CI |
| `Dockerfile`, `.dockerignore` | Build context จาก Repository root |
| `compose.yaml` | Local application + PostgreSQL |
| `.env.example`, `.gitignore`, `.editorconfig` | ตัวอย่าง Configuration และมาตรฐานพื้นฐาน |
| `docs/architecture/` | Architecture, module rules, versions และ ADR |
| `docs/api/openapi.yaml` | Contract ของ Endpoint ที่มีจริงและ Proposal ที่แยกชัดเจน |
| `docs/database/` | DBML, Data Dictionary และคำอธิบาย Migration |
| `docs/requirements/`, `docs/stories/` | Business Rules และ Story Specification |
| `docs/testing/` | Test Plan, ผลตรวจรับ และข้อจำกัด |
| `docs/deployment/` | Local demo, Render deployment, backup/restore และ smoke-test guide |

ใช้ `.gitkeep` หรือ README เฉพาะจุดที่ต้องเก็บโฟลเดอร์ว่าง ไม่สร้างคลาสว่างหลายสิบคลาสเพียงให้ดูมีโครงสร้าง

## 5. Backend module contract

Base package: `com.tu.clubhub`; คลาสเริ่มต้น `ClubhubApplication` อยู่ใน Root Package

| Package | เจ้าของความรับผิดชอบ |
|---|---|
| `auth` | Login/logout/me, TU authentication adapter, session authentication |
| `user` | บัญชีภายในและ Student Profile |
| `club` | โปรไฟล์ชมรม หมวดหมู่ แท็ก |
| `committee` | Assignment และตรวจสิทธิ์ตามชมรม/วาระ |
| `recruitment` | รอบรับสมัคร คำถาม และการตรวจช่วงเปิดรับ |
| `application` | ใบสมัคร คำตอบ ลิงก์ การพิจารณา สถานะ และ orchestration การตอบรับผล |
| `membership` | สมาชิกชมรมและประวัติสมาชิกภาพ |
| `notification` | การสร้าง/อ่านการแจ้งเตือนภายในเว็บ |
| `dashboard` | Read model สำหรับสถิติและภาพรวม |
| `config` | Security, Session, Web, Properties และ Clock |
| `common` | Error contract, Exception Handler และ primitive utilities ที่ใช้ร่วมกันจริง |

ภายใน Feature ที่มีโค้ดใช้ `controller/`, `service/`, `repository/`, `domain/`, `dto/` และ `api/` เมื่อจำเป็นต้องเผยแพร่ Service Contract ข้ามโมดูล สำหรับ TU adapter ใช้ `auth/integration/tu/`

กติกา:

1. Controller รับ/ตรวจรูปแบบ DTO และเรียก Service; ไม่ใส่ SQL หรือ Business Workflow ใน Controller
2. Service เป็นเจ้าของกฎธุรกิจและ Transaction Boundary
3. Repository เข้าถึงข้อมูลของโมดูลตนเอง ไม่เรียก HTTP
4. โมดูลอื่นเรียกเฉพาะ Public Service Contract / DTO; ไม่ Import Repository หรือ Entity ภายในของอีกโมดูล
5. ใช้ ID อ้างอิงข้ามโมดูลและรักษา Foreign Key ในฐานข้อมูล ไม่สร้าง Entity navigation ที่ทำให้โมดูลผูกกันทุกทิศ
6. ห้าม Cyclic Dependencies และไม่แก้ด้วยการย้าย Business Logic ทุกอย่างเข้า `common`
7. ไม่สร้าง Interface และ Implementation คู่กันทุก Service โดยไม่มีเหตุผล ใช้ Interface ที่ขอบเขตข้ามโมดูลหรือจุดที่ต้องสลับ Adapter เช่น TU API
8. Policy จากเวลาใช้ `Clock` ที่ Inject ได้ เพื่อให้ทดสอบก่อน/หลัง Deadline ได้แน่นอน
9. แนวทาง feature-based อย่างเดียวไม่ได้บังคับความเป็นโมดูล ให้มี Architecture Test ตรวจ Dependency ที่ห้าม หรือกฎตรวจ Review ที่ชัดเจน

## 6. Frontend contract

| Path ภายใน `frontend/` | หน้าที่ |
|---|---|
| `src/app/` | App bootstrap, Router และ Providers |
| `src/pages/` | Route-level pages ประกอบ Feature Components |
| `src/features/auth/` | Login, AuthProvider และข้อมูลผู้ใช้จาก `/auth/me` |
| `src/features/clubs/` | ฟีเจอร์ชมรม |
| `src/features/recruitment/` | รอบและคำถาม |
| `src/features/applications/` | ใบสมัครและสถานะ |
| `src/features/memberships/` | การตอบรับสิทธิ์และสมาชิกภาพ |
| `src/features/dashboard/`, `src/features/notifications/` | งาน Sprint ถัดไป |
| `src/components/ui/`, `src/components/layout/` | Shared UI และโครงหน้าจอ |
| `src/lib/httpClient.ts` | HTTP, credentials, CSRF header และ Error normalization |
| `src/hooks/`, `src/types/` | ส่วนที่ใช้ข้าม Feature จริง |
| `src/assets/`, `src/styles/`, `public/` | Assets, Styles และไฟล์ URL คงที่ |

Feature แบ่ง `components/`, `hooks/`, `api/`, `types/`, `utils/` ตามการใช้งาน เก็บ Test ใกล้ไฟล์ที่ทดสอบ เช่น `ClubCard.test.tsx`

Default สำหรับ Scaffold: React Context สำหรับ Auth; local component state สำหรับฟอร์ม/Modal; Fetch wrapper สำหรับ HTTP อย่าเพิ่ม Redux, Zustand และ TanStack Query พร้อมกัน หากมี Dependency เดิมให้รักษาไว้และบันทึกเหตุผล หากเพิ่ม Server-state library ภายหลังให้แยก cache ของแต่ละผู้ใช้และ Clear เมื่อ Logout

Frontend ห้ามเรียก TU API โดยตรง ห้ามเก็บ TU password, Session ID หรือสิทธิ์ที่ใช้เป็นแหล่งความจริงใน LocalStorage ค่าจาก `/auth/me` ใช้เพื่อแสดง UI; Backend ยังต้องตรวจสิทธิ์ใหม่

Route ที่ต้องรองรับใน Scaffold: `/`, `/login`, `/clubs/:clubId`, หน้า Not Found ใช้ Lazy Loading ที่ระดับหน้าหากเพิ่มได้โดยไม่สร้าง abstraction เกินจำเป็น

## 7. ขอบเขตที่ต้องทำให้รันได้จริง

### 7.1 Foundation

- Frontend และ Backend Build ได้ และมี health endpoint ที่แสดงข้อมูลขั้นต่ำ
- PostgreSQL + Flyway เริ่มจากฐานข้อมูลว่างได้
- Login/logout/me ผ่าน Mock TU adapter เฉพาะ Local/Test พร้อม JDBC Session และ CSRF
- หน้า Login, Layout, Loading/Error/Empty States และ Club Detail ตัวอย่าง
- Vertical slice หนึ่งเส้น: หน้า Club Detail อ่านข้อมูลจาก API และ PostgreSQL จริง โดยไม่มี Mock API แทรกในเส้นนี้
- ตรวจรูปแบบ API error และ unauthenticated/forbidden behavior
- CI, Docker build, Compose และคู่มือเริ่มต้นใช้งาน

### 7.2 ยังไม่ต้องพัฒนาครบใน Scaffold

- Submit Application workflow เต็มรูปแบบ, quota, concurrent submission
- Review / publish results / confirm / expiry workflow
- Dashboard จริงและ Notification workflow
- CRUD ทุกตารางหรือหน้า User Management

สร้างเพียงแผน Package / Route และ TODO ที่ชี้ไปยัง Story สำหรับงานอนาคต ห้าม Endpoint ที่ยังไม่ทำตอบ `200 OK` เสมือนสำเร็จ

## 8. Authentication, Session และ CSRF

### Proposed foundation endpoints

| Method / Path | ความหมาย |
|---|---|
| `GET /api/v1/auth/csrf` | ส่ง CSRF token และชื่อ Header สำหรับ request ถัดไป; `Cache-Control: no-store` |
| `POST /api/v1/auth/login` | ตรวจ TU identity, สร้าง/อัปเดตบัญชีที่อนุญาต, เปลี่ยน Session ID และคืน CSRF token ใหม่ใน Response Body เมื่อสำเร็จ |
| `GET /api/v1/auth/me` | คืนข้อมูลผู้ใช้ปัจจุบัน; ไม่มี Session ให้ตอบ JSON 401 |
| `POST /api/v1/auth/logout` | ตรวจ CSRF, invalidate Session และล้าง Session Cookie |
| `GET /api/v1/clubs/{clubId}` | ข้อมูลชมรมสาธารณะตาม Response DTO |
| `GET /actuator/health` | สถานะขั้นต่ำ ไม่เผย Environment หรือ Secrets |

Endpoint และ payload นี้เป็นข้อเสนอสำหรับ Scaffold; ตรวจ API Spec เดิมก่อนสร้างและอย่าเปลี่ยน Contract เดิมที่ทีมใช้อยู่โดยพลการ

ใช้ `HttpSessionCsrfTokenRepository` เป็นค่าเริ่มต้นที่เสนอ GET token ผ่าน Controller ซึ่งใช้ Spring Security CsrfToken; ส่ง token กลับตาม `headerName` โดยไม่แยกสร้าง token เองใน JS

Flow: GET csrf → POST login พร้อม token → เปลี่ยน Session ID และคืน CSRF token ใหม่ใน Login Response เมื่อ Authentication สำเร็จ → บันทึก SecurityContext ใน Session ผ่านกลไกที่เข้ากับ Spring Security รุ่นที่เลือก → เรียก `/auth/me` เพื่อกู้ Auth State ได้ เมื่อ Logout หรือ Session หมดอายุ ให้ล้าง Auth State และดึง CSRF ใหม่ก่อน Login ครั้งถัดไป

ถ้าทำ JSON Login Controller เอง ต้องตรวจว่ามีการใช้ SessionAuthenticationStrategy และบันทึก SecurityContext อย่างถูกต้อง การตั้ง SecurityContextHolder เพียงอย่างเดียวไม่เพียงพอสำหรับการคงสถานะข้าม Request ให้ทดสอบกับคำขอถัดไปจริง

- Cookie: `HttpOnly`, `Secure=true` บน HTTPS, `SameSite=Lax` เป็นค่าเริ่มต้น, Path `/` และ host-only
- Local HTTP อนุญาต Secure=false เฉพาะ dev/test profile
- Session หมดอายุเมื่อไม่มี activity 30 นาที หรือครบ 8 ชั่วโมงนับจาก Login สำเร็จ แล้วแต่อย่างใดถึงก่อน; Backend ต้อง enforce ทั้งสองค่า
- Inactivity timeout ใช้ `spring.session.timeout` (Environment override: `SPRING_SESSION_TIMEOUT`, ค่าเริ่มต้น `30m`); absolute timeout `8h` ต้องตรวจจากเวลาที่ Login สำเร็จและ enforce ฝั่ง Backend แยกจาก idle timeout
- เปิด CSRF สำหรับ state-changing endpoints รวม Login/Logout; อย่าแก้ CORS ด้วยการปิด CSRF
- `/api/**` คืน JSON 401/403 ไม่ redirect เป็น HTML login page
- ไม่เปิด `permitAll()` ทั้ง `/api/**`; เปิด Public Paths แบบระบุชัด
- TU credential และ Application-Key ห้ามอยู่ใน Logs, Frontend bundle, Database หรือ Session
- TU API ล่ม/Timeout ต้องไม่กลายเป็น Login สำเร็จ หรือสลับใช้ Mock อัตโนมัติ

Mock adapter ต้องมีบัญชีตัวอย่างที่กำหนดไว้แน่นอน ไม่รับ username/password ใดก็ได้ กำหนด `TU_AUTH_MODE=mock` ได้เฉพาะ dev/test; การเปิด Mock ใน prod ต้องทำให้แอปไม่ Start

Production TU adapter สร้าง Interface, config validation และ timeout ได้ก่อน แต่ห้ามเดา URL/header/payload จากชื่อบริการ หากไม่มี Contract จริง ให้แจ้ง Integration ที่ยังขาดและ fail closed ไม่สร้าง response ปลอม และไม่อ้างว่าเชื่อม TU API จริงแล้ว

## 9. Database และข้อมูลทดสอบ

ใช้ `docs/database/TU-ClubHub-ERD-Updated.dbml` เป็น Reference Design อย่าเดาว่า DBML ที่ใช้ `>?` แปลงผ่าน Tool ทุกตัวได้โดยตรง ต้องตรวจ SQL ที่สร้างก่อนใช้

Scaffold ใช้ Schema subset เท่าที่ Vertical slice ต้องใช้ ได้แก่ `users`, `student_profiles` ถ้าจำเป็นต่อ Login, `club_categories`, `clubs` และตาราง Spring Session ตาม Spring Session รุ่นจริง รักษาชื่อ/ข้อกำหนดของตารางที่สร้างให้ตรง ERD และสร้าง FK dependencies ให้ครบ ตารางอื่นค่อยเพิ่มด้วย Migration เมื่อเริ่ม Story นั้น

Flyway เป็นผู้จัดการ Schema เพียงทางเดียว: JPA ใช้ `ddl-auto=validate`; ปิด Spring Session auto-initialization เมื่อสร้าง Session tables ด้วย Flyway แล้ว ใช้ Session schema script ที่ตรง Dependency รุ่นนั้น

วาง Production migrations ใน `db/migration/` และ Local fixture migrations ใน `db/devdata/` ที่เปิดเฉพาะ dev; CI ใช้ test fixtures ของตนเอง อย่าใส่บัญชี Mock/Admin หรือ Sample clubs ลง Production migration

Migration ที่ถูกใช้ร่วมกันแล้วห้ามแก้ย้อนหลัง ให้เพิ่ม Version ใหม่ การรัน Flyway รอบสองต้องไม่ทำซ้ำ migration ที่สำเร็จแล้ว ไม่ได้หมายความว่า SQL ทุกไฟล์ต้องรันซ้ำได้เอง

## 10. API และข้อมูลข้ามระบบ

- JSON fields ใช้ camelCase; PostgreSQL ใช้ snake_case
- ถ้า Backend ใช้ bigint/Long สำหรับ ID ให้ส่งผ่าน JSON เป็น decimal string และ Frontend ใช้ `string` เป็นค่าเริ่มต้นที่เสนอ เพื่อไม่สูญเสียความแม่นยำของ JavaScript number
- เวลาข้าม API ใช้ ISO 8601 UTC; Database ใช้ timestamptz; UI แสดง Asia/Bangkok
- Error response เสนอใช้ `application/problem+json` มี `type`, `title`, `status`, `detail`, `instance` และ extensions `code`, `fieldErrors`, `traceId` โดยไม่เผย Stack Trace/SQL/Secrets
- ความผิดพลาดทั่วไป: 400 validation, 401 unauthenticated, 403 unauthorized/CSRF, 404 resource missing, 409 conflict, 503 upstream unavailable
- TU login ล้มเหลวไม่เผยรายละเอียดที่เปิดเผยข้อมูลบัญชีเกินจำเป็น
- DTO ต้องไม่ส่ง Entity ตรง ๆ; public club DTO ต้องไม่หลุด draft rounds, applicant details หรือ internal notes

## 11. Local development และ Deployment

### Local development

ใช้ Browser เข้า Vite ที่ `http://localhost:5173`; Vite proxy `/api` ไป Spring Boot ที่ `http://localhost:8080` ห้ามให้ Frontend เรียก Backend URL ต่าง Origin เป็น default

API client ใช้ relative `/api/v1` พร้อม Cookie ตาม origin; ทำให้ dev และ delivery ใช้โค้ดเดียวกันได้ PostgreSQL local bind เฉพาะ loopback หากเปิด Port ให้เครื่อง host

### Docker / Compose

Root Dockerfile มี Node build stage → Maven build stage → Java runtime stage นำ React `dist/` เข้า Static Resources ก่อน package JAR และใช้ Runtime user ที่ไม่ใช่ root

Compose มี `app` กับ `db`; named volume ใช้เก็บ PostgreSQL เท่านั้น ไม่ใช่ที่เก็บไฟล์แนบ รอ DB healthy ก่อน Start app พร้อมการ Retry ที่เหมาะสม Session และข้อมูลธุรกิจต้องยังอยู่เมื่อ recreate app โดยไม่ลบ DB volume

### SPA routing

Spring Boot เสิร์ฟ `index.html` ให้เฉพาะ Frontend routes ที่รองรับ รวม Direct URL / Refresh; ห้าม catch-all กลืน `/api/**`, `/actuator/**` หรือไฟล์ Asset ที่ไม่มีอยู่ ให้ API ที่ไม่พบยังเป็น JSON 404 และ Asset ที่ไม่พบเป็น 404

### Render

Web Service ใช้ Dockerfile ที่ Repository root; แอป bind `0.0.0.0` และ Port จาก Render `PORT` กำหนด Spring port ด้วย `${PORT:8080}` ใน config

Render PostgreSQL อยู่ Region เดียวกับแอป ใช้ internal connection ที่ตั้งค่าเหมาะสม ส่ง JDBC URL แยกจาก username/password อย่านำ `postgresql://...` ไปใส่ JDBC URL โดยไม่แปลง/ตรวจสอบ

เลือก Source-based build: Deploy commit ที่ผ่าน PR review และ CI แล้ว ตั้ง Manual Deploy เป็น default ที่เสนอ ไม่เพิ่ม GHCR pipeline ซ้ำโดยไม่จำเป็น Secrets ตั้งผ่าน Platform Environment; ไม่ใส่ `VITE_*` สำหรับ Secret เพราะค่าที่ใช้โดย Client สามารถอยู่ใน Bundle ได้

## 12. Configuration ที่ต้องอธิบายใน README

| Variable | การใช้ |
|---|---|
| `SPRING_PROFILES_ACTIVE` | dev / test / prod |
| `PORT` | พอร์ต HTTP ของแอป |
| `SPRING_DATASOURCE_URL` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Credentials ฝั่ง Server |
| `TU_AUTH_MODE` | mock เฉพาะ dev/test; real สำหรับ delivery |
| `TU_AUTH_BASE_URL`, `TU_AUTH_APPLICATION_KEY` | ต้องยืนยันจาก TU Contract และตั้งภายนอก Source |
| `TU_AUTH_CONNECT_TIMEOUT`, `TU_AUTH_READ_TIMEOUT` | ระบุหน่วยและผูก Properties ให้ใช้งานจริง |
| `SPRING_SESSION_TIMEOUT` | Idle timeout ของ Spring Session; ค่าเริ่มต้น 30 นาที |
| `SESSION_ABSOLUTE_TIMEOUT` | อายุสูงสุด 8 ชั่วโมงนับจาก Login สำเร็จ; ต้อง enforce ฝั่ง Backend ไม่ใช่แค่ cookie expiry |

ชื่อตัวแปร custom เป็น Proposed Contract ให้เขียน ConfigurationProperties และเอกสารให้ตรงกัน ห้ามมี Variable ที่ประกาศแล้วไม่ได้ใช้

Root `.env` ไม่ได้ถูกอ่านโดย Spring Boot อัตโนมัติ ให้ README อธิบาย Compose interpolation/env_file และวิธี export ตัวแปรเมื่อรัน JVM ตรง ๆ

## 13. CI และเกณฑ์ตรวจรับ Scaffold

Commands ต่อไปนี้เป็น Target Interface ที่ Scaffold ต้องทำให้ใช้ได้ ไม่ใช่ผลการรันในเอกสารนี้

| Working directory | Command | Expected |
|---|---|---|
| `frontend/` | `npm ci` | ติดตั้งจาก Lockfile |
| `frontend/` | `npm run lint` | ผ่าน Lint |
| `frontend/` | `npm run typecheck` | TypeScript ผ่าน |
| `frontend/` | `npm run test:run` | Tests จบเอง ไม่ Watch |
| `frontend/` | `npm run build` | สร้าง `dist/` |
| `backend/` | `./mvnw verify` | Compile + Unit/Integration tests |
| Repository root | `docker compose up --build` | App และ Database พร้อมใช้งาน |

เลือก PostgreSQL Service ใน CI เป็นแนวทางเริ่มต้นที่เสนอ และแยก DB test ออกจาก DB ที่ใช้จริง CI ต้องไม่เรียก TU API จริง; ใช้ Mock adapter ที่ครอบคลุม success, invalid credential, timeout

Definition of Done:

- [ ] Clone ใหม่แล้วทำตาม README ได้โดยไม่มี dependency/secret ที่ซ่อนอยู่
- [ ] Health, Club Detail จาก DB, Login, me, Logout ทำงานใน Local mock mode
- [ ] Login เปลี่ยน Session ID และคืน CSRF token ใหม่; Cookie เรียก `/auth/me` ข้าม Request ได้; Logout ทำให้ Session เดิมใช้ไม่ได้
- [ ] Backend enforce idle timeout 30 นาทีและ absolute timeout 8 ชั่วโมง; Session หมดอายุแล้ว Protected API ตอบ 401 และ Frontend ล้าง Auth State
- [ ] Unsafe request ที่ไม่มี/ผิด CSRF ถูกปฏิเสธ และ request ที่มี token ถูกต้องผ่านได้
- [ ] Prod ไม่ Start ด้วย Mock adapter; real TU integration ที่ยังไม่ครบถูกระบุชัด
- [ ] Flyway ใช้กับ DB ว่างได้และ Start รอบสองไม่ทำ Migration ซ้ำ
- [ ] Compose recreate app แล้วข้อมูลยังอยู่; ไม่ใช้การลบ Volume เป็นวิธีแก้ Migration ตามปกติ
- [ ] Direct URL หน้าเว็บทำงาน แต่ API/Asset 404 ไม่กลายเป็น index.html
- [ ] Typecheck, Backend verify, Frontend tests/build และ Docker build ผ่านจริง
- [ ] Tests ตรวจพฤติกรรมสำคัญ ไม่ใช่เฉพาะ Component mount หรือ Spring context loads
- [ ] ไม่มี Secrets, node_modules, target, dist หรือ .env จริงใน Git
- [ ] มีรายการไฟล์ที่สร้าง วิธีรัน ผลการตรวจจริง และงานที่ยังไม่ทำ

## 14. Backlog และข้อขัดแย้งที่ห้ามเดา

Sprint 1: US-02 ดูรายละเอียด, US-03 ส่งใบสมัคร, US-06 โปรไฟล์ชมรม, US-07 รอบรับสมัคร, US-08 คำถามคัดเลือก (20 SP)

Sprint 2: US-01 ค้นหา, US-04 ติดตาม, US-05 ยืนยัน/สละสิทธิ์, US-09 เปิดอ่านใบสมัคร, US-10 ภาพรวมส่วนกลาง (21 SP)

Foundation นี้เป็นงานร่วม ไม่ใช่การทำทุก Story ให้เสร็จใน Scaffold

| ประเด็น | วิธีจัดการ |
|---|---|
| Task ใช้ PENDING แต่ ERD ใช้ SUBMITTED | ใช้ SUBMITTED เป็นฐานเมื่ออ้าง ERD; ระบุ PENDING เป็นความขัดแย้งที่ต้องปรับเอกสาร ไม่เพิ่ม Enum ซ้ำเอง |
| โควตามีตัวเลขต่างกันในเอกสาร | ห้าม hardcode 3 หรือ 5; ต้องตกลงจำนวน ช่วงเวลานับ และสถานะที่ถูกนับก่อนทำ Logic |
| US-09 เป็น read-only | Decision / publication workflow ยังขาด Story/Estimate ต้องเพิ่มหรือปรับ Backlog ก่อนทำ US-05 ให้ครบ |
| การแก้คำถามหลังเผยแพร่/มีคำตอบ | ต้องตกลง Freeze/Version policy ไม่ลบข้อมูลคำตอบโดยเดาเอง |
| สิทธิ์ประกาศผลและ Self-review | ต้องยืนยัน Permission Matrix แยกจากสิทธิ์อ่านใบสมัคร |
| TU API Contract | ต้องได้รับตัวอย่าง request/response/error ที่อนุญาตให้ใช้; ไม่เดาจากชื่อ Field |
| เอกสารเก่าระบุ Nginx / Compose บน Render | ยึด Render Web Service ที่เสิร์ฟ React ผ่าน Spring Boot; Compose สำหรับ Local/demo |

## 15. ลำดับการทำงานของ Agent

1. อ่านเอกสารและตรวจ Repo เดิม สรุปข้อขัดแย้งที่กระทบ Scaffold
2. เลือกและตรึง Dependency Versions ที่เข้ากัน บันทึกเหตุผล
3. สร้าง Monorepo และคำสั่ง Build/Test ขั้นต้น
4. ตั้ง PostgreSQL, Flyway, Configuration และ Profile แยก Local/Test/Prod
5. สร้าง Security/Mock TU + JDBC Session/CSRF พร้อม Tests ของ Foundation
6. ทำ Vertical slice Club Detail จาก DB ผ่าน API จนถึงหน้าเว็บ
7. ทำ Docker, Compose, CI และ SPA routing
8. รันทดสอบตามเกณฑ์และแก้จนผ่าน; หากติดข้อจำกัดจริงให้ระบุสิ่งที่ไม่ได้รัน
9. ส่งสรุปสิ่งที่สร้าง คำสั่งใช้งาน ผลการตรวจ และ TODO ที่ผูกกับ Story

อย่าจบเพียงเสนอแผนเมื่อได้รับคำสั่งให้สร้าง Scaffold แต่ไม่ต้อง Deploy ไปบัญชีจริงหรือใช้ TU Credentials จริงหากผู้ใช้ยังไม่ได้สั่งให้ทำส่วนนั้น

## References

- System design ของโครงการ: `docs/architecture/system-architecture.md`
- [Spring Security — CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
- [Spring Session — JDBC](https://docs.spring.io/spring-session/reference/configuration/jdbc.html)
- [Vite — Environment variables](https://vite.dev/guide/env-and-mode)
- [Render — Web Services](https://render.com/docs/web-services)
- [Render — Deploys](https://render.com/docs/deploys)

เอกสารออนไลน์อาจแสดง Framework รุ่นใหม่กว่า baseline ให้เลือกเอกสารที่ตรงกับเวอร์ชันที่ตรึงไว้ก่อนนำโค้ดตัวอย่างมาใช้
