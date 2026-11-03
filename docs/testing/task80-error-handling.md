# Task80 / AUTH-06: HTTP และ Frontend Error Handling

วันที่ตรวจ: 2026-11-01

สถานะ: implementation และ local verification ผ่านตามผลด้านล่าง จัดเตรียมส่ง PR สำหรับ Task80 **ผล Reviewer, GitHub Actions และ merge ให้ตรวจจาก PR จริง ยังไม่ถือว่าผ่าน review หรือ Definition of Done**

## 1. Checkout และหลักฐานข้อกำหนด

- ตรวจ working tree ก่อนเริ่ม: สะอาด ไม่พบ `AGENTS.md` ใน repository หรือ directory บรรพบุรุษที่ตรวจ
- อ่าน `COMMIT_RULES.md`, workflows, handlers, filters, clients และ tests เดิมก่อนแก้
- รัน `git pull --ff-only` บน `feat/application-submission` สำเร็จถึง `ac9c639` จากนั้นแยก `feat/task80-error-handling` จาก `origin/main` (`e1cbd5b`) ซึ่งมี Task74–75 และ implementation ล่าสุด ไม่ merge หรือ reset branch เดิม
- Dependencies ที่ใช้:
  - [Permission Matrix](../security/permission-matrix.md)
  - [Task74 decisions](../architecture/task74-sprint2-analysis.md)
  - [Task75 design และ error vocabulary](../architecture/task75-sprint2-design.md)
  - [Markdown API contract](../api/API_v1.md#6-error-contract)
  - [Main OpenAPI](../api/openapi.yaml) และ [Recruitment OpenAPI](../api/rounds.openapi.yaml)

ยึดข้อแตกต่าง 403/404 ตาม Task74–75: resource ส่วนตัวที่มีอยู่แต่ caller ไม่มีสิทธิ์ใช้ 403; resource ที่ไม่มีอยู่ใช้ 404 เมื่อ caller มีสิทธิ์ตรวจ scope นั้น ส่วน public club ที่ไม่ Active และแบบฟอร์มที่ไม่เปิดเผยใช้ 404 เช่นเดียวกับ ID ที่ไม่มีอยู่จริง ทั้งนี้ parent-club guard เดิมยังปฏิเสธ caller ที่ไม่มีสิทธิ์ก่อนเปิดเผยข้อมูลลูก

## 2. สิ่งที่พบและสิ่งที่แก้

### Backend

1. Framework errors นอกขอบเขต advice เดิมและ servlet fallback อาจได้รูปแบบอื่นหรือ HTML และบาง exception หลุดออกจาก MVC โดยไม่มี safe response
2. Recruitment advice ใช้ข้อความจาก `ResponseStatusException` ซึ่งอาจมีข้อมูลภายใน และ title/type ของปัญหาชนิดเดียวกันต่างกันระหว่างโมดูล
3. การอ่านสถานะบัญชีใน filter เกิดก่อน Controller จึงไม่อยู่ภายใต้ ControllerAdvice

แก้โดยใช้ `ProblemResponse extends ProblemDetail` เป็น wire contract เดียว มี `code`, `traceId`, `fieldErrors` เป็น extension fields ที่อยู่ระดับเดียวกับ standard members ใช้ implementation กลางใน `ApiExceptionHandler`; scoped advice เดิมสืบทอดส่วน framework error แล้วเก็บ domain handling ของตนไว้

- ครอบคลุม validation, malformed JSON, path/query conversion, 405, 415, service errors และ unexpected 500
- `detail` ใช้ข้อความทั่วไปหรือ application-owned allowlist; ไม่นำ `exception.getMessage()` หรือ arbitrary `getReason()` ไปแสดงโดยตรง
- 404 สำหรับ missing/hidden resource ในกลุ่มเดียวกันใช้ type/title/detail/code เหมือนกัน โดย instance และ traceId ยังแตกต่างได้
- คง `Allow`, supported `Accept` และ login limiter `Retry-After`
- `ActiveAccountFilter` จัด DB lookup failure เป็น safe 503 หรือ unexpected 500 เฉพาะ API โดยไม่ catch exception ของ downstream chain รวมไปด้วย
- Fallback ที่เกิดจาก servlet ERROR dispatch ของ API ส่ง Problem JSON แม้ request ขอ HTML; non-API HTML behavior ยังอยู่
- Logs ของ shared unexpected-failure path เก็บ trace ID, method, path ที่ไม่มี query, exception type และตำแหน่งแรก ไม่ log raw exception message, SQL, bind values หรือ throwable ทั้งก้อน จึงเป็น metadata สำหรับ correlation ไม่ใช่ full stack trace

### Frontend

ใช้ `src/lib/api.ts` เดิมเป็นจุดกลาง รวมถึงให้ club editor client เดิม delegate มาที่นี่ และให้ AuthProvider ใช้ client เดียวกัน

- อ่าน HTTP status เป็นหลัก เก็บ code/reason/traceId และ field paths
- แสดงข้อความที่ UI กำหนดตาม status/code/reason; ไม่แสดง server detail/title/message, HTML, parser message หรือ SQL โดยตรง
- รักษา validation รายฟิลด์และชื่อ indexed fields เช่น `answers[0].textAnswer`; แปลข้อความจาก field code เป็นข้อความปลอดภัย
- 401 ของ protected request ล้าง auth state แล้วใช้ RequireAuth/Login flow เดิม พร้อม notice หนึ่งรายการ; ไม่ตีความ login credential rejection ว่า session หมดอายุ
- 403 `ACCOUNT_NOT_ALLOWED` ล้าง auth state; 403 `ACCESS_DENIED` และ `CSRF_INVALID` ไม่ทำให้ logout
- API client ไม่สร้าง Toast และไม่ retry write อัตโนมัติ; auth notification มีการ deduplicate จนกว่าจะ reset หลังยืนยัน session/login
- แยกข้อความ network failure ออกจาก HTTP failure
- 500 แสดง reference ID เฉพาะ traceId รูปแบบ UUID เพื่อไม่เอา arbitrary trace string ไปแสดง
- ป้องกัน bootstrap response เก่าทั้ง success และ failure แก้ auth state ใหม่หลัง login หรือหลังได้รับ 401

## 3. ไฟล์ที่เปลี่ยน

Paths ของ source/tests ในตารางอ้างอิงจาก repository root

| กลุ่ม | ไฟล์ | หน้าที่ |
|---|---|---|
| Shared body | `backend/src/main/java/com/tu/clubhub/auth/dto/ProblemResponse.java` | Spring ProblemDetail, canonical type/title, safe instance, hidden 404 และ safe 500 |
| Shared MVC/fallback | `backend/src/main/java/com/tu/clubhub/common/error/ApiExceptionHandler.java`, `ApiFallbackErrorController.java` | Framework handling, safe logging และ servlet ERROR dispatch |
| Domain advice | `application/controller/ApplicationExceptionHandler.java`, `club/controller/ClubExceptionHandler.java`, `recruitment/controller/RecruitmentRoundExceptionHandler.java`, `auth/controller/AuthController.java` ใต้ `backend/src/main/java/com/tu/clubhub/` | Reuse shared handling; คง codes/reasons และ domain behavior |
| Security | `backend/src/main/java/com/tu/clubhub/config/SecurityConfiguration.java`, `ActiveAccountFilter.java` | Shared problem serialization, internal ERROR dispatch และ pre-controller DB failure |
| New backend tests | `backend/src/test/java/com/tu/clubhub/config/ApiProblemDetailsIntegrationTest.java`, `ApiSecurityProblemIntegrationTest.java`, `ApiFallbackErrorHttpTest.java`, `ActiveAccountFilterErrorTest.java` | ตรวจ framework, PostgreSQL authorization, actual HTTP fallback และ filter failure |
| Backend regression tests | `auth/AuthSessionIntegrationTest.java`, `auth/StudentProfileLoginIntegrationTest.java`, `recruitment/controller/ApplicationQuestionControllerTest.java`, `RecruitmentRoundErrorResponseTest.java` ใต้ `backend/src/test/java/com/tu/clubhub/` | ตรวจ session expiry, rollback, canonical problems และ conflict reasons |
| Frontend boundary | `frontend/src/lib/api.ts` | Safe parsing, messages, field validation และ auth failure notifications |
| Auth UX | `frontend/src/features/auth/AuthContext.tsx`, `Login.tsx` | Shared client, safe notice และ async bootstrap protection |
| Club editor | `frontend/src/features/clubs/api/clubApi.ts`, `hooks/useClubProfile.ts` | Reuse shared client/error presentation |
| Frontend tests | `frontend/tests/api.test.ts`, `authErrorFlow.test.ts`, `clubApi.test.ts`, `helpers.ts` | Parser, UI flow, auth races, legacy delegation และ async fetch fixture |
| Contract | `docs/api/API_v1.md`, `openapi.yaml`, `rounds.openapi.yaml` | Shared Problem schemas, examples, semantic headers และ integration notes |
| Handoff | ไฟล์นี้ | หลักฐาน คำสั่ง และข้อจำกัดสำหรับ Reviewer |

## 4. Acceptance criteria → tests

| สิ่งที่พิสูจน์ | Class / method หรือ test name |
|---|---|
| Anonymous protected request + valid CSRF ได้ 401 | `ApiSecurityProblemIntegrationTest.anonymousWriteWithValidCsrfIs401NotCsrf403` |
| Session อายุเกิน 8 ชั่วโมงได้ Problem 401 | `AuthSessionIntegrationTest.sessionTimeoutRejectsProtectedAccessAfterEightHours` |
| สมาชิกธรรมดาและ ADMIN ที่ไม่ได้รับ assignment ถูก 403 | `ordinaryMemberWithValidCsrfIsDeniedByPermissionRule`, `adminWithoutClubAssignmentIs403WithValidCsrf` |
| กรรมการชมรมอื่นถูก 403 | `committeeOfAnotherClubIs403WithValidCsrf` |
| กรรมการที่มีผลผ่าน guard และ update ลง DB | `effectiveCommitteePassesRealGuardAndUpdatesClub` |
| บัญชีถูกระงับแยกจาก RBAC และ CSRF | `suspendedAccountIsDistinctFromRbacAndCsrf` |
| Caller มีสิทธิ์ดู form แต่ ID ไม่มีอยู่ได้ 404 | `missingResourceForEligibleStudentIs404` |
| Draft/Inactive form เหมือน absent form | `draftAndInactiveResourcesAreIndistinguishableFromAbsentForms` |
| Public access เดิมยังใช้ได้ และ inactive club ถูกซ่อน | `publicClubAndRoundsStillAllowAnonymousAccess`, `inactiveAndMissingPublicClubsHaveSameProblemDescription` |
| 400/401/403/404/409/500 ปลอดภัย ไม่ reflect reason/query | `ApiProblemDetailsIntegrationTest.responseStatusExceptionsUseSafeProblemDetails` และ `unexpectedExceptionIsSanitized` |
| Validation, JSON เสีย และ path conversion | `beanValidationKeepsFieldNamesWithoutRejectedValues`, `malformedJsonDoesNotReflectRejectedBody`, `pathConversionAndValidationUse400` |
| 405/415 และ semantic headers | `unsupportedMethodPreservesAllow`, `unsupportedMediaTypePreservesSupportedTypes` |
| CSRF แยกจาก Login/RBAC | `missingCsrfRemainsCsrfFailure`, `invalidCsrfRemainsCsrfFailure` |
| Errors ก่อนถึง Controller | `ActiveAccountFilterErrorTest.accountLookupFailureBeforeControllerUsesSafeProblem` สำหรับ 503/500 |
| Servlet fallback ผ่าน HTTP จริง และ non-API HTML เดิม | `ApiFallbackErrorHttpTest.servletFallbackNeverReturnsHtmlOrErrorMessage`, `nonApiHtmlErrorKeepsTheExistingPageBehavior` |
| Scoped advice ไม่รั่ว arbitrary service reason | `RecruitmentRoundErrorResponseTest.arbitraryServiceReasonCannotLeakThroughScopedAdvice` |
| Login DB failure ได้ safe 500 และ rollback/session assertions เดิมยังครบ | `StudentProfileLoginIntegrationTest.failedProfileWriteLeavesNoAccountOrAuthenticatedSession` |
| Conflict reason ใช้ค่าเดิมที่ documented | tests เดิมใน `ApplicationQuestionControllerTest` และ `RecruitmentRoundErrorResponseTest` เพิ่ม assertions `QUESTION_HAS_ANSWERS` / `VERSION_MISMATCH` |
| Frontend ไม่แสดง raw data และใช้ HTTP status จริง | `api.test.ts`: `HTTP … never displays raw server detail, title, HTML or SQL`, `HTTP status is authoritative…`, malformed error/success JSON tests |
| Validation, network และ reference ID | `field paths and codes survive…`, `fetch network errors…`, `500 UI uses only a safe reference ID…` |
| ป้องกัน prototype property lookup | `unknown reason and field codes cannot resolve Object prototype members` |
| 401/403 UX และแจ้งเตือนครั้งเดียว | `authErrorFlow.test.ts` และ `concurrent 401 responses notify AuthProvider once…` ใน `api.test.ts` |
| RBAC/CSRF ไม่ logout หรือ retry write | `a permission denial does not log out…`, `RBAC and CSRF denials do not trigger Login flow…` |
| Bootstrap แข่งกับ 401 หรือ login ใหม่ | `a late bootstrap response cannot restore…`, `a late failed bootstrap cannot clear a newer successful Login` |
| Club client เดิมผ่าน shared client | `clubApi.test.ts` ทั้ง 3 tests |

`ApiSecurityProblemIntegrationTest` ใช้ PostgreSQL จริง, fixtures ของ users/student profiles/memberships/committee assignments และ ClubSecurity/Services/Repositories จริง ไม่มี mock authorization เปิด filters ด้วย `@AutoConfigureMockMvc(addFilters = true)`

`ApiProblemDetailsIntegrationTest` ใช้ mock principal สำหรับทดสอบ framework serialization ไม่ใช้เป็นหลักฐาน DB RBAC ส่วน `ActiveAccountFilterErrorTest` mock lookup เพื่อ inject failure เท่านั้น ไม่ใช้พิสูจน์สิทธิ์

### วิธีไม่ให้ CSRF บดบัง RBAC

ตัวอย่างรูปแบบใน PostgreSQL security test:

```java
mvc.perform(put("/api/v1/clubs/" + clubId)
    .with(authentication(UsernamePasswordAuthenticationToken.authenticated(
        new ClubHubPrincipal(userId, "fictional-user", "USER"), null, List.of())))
    .with(csrf())
    .contentType(MediaType.APPLICATION_JSON)
    .content(validBody));
```

Role ใน principal เพียงอย่างเดียวไม่ให้สิทธิ์กรรมการ: ต้องมีสมาชิกภาพและ committee assignment ที่มีผลของชมรมนั้นใน DB ด้วย ตรวจ response `403 ACCESS_DENIED` แยกจาก `403 CSRF_INVALID` และมี positive control ที่กรรมการจริงผ่านได้

Anonymous authentication case ส่ง `.with(csrf())` เช่นกัน แล้วคาดหวัง `401 AUTHENTICATION_REQUIRED`; missing token กับ `.with(csrf().useInvalidToken())` เป็นอีกสอง tests ที่คาดหวัง CSRF failure โดยไม่ปิด filters

## 5. ตัวอย่าง Problem Details

ทุกตัวอย่างใช้ `Content-Type: application/problem+json`, `Cache-Control: no-store` และ HTTP status เท่ากับ `status` ใน body ข้อมูลและ trace ID เป็นข้อมูลสมมติ ไม่มี query string

### HTTP 401 — ยังไม่ได้ Login / session ใช้ไม่ได้

```json
{
  "type": "urn:tuclubhub:problem:authentication-required",
  "title": "Authentication required",
  "status": 401,
  "detail": "Sign in to access this resource.",
  "instance": "/api/v1/auth/me",
  "code": "AUTHENTICATION_REQUIRED",
  "traceId": "00000000-0000-4000-8000-000000000080",
  "fieldErrors": []
}
```

### HTTP 403 — ไม่มีสิทธิ์ตาม permission rule

```json
{
  "type": "urn:tuclubhub:problem:access-denied",
  "title": "Access denied",
  "status": 403,
  "detail": "You are not allowed to access this resource.",
  "instance": "/api/v1/clubs/20001",
  "code": "ACCESS_DENIED",
  "traceId": "00000000-0000-4000-8000-000000000081",
  "fieldErrors": []
}
```

### HTTP 404 — public club ไม่มีอยู่หรือไม่ Active

```json
{
  "type": "urn:tuclubhub:problem:club-not-found",
  "title": "Club not found",
  "status": 404,
  "detail": "No club was found for this identifier.",
  "instance": "/api/v1/public/clubs/20001",
  "code": "CLUB_NOT_FOUND",
  "traceId": "00000000-0000-4000-8000-000000000082",
  "fieldErrors": []
}
```

### HTTP 500 — unexpected failure

```json
{
  "type": "urn:tuclubhub:problem:internal-error",
  "title": "Internal server error",
  "status": 500,
  "detail": "The request could not be completed.",
  "instance": "/api/v1/rounds/70001/applications",
  "code": "INTERNAL_ERROR",
  "traceId": "00000000-0000-4000-8000-000000000083",
  "fieldErrors": []
}
```

## 6. ผลตรวจจริง

Local environment: macOS, Temurin Java 21.0.12.1, PostgreSQL 18 ใน container แยก, Node 24.19.0 / npm 11.17.0 ส่วน CI กำหนด Java 21 / PostgreSQL 18 / Node 22 ไม่มีการแก้ CI หรือ test profiles

| Check | ผลล่าสุด |
|---|---|
| `backend: ./mvnw clean verify` | **476 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS** รวม packaging และ JaCoCo report |
| `frontend: npm ci` | สำเร็จ ไม่แก้ dependency manifest/lockfile |
| `frontend: npm test` | **72 passed, 0 failed, 0 skipped** |
| `frontend: npm run lint` | ผ่าน |
| `frontend: npm run build` | ผ่าน TypeScript และ Vite build |
| `npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml` | ทั้งสอง spec valid, 0 errors, **11 warnings** |
| Python `openapi_spec_validator` ทั้งสอง spec | ผ่าน; มี nonfatal urllib3/LibreSSL warning ของ local Python |
| `git diff --check` และตรวจ whitespace ของไฟล์ใหม่ | ผ่าน |

Redocly warnings ที่ยังอยู่: `tag-description` 4, `operation-4xx-response` 4, `info-license` 2 และ `no-server-example.com` 1 ตรวจเทียบ spec จาก `HEAD` ด้วย validator/config เดียวกันแล้วได้ warnings ทั้ง 11 จุดในกลุ่มเดียวกัน ไม่ได้ปิด rule เพื่อให้ผ่าน `redocly.yaml` ยังคงกำหนด invalid media-type examples เป็น error

### หลักฐานก่อนแก้ / regression

- ชุดใหม่ `ApiProblemDetailsIntegrationTest` ก่อน production changes: 17 tests, 13 failures, 1 error, 3 passed; พบ Content-Type/body format ที่ไม่ตรง และ unexpected exception ไม่ถูกจัดการ หลังแก้ผ่านทั้ง 17
- Full verify ครั้งแรก: 474 tests, 1 failure, 0 errors, 0 skipped โดย test login rollback เดิมคาดว่า exception ต้องหลุดถึง test runner แต่เมื่อมี global handler แล้ว HTTP ต้องตอบ safe 500 ปรับเป็น assertions ของ 500 Problem Details และ **คง assertions เดิมเรื่อง rollback, จำนวน account/profile และ session ที่ไม่ได้ authenticated** ไว้ทั้งหมด
- Frontend regression `a late failed bootstrap cannot clear a newer successful Login` ล้มก่อนแก้: user ที่ login แล้วกลายเป็น Anonymous เมื่อ bootstrap เก่าตอบ 401 แก้ version guard ใน catch เช่นเดียวกับ success branch แล้วผ่าน
- Sandbox แรกจำกัด Mockito self-attach / Node test-runner IPC จึงรันใหม่ด้วยสิทธิ์ local process ตามที่เครื่องมืออนุมัติ ผลในตารางคือรอบที่รันจริงครบ ไม่ใช่ compile-only หรือ tests ที่ไม่ได้รัน
- ผลสุดท้ายของ checks ที่ร้องขอ: ไม่มี failed check ค้าง และไม่มี tests ในชุดที่ร้องขอถูก skip แต่ **ยังไม่ได้รัน GitHub Actions บน changes นี้**

### คำสั่งสำหรับ Reviewer

ใช้ PostgreSQL test database แยกที่ยอมให้ tests เขียน/ลบ fixtures ได้ ตั้งรหัสในเครื่องโดยไม่ commit ค่าเข้า repository ถ้าใช้ port อื่น ให้ตั้ง URL ทั้งสองตัวตามด้านล่าง (profile `seedtest` และ repository tests บางชุดอ่านคนละตัวแปร)

```sh
# จาก repository root; ตั้ง DB_PASSWORD ใน environment ของเครื่องไว้ก่อน
export SEEDTEST_DATABASE_URL='jdbc:postgresql://127.0.0.1:5433/tu_clubhub_test'
export ROUNDS_TEST_DATABASE_URL="$SEEDTEST_DATABASE_URL"
cd backend
./mvnw -Dtest=ApiProblemDetailsIntegrationTest,ApiSecurityProblemIntegrationTest,ApiFallbackErrorHttpTest,ActiveAccountFilterErrorTest,AuthSessionIntegrationTest,StudentProfileLoginIntegrationTest,ApplicationQuestionControllerTest,RecruitmentRoundErrorResponseTest test
./mvnw clean verify
cd ../frontend
npm ci
npm test
npm run lint
npm run build
cd ..
npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml
git diff --check
```

Local run ของงานนี้ใช้ port สุ่มบน `127.0.0.1` และ password สุ่มใน private temporary env file ไม่ใช้หรือแก้ DB/container ของผู้ใช้ Credentials ไม่อยู่ใน source, tests, report หรือ output ตรวจหลังจบพบ Task80 fixtures ใน users/clubs/categories เหลือ 0 รายการ และนำ test container พร้อม temporary credentials ออกหลังตรวจเสร็จ

## 7. Frontend handoff และ compatibility

```ts
try {
  return await apiRequest('/api/v1/clubs/20001', { method: 'PUT', body })
} catch (error) {
  setError(describeApiError(error, 'ไม่สามารถบันทึกข้อมูลได้'))
  // ถ้าต้อง map field errors ให้อ่าน ApiError.fieldErrors โดยใช้ field path เดิม
}
```

- Success response, session cookie, CSRF, domain status/reason และ business rules เดิมคงเดิม
- Error type/title ปรับให้ canonical; `detail` และ `instance` เป็น required ใน main Problem schema ตาม Task75; non-field error ส่ง `fieldErrors: []` แทนการอาศัย omission
- 405 ใช้ `METHOD_NOT_ALLOWED`; 415 ใช้ `HTTP_415` ตาม generic framework-code convention เดิม และระบุใน contract แล้ว
- อาจมีผู้ใช้ API เก่าที่เทียบ title/detail หรือพึ่ง raw validation messages ต้องเปลี่ยนมาใช้ HTTP status/code/reason/field paths โดยข้อความสำหรับ UI มาจาก frontend
- อย่าเพิ่ม Toast อีกชั้นใน client; component แสดง inline error ที่ปลอดภัยได้ ส่วน auth notice เป็นของ AuthProvider/Login UX
- อย่า retry POST/PUT อัตโนมัติหลัง CSRF หรือ network failure เพราะยังไม่ทราบว่า server บันทึกไปแล้วหรือไม่
- ถ้าทีมเปลี่ยน traceId จาก UUID ต้องตรวจรูปแบบ reference ที่อนุญาตให้แสดงใน UI และเพิ่ม test ก่อน

## 8. สิ่งที่ยังต้อง review / ยืนยัน

- ไม่เปลี่ยน permission/business rules และไม่เพิ่ม endpoints ของ US-04/US-09 ที่ยังเป็นงานอนาคต จึงไม่อ้างว่าพิสูจน์ permission ของ endpoints เหล่านั้นแล้ว
- Task74–75 ที่ยังรอการยืนยันจาก PO/ทีมตามเอกสารต้นทาง ยังคงสถานะเดิม งานนี้ไม่ใช่การอนุมัติแทนทีม
- Reviewer ควรตรวจ compatibility ของ canonical titles, required fields และ safe UI messages รวมถึงกลยุทธ์ logs แบบ metadata-only
- ยังต้องให้ GitHub Actions บน Node 22/Linux ตรวจ branch จริง; local Node 24/macOS ผ่านไม่ใช่หลักฐานว่า CI ผ่านแล้ว
- ไม่ได้ตรวจ reverse proxy/deployment environment จริง

การแบ่ง focused commits สำหรับส่ง PR:

```text
fix(api): standardize problem responses
fix(frontend): handle API errors safely
docs(api): document error integration
```

Backend tests อยู่กับ backend fix, frontend tests อยู่กับ frontend fix; OpenAPI, Markdown contract และ report อยู่ใน documentation commit เดียวกันตาม `COMMIT_RULES.md`
