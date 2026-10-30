# SD-05: ส่งใบสมัครเข้าชมรม

อ้างอิง: [US-03 งานยกยอด Sprint 1](../../stories/sprint1/US-03.md) · [API Contract §11](../../api/API_v1.md#11-application-submission) · [OpenAPI](../../api/openapi.yaml) · [Task74 Sprint 2 Artefact](../../architecture/task74-sprint2-analysis.md)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ 27 ต.ค. 2026: **Draft / Pending Review สำหรับการส่งต่องาน Task74** กำหนด API ส่งใบสมัครใน API Contract §11 และ openapi.yaml แล้ว มี DynamicApplicationForm เป็น UI ต้นแบบ แต่ยังไม่เชื่อมเข้าหน้าหลัก ไม่มี Submission API client และ endpoint ใน Backend การแก้ Diagram ไม่ใช่หลักฐานว่า Implement หรือผ่าน Review แล้ว

ย่อ Service ไว้ใน REST API Controller; DAO แทน Repository สำหรับใบสมัครตามแบบ

```mermaid
---
title: "SD-05: ส่งใบสมัครเข้าชมรม"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL

    V->>C: ส่งใบสมัครพร้อมคำตอบและลิงก์เอกสาร
    C->>API: POST /api/v1/rounds/{roundId}/applications<br/>motivation, answers, links + SESSION + X-CSRF-TOKEN
    API->>API: ตรวจ Session/CSRF และใช้ผู้สมัครจาก Session
    API->>DAO: เริ่ม Transaction และ Lock รอบจาก roundId<br/>อ่านชมรม คำถาม และข้อมูล eligibility
    DAO->>DB: Lock/อ่านรอบและข้อมูลที่เกี่ยวข้อง
    DB-->>DAO: ข้อมูลรอบ ชมรม คำถาม และ eligibility
    DAO-->>API: ข้อมูลสำหรับตรวจเงื่อนไขปัจจุบัน
    API->>API: ใช้เวลา Backend หลังได้ Lock<br/>ตรวจช่วงเปิดรับ/ปิดจริง คำตอบ ลิงก์ duplicate และเพดานสมาชิก
    API->>DAO: บันทึกใบสมัครพร้อมคำตอบ ลิงก์ และประวัติสถานะ
    DAO->>DB: บันทึกลง applications,<br/>application_answers, application_links<br/>และ application_status_history
    DB-->>DAO: ข้อมูลใบสมัครที่บันทึก
    DAO->>DB: Commit Transaction ทั้งชุด
    DB-->>DAO: Commit สำเร็จ
    DAO-->>API: รหัสใบสมัครและสถานะ SUBMITTED
    API-->>C: 201 Created + ApplicationSubmission<br/>Location: /api/v1/me/applications/{id}
    C-->>V: แจ้งว่าส่งใบสมัครสำเร็จและแสดงสถานะรอพิจารณา
```

ตาม Contract การ Lock/ตรวจเงื่อนไขและบันทึกทั้ง 4 ตารางอยู่ใน Transaction เดียว ตอบ 201 หลัง Commit และ Rollback ทั้งชุดเมื่อบันทึกล้มเหลว ลิงก์เอกสารแต่ละรายการเก็บเป็น 1 แถวใน `application_links` โดยใช้คอลัมน์ `label`, `url` และ `display_order` การส่งใบสมัครไม่สร้างสมาชิกภาพ

นักศึกษา Login ผ่าน TU API ตาม [SD-00](SD-00-login-tu-api.md) แล้ว คำขอส่ง SESSION cookie และ X-CSRF-TOKEN

Backend หา `clubId` จากรอบและ `applicant_id` จาก Session ไม่รับสองค่านี้จาก Client เปิดฟอร์มไม่จองสิทธิ์สมัคร ต้องตรวจ `opens_at <= now < closes_at` และ `closed_at IS NULL` ตอนบันทึกตาม Contract หากปิดรับระหว่างกรอกให้ปฏิเสธโดยไม่บันทึกบางส่วน การส่งซ้ำตอบ HTTP `409`, `code: RESOURCE_CONFLICT`, `reason: APPLICATION_ALREADY_EXISTS` ไม่ใช่ replay สำเร็จ

การอ่านประวัติที่ `Location` ยังรอ Contract/Implementation ของ US-04 โดย [T74-D01](../../architecture/system-architecture.md#t74-d01) บันทึกข้อสรุปผู้ใช้แล้วว่า private resource มีอยู่แต่ไม่มีสิทธิ์เป็น 403 และไม่พบจริงเป็น 404 ส่วนการพิจารณา ประกาศผล ยืนยัน และหมดเวลาแยกจาก Diagram นี้ ดู [State Machine](../../architecture/system-architecture.md#s2-application-state-machine), [Business Rules](../../architecture/system-architecture.md#s2-business-rules) และ [Permission Matrix](../../security/permission-matrix.md#s2-permission-matrix)
