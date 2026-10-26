# ร่าง Stories: บันทึกผลคัดเลือกและประกาศผล — Sprint 2 Dependency

**สถานะ 27 ต.ค. 2026: Draft / Pending Team Review — ยังไม่ใช่ Scope ที่รับเข้า Sprint หรือหลักฐาน Approval**

เอกสารนี้แยกงานต้นทางของ US-04/US-05 ออกจาก [US-09 ซึ่งเป็น Read-only](US-09.md) ตามคำสั่งผู้ใช้วันที่ 27 ตุลาคม 2026 รหัส `S2-DECISION-DRAFT` และ `S2-PUBLICATION-DRAFT` เป็นรหัสชั่วคราวสำหรับ Traceability ไม่ใช่เลข User Story ที่ PO จัดสรรแล้ว การอยู่ในโฟลเดอร์ Sprint 2 ไม่ใช่การอนุมัติ Scope/Estimate

| รายการ | ผู้รับผิดชอบ / สถานะ |
|---|---|
| Scope Owner | ชนิตว์นันท์ — PO / System Analyst; ผู้ใช้ยืนยัน Owner และการแยก 2 Draft Stories วันที่ 27 ต.ค. 2026 ตาม T74-D03; เลข Story จริง/รับเข้า Sprint ยังรอ Review |
| Reviewer | สิรวิชญ์ — Scrum Master / QA Lead |
| Frontend / Backend implementer | รอมอบหมายหลัง Scope Review; ไม่อนุมานจาก Owner ของ Task74 |
| Dependency | US-03 submission, US-07 recruitment, Permission Matrix และ Application State Machine |
| งานปลายทาง | US-04 สถานะ/ประวัติ, US-05 ตอบรับ/หมดเวลา และ US-10 สถิติที่เกี่ยวข้อง |

