# SD-05: ส่งใบสมัครเข้าชมรม

อ้างอิง: [US-03](../../stories/US-03.md) · [API Contract §11](../../api/API_v1.md#11-application-submission) · [OpenAPI](../../api/openapi.yaml)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ: กำหนด API ส่งใบสมัครใน API Contract §11 และ openapi.yaml แล้ว แต่ยังไม่มีหน้าฟอร์ม API client และ endpoint ใน Backend

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
    C->>API: POST /api/v1/clubs/{clubId}/rounds/{roundId}/applications<br/>motivation, answers, links
    API->>DAO: บันทึกใบสมัครพร้อมคำตอบ ลิงก์ และประวัติสถานะ
    DAO->>DB: บันทึกลง applications,<br/>application_answers, application_links<br/>และ application_status_history
    DB-->>DAO: ข้อมูลใบสมัครที่บันทึก
    DAO-->>API: รหัสใบสมัครและสถานะ SUBMITTED
    API-->>C: 201 Created + ApplicationSubmission
    C-->>V: แจ้งว่าส่งใบสมัครสำเร็จและแสดงสถานะรอพิจารณา
```

API ล็อกแถวรอบรับสมัคร แล้วตรวจช่วงเวลาเปิดรับ คำตอบ ใบสมัครซ้ำ และเพดานสมาชิกภาพใน Transaction เดียวกับการบันทึก และตอบ 201 หลัง Commit เท่านั้น ลิงก์เอกสารแต่ละรายการเก็บเป็น 1 แถวใน application_links

นักศึกษา Login ผ่าน TU API ตาม [SD-00](SD-00-login-tu-api.md) แล้ว คำขอส่ง SESSION cookie และ X-CSRF-TOKEN
