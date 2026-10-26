# Task74 [SYS-ANALYSIS] — Sprint 2 Analysis and Review Packet

**สถานะ: User decisions recorded / Draft for Team Review · ปรับปรุง 27 ตุลาคม 2026 · ยังไม่ปิด Task74**

| รายการ | ผู้รับผิดชอบ / ขอบเขต |
|---|---|
| Owner | ชนิตว์นันท์ — Product Owner / System Analyst |
| Reviewer | สิรวิชญ์ — Scrum Master / QA Lead |
| Label | 1. Requirements & Analysis |
| Dependency | Requirements และเอกสารระบบเดิม Sprint 1; US-03 เป็นงานยกยอด |
| จุดประสงค์ | ให้ Frontend, Backend และ QA ใช้ Flow, สิทธิ์ และ Business Rules ชุดเดียวกันก่อน Design Sprint 2 |
| รอบส่งมอบนี้ | ปรับเอกสารและจัดทำ Artefacts เท่านั้น ไม่เปลี่ยน Source Code, SQL Migration หรือ Runtime |
| Baseline ที่สำรวจ | `main` ที่ `04a4cfe`; รวม Stories ใน working tree ที่ย้ายเข้า `sprint1/` และ `sprint2/` ซึ่งยังไม่ใช่หลักฐานการ Review/Approval |
| ฐาน PR ที่ตรวจผ่าน GitHub | `main` ที่ `ce60bc709e3ed7005715ca3f9647eaa3de31fb13` รวม PR #57 ของ CI แล้ว; ชุดเอกสารนี้รักษาการเปลี่ยนแปลง CI/Frontend README ของฐานใหม่ ไม่แก้ Source/Workflow |

ไฟล์นี้เป็นจุดเริ่ม Review, Traceability และ Acceptance Scenarios ไม่ใช่กฎอีกฉบับหนึ่ง กฎหลักอยู่ใน Architecture, Permission Matrix, Stories และ API ตามตารางถัดไป ผู้ใช้ให้ข้อสรุป D01/02/05/06/07 และยืนยัน Scope Owner/สอง Draft Stories ใน D03 แล้ว ส่วนรายละเอียด Design และ D04/08/09 ยังต้อง Review การบันทึกคำสั่งผู้ใช้ไม่ใช่การลงชื่ออนุมัติแทน PO/Reviewer หรือหลักฐาน FE/BE/QA เห็นชอบแล้ว

## 1. Artefacts และแหล่งอ้างอิงหลัก

