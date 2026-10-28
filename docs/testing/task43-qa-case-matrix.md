# Task43 — ตาราง QA เทียบกับ Contract

อ้างอิง [API_v1.md §11](../api/API_v1.md#11-application-submission), [OpenAPI](../api/openapi.yaml) และ [implementation handoff](task43-application-submission.md) ผู้ขอยืนยันให้ยึด docs เมื่อวันที่ 20 ตุลาคม 2026

## ความหมายของผลในตาราง

- **ผ่าน**: รัน test ที่อ้างอิงในระดับ DTO / Service / PostgreSQL แล้ว ไม่ได้หมายถึงเรียก application endpoint ผ่าน HTTP แล้ว
- **บางส่วน**: Service behavior ผ่าน แต่ส่วน HTTP/session lifecycle ของ endpoint นี้ยังไม่มีให้รัน
- **ไม่ใช้**: Case อาศัยกฎหรือคอลัมน์ที่ไม่มีใน contract จึงไม่สร้าง test ที่บังคับกฎนั้น และไม่ได้นับเป็น skipped test

โค้ดอ้างอิง:

- **S** = [ApplicationServiceIntegrationTest.java](../../backend/src/test/java/com/tu/clubhub/application/ApplicationServiceIntegrationTest.java) ใช้ Service/Repository และ PostgreSQL จริง
- **V** = [ApplicationSubmissionValidatorTest.java](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionValidatorTest.java) ใช้ validator/DTO JSON boundary

## กฎที่ใช้แทนคำใน checklist ทั่วไป

1. สถานะใน DB/API คือ **SUBMITTED** ซึ่ง UI แสดงเป็น Pending ไม่ใช้ค่า PENDING ในฐานข้อมูล
2. เพดานคือ **สมาชิกภาพที่มีผลห้าชมรม** นับจาก membership ที่ Active, joined_at ถึงแล้ว และ ended_at เป็น null ไม่มีโควตาที่นั่งต่อรอบหรือโควตาใบสมัครค้าง
3. Application states ที่มีจริงคือ SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, CONFIRMED, DECLINED, WITHDRAWN, EXPIRED ส่วน CANCELLED เป็นสถานะรอบรับสมัคร
4. คำถามรองรับ TEXT เท่านั้น ส่วน optionId/selectedOptions เป็น fields ที่ไม่อนุญาต
5. URL optional หมายถึงไม่แนบ link โดยส่ง `links: []` ถ้าส่ง link object มาแล้ว url ต้องมีและถูกต้อง ไม่อนุญาต null/blank

## Authentication

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| AUTH-01 | ผ่าน | S: `commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory` ใช้ authenticated ClubHubPrincipal และ Active student จริงใน DB |
| AUTH-02 | บางส่วน | S: `rejectsMissingAnonymousUnauthenticatedAndForeignPrincipal` ตรวจ identity ที่ใช้ไม่ได้และไม่มีข้อมูลค้าง แต่ expired SESSION cookie ผ่าน POST application ยังไม่ได้รันเพราะไม่มี Controller; auth expiry เดิมมี tests ของ auth endpoints แยกอยู่ |
| AUTH-03 | ผ่าน | S: `rejectsInactiveOrMissingStudentProfileEvenForAdmin`, `rechecksCurrentAccountStatusAndDoesNotTrustPrincipalRole` |
| AUTH-04 | ผ่าน | S: `forbiddenApplicantAndStatusFieldsCannotCreateOrAssignApplications` และ V: `jsonDtoAcceptsOnlyContractFieldsAndTypesEvenWithPermissiveGlobalMapper` ปฏิเสธ applicant/user ID ใน JSON และตรวจ stored applicant จาก principal |

## Recruitment round

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| ROUND-01 | ผ่าน | S: `hidesMissingRoundInactiveClubAndNeverPublishedRound` ใช้ nonexistent ID และตรวจ RESOURCE_NOT_FOUND |
| ROUND-02 | ผ่าน | S: `rejectsNotYetOpenManuallyClosedAndPreviouslyPublishedCancelledRounds` ตรวจ ROUND_NOT_OPEN |
| ROUND-03 | ผ่าน | S: `commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory` |
| ROUND-04 | ผ่าน | S: `openingIsInclusiveAndClosingIsExclusive` ใช้ Clock ตรงเวลาเปิด |
| ROUND-05 | ผ่าน | S: `openingIsInclusiveAndClosingIsExclusive` ตรงเวลาปิดและหลังปิดถูกปฏิเสธ |
| ROUND-06 | ผ่าน | S: `rejectsNotYetOpenManuallyClosedAndPreviouslyPublishedCancelledRounds` และ `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock` |
| ROUND-07 | ผ่าน | S: `hidesMissingRoundInactiveClubAndNeverPublishedRound` สำหรับ Draft และ cancelled-state case สำหรับรอบที่เคยเผยแพร่ |
| ROUND-08 | ผ่านระดับ Service | S: `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock` พิสูจน์อ่านเวลาใหม่เมื่อได้ lock; ยังไม่มี UI/GET form → POST HTTP flow |

## Duplicate / membership limit

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| LIMIT-01 | ผ่าน | S: `rejectsDuplicateIncludingWithdrawnApplicationsAndPreservesOriginalHistory` |
| LIMIT-02 | ผ่าน | S: `priorApplicationInAnotherRoundDoesNotCountAsDuplicate` |
| LIMIT-03 | ผ่านตามกฎสมาชิกภาพ | S: `applicationStateAloneDoesNotConsumeMembershipQuota` ใช้สมาชิกภาพสี่ชมรมแล้วสมัครได้ โดยไม่สร้างสมาชิกภาพใหม่ |
| LIMIT-04 | ผ่านตามกฎสมาชิกภาพ | S: `rejectsFiveEffectiveMembershipsAcrossAllClubTypes` |
| LIMIT-05 | ผ่านตามสถานะจริง | S: `allPersistedApplicationStatesPreventSameRoundReapplication`, `applicationStateAloneDoesNotConsumeMembershipQuota` ครอบคลุมสถานะจริงแปดแบบ; quota อ่าน membership ไม่เดาจาก application state |
| LIMIT-06 | ไม่ใช้ | ไม่มี capacity/quota column แบบ 0/null ใน schema จึงไม่มีความหมาย unlimited/disabled ให้กำหนดเอง |
| LIMIT-07 | ผ่าน | WITHDRAWN ยังคงบล็อกสมัครรอบเดิมใน duplicate tests |

## Answers และ URLs

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| ANSWER-01 | ผ่าน | S: `commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory` |
| ANSWER-02 | ผ่าน | S: `rejectsRequiredMissingBlankForeignDuplicateAndOverlongAnswersWithoutPartialWrites` |
| ANSWER-03 | ผ่าน | V: `rejectsNullEmptyOrWhitespaceAnswerText` และ S: required-answer validation รวม Unicode whitespace |
| ANSWER-04 | ผ่าน | S: `countsAnswerLengthBeforeTrimmingAndAllowsOptionalOmission`, `allowsNoCustomQuestionsAndNoDocumentLinks` |
| ANSWER-05 | ผ่าน | S: required-answer test ใช้ทั้ง question ของอีกรอบและ nonexistent question ID |
| ANSWER-06 | ผ่าน | V/S: duplicate question ID แม้ answerText ต่างกันถูกปฏิเสธ |
| ANSWER-07 | ผ่านสำหรับ TEXT model | V: strict JSON boundary ปฏิเสธ number/array/object/null แทน answerText และ unsupported optionId ไม่สร้าง choice model ขึ้นใหม่ |
| ANSWER-08 | ผ่าน | S: max_length ก่อน trim/ไม่มีข้อมูลค้าง; V: motivation/label/links count limits ทั้งนี้ไม่มี answer-array quota เพิ่มนอกจาก question membership/uniqueness |
| URL-01 | ผ่าน | V: `trimsTextPreservesUrlsAndCountsUnicodeBeforeTrimming` และ S: success พร้อมเก็บ HTTPS URL ตาม input |
| URL-02 | ผ่าน | V: `rejectsInvalidOptionalUrlsWhenLinkIsPresent` มี HTTP, FTP และ javascript scheme |
| URL-03 | ผ่าน | V: URI ไม่มี host/รูปแบบเสีย รวม userinfo, whitespace และ controls |
| URL-04 | ผ่าน | V: `https-example.com` และ `httpsx://...` ถูกปฏิเสธ |
| URL-05 | ผ่านตาม contract | links ว่างเป็น [] ผ่าน; supplied url null/blank ไม่ผ่าน |

## Transaction และ initial history

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| TX-01 | ผ่านโดยแก้ expected ให้ตรง docs | S: success ตรวจ **SUBMITTED** ใน receipt, application และ history ไม่ใช้ PENDING เป็น persisted value |
| TX-02 | ผ่าน | S: `forbiddenApplicantAndStatusFieldsCannotCreateOrAssignApplications` ปฏิเสธ status APPROVED จาก client |
| TX-03 | ผ่าน | S: success/duplicate/concurrency tests ตรวจ initial history หนึ่งรายการต่อ application |
| TX-04 | ผ่าน | S: success ตรวจ from_status NULL, to_status SUBMITTED, actor เป็น principal, reason NULL และ timestamps เดียวกัน |
| TX-05 | ผ่าน | S: `answerFailureMidwayRollsBackEarlierAnswersAndApplication` ให้คำตอบแรก insert แล้วคำตอบที่สองล้มเหลวจาก DB constraint ตรวจ rollback |
| TX-06 | ผ่าน | S: `historyFailureRollsBackApplicationAnswersAndLinks` ให้ answers/links เขียนก่อน history ล้มเหลวจริงใน PostgreSQL |
| TX-07 | ผ่าน | S: invalid required answer/URL/eligibility มี assertNoSubmission; DTO rejection ไม่มี write path ถูกเรียก |

## Concurrency / locks

| Case | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| RACE-01 | ไม่ใช้กับที่นั่ง | ไม่มี round seat quota ตามคำยืนยันเดิม จึงไม่บังคับว่าสองคนต้องสำเร็จคนเดียว; S: `differentApplicantsMaySubmitConcurrentlyWithoutInventedSeatQuota` ตรวจทั้งสองสมัครได้ |
| RACE-02 | ผ่าน | S: `concurrentSameApplicantProducesOneApplicationAndOneHistoryOnSeparateConnections` |
| RACE-03 | ไม่ใช้กับจำนวนที่ว่าง | แทนด้วย S: `severalEligibleApplicantsCreateIndependentSubmissionsWithoutOrphans` ผู้สมัครห้าคนคนละ connection สมัครได้ครบ มี ID/history ไม่ซ้ำและไม่มีข้อมูลกำพร้า |
| RACE-04 | ผ่าน | S: `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock` ใช้ pg_blocking_pids ยืนยันว่ารอจริง แล้วขยับ Clock ไปตรงเวลาปิด |
| RACE-05 | ผ่าน | S: `rollbackOfLockHolderLetsWaitingRequestCommitOneCompleteSubmission` transaction แรกเขียนครบแต่ rollback; request ที่รอได้ commit เพียงชุดเดียว |
| RACE-06 | ผ่านระดับ Service หลังแก้ | S: `realPostgresLockTimeoutReturnsServiceUnavailableAndRetryCanSucceed`, `realPostgresDeadlockVictimReturnsServiceUnavailableAndRetryCanSucceed` ใช้ SQLSTATE จริงและตรวจ 503 metadata, rollback, retry; HTTP mapping ยังเป็นงาน Controller |

## Finding และการแก้ RACE-06

ก่อนแก้ รันสอง tests ใหม่แล้วล้มทั้งสองเคส:

- Lock timeout จาก PostgreSQL หลุดเป็น `UncategorizedSQLException` แทน service error ตาม contract
- Deadlock victim หลุดเป็น `PessimisticLockingFailureException`

แก้เฉพาะ transaction entry ของ ApplicationService ให้ตรวจ cause ที่เป็น SQLException และ SQLSTATE **55P03** (lock unavailable/timeout) หรือ **40P01** (deadlock) แล้วส่ง `ApplicationSubmissionException` ที่มี status 503, code SERVICE_UNAVAILABLE, ข้อความทั่วไป และเก็บ cause ไว้ภายใน ไม่มี new conflict reason, ไม่มี automatic retry และไม่มีการเปลี่ยน database errors ทั้งหมดเป็น duplicate หรือ unavailable

รันสองเคสเดิมหลังแก้ผ่านโดยคง assertions เดิม รวม assert SQLSTATE จาก PostgreSQL จริงและการลองสมัครใหม่หลัง rollback ไม่มีการเปลี่ยน production lock timeout/deadlock settings; tests ตั้งค่าเฉพาะ transaction สำหรับ fault injection

## ผลรันล่าสุด

Focused DTO/Service tests: **89 ผ่าน** — Validator 37 + PostgreSQL Service Integration 52, failures/errors/skipped เป็น 0

Full Backend `./mvnw clean verify`: **340 tests ผ่าน**, failures/errors/skipped เป็น 0 และ `git diff --check` ผ่าน รายละเอียดอยู่ใน [handoff](task43-application-submission.md)

ตารางนี้มี 45 case IDs: 41 ผ่านในระดับที่ระบุ, AUTH-02 บางส่วน, และ LIMIT-06/RACE-01/RACE-03 ไม่ใช้กับ contract ปัจจุบัน ไม่ได้อ้างว่า HTTP application endpoints หรือ PO/QA review ผ่านแล้ว
