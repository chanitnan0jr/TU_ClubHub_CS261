# TU ClubHub — Diagram Index

**ปรับปรุง 27 ตุลาคม 2026 · Sequence Diagrams Sprint 2 เป็น Draft / Pending Review**

เปิดไฟล์ Markdown ผ่าน Preview ที่รองรับ Mermaid หรือบน GitHub เพื่อดูภาพ เอกสารนี้เป็นดัชนี ไม่ใช่กฎหลักอีกฉบับ และการมี Diagram ไม่ใช่หลักฐานว่า Endpoint/Workflow มี Implementation, Test ผ่าน หรือ Requirement ได้รับอนุมัติแล้ว

คำยืนยันผู้ใช้วันที่ 27 ตุลาคม 2026 ถูกนำมาปรับ Diagrams แล้วในสถานะ **Recorded User Instruction / Pending Team Review** แยกจากการ Review/Approval จริงของทีม รายละเอียดกฎและสถานะการตัดสินอ้าง [Decision Log กลาง](../architecture/system-architecture.md#s2-decision-log) ไม่เปิดข้อที่ผู้ใช้เลือกแล้วเป็นคำถามเดิมซ้ำ

| ข้อสรุปผู้ใช้ที่มีผลต่อภาพ | สถานะ / จุดที่ยังเปิด |
|---|---|
| T74-D01: ทรัพยากรส่วนตัวมีอยู่แต่ไม่มีสิทธิ์ `403`; ไม่มีทรัพยากร `404` | บันทึกคำยืนยันผู้ใช้แล้ว รอ Team Review; ถอด Blocked เรื่องเลือก 403/404 ออกจากภาพ |
| T74-D02: `INTERVIEW` ออกจาก MVP; `UNDER_REVIEW` optional ผ่าน explicit Action เท่านั้น; ตัดสินตรงจาก `SUBMITTED` ได้หลังปิดรับจริง | บันทึกคำยืนยันผู้ใช้แล้ว; GET ไม่เริ่ม Review และไม่รวมงานเขียนเข้า US-09 |
| T74-D05: Exact Retry ของการยืนยัน/สละที่สำเร็จแล้วคืนผลเดิมแบบไม่เขียน/ไม่เพิ่มสมาชิกหรือ history; คำขอสวนทาง `409` ไม่เปลี่ยนใจ | ตรวจ Session/บัญชี Active/ownership ก่อนอ่านผลเดิม แม้นอกช่วงตอบรับ; HTTP/DTO ของผลอ่านยังเป็นงาน Contract ไม่เพิ่ม gate สำหรับตัดสินซ้ำ |
| T74-D06: Action ตอบรับใหม่ใช้ `results_published_at <= server_now < confirmation_deadline` ณ จุดตัดสินหลัง Lock โดยตรวจสิทธิ์ใน Transaction ก่อนเขียน; หมดเวลาใช้ `EXPIRED` | บันทึกกฎเวลาแล้ว; ความถี่ ความหน่วงที่ยอมรับได้ และรายละเอียด worker/catch-up ยังเปิด ไม่ใส่ตัวเลขเอง |
| T74-D07: การยืนยันเดิมของใบสมัครเดียวกัน exact Retry คืนผลเดิม; พบแถวสมาชิกเดิม ACTIVE/INACTIVE/LEFT/REMOVED ปฏิเสธการยืนยันใหม่ คงข้อมูล/ประวัติทั้งหมด | บันทึกคำยืนยันผู้ใช้แล้ว รอ Team Review; ไม่มี reactivation ใน MVP ไม่ถือเป็นคำถามที่ยังรอเลือกนโยบาย |

## Sprint 2 Sequence Diagrams

| ID / Diagram | Story / ขอบเขต | Contract / Decision ที่ต้องรู้ |
|---|---|---|
| [SD-06 ค้นหาและกรองชมรม](sequence/SD-06-search-clubs.md) | US-01 ค้นหาชื่อ/หมวดหมู่/แท็ก และเปิดรายละเอียด | Public read; ยังไม่มี search Endpoint/Response Contract; กติกาจับคู่/ตัวกรองรอ US-01 §10 |
| [SD-05 ส่งใบสมัคร](sequence/SD-05-submit-application.md) | US-03 งานยกยอดจาก Sprint 1 | POST ตาม API §11 มี Contract แต่ยังไม่มี Implementation; atomic 4 ตาราง ไม่สร้างสมาชิก |
| [SD-07 สถานะและประวัติใบสมัครของตน](sequence/SD-07-application-history.md) | US-04 รายการ/รายละเอียด/ประวัติ | ใช้ D01: มีทรัพยากรแต่ไม่มีสิทธิ์ 403/ไม่มีทรัพยากร 404; URI ถูกจองไว้ แต่ DTO/Mapping ตาม D04 ยังขาด |
| [SD-08 กรรมการเปิดอ่านใบสมัคร](sequence/SD-08-committee-application-review.md) | US-09 read-only | Actual resource scope/Assignment/วาระ/self-review ทุกสถานะ; ไม่กำหนด Endpoint; อ่านไม่เริ่ม UNDER_REVIEW; INTERVIEW นอก MVP |
| [SD-10 ยืนยันและสละสิทธิ์](sequence/SD-10-confirm-decline-membership.md) | US-05: ยืนยัน/สละใหม่ และอ่านผลเดิมของ Retry แยกภาพ | D05 คืนผลเดิมแบบไม่เขียน/สวนทาง 409; D06 ช่วงเวลาของ Action ใหม่; D07 พบแถวสมาชิกเดิมทุกสถานะปฏิเสธการยืนยันใหม่ ไม่มี MVP reactivation |
| [SD-11 หมดเวลาตอบรับอัตโนมัติ](sequence/SD-11-expire-offers.md) | US-05 งานระบบ ไม่พึ่งการเปิดหน้า | EXPIRED แยก DECLINED; UI “สละสิทธิ์ (หมดเวลาตอบรับ)”; worker/catch-up/ความหน่วงยังรอ D06 ไม่มี public Endpoint ใหม่ |
| [SD-12 Dashboard ส่วนกลาง](sequence/SD-12-admin-dashboard.md) | US-10 สถิติรวมสำหรับ ADMIN | T74-D08 หน่วยนับ/ปี/ภาค/หลายรอบ; ไม่ใช่สิทธิ์อ่านข้อมูลผู้สมัครรายคน |

## Dependency ที่ยังต้องจัด Scope ก่อนพัฒนา

| Diagram | สถานะ / ขอบเขต |
|---|---|
| [SD-09 บันทึกผลภายในและประกาศผล](sequence/SD-09-selection-results.md) | แยกสองภาพและสอง Action; มี [S2-DECISION-DRAFT](../stories/sprint2/selection-results-draft.md#s2-decision-draft) / [S2-PUBLICATION-DRAFT](../stories/sprint2/selection-results-draft.md#s2-publication-draft) โดยยืนยันชนิตว์นันท์เป็น Scope Owner แล้ว FE/BE รอมอบหมายชื่อ; Scope/API/audit ยังต้อง formal Review ตาม T74-D03/04 **ไม่รวมเข้า US-09 และไม่ถือว่าอนุมัติ Sprint 2 แล้ว**; ใช้ D02 ที่ผู้ใช้เลือกให้ตัดสินตรงจาก SUBMITTED ได้หลังปิดรับ |

ภาพที่ยังไม่มี Contract ใช้ชื่อ Action เชิงตรรกะแทนการตั้ง HTTP path, DTO หรือชื่อคลาสใหม่ เส้นทางสำเร็จในภาพต้องผ่าน Preconditions ของ State/Permission Matrix เสมอ รายละเอียดปฏิเสธ คำขอซ้ำ และ race อ้างอิง QA Scenarios ไม่ได้ถูกยกเว้นเพียงเพราะไม่วาดทุกทางเลือกในภาพ

## เอกสารหลักที่ต้องอ่านคู่กัน

- [Task74 Sprint 2 Analysis and Review Packet](../architecture/task74-sprint2-analysis.md): Scope, Traceability, QA Scenarios, AC/DoD และ Review/Approval Ledger
- [Business Flow](../architecture/system-architecture.md#s2-business-flow), [State Machine / Transition Table](../architecture/system-architecture.md#s2-application-state-machine), [Rule Index](../architecture/system-architecture.md#s2-business-rules) และ [Decision Log](../architecture/system-architecture.md#s2-decision-log)
- [Permission Matrix](../security/permission-matrix.md#s2-permission-matrix): USER/ADMIN แยก club Assignment COMMITTEE/PRESIDENT; ไม่มี ADMIN override
- [API Contract](../api/API_v1.md#81-task74-sprint-2-contract-handoff--draft--pending-review), [Main OpenAPI](../api/openapi.yaml), [Recruitment OpenAPI](../api/rounds.openapi.yaml) และ [Schema ที่มีผล](../../backend/src/main/resources/db/migration/V1__init_schema.sql)

## Sequence Diagrams ของ Sprint 1 / Foundation

| Diagram | ขอบเขต |
|---|---|
| [SD-00 Login ผ่าน TU API](sequence/SD-00-login-tu-api.md) | Authentication / Session |
| [SD-01 โปรไฟล์ชมรม](sequence/SD-01-club-profile.md) | US-06; editor GET ในภาพยังไม่ Implement ปัจจุบันใช้ Public profile เติมฟอร์ม |
| [SD-02 รอบรับสมัคร](sequence/SD-02-recruitment-round.md) | US-07; เผยแพร่ประกาศรับสมัครแยกจากประกาศผลคัดเลือก |
| [SD-03 คำถามคัดเลือก](sequence/SD-03-selection-questions.md) | US-08; แก้เฉพาะ DRAFT ที่ไม่มีใบสมัคร |
| [SD-04 รายละเอียดสาธารณะ](sequence/SD-04-public-club-data.md) | US-02; แสดงชมรมและรอบที่เปิดรับตาม Contract ปัจจุบัน |

ดู [Architecture diagram แบบแก้ไขได้](../architecture/TU-ClubHub-Architecture.drawio) สำหรับภาพโครงสร้างระบบ ไม่ใช้แทน Sequence Diagram ของแต่ละ Workflow
