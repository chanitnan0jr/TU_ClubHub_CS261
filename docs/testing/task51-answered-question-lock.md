# Task51 / US-08: ป้องกันคำถามที่มีคำตอบแล้ว

วันที่ตรวจ: 2026-11-04 — implementation และ local checks เสร็จตามผลด้านล่าง จัดเตรียมส่ง PR ของ Task51 **ผล GitHub Actions และ reviewer ให้ตรวจจาก PR จริง ยังไม่ถือว่าผ่าน review หรือ Definition of Done**

## Checkout และกฎ

- Working tree สะอาดก่อนเริ่ม ไม่พบ `AGENTS.md` ใน repository หรือ ancestor paths ที่ตรวจ อ่าน `COMMIT_RULES.md` และ workflows แล้ว
- `git fetch origin`, switch ไป `main`, `git pull --ff-only origin main` สำเร็จถึง `2b7e5e7`
- สร้าง branch `fix/answered-screening-questions` จาก main ล่าสุด โดยไม่ reset/ทับงานของ branch Task80
- อ้างอิง [US-08](../stories/sprint1/US-08.md), [Task51](../tasks/sprint2/Task51.md), [Permission Matrix](../security/permission-matrix.md), [Task75 locking order](../architecture/task75-sprint2-design.md#42-ลำดับการล็อกข้อมูล-deterministic-locking-order-และการป้องกัน-race-condition), [API contract](../api/API_v1.md), [Recruitment OpenAPI](../api/rounds.openapi.yaml) และ Flyway schema

## สาเหตุที่พบ

1. `updateQuestion` ไม่ตรวจคำตอบรายคำถาม; guard แบบ `hasApplications(roundId)` ทำให้ทุกข้อในรอบถูกล็อก รวมข้อที่ยังไม่มีคำตอบ
2. Delete ตรวจคำตอบแล้ว แต่ข้อที่ยังไม่ตอบยังถูก guard ทั้งรอบปฏิเสธ
3. Reorder/compact เดิมกำหนด `1..n` ให้ทุกข้อ จึงอาจเปลี่ยนตำแหน่งข้อที่มีคำตอบเมื่อเปิดการแก้ mixed draft
4. Whole-round PUT ลบและสร้าง question IDs ใหม่ทั้งหมด จึงต้องป้องกันที่เส้นทางนี้ด้วย
5. Frontend ครอบ 409 ทุกเหตุผลด้วยข้อความทั่วไป ไม่แยก `QUESTION_HAS_ANSWERS` และ success toast เก่าอาจยังค้างตอน request ถัดไปถูกปฏิเสธ

## พฤติกรรมหลังแก้

| เส้นทาง | พฤติกรรม |
|---|---|
| `PUT /api/v1/rounds/{roundId}/questions/{questionId}` | ตรวจสิทธิ์/เจ้าของรอบ/self-review แล้วล็อกรอบ ตรวจคำถามว่ามีอยู่ในรอบ และตรวจคำตอบของข้อนี้ หากมีคืน 409 พร้อม reason โดยไม่แก้ข้อความ Required คำตอบ หรือ version |
| `DELETE` เส้นทางเดียวกัน | ตรวจรายข้อเช่นเดียวกัน ไม่ลบคำตอบตาม และไม่ให้ compact ไปเลื่อนข้อที่มีคำตอบ |
| `PUT .../questions/order` | รับ ID ครบชุดตาม contract เดิม ตรวจ duplicate/missing/foreign IDs ก่อนเขียน รักษา numeric displayOrder ของข้อที่มีคำตอบ ย้ายเฉพาะข้ออื่นไปตำแหน่งว่างตาม relative order ที่ร้องขอ หากทำไม่ได้คืน 409 reason เดียวกันก่อน SQL write |
| `PUT /api/v1/clubs/{clubId}/rounds/{roundId}` | หลัง permission/parent lock/version checks หากมีคำตอบในรอบ ห้าม full replacement แม้ส่ง `questions: []` เพราะการ replace จะลบทุก question ID เดิม |
| เพิ่มคำถาม | เงื่อนไขเดิม: DRAFT ที่ยังไม่ปิดและไม่มีใบสมัคร |

ทุกเส้นทางคง session, CSRF, Active/term/committee, ownership และ self-review ไว้ คำถามผิดรอบหรือไม่มีอยู่ยังเป็น 404 ก่อนตรวจคำตอบ ไม่เพิ่ม migration หรือ DTO fields

### ข้อยกเว้นที่ต้องให้ทีม review

คำสั่งงานนี้ระบุชัดให้ข้อที่ยังไม่ตอบแก้/ลบ/เรียงได้แม้ข้ออื่นในรอบถูกตอบ จึงปรับ guard ทั้งรอบ **เฉพาะคำถามเดิมใน open DRAFT** การแก้ PUBLISHED/CLOSED ยังถูกปฏิเสธ และการเพิ่มคำถาม/replace ทั้งชุดยังต้องไม่มีใบสมัคร

ข้อยกเว้น mixed-DRAFT นี้ต่างจาก baseline Task74/T74-D09 ที่ห้ามทั้งรอบเมื่อมีใบสมัคร จึงบันทึกไว้ใน API Docs, US-08 และ Permission Matrix เพื่อให้ reviewer ตรวจ ไม่ได้ตีความว่าเปิดแก้แบบฟอร์มขณะรับสมัครหรือผ่าน PO/team approval แล้ว Fixtures แบบ mixed DRAFT เตรียมผ่าน DB เพื่อทดสอบข้อมูลเดิม/ผิดลำดับในอดีต ไม่เพิ่มทางเปลี่ยน PUBLISHED กลับ DRAFT

การเรียงข้อที่มีคำตอบ **มีหลักฐานชัดเจนแล้ว** ใน US-08 BR-05/BR-07 ว่าตำแหน่งต้องคงเดิม จึงไม่ต้องสมมตินโยบายเพิ่ม เช่น `[ข้อว่าง, ข้อตอบแล้ว, ข้อว่าง]` สลับข้อว่างสองข้อได้ แต่ย้ายข้อตอบแล้วออกจากตำแหน่ง 2 ไม่ได้ หลังลบข้อก่อนหน้าอาจเหลือลำดับ `[2, 3]` ซึ่งถูกต้องตาม Story

## Transaction และ concurrency

- คงกลไกเดิม: question writes/full replacement ล็อก `recruitment_rounds FOR UPDATE`; `ApplicationService` ผ่าน `ApplicationRepository` ใช้ `FOR SHARE` บนรอบเดียวกันก่อนอ่านคำถามและบันทึกคำตอบ
- ตรวจคำตอบหลังได้ lock และถือ lock ถึงจบ transaction จึงไม่มีช่องให้ submission ที่ปฏิบัติตาม protocol เขียนแทรกระหว่างตรวจและแก้/ลบ
- ไม่เพิ่ม/เปลี่ยนลำดับ lock: committee assignment ก่อน round; submission ยังเป็น account/student → club → round → questions
- ตรวจคำตอบเป้าหมายด้วย SQL EXISTS ของ `(round_id, question_id)`; การจัดลำดับดึงเฉพาะ IDs ของข้อที่มีคำตอบด้วย EXISTS และไม่ update ข้อเหล่านั้นแม้ใน temporary pass
- การจัดลำดับวางแผน/ตรวจ fixed positions ครบก่อน SQL แล้วใช้ temporary positive positions สอง pass เฉพาะข้อที่ยังไม่มีคำตอบ ป้องกัน UNIQUE conflicts และ rollback ทั้งชุดเมื่อผิดพลาด

Concurrency regression ใช้ PostgreSQL จริง: fixture commit ก่อน worker, coordinator connection ถือ parent/child SHARE locks แบบ submission, HTTP worker เรียก Controller/Service/Repository/authorization จริงและรอ UPDATE lock ตรวจการรอจริงด้วย `pg_blocking_pids` และ `Future.isDone()` จากนั้น coordinator INSERT/commit คำตอบ แล้ว HTTP worker ต้องได้ 409 ไม่แก้คำถาม/round version ตรวจหลัง full suite แล้ว committed question-security fixtures เหลือ 0 รายการ และนำเฉพาะ test container/temporary credentials ออกหลังจบ

มี latch และ timeout ทุกจุดสำคัญ ไม่มี sleep เพื่อสร้างผลลัพธ์ ตรวจ DB ผ่าน connection ใหม่หลัง worker จบ และ cleanup committed fixtures เอง ไม่อาศัย outer test rollback เคสนี้จำลอง answer-writer protocol ด้วย SQL ของ coordinator **ไม่ได้อ้างว่าเป็น HTTP submission-to-edit test สองฝั่ง** ส่วนชุดเดิม `ApplicationSubmissionHttpIntegrationTest` รันจริงใน full verification ด้วย ไม่เปลี่ยน production locks

## ไฟล์ที่แก้

Paths ต่อไปนี้อ้างจาก repository root

| กลุ่ม | ไฟล์ |
|---|---|
| Per-question guards | `backend/src/main/java/com/tu/clubhub/recruitment/service/ApplicationQuestionService.java` |
| Ordering / compaction | `backend/src/main/java/com/tu/clubhub/recruitment/repository/ApplicationQuestionRepository.java` |
| Whole-form guard | `backend/src/main/java/com/tu/clubhub/recruitment/service/RecruitmentRoundService.java`, `repository/RecruitmentRoundRepository.java` |
| Unit regression | `backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityTest.java` |
| PostgreSQL regression | `backend/src/test/java/com/tu/clubhub/recruitment/service/ApplicationQuestionIntegrityIntegrationTest.java`, `controller/ApplicationQuestionSecurityIntegrationTest.java` |
| Frontend | `frontend/src/features/recruitment/components/QuestionManagementPage.tsx`, `DeleteQuestionModal.tsx` |
| Frontend component tests | `frontend/tests/questionManagementComponent.test.ts` |
| Contract / handoff | `docs/api/rounds.openapi.yaml`, `docs/api/API_v1.md`, `docs/stories/sprint1/US-08.md`, `docs/security/permission-matrix.md`, root `README.md`, `frontend/README.md` และไฟล์นี้ |

## Tests → Acceptance Criteria

| Case | Test methods / หลักฐาน |
|---|---|
| Unit: ข้อมีคำตอบแก้/ลบไม่ได้ ไม่มี write/version bump | `answeredQuestionCannotBeUpdatedAndRoundIsLockedBeforeCheckingAnswers`, `answeredQuestionCannotBeDeleted` |
| Unit: ข้อไม่ตอบยังแก้/ลบได้แม้อีกข้อถูกตอบ | `unansweredQuestionCanBeUpdatedEvenWithOtherApplications`, `unansweredQuestionCanBeDeletedEvenWithOtherApplications` |
| Unit: application count ไม่ล็อก reorder ทั้งรอบ | `otherApplicationsDoNotPreventReordering` |
| HTTP: edit/delete ได้ 409 root reason และ DB ทั้งชุดเหมือนเดิม | `answeredQuestionHttpConflictPreservesAllData` (PUT/DELETE) ตรวจ snapshot ของ round/questions/application/answers/history |
| HTTP: mixed draft ยังแก้/เรียง/ลบข้อว่างได้ | `unansweredQuestionsRemainEditableDeletableAndSortableInMixedDraft` ตรวจ ID, prompt, anchored order, gaps หลังลบ, reorder หลังมี gaps และคำตอบเดิม |
| HTTP: ย้าย answered anchor ไม่ได้ ไม่เปลี่ยนข้อมูลบางส่วน | `movingAnAnsweredPositionIsRejectedAtomically` |
| HTTP: full replacement ข้าม guard ไม่ได้ | `wholeRoundReplacementCannotBypassAnsweredQuestionProtection` |
| HTTP: ไม่เปิด editing ของ PUBLISHED | `unansweredQuestionInPublishedRoundStillCannotBeEdited` |
| Lock regression | `answerCommittedWhileQuestionWriteWaitsIsRecheckedAfterParentLock` (PUT/DELETE), PostgreSQL observed blocking และข้อมูลหลัง commit |
| Service/DB: answers/application/history เดิมไม่เสีย | `existingApplicationProtectsQuestionsAnswersAndApplicationData` ขยาย assertions เดิมหลัง successful unanswered update/delete |
| Frontend edit/delete เฉพาะ reason | `questionManagementComponent.test.ts`: สอง actions × QUESTION_HAS_ANSWERS / VERSION_MISMATCH / ไม่มี reason (6 tests) ตรวจ alert, card จริง, modal, ไม่มี success และไม่มีการ retry request |
| Frontend ไม่มี success เก่าค้างตอนถูกปฏิเสธ | `a rejected delete clears an earlier success toast and keeps the edited question` |

HTTP tests เปิด security filters และใช้ ClubHubPrincipal พร้อม memberships/committee assignments ที่มีผลจริงใน PostgreSQL ไม่ mock ClubSecurity/Service/Repository Requests ที่ต้องใช้ CSRF ส่ง valid token

## ผลตรวจจริง

ใช้ Java 21, Node 24.19.0 และ PostgreSQL 18 แยกใน container ชั่วคราว ไม่ใช้ H2 แทน locking tests และไม่แก้ฐานข้อมูล Docker demo ที่เปิดอยู่ก่อนหน้า CI ใช้ Node 22 จึงยังต้องตรวจบน GitHub Actions จริง

| Check | ผลล่าสุด |
|---|---|
| Focused backend tests (5 classes) | 52 tests, 0 failures, 0 errors, 0 skipped |
| Lock-wait regressions ซ้ำ | **3 รอบ × 2 cases ผ่านทั้งหมด** เพิ่มจาก focused/full suite |
| `backend: ./mvnw clean verify` | **486 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS** รวม package/JaCoCo |
| `frontend: npm ci` | ผ่าน ใช้ lockfile เดิม |
| `frontend: npm test` | **79 passed, 0 failed, 0 skipped** |
| `frontend: npm run lint` | ผ่าน |
| `frontend: npm run build` | ผ่าน TypeScript/Vite |
| Redocly CLI 1.34.5 ทั้งสอง OpenAPI | valid, 0 errors, 11 warnings ด้าน metadata/style |
| Python `openapi_spec_validator` ทั้งสองไฟล์ | ผ่าน มี nonfatal LibreSSL warning ของ local Python |
| `git diff --check`, new-file whitespace, Markdown links / JSON example | ผ่าน |

หลักฐานก่อนแก้: new unit regressions 5 เคสล้มทั้งหมด (2 assertion failures, 3 business-conflict errors) บนโค้ดเดิม หลังแก้ผ่าน 5/5 ไม่ปิด tests ไม่ลด assertions เพื่อหลบ bug โดย assertions ที่เปลี่ยนเกี่ยวกับ round-wide lock เดิมถูกแทนด้วยผลที่โจทย์นี้กำหนดและ DB preservation assertions ที่เข้มขึ้น

มีการแก้ compile import ใน test และ indentation ของ OpenAPI ระหว่างพัฒนา ก่อนรัน checks ซ้ำผ่านตามผลล่าสุด ไม่มี failed check ค้าง ชุดที่ร้องขอรันครบ ไม่มี tests ที่ไม่ได้รันถูกนับว่าผ่าน อย่างไรก็ตาม **ยังไม่รัน GitHub Actions หรือ review บน changes ชุดนี้**

## ตัวอย่าง response จริง

HTTP 409, `Content-Type: application/problem+json`, `Cache-Control: no-store` (IDs/trace เป็นข้อมูลสมมติ):

```json
{
  "type": "urn:tuclubhub:problem:resource-conflict",
  "title": "Resource state conflict",
  "status": 409,
  "detail": "Question has answers",
  "instance": "/api/v1/rounds/70001/questions/81001",
  "code": "RESOURCE_CONFLICT",
  "reason": "QUESTION_HAS_ANSWERS",
  "traceId": "00000000-0000-4000-8000-000000000051",
  "fieldErrors": []
}
```

OpenAPI มี examples ของ PUT, DELETE, order และ whole-round PUT ตาม path จริง โดย reuse Problem schema เดิม

## วิธีตรวจงานสำหรับ reviewer

ใช้ test database แยกที่อนุญาตให้เขียน/ลบ fixtures ได้ ตั้ง `DB_PASSWORD` ในเครื่องโดยไม่ commit และตั้ง URL ทั้งสองตัวให้ชี้ DB เดียวกันตาม conventions ของ tests:

```sh
export SEEDTEST_DATABASE_URL='jdbc:postgresql://127.0.0.1:5433/tu_clubhub_test'
export ROUNDS_TEST_DATABASE_URL="$SEEDTEST_DATABASE_URL"
cd backend
./mvnw -Dtest=ApplicationQuestionServiceTest,ApplicationQuestionIntegrityTest,ApplicationQuestionIntegrityIntegrationTest,ApplicationQuestionSecurityIntegrationTest,RecruitmentRoundServiceTest test
./mvnw '-Dtest=ApplicationQuestionSecurityIntegrationTest#answerCommittedWhileQuestionWriteWaitsIsRecheckedAfterParentLock' test
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

ทดสอบ UI โดยตอบ API mock ตาม component tests หรือเตรียม mixed-DRAFT fixtures ใน test database เท่านั้น ดูสอง actions ว่า alert ปรากฏ row/modal คงเดิม ไม่มี success และ VERSION_MISMATCH ไม่แสดงข้อความเฉพาะ QHAS Docker demo ที่เปิดจากงานก่อนหน้ายังไม่ได้ rebuild เพื่อไม่รบกวน instance เดิม หากต้องการทดลอง image ใหม่ ให้ rebuild `app` จาก branch นี้

## ประเด็นส่ง reviewer

1. ยืนยันข้อยกเว้น mixed-DRAFT ตามคำสั่งงาน เทียบ baseline เดิม Task74/T74-D09; PUBLISHED/CLOSED ยังคงถูกปฏิเสธ
2. ตรวจ anchored order/gaps หลังลบตาม BR-05/BR-07 ไม่บังคับ dense positions จนข้อมูลคำถามที่ล็อกเปลี่ยน
3. Whole-round PUT ยังคง version-check precedence และห้าม replace เมื่อมีใบสมัคร ไม่แอบเปิด partial metadata update
4. Local pass ไม่ใช่ CI/reviewer approval; ต้องตรวจผลจาก PR จริงก่อนทำเครื่องหมาย DoD ว่าครบ

การแบ่ง focused commits สำหรับส่ง PR (English / Conventional Commits / ไม่เกิน 50 ตัวอักษร):

```text
fix(api): lock answered screening questions
fix(frontend): show answered question alerts
docs(api): document answered question locks
```

Backend tests อยู่กับ backend fix, frontend component tests อยู่กับ frontend fix ส่วน OpenAPI, Markdown contract, README และรายงานอยู่ใน documentation commit เดียวกันตาม `COMMIT_RULES.md`