อ้างอิงหลัก: [Task74](../../architecture/task74-sprint2-analysis.md), [Decision Log](../../architecture/system-architecture.md#s2-decision-log), [State Machine](../../architecture/system-architecture.md#s2-application-state-machine), [Permission Matrix](../../security/permission-matrix.md#s2-permission-matrix), [SD-09](../../diagrams/sequence/SD-09-selection-results.md) และ [API handoff](../../api/API_v1.md#81-task74-sprint-2-contract-handoff--draft--pending-review)

<a id="s2-decision-draft"></a>

## S2-DECISION-DRAFT — บันทึกและแก้ผลคัดเลือกภายในก่อนประกาศ

**As a:** COMMITTEE/PRESIDENT ที่มี Assignment ปัจจุบันของชมรมและไม่ติด self-review  
**I want to:** บันทึกหรือแก้ผลผ่าน/ไม่ผ่านของใบสมัครหลังปิดรับจริง  
**So that:** ชมรมเตรียมผลครบก่อน PRESIDENT ประกาศ โดยนักศึกษายังไม่เห็นผลภายใน

### Acceptance Criteria ที่เสนอให้ Scope Owner ทบทวน

| ID | เกณฑ์ |
|---|---|
| AC-01 | Backend ตรวจ session/account, student/club/member/assignment Active, membership เริ่มแล้วไม่สิ้นสุด, Assignment ไม่ถูกถอนและอยู่ในวาระของชมรมเจ้าของทรัพยากรจริงทุกครั้ง ADMIN ไม่มี override |
| AC-02 | ผู้ที่มีใบสมัครในรอบนั้นสถานะใดก็ตาม รวม WITHDRAWN ใช้ Action กรรมการกับรอบนั้นไม่ได้; ทรัพยากรมีอยู่แต่ไม่มีสิทธิ์ใช้ 403 และไม่พบทรัพยากรใช้ 404 ตาม T74-D01 |
| AC-03 | บันทึกผลได้เฉพาะรอบ published ที่ไม่ cancelled ปิดรับจริงแล้ว และยังไม่ประกาศผล; ใช้ `closed_at` เมื่อมี มิฉะนั้นใช้ `closes_at` |
| AC-04 | อนุญาตบันทึกจาก SUBMITTED หรือ UNDER_REVIEW ไป ACCEPTED/REJECTED ไม่บังคับผ่าน UNDER_REVIEW; INTERVIEW อยู่นอก MVP |
| AC-05 | บันทึกผล ผู้ตัดสิน เวลา version และประวัติการเปลี่ยนสถานะครบใน Transaction เดียว; ไม่แก้คำตอบ/ลิงก์แทนผู้สมัคร และไม่ปลอมประวัติสถานะเดิมไปเดิมเมื่อคำขอซ้ำ |
| AC-06 | แก้ ACCEPTED/REJECTED ได้ก่อนประกาศภายใต้สิทธิ์และ concurrency/version เดิม; หลังประกาศห้ามแก้ ไม่มีการตอบรับแทนเจ้าของ |
| AC-07 | ผลภายในไม่รั่วผ่าน applicant status/history/message/notification ก่อน `results_published_at`; internal notes ไม่เปิดเผยแม้หลังประกาศ และไม่คัดลอกเป็นข้อความผลอัตโนมัติ |
| AC-08 | การอ่านตาม US-09 ไม่เปลี่ยนสถานะ หากจะรับ optional Action เริ่ม UNDER_REVIEW ต้องเป็นคำสั่งชัดเจนและระบุ preconditions/เวลาใน AC เพิ่มก่อน Implement ไม่เพิ่มคำสั่งนี้จากการเปิดอ่านหรือจาก Diagram โดยอัตโนมัติ |
| AC-09 | การบันทึก/แก้ผลแข่งกับการประกาศหรือถอนสิทธิ์ต้องได้ผลสอดคล้องตามจุดตรวจสิทธิ์/เวลาและกลไกเขียนข้อมูลที่ Design กำหนด ไม่ใช้ผลจากหน้าเก่าหรือ session role เก่า |

**ไม่รวม:** นัดสัมภาษณ์ คะแนน INTERVIEW การแก้คำตอบผู้สมัคร การประกาศผล การแก้ผลหลังประกาศ และการเพิ่มระบบแจ้งเตือนชนิดใหม่

<a id="s2-publication-draft"></a>

## S2-PUBLICATION-DRAFT — PRESIDENT ประกาศผลคัดเลือก

**As a:** PRESIDENT ที่มี Assignment ปัจจุบันของชมรมและไม่ติด self-review  
**I want to:** เผยแพร่ผลคัดเลือกที่ตัดสินครบแล้วอย่างชัดเจน  
**So that:** นักศึกษาเห็นผลและผู้ผ่านเริ่มตอบรับตามช่วงเวลาจริงได้

### Acceptance Criteria ที่เสนอให้ Scope Owner ทบทวน

| ID | เกณฑ์ |
|---|---|
| AC-01 | ใช้เงื่อนไขกรรมการปัจจุบันทั้งหมดและต้องมี `permission_role=PRESIDENT` ของชมรมจริง COMMITTEE ทั่วไป/ADMIN ที่ไม่มีสิทธิ์ดังกล่าวประกาศไม่ได้; self-review ทุกสถานะยังห้าม |
| AC-02 | รอบต้อง published ไม่ cancelled ปิดรับจริงแล้ว ยังไม่ประกาศผล และทุกใบสมัครที่ยังอยู่ในการคัดเลือกมีผล ACCEPTED/REJECTED ครบ |
| AC-03 | ตรวจเวลา Server และสถานะล่าสุดใน Transaction ณ จุดตัดสินหลังได้สิทธิ์เขียนข้อมูล; ประกาศได้ก่อน `confirmation_deadline` ไม่ใช้เวลาเปิดหน้า หรือถือว่า `results_scheduled_at` เผยแพร่ผลเอง |
| AC-04 | บันทึก `results_published_at` จริง, audit/history ของการประกาศและ in-app notification ตาม Matrix ใน Transaction เดียว; ส่วนใดล้มเหลว Rollback ทั้งชุด และตอบสำเร็จหลัง Commit |
| AC-05 | การประกาศไม่เปลี่ยนสถานะใบสมัคร จึงไม่ใช้ `ACCEPTED → ACCEPTED` ใน application_status_history; BE ต้องกำหนด Contract/แหล่งเก็บ audit ที่รักษาผู้ดำเนินการ รอบ และเวลา โดยไม่อ้างว่ามีตารางหรือ Migration ใหม่แล้ว |
| AC-06 | หลัง Commit applicant API จึงเปิดเผยผล/ข้อความที่อนุญาต; internal notes ไม่เปิดเผย ผู้ผ่านตอบรับได้เมื่อ `results_published_at <= เวลา Server < confirmation_deadline` และผ่านสิทธิ์ของแต่ละ Action |
| AC-07 | การประกาศแยกจาก recruitment `PUBLISH`; ไม่เพิ่ม email/push, notification สัมภาษณ์ หรือปุ่มแก้ผลหลังประกาศ |
| AC-08 | การประกาศแข่งกับการแก้ผล/Retry ต้องไม่เผยผลที่ยังไม่ครบหรือสร้าง audit/notification ผลเดิมซ้ำ; operation-specific response ของการประกาศซ้ำยังต้องระบุใน API Design ไม่ใช้กฎ Retry ของ US-05 ครอบทุกคำสั่งโดยอัตโนมัติ |

## Scope Review และ Handoff

| ประเด็น | สิ่งที่ต้องยืนยันก่อนรับ Scope / Design |
|---|---|
| Owner และเลข Story จริง | ผู้ใช้ยืนยัน Scope Owner และสอง Draft แล้ว; Owner ต้องทบทวน AC และผูกเลข Story จริง/การรับเข้า Sprint โดย US-09 ยังคงอ่านอย่างเดียว |
| Optional UNDER_REVIEW | ตัดสินว่าจะเปิด explicit Action ใน MVP หรือรองรับสถานะเดิมเพื่ออ่านเท่านั้น; ถ้าเปิดต้องมี AC เวลา/สิทธิ์ชัดเจน |
| API / DTO / audit | กำหนด path, payload, version/Retry, error และ publication audit ร่วม FE/BE; เอกสารนี้ไม่สร้าง Endpoint ที่ยังไม่มี |
| Acceptance Scenarios | [T74-QA07/09–13](../../architecture/task74-sprint2-analysis.md#4-acceptance-scenarios-สำหรับ-qa) และ walkthrough ก่อนประกาศ/ไม่มีสิทธิ์; หลังประกาศเชื่อม US-05 ที่ deadline/retry |
| Review จริง | FE/BE/QA บันทึกผู้ตรวจ วันที่ revision ข้อเสนอแนะและข้อสรุป ก่อน Owner/Reviewer อนุมัติและรับ Scope |

ยังไม่มีผล Review/Approval จริงของสอง Draft นี้ ไม่กำหนดเลข Story, Estimate, ผู้พัฒนา หรือวันส่งมอบแทนทีม