| Artefact | เอกสารเจ้าของเนื้อหา | วิธีใช้งาน |
|---|---|---|
| Business Flow และขอบเขต Sprint 2 | [Architecture: Business Flow](system-architecture.md#s2-business-flow) | ทบทวนจุดเริ่ม/จบ การยกยอด และสอง Draft Stories ของงานต้นทางที่รอ Review |
| State Diagram และ Transition Table | [Architecture: Application State Machine](system-architecture.md#s2-application-state-machine) | ตรวจทุก Transition พร้อม Actor, เวลา, ประวัติ, การมองเห็น และเงื่อนไขปฏิเสธ |
| Sequence Diagrams Sprint 2 | [Diagram Index](../diagrams/README.md) และ SD-06–12; SD-05 เป็น submission ที่ยกยอด | ดูลำดับการทำงานของแต่ละ Story; SD-09 ผูกสอง Draft Stories แยก โดยชนิตว์นันท์ดูแล Scope; ไม่เพิ่มงานเขียนเข้า US-09 |
| Permission Matrix | [Matrix: Sprint 2](../security/permission-matrix.md#s2-permission-matrix) และนโยบายส่วนอื่นของไฟล์เดียวกัน | ใช้ System Role แยกจาก Assignment/ตำแหน่ง และตรวจ resource scope/วาระ/self-review |
| Business Rules ที่มีรหัสอ้างอิง | [Architecture: Rule Index](system-architecture.md#s2-business-rules) | ใช้รหัสแบบ `US-03.BR-03` เพื่อไม่สับสนกับ BR หมายเลขเดียวกันของ Story อื่น |
| Decision Log / Open Questions | [Architecture: Decision Log](system-architecture.md#s2-decision-log) | บันทึกตัวเลือก ข้อเสนอ MVP ผลกระทบ ผู้ตัดสิน และหลักฐานจริงก่อนเปลี่ยนสถานะ |
| Acceptance Scenarios / Review / DoD | เอกสารนี้ §4–8 | ใช้เป็น Review Checklist และส่งต่อ QA; ไม่ใช่รายงานผลทดสอบ |
| API / Data Contract | [API v1](../api/API_v1.md), [OpenAPI](../api/openapi.yaml), [Recruitment OpenAPI](../api/rounds.openapi.yaml), [V1 Schema](../../backend/src/main/resources/db/migration/V1__init_schema.sql) | แยก Contract ที่มีแล้ว, Pending Review และ Contract ที่ยังไม่มี; SQL ที่มีผลเป็นแหล่งความจริงของ Schema |

## 2. Scope และหลักฐานที่ต้องแยกให้ชัด

### 2.1 Scope ที่นำมาวิเคราะห์

- [US-01](../stories/sprint2/US-01.md): ค้นหา/กรองและเข้าถึงข้อมูลสาธารณะ เป็นทางเข้าของ Flow ไม่เพิ่มเงื่อนไขการค้นหาใหม่จาก Task74
- [US-03](../stories/sprint1/US-03.md): ส่งใบสมัคร ต้นกำเนิดและไฟล์อยู่ใน Sprint 1 เชื่อมกับการวิเคราะห์งานยกยอดของ Sprint 2; ตำแหน่งไฟล์ไม่เปลี่ยน Estimate หรือ Scope โดยอัตโนมัติ
- [US-04](../stories/sprint2/US-04.md): อ่านสถานะและประวัติของตนเอง
- [US-09](../stories/sprint2/US-09.md): กรรมการเปิดอ่านใบสมัครเท่านั้น ไม่รวมการตัดสิน/ประกาศผล
- [US-05](../stories/sprint2/US-05.md): ยืนยัน สละสิทธิ์ หมดเวลา และสมาชิกภาพ
- [US-10](../stories/sprint2/US-10.md): Dashboard ส่วนกลางตามตัวกรองและนิยาม Metric ที่ต้องตกลง
- [US-02](../stories/sprint1/US-02.md), [US-06](../stories/sprint1/US-06.md), [US-07](../stories/sprint1/US-07.md), [US-08](../stories/sprint1/US-08.md): Dependency ด้านข้อมูลสาธารณะ โปรไฟล์ รอบ และคำถาม

งานบันทึกผลภายในและประกาศผลผูกกับ [สอง Draft Stories พร้อม AC](../stories/sprint2/selection-results-draft.md) แยกจาก US-09 แล้ว ผู้ใช้ยืนยันให้ชนิตว์นันท์ (PO/SA) ดูแล Scope โดย FE/BE รอมอบหมายตาม [T74-D03](system-architecture.md#t74-d03) เลข Story จริง การรับเข้า Sprint และการ Review/Approval ของ AC/API ยังต้องเกิดขึ้นจริง

**INTERVIEW อยู่นอก MVP ตามข้อสรุปผู้ใช้** ส่วนระบบนัดสัมภาษณ์ คะแนน การแจ้งเตือนสัมภาษณ์ การถอนใบสมัครใหม่ การแก้ผลหลังประกาศ และฟีเจอร์แต่งตั้ง/ถอนกรรมการยังอยู่นอก Scope การแต่งตั้งเกี่ยวข้องในฐานะ Dependency เมื่อไม่มีผู้มีสิทธิ์พิจารณาหรือประกาศผลเท่านั้น

### 2.2 Evidence Ledger

| ประเภท | หลักฐานจริง | ผลต่อการ Review |
|---|---|---|
| Baseline ที่เอกสารระบุว่ากำหนดแล้ว | [Permission Matrix §1–4](../security/permission-matrix.md), [US-03 Business Rules](../stories/sprint1/US-03.md#business-rules) | USER/ADMIN แยก Assignment COMMITTEE/PRESIDENT; self-review ทั้งรอบ; สมาชิกภาพที่มีผลไม่เกิน 5 ชมรมทุกประเภท ไม่มีโควตาใบสมัครค้าง ไม่ตีความว่า Task74 ผ่าน Approval แล้ว |
| Draft Requirement | สถานะ Draft ด้านบนของ US-04/05/09/10 และ Open Decisions ของแต่ละ Story | ต้อง Review ร่วมกัน; แยกข้อสรุปผู้ใช้ที่บันทึกแล้วออกจากประเด็นเปิดใน Decision Log ไม่ทำเครื่องหมาย Team Approval แทนผู้ตรวจ |
| Schema ที่มีอยู่ | [V1 applications/history/memberships](../../backend/src/main/resources/db/migration/V1__init_schema.sql), [DBML หมายเหตุ Flow](../database/TU-ClubHub-ERD-Updated.dbml) | มี 8 สถานะ ไม่มี INTERVIEW; EXPIRED แยก DECLINED; WITHDRAWN มีใน Schema แต่คำสั่งถอนยังไม่ยืนยัน Scope; unique สมาชิกหนึ่งแถวต่อคนต่อชมรม |
| Implementation | [Round Service](../../backend/src/main/java/com/tu/clubhub/recruitment/service/RecruitmentRoundService.java), [Question Service](../../backend/src/main/java/com/tu/clubhub/recruitment/service/ApplicationQuestionService.java), [ClubSecurity](../../backend/src/main/java/com/tu/clubhub/committee/security/ClubSecurity.java), [Account Filter](../../backend/src/main/java/com/tu/clubhub/config/ActiveAccountFilter.java), [Student Profile Sync](../../backend/src/main/java/com/tu/clubhub/user/service/UserAccountService.java) | มีรอบ/คำถาม/guard/session-account check/profile sync แล้ว ไม่ใช่หลักฐานว่า Application workflow หรือ PRESIDENT-only publication มีแล้ว |
| Implementation ที่ยังไม่มี | [Matrix: Implementation Status](../security/permission-matrix.md#9-สถานะ-implementation-และงานที่ต้องตามนโยบาย), [Frontend Application Mock](../../frontend/src/features/applications/services/applicationService.ts) | ยังไม่มี Backend application workflow/automatic expiry/dashboard ตาม Flow นี้; Form prototype ไม่ได้บันทึกใบสมัครจริง การไม่มีโค้ดไม่ได้แปลว่าไม่มี Requirement |
| ข้อสรุปและประเด็นที่ยังเปิด | [US-04 Open Decisions](../stories/sprint2/US-04.md), [US-05 Open Decisions](../stories/sprint2/US-05.md), [US-10 Open Decisions](../stories/sprint2/US-10.md), [Decision Log กลาง](system-architecture.md#s2-decision-log) | 403/404, MVP states, Retry, จุดตรวจเวลาและสมาชิกเดิมได้ข้อสรุปผู้ใช้แล้ว; ยังเปิด DTO/Mapping, worker frequency/lag, Metric และ baseline/form review |
| ข้อจำกัด Data Contract | [status-history constraint และ round fields](../../backend/src/main/resources/db/migration/V1__init_schema.sql), [Matrix การประกาศผล](../security/permission-matrix.md) | ประกาศผลเป็นเหตุการณ์ของรอบ ไม่ใช้ประวัติสถานะเดิมไปสถานะเดิม; มี academic_year/semester แล้ว แต่หน่วยนับสถิติยังต้องตกลง |
| Tests ที่อ่านเป็นหลักฐาน | [Migration Tests](../../backend/src/test/java/com/tu/clubhub/application/ApplicationMigrationIntegrationTest.java), [Assignment Concurrency Tests](../../backend/src/test/java/com/tu/clubhub/committee/security/CommitteeRevocationConcurrencyIntegrationTest.java), [Self-review Tests](../../backend/src/test/java/com/tu/clubhub/recruitment/controller/RecruitmentRoundApplicantRestrictionIntegrationTest.java) | เป็นหลักฐานว่ามี Test สำหรับ Schema/Assignment/รอบ ไม่ใช่ผลรันรอบนี้หรือ Test ของ Application workflow ที่ยังไม่มี |

ไม่พบ Requirements/UCS แยกฉบับหรือ AGENTS.md ในขอบเขต Repository ที่ตรวจ หากมีเอกสาร Sprint 1 นอก Repository ให้ Owner แนบและเทียบกับ baseline นี้ก่อนปิด Task74

<a id="task74-user-decisions"></a>

### 2.3 ข้อความ Task74 ที่ปรับตามคำสั่งผู้ใช้

ใช้ข้อความนี้แทน Flow ตั้งต้นในการ์ด/การส่งต่อ Requirement โดยเอกสารนี้บันทึกฉบับใน Repo เท่านั้น ยังไม่ได้แก้การ์ดภายนอกที่ไม่มีลิงก์ให้เข้าถึง:

- **Application State Machine:** SUBMITTED เปลี่ยนเป็น ACCEPTED/REJECTED ได้หลังปิดรับจริงโดยไม่บังคับ UNDER_REVIEW; หากเปิดใช้ UNDER_REVIEW ต้องมี explicit Action การเปิดอ่านตาม US-09 ไม่เปลี่ยนสถานะ INTERVIEW ตัดออกจาก MVP ผู้ผ่านตอบรับจาก ACCEPTED เป็น CONFIRMED/DECLINED ภายใต้ผลที่ประกาศจริงและช่วงเวลา; หมดเวลาอัตโนมัติเป็น EXPIRED แยกเหตุจากสละเอง
- **Permission Matrix:** USER/ADMIN เป็น System Role; CLUB_COMMITTEE เป็น Actor ที่ใช้ Assignment COMMITTEE/PRESIDENT ของชมรมตนเองและวาระจริง ไม่เพิ่ม global role; ทรัพยากรส่วนตัวมีอยู่แต่ไม่มีสิทธิ์เป็น 403 และไม่มีอยู่เป็น 404 ตาม D01
- **Business Rules:** ใช้เวลา Server ณจุดตัดสินใน Transaction หลังได้สิทธิ์เขียน; same-action Retry คืนผลเดิมไม่เขียนซ้ำ; คำขอสวนทางหลังยืนยัน/สละสำเร็จปฏิเสธ; มีแถวสมาชิกเดิมทุกสถานะปฏิเสธ fresh confirmation ยกเว้น Retry เดิม ไม่เปิด reactivation ใน MVP
- **Scope บันทึก/ประกาศผล:** แยก S2-DECISION-DRAFT และ S2-PUBLICATION-DRAFT โดยชนิตว์นันท์ดูแล Scope; FE/BE รอมอบหมาย ไม่รวมงานนี้ใน US-09

**Provenance UDEC-2026-10-27:** ผู้ใช้ส่งข้อสรุปและสั่งให้บันทึกใน Decision Log จากนั้นตอบยืนยันสอง Draft Stories/Scope Owner และนโยบายปฏิเสธทุกแถวสมาชิกเดิมยกเว้น Retry ในบทสนทนาเดียวกัน เหตุผล/เอกสารที่ได้รับผลกระทบอยู่ใน [Decision Log กลาง](system-architecture.md#s2-decision-log) หลักฐานนี้ไม่ใช่รายงานประชุมหรือ Approval ของทีม FE/BE/QA

## 3. Traceability และ Dependency สำหรับ Design

| Action / ผลลัพธ์ | Story / AC หรือแหล่งนโยบาย | Artefact / Decision ที่ใช้ | Dependency / ผู้รับงานต่อ |
|---|---|---|---|
| ดูข้อมูลสาธารณะและรอบ | US-01; US-02.AC-01–06 | Permission Matrix; US-07.BR-05–08 | FE/BE ใช้ Public DTO และเงื่อนไขเวลาร่วมกัน |
| เปิดฟอร์ม / ส่งใบสมัคร | US-03.AC-01–06; API §11/12 (Task42) | Rule Index; T74-D09; SD-05 | BE ทำ Contract/Transaction ตาม baseline; FE ใช้ข้อมูลจริง; QA ตรวจเวลา/validation/duplicate |
| อ่านใบสมัครและประวัติตนเอง | US-04.AC-01–05 | T74-D01, T74-D04; State/Permission Matrix | FE/BE ตกลง DTO และ Error ก่อน Design; QA ตรวจผลรั่ว |
| อ่านผู้สมัครของชมรม | US-09.AC-01–05 | Permission Matrix; US-09.BR-01–09 | กรอง resource/self-review ก่อน pagination/count; ไม่เปลี่ยนสถานะจาก GET |
| เริ่มพิจารณา / บันทึกหรือแก้ผลภายใน | [S2-DECISION-DRAFT.AC-01–09](../stories/sprint2/selection-results-draft.md#s2-decision-draft); Matrix §4 | T74-D02/03; State/Permission Matrix | Scope Owner ชนิตว์นันท์; optional UNDER_REVIEW ต้อง explicit Action; FE/BE รอมอบหมายและ AC รอ Review ไม่ใช่ US-09 |
| ประกาศผลคัดเลือก | [S2-PUBLICATION-DRAFT.AC-01–08](../stories/sprint2/selection-results-draft.md#s2-publication-draft); Matrix §4.5–7 | T74-D03/04/06 | PRESIDENT, completeness, audit/notification; Scope Owner ยืนยันแล้ว แต่ API/รับเข้า Sprint และ Review ยัง Pending |
| ยืนยัน / สละสิทธิ์ / หมดเวลา | US-05.AC-01–05 | T74-D05–07; US-03.BR-07/08 | BE ออกแบบ atomicity/concurrency และ automatic expiry; FE แสดงผลจริง; QA ตรวจ failure/race/catch-up |
| สมาชิกภาพจากการยืนยัน | US-05.AC-02/05 | T74-D07; Schema memberships/history | ใช้ D07 ปฏิเสธทุกแถวสมาชิกเดิมยกเว้น exact Retry และรักษาประวัติ; ไม่สร้างสมาชิกเมื่อสละ/หมดเวลา |
| Dashboard ส่วนกลาง | US-10.AC-01–05 | T74-D08; System Role ADMIN | นิยามหน่วยนับ ปี/ภาค และหลายรอบก่อนออกแบบ Query/UI |
| จัดการโปรไฟล์/รอบ/คำถาม | US-06/07/08; Matrix §3/4 | Rule Index; recruitment OpenAPI | ใช้เป็น Dependency เดิม ไม่เพิ่มแก้เงื่อนไขระหว่างเปิดรับโดยไม่มีข้อสรุป |
| แต่งตั้ง/ถอนกรรมการ | Matrix §5 | Dependency เท่านั้น | ไม่เพิ่มเป็นฟีเจอร์ Sprint 2 ของ Task74; ต้องใช้กระบวนการจริงเมื่อไม่มีผู้มีสิทธิ์ |

US-09 ปัจจุบันมี Business Rules BR-01–09; การอ้าง AC/BR ในตารางเป็นรหัสของเอกสาร ไม่ใช่หลักฐานว่า Implementation หรือการตรวจรับสำเร็จแล้ว

### จุดส่งต่อ API / UI / Data Design

1. ใช้ canonical submission route ใน API §11/SD-05; path `/me/applications` ที่จองไว้ยังไม่ใช่ Contract อ่านข้อมูลที่ครบ และไม่ตั้ง path ใหม่แทนทีมในเอกสารนี้
2. ระบุ applicant-visible DTO, history allowlist, result message และ CTA ก่อน/หลังประกาศตาม T74-D04; ไม่ส่ง Entity/internal notes ให้ FE ซ่อนเอง
3. แยกคำสั่งบันทึกผลจากประกาศผลและ recruitment `PUBLISH`; ใช้สอง Draft Stories/AC ตาม T74-D03 ให้ Owner/ทีม Review และผูกเลข Story จริงก่อนรับเข้า Sprint
4. ระบุข้อมูล audit การประกาศที่ไม่ขัด `from_status <> to_status`; ไม่จำลอง `ACCEPTED → ACCEPTED` และไม่เพิ่ม Migration จากงานวิเคราะห์นี้
5. กำหนดจุดตรวจเวลา/version/สิทธิ์ร่วมกับ lock สำหรับ submit–close, decision–publication, confirm–decline–expiry และเพดานสมาชิกข้ามชมรม; assignment-row lock ไม่ครอบคลุมการเปลี่ยนสถานะทุกตาราง
6. ใช้ Replay/คำขอสวนทางและนโยบายปฏิเสธแถวสมาชิกเดิมตาม T74-D05/07 ที่ผู้ใช้ยืนยันแล้ว; รูปแบบ HTTP/DTO เป็นงาน Design และไม่เปลี่ยน duplicate submission `409`
7. ใช้ academic_year/semester ของรอบที่มีใน Schema แล้วตามนิยาม Metric ที่ตกลง ไม่อนุมานจากปีปฏิทินหรือชื่อ Actor ว่าเป็น ADMIN
8. Submission/form เดิมตรวจสมาชิกภาพที่มีผลตาม Contract ของตน ส่วน D07 ปฏิเสธ fresh confirmation เมื่อมีแถวสมาชิกเดิมทุกสถานะ การส่งใบสมัครผ่านไม่รับประกันว่าจะยืนยันได้ FE/QA ต้องตรวจข้อความนี้โดยไม่เพิ่มเงื่อนไข POST/GET เอง

## 4. Acceptance Scenarios สำหรับ QA

**สถานะทุก Scenario: Planned / Not Run.** ตารางนี้เป็นข้อกำหนดสำหรับออกแบบ Test ไม่ใช่ชื่อไฟล์ Test ที่มีอยู่หรือผลทดสอบผ่านแล้ว Expected results ตาม D01/02/05/06/07 ที่ผู้ใช้สรุปแล้วใช้ตามตาราง ไม่กลับเป็น Blocked; เฉพาะรายละเอียดที่ยังเปิด เช่น D04/08/09 และ worker frequency/lag ต้องเติมหลัง Review ไม่ใช้ข้อเสนอเหล่านั้นเป็น Team Approved

| ID | Given / When | Then / ผลที่ต้องตรวจ | Trace / Dependency |
|---|---|---|---|
| T74-QA01 | รอบ published และผู้สมัครผ่านสิทธิ์; ส่งก่อนเปิด/ตรงเปิด/ก่อนปิด/ตรงปิด | รับได้เฉพาะ `[opens_at, closes_at)` โดยเวลา Backend; ขอบเขตตรงเปิดรับได้ ตรงปิดปฏิเสธ | US-03.AC-04; US-07.BR-03/05/06 |
| T74-QA02 | เปิดฟอร์มไว้ก่อน แล้ว manual close แข่งกับการส่ง | ผลสอดคล้องกับจุดตรวจใน Transaction; ใบสมัครที่ Commit แล้วไม่ถูกลบ; `closed_at` ไม่เขียนทับเมื่อปิดซ้ำ และ `closes_at` คงเดิม | US-03.BR-03; US-07.BR-07; BE Design |
| T74-QA03 | Required ว่าง คำถามผิดรอบ/ซ้ำ หรือ HTTPS link ผิดข้อจำกัด | Validation error ตาม API; ไม่เหลือใบสมัคร/คำตอบ/ลิงก์/history บางส่วน; Backend ไม่ดาวน์โหลด URL | US-03.AC-02/03/06; API §11 |
| T74-QA04 | ส่งสองคำขอพร้อมกัน หรือ response หายหลัง Commit แล้วส่งซ้ำ | มีหนึ่งใบสมัครต่อคนต่อรอบ; คำขอซ้ำ `409`; UI ตรวจประวัติ ไม่บอกว่าไม่มีข้อมูลถูกบันทึกโดยไม่มีหลักฐาน | US-03.AC-05/06; API §11 retry |
| T74-QA05 | ใบสมัครสถานะ WITHDRAWN เดิม แล้วส่งรอบเดิมใหม่ | ไม่ข้าม unique student/round; ไม่ถือว่าการถอนเปิดสิทธิ์สมัครใหม่; ไม่เพิ่มคำสั่งถอนใน Scope เอง | US-03.BR-04; T74-D02 |
| T74-QA06 | ผู้สมัครเปิดของตน เทียบ application ที่มีอยู่ของคนอื่น/ID ไม่มี/parent ไม่ตรง | ของตนไม่ปนผู้อื่น; มีทรัพยากรแต่ไม่มีสิทธิ์ 403; ไม่มีทรัพยากร 404; relationship ใน authorized parent ตาม Contract; Error ไม่แสดงเป็นประวัติว่าง | US-04.AC-01/02/05; T74-D01 recorded |
| T74-QA07 | ภายในบันทึก ACCEPTED/REJECTED แล้ว แต่ยังไม่ประกาศ หรือถึงเวลาตามแผนอย่างเดียว | Applicant DTO/history/message/notification ไม่เผยผล; GET ไม่เปลี่ยน UNDER_REVIEW; internal notes ไม่เปิดแม้หลังประกาศ | US-04.AC-03/04; US-09.AC-04; T74-D04 |
| T74-QA08 | กรรมการอ่านคำตอบหลายคำถาม/ลิงก์และเปิดหลายรอบ | scope ตรงชมรม/รอบ; จับคำตอบด้วย question ID และเรียงตาม Contract; read ไม่มี decision/publication side effect | US-09.AC-01–04 |
| T74-QA09 | USER ไม่มี Assignment, กรรมการต่างชมรม, ADMIN ไม่มี Assignment หรือกรรมการมีใบสมัครในรอบนั้นไม่ว่าสถานะใด | ปฏิเสธงานกรรมการตาม Matrix; self-review กรองก่อน pagination/count; อ่านของตนได้ผ่าน applicant API ตามสิทธิ์ทั่วไป | US-09.AC-05; Matrix §2/4 |
| T74-QA10 | Assignment ก่อนเริ่ม/ตรงเริ่ม/ตรงสิ้นสุด/ถูกถอน หรือ account ถูก suspend | ใช้ `[starts_at, ends_at)`; account suspension invalidate session ตาม Contract; การแข่งกันกับ revocation ระบุผลตามขอบเขต lock จริง ไม่อ้างว่าล็อกทุกสถานะแล้ว | Matrix §2/7/8; BE Design |
| T74-QA11 | บันทึกผลก่อน/หลังปิดรับ จาก SUBMITTED หรือ UNDER_REVIEW และลองเปิดอ่าน | หลังปิดรับตัดสินจาก SUBMITTED ได้ไม่บังคับ UNDER_REVIEW; หากใช้ U ต้อง explicit Action ที่มี AC; GET ไม่เปลี่ยนสถานะ; INTERVIEW นอก MVP | T74-D02; S2-DECISION-DRAFT.AC-03/04/08 |
| T74-QA12 | COMMITTEE เทียบ PRESIDENT ประกาศผล; ผลไม่ครบ/หมดเวลา/version ชน | เฉพาะ PRESIDENT ที่ผ่านเงื่อนไข; actual publication แยก planned time; audit/notification ครบหรือ Rollback; ไม่มี same-state history ปลอม | S2-PUBLICATION-DRAFT.AC-01–08; T74-D03/06 |
| T74-QA13 | ผลประกาศแล้ว มีการขอแก้ผล หรือ ADMIN ขอข้ามสิทธิ์/ตอบรับแทน | ปฏิเสธตามนโยบาย ไม่มี override; ไม่เปลี่ยนข้อมูลผู้สมัครแทนเจ้าของ | Matrix §3/4 |
| T74-QA14 | fresh response ตรงเวลาเริ่มจริง/ก่อน deadline และ student/club Active เทียบ inactive | รับเฉพาะ results_published_at <= เวลา Server < deadline; ยืนยันต้อง student/club Active แต่สละไม่บังคับสองสถานะนี้; ใช้สิทธิ์เจ้าของ/account/รอบตาม Matrix | US-05.AC-01/03; T74-D06 recorded |
| T74-QA15 | ยืนยันสำเร็จ เทียบล้มเหลวขณะสร้างสมาชิก/บันทึกประวัติ | สถานะตอบรับกับสมาชิกภาพและประวัติครบใน Transaction เดียว; ไม่เหลือ CONFIRMED ที่ไม่มีสมาชิกจากการบันทึกล้มเหลว | US-05.AC-02/05 |
| T74-QA16 | ผู้สมัครใกล้เต็มเพดานยืนยันต่างชมรมพร้อมกัน | จำนวนสมาชิกภาพที่มีผลทุกประเภทไม่เกินเพดานเดิม; unique application/membership ไม่ถูกใช้เป็นหลักฐานว่าเพียงพอป้องกัน race นี้ | US-03.BR-07/08; US-05.AC-05 |
| T74-QA17 | พบแถวสมาชิกเดิม ACTIVE/INACTIVE/LEFT/REMOVED แล้วขอยืนยันใหม่ เทียบ Retry ของการยืนยันเดิม | fresh confirmation ปฏิเสธ 409 ทุกสถานะและไม่เปลี่ยนข้อมูล/history/source; exact Retry คืนผลเดิมไม่สร้าง/คืนสถานะสมาชิก แม้สมาชิกปัจจุบันเปลี่ยน; สละไม่ลบสมาชิกจากเหตุอื่น | US-05.BR-05; T74-D07 recorded |
| T74-QA18 | confirm/decline/expiry แข่งกัน หรือ Request เข้าก่อน deadline แต่รอสิทธิ์เขียนจนถึง deadline | ใช้ Server Clock ณจุดตัดสินใน Transaction หลังได้สิทธิ์เขียน ไม่ใช่เวลาเปิดหน้า/รับ Request; เวลาเท่ากับ deadline ปฏิเสธ fresh response; ผลสุดท้ายทางเดียวและไม่ทับ terminal state | US-05.AC-03–05; T74-D06 recorded |
| T74-QA19 | ไม่มีผู้เปิดหน้า ระบบ restart หลัง deadline และงานหมดเวลาทำซ้ำ | อัตโนมัติตามเก็บเฉพาะ published ACCEPTED ที่ยังไม่ตอบ; EXPIRED แยก DECLINED พร้อมเหตุผล/UI “สละสิทธิ์ (หมดเวลาตอบรับ)”; actor/responded_at ตาม Schema ไม่มี history ซ้ำ; worker lag/frequency รอเกณฑ์ | US-05.AC-04/05; T74-D06 |
| T74-QA20 | Retry confirm/decline เดิมหลังผลสำเร็จ/response หาย/เลย deadline เทียบ Action สวนทาง | หลังตรวจ Session/account/ownership และ CSRF ของ unsafe request คืนผลตอบรับเดิมก่อน fresh-action business gates ไม่มี writes/member/history ซ้ำหรือ reactivation; Action สวนทางหลัง CONFIRMED/DECLINED เป็น 409; unsafe Retry ที่ CSRF ไม่ผ่านยังได้ 403 CSRF_INVALID; ไม่ใช้กฎนี้เปลี่ยน duplicate submission | US-05.AC-05; T74-D05/07 recorded |
| T74-QA21 | ADMIN ดูหลายรอบ/ชมรม ใช้ตัวกรองปี/ภาค มีคนสมัครหลายชมรมและสมาชิกสิ้นสุดแล้ว | หน่วยนับ/การรวมยอดตรง T74-D08; ไม่ซ้ำจาก join; ไม่รวมรอยืนยัน/สละเป็นสมาชิกยืนยัน; ผู้ไม่ใช่ ADMIN เข้าไม่ได้และไม่มีข้อมูลคำตอบ/เอกสารส่วนตัว | US-10.AC-01–05; T74-D08 |

## 5. ลำดับงานและ Dependency

| ลำดับ | งาน | ผลส่งมอบ / Owner |
|---|---|---|
| 1 | ยืนยัน baseline และเอกสาร Sprint 1 ภายนอกถ้ามี | PO/SA ระบุ Story ฉบับใช้งานและ carry-over; ไม่เปลี่ยน Estimate เอง |
| 2 | ตรวจความสอดคล้องตาม D01/02 ที่ผู้ใช้สรุปแล้ว และ Review สอง Draft Stories/DTO | PO/SA ดูแล Scope; FE/BE/QA ทบทวน AC และรายการรับเข้า Sprint โดยไม่รวมใน US-09 |
| 3 | ทวน Replay/เวลา/สมาชิกเดิมตาม D05/06/07 และปิด worker details, D08/09 ที่ยังเปิด | ไม่เปิดคำถามที่ผู้ใช้ตอบแล้วใหม่; แยก API/Design details และ Business Decisions ที่เหลือ |
| 4 | ทำ State/Permission/Rule/Story/API references ให้ตรงข้อสรุปจริง | SA ดูแล Architecture/Stories; BE ดูแล API/Data Contract; ไม่ทำ Migration ใน Task วิเคราะห์ |
| 5 | Review API/UI/data effects และ Acceptance Scenarios ร่วมกัน | FE/BE/QA ยืนยันว่ามีข้อมูลพอเริ่ม Design พร้อม Action Items |
| 6 | แนบ diff/PR/ผลตรวจเอกสาร และบันทึก Approval/CI/merge ตามจริง | Reviewer ตรวจหลักฐานก่อนปิด Task74; สิ่งที่ยังไม่มีต้องคง Pending |

## 6. Agenda และ Action Items สำหรับทีม

| Agenda | ผู้นำ / ผู้ร่วม | สิ่งที่ต้องได้ |
|---|---|---|
| ขอบเขต Sprint 2, State และ Transition | PO/SA + FE/BE/QA | Review ตามข้อสรุป D02 และสอง Draft Stories ของ D03 ไม่เพิ่ม INTERVIEW หรือรวม US-09 กับงานเขียน |
| สิทธิ์และการมองเห็นผล | BE + FE + QA | ทวน 403/404 ตาม D01, Assignment/PRESIDENT/self-review และตัวอย่าง DTO ตาม D04 |
| เวลา Retry สมาชิกเดิม และ Metric | PO + BE + QA | เดิน Flow ตาม D05/06/07 ที่บันทึกแล้ว และปิด worker details/Metric/form review ที่ยังเปิด |
| API/UI ที่ได้รับผลกระทบ | FE + BE | รายการ Contract/DTO/หน้าจอ/CTA และ Dependency ก่อนเริ่ม Design |
| ตรวจรับและมอบหมายงานต่อ | สิรวิชญ์ + ชนิตว์นันท์ | Owner ของ Action Items, due date ที่ทีมตกลง และหลักฐาน Review |

| Action Item | Owner | สถานะ / หลักฐาน |
|---|---|---|
| บันทึกข้อสรุปผู้ใช้และดูแลสอง Draft Stories/ประเด็นเปิด | ชนิตว์นันท์ — PO/SA | User decisions/Scope Owner recorded; formal Review/Story assignment ยัง Pending |
| ตรวจความครบถ้วน AC/Scenario และข้อเสนอแนะ | สิรวิชญ์ — Scrum Master / QA Lead | Pending Review |
| ทบทวน UI/DTO/CTA และผลจาก API error | ตัวแทน Frontend — รอมอบหมายชื่อ | Pending Review |
| ทบทวน API/Data Contract, guard และ Transaction/concurrency | ตัวแทน Backend — รอมอบหมายชื่อ | Pending Review |
| เติมผลคาดหวัง/แผนทดสอบหลัง Decision | ตัวแทน QA — รอมอบหมายชื่อ | Planned / Not Run |

## 7. Acceptance Criteria และ DoD จากการ์ด Task74

ถอดเกณฑ์จากภาพการ์ดที่ผู้ใช้ให้วันที่ 27 ตุลาคม 2026 ในบทสนทนา ยังไม่มีลิงก์การ์ด/PR หรือหลักฐาน Review จริงใน Repository จึงไม่ทำเครื่องหมายผ่านแทนผู้รับผิดชอบ

### Acceptance Criteria

| เกณฑ์จากการ์ด | Artefact / วิธีตรวจ | สถานะตรวจรับ |
|---|---|---|
| เอกสาร State Machine Flow และเงื่อนไขการเปลี่ยนสถานะใบสมัครครบถ้วน | Architecture/Stories/Diagrams ตรง D02/05/06/07 ที่บันทึกแล้ว; optional U ยังต้องรับ AC หากเปิดใช้ | พร้อม Team Review; ไม่ถือว่ามี Approval แล้ว |
| ตารางสิทธิ์ (Permission Matrix) ระบุ Action และ Role ครบทุกกรณี | Matrix/Traceability แยก System Role/Assignment; D01 ใช้ 403/404 ตามข้อสรุปแล้ว | พร้อม Team Review; form Contract/รายละเอียด API ยังต้อง Review |
| ทีม Dev (Frontend/Backend) และ QA ร่วมตรวจสอบและเห็นชอบตรงกัน | Agenda §6 และ Review Ledger §8 พร้อมผู้ตรวจ/วันที่/ข้อสรุป/ลิงก์หลักฐาน | Pending Review — ยังไม่มีหลักฐานเห็นชอบร่วมกัน |

### Definition of Done (Checklist กลาง)

| เกณฑ์จากการ์ด | การใช้กับ Task วิเคราะห์นี้ / หลักฐานที่ต้องแนบ | สถานะ |
|---|---|---|
| ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน | Scope/Traceability/จุดส่งต่อ Design ใน §2–3; ปิดข้อขัดแย้งที่ Block หรือเลื่อน Scope อย่างมีหลักฐาน | Draft / Pending Review |
| พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด | สำหรับ SYS-ANALYSIS คือจัดทำ Artefacts และตรวจความครบ/สอดคล้องตาม AC; Scenario §4 เป็นแผน ไม่อ้างว่า feature ที่ยังไม่มีทดสอบผ่าน | รอการตรวจรับและผลตรวจเอกสารจริง |
| แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer | ลิงก์ Artefacts §1, วิธีตรวจ §8; ต้องเพิ่ม PR และผลตรวจ revision ที่ส่งจริง | PR: ยังไม่มี; ดู Verification Ledger §8 |
| CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend | รอบนี้แก้เฉพาะเอกสาร ไม่มี Frontend Logic; แนบ CI ของ PR จริงหรือให้ Reviewer รับรองว่าไม่เข้า path filter ตาม workflow ไม่อ้าง CI ผ่านจาก local checks | CI: ยังไม่ได้รัน; Frontend Tests: ไม่ได้รันเพราะไม่มีการแก้ Logic |
| แก้ข้อเสนอแนะที่ต้องการครบ และ Reviewer อนุมัติ | Feedback/Resolution และ Approval ที่อ้างอิง revision จริง | Pending Review / ยังไม่มี Approval |
| รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ | สำหรับรอบนี้คือรวมชุดเอกสารที่ Review แล้ว; ต้องมี merge/reference จริง ไม่เท่ากับมีไฟล์ใน working tree | ยังไม่ Commit/เปิด PR/merge |

### DoD เฉพาะ SYS-ANALYSIS ก่อนปิด Task74

- [ ] ทุก Action ใน Scope มี Actor/resource scope/เงื่อนไขบัญชี นักศึกษา สมาชิก Assignment วาระและเวลา/ผลลัพธ์/การมองเห็น/ประวัติ/Error ชัดเจน
- [ ] State Machine, Permission Matrix และ Business Rules ไม่ขัดกัน และการบันทึกผลแยกจากการประกาศผล
- [ ] ทุกข้อเชื่อมกลับ Story/AC ได้; Action ที่ยังขาด Story มี Scope/Dependency ที่ PO ตัดสินแล้ว
- [ ] ข้อที่ยังไม่ยืนยันถูกแยก พร้อมผู้ตัดสินและงานที่ได้รับผลกระทบ; ไม่มีข้อเสนอที่ถูกเปลี่ยนเป็น Team Approved โดยไม่มีหลักฐาน; user decisions ต้องมี provenance แยก
- [ ] Expected results ของ Acceptance Scenarios ที่ Block ถูกเติมหลัง Decision หรือเลื่อน Scope อย่างมีหลักฐาน
- [ ] Frontend, Backend และ QA ร่วม Review ว่ามีข้อมูลพอเริ่ม Design พร้อม Owner ของงานต่อ
- [ ] ลิงก์/Diagram/API references ใช้งานได้ และมีกฎหลักฉบับเดียวต่อเรื่อง
- [ ] มี PR/ผลตรวจ/CI หรือคำวินิจฉัย CI ที่เกี่ยวข้อง/หลักฐาน Review และ Approval จริงจากผู้รับผิดชอบ
- [ ] รวมชุดเอกสารที่ผ่าน Review แล้วและอัปเดตสถานะ Task ตาม revision ที่รวมจริง

## 8. วิธีตรวจงานและหลักฐาน Review

### วิธีตรวจสำหรับ Reviewer

1. เปิด Artefacts ตาม §1 และเทียบทุก Action ใน Traceability §3 กับ State/Permission/Rule โดยใช้ Story-qualified IDs
2. ตรวจ Decision Log `T74-D01`–`T74-D09`; ใช้ข้อสรุปผู้ใช้ที่บันทึกแล้ว ตรวจ provenance/เหตุผล/ผลกระทบ และเพิ่มหลักฐาน Review จริงให้ประเด็นที่ยังเปิด ไม่เปลี่ยน Pending เป็น Team Approved เพียงเพราะมีข้อเสนอ
3. เดิน Scenario §4 ร่วมกับ FE/BE/QA โดยเฉพาะผลรั่ว, self-review, exact deadline, retry/race และสมาชิกเดิม; แยก Scenario ที่ยัง Block ชัดเจน
4. ตรวจ diff ว่าเปลี่ยนเฉพาะเอกสาร ไม่มี Source Code/Migration/Runtime หรือการอ้าง Implementation/ผล Test ที่ยังไม่มี
5. ตรวจลิงก์ Markdown/anchors, Mermaid และ YAML syntax/local `$ref`; ตรวจว่า OpenAPI ไม่เพิ่ม path/schema/required field จากข้อเสนอที่ยังไม่ตัดสิน
6. แนบผลตรวจ, PR/CI/merge ที่เกิดขึ้นจริง และกรอก Review Ledger ก่อนปิด Task74

### Walkthrough ที่ส่งให้ FE/BE/QA ตรวจ

ทุกแถวเป็น **Prepared / Awaiting human review** ไม่ใช่ผลประชุมหรือผู้ตรวจเห็นชอบแล้ว ให้บันทึกผู้ตรวจ/วันที่/revision/feedback ใน Ledger หลังตรวจจริง

| ตัวอย่าง Flow | ผลคาดหวังที่ใช้ร่วมกัน | ผู้ตรวจ / หลักฐาน |
|---|---|---|
| ก่อนประกาศ ภายในเป็น ACCEPTED แต่ถึงเวลา results_scheduled_at แล้ว | นักศึกษายังไม่เห็นผล/history/message ที่เผยผล ไม่มี CTA ตอบรับ; GET ไม่เปลี่ยนสถานะ; หลังประกาศจริงจึงเปลี่ยนการมองเห็น | FE + BE + QA — Pending; T74-QA07 |
| Request เปิดก่อน deadline แต่รอสิทธิ์เขียนจนเวลาเท่ากับ deadline | fresh confirm/decline ไม่ผ่าน; Server Clock ที่จุดตัดสินใน Transaction เป็นตัวตัด ไม่ใช่เวลาเปิดฟอร์ม/ส่ง Request | BE + QA — Pending; T74-QA18 |
| การยืนยันเดิมสำเร็จแล้ว response หาย หรือ Retry หลัง deadline/สมาชิกเปลี่ยนเป็น LEFT | ตรวจ Session/account/ownership แล้วคืนผลเดิมโดยไม่เขียน status/member/history และไม่คืนสมาชิกเป็น Active | FE + BE + QA — Pending; T74-QA17/20 |
| ยืนยันแล้วขอสละ หรือสละแล้วขอยืนยัน | ปฏิเสธ 409 ไม่เปลี่ยนใจผ่าน Flow นี้ใน MVP; ไม่เปลี่ยนสมาชิกหรือประวัติ | FE + BE + QA — Pending; T74-QA20 |
| มี application จริงแต่เป็นของคนอื่น เทียบ ID ไม่มี | ผู้ Login ที่ไม่มีสิทธิ์ได้ 403 ไม่คืนเนื้อหา; ID ไม่มีได้ 404; ไม่แสดง Error เป็นประวัติว่าง | FE + BE + QA — Pending; T74-QA06/09 |
| มีแถวสมาชิกเดิมแต่ยังไม่ใช่ผลยืนยันของใบสมัครนี้ | fresh confirm ปฏิเสธทุกสถานะ ACTIVE/INACTIVE/LEFT/REMOVED ไม่มี reactivation/เปลี่ยน source; การสละยังไม่ลบสมาชิกจากเหตุอื่น | BE + QA — Pending; T74-QA17 |

### Verification Ledger ของรอบเอกสารนี้

| รายการ | ผล / ขอบเขต |
|---|---|
| Local documentation checks — 27 ต.ค. 2026 | ผ่าน git diff --check ของ tracked working diff และตรวจ Markdown 42 ไฟล์: local file/fragment links 401 รายการ ไม่พบปลายทางขาด; table columns/code fences ผ่าน; แยก URL ภายนอก/URI ประวัติออกจากการตรวจ local links |
| OpenAPI checks | YAML ทั้งสองฉบับ parse ผ่านโดยไม่พบ key ซ้ำ; local `$ref` ครบ 102/74 รายการ และ operation IDs ไม่ซ้ำ; semantic diff เมื่อไม่นับ description/summary/Task74 metadata ไม่เปลี่ยน transport structure, paths/components/security/operation flags/version; ข้อความ policy ของ private-resource 403/404 ปรับตาม D01 ไม่ใช่ handler ที่ Implement แล้ว |
| Mermaid | พบ 27 Mermaid blocks รวม SD-06–12 จำนวน 12 sequence diagrams; ตรวจ fences/frontmatter/participants/control blocks และอ่านทวนแล้ว SD-10 แยก exact Retry พร้อม CSRF ของ unsafe request; parser/render ยัง Not Run ไม่อ้างว่า structural checks เท่ากับ render ผ่าน |
| Scope / Data declarations | ไม่พบ diff ใน `backend/` หรือ `frontend/`; SQL Migration ไม่เปลี่ยน; DBML ต่างเฉพาะ comments/Note ไม่มี schema declarations เปลี่ยน |
| Cross-review เอกสาร | ตรวจข้าม State/Permission/Stories/API/Diagrams และแก้ข้อเสนอแนะเรื่อง fresh-action gates, CSRF ของ unsafe Replay และสถานะ student-profile sync แล้ว; การตรวจโดยผู้จัดทำ/AI ไม่ใช่การเห็นชอบของทีม Dev/QA หรือ Approval ของ Owner/Reviewer |
| Application / Frontend / Backend feature tests | Not Run — ไม่มีการแก้ Source Code ในรอบนี้ |
| Database migration | Not Run — ไม่เปลี่ยน SQL Migration/ข้อมูลฐานข้อมูล |
| CI | ยังไม่อ้าง CI ผ่าน; workflow ฐาน GitHub main ce60bc7 ข้าม docs/Markdown-only ตาม paths-ignore; ต้องตรวจ run/check ของ PR จริงหลังสร้าง |
| PR / Commit / Merge | ยังไม่มี — ไม่ถือว่าการแก้ไฟล์ใน working tree เป็นการรวมงาน |
| Deployment | Not Run — อยู่นอกขอบเขต |

### Review / Approval Ledger

| บทบาท / ผู้ตรวจ | สถานะ | วันที่ / revision / ลิงก์หลักฐาน | Feedback / Resolution |
|---|---|---|---|
| Owner: ชนิตว์นันท์ — PO/SA | User decisions recorded / Pending Team Review | UDEC-2026-10-27 ใน §2.3; ยังไม่มีลิงก์ sign-off ของ Owner | Scope Owner/สอง Draft Stories ยืนยันแล้ว; รอ Review AC/ประเด็นเปิด ไม่ลงชื่อแทน Owner |
| Reviewer: สิรวิชญ์ — Scrum Master / QA Lead | Pending Review | ยังไม่มี | รอตรวจ AC/DoD และข้อเสนอแนะ |
| Frontend representative | Pending Review / รอมอบหมายชื่อ | ยังไม่มี | รอทบทวน UI/DTO/API effects |
| Backend representative | Pending Review / รอมอบหมายชื่อ | ยังไม่มี | รอทบทวน guard/time/Transaction/Data Contract |
| QA representative | Pending Review / รอมอบหมายชื่อ | ยังไม่มี | รอ expected results หลัง Decision |

เอกสารชุดนี้ส่งให้ Review ได้ แต่ยังไม่มีหลักฐานเพียงพอทำเครื่องหมาย Approved หรือปิด Task74
