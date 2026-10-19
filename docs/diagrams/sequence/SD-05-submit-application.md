# SD-05: ส่งใบสมัครเข้าชมรม

อ้างอิง: [US-03](../../stories/US-03.md)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ: ภาพเป้าหมายตาม Story; ยังไม่มีหน้าฟอร์ม API client หรือ endpoint ส่งใบสมัคร

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
    C->>API: ส่งรอบที่สมัครและข้อมูลใบสมัคร
    API->>DAO: บันทึกใบสมัครพร้อมข้อมูลประกอบ
    DAO->>DB: บันทึกใบสมัคร คำตอบ ลิงก์<br/>และประวัติสถานะ SUBMITTED
    DB-->>DAO: ข้อมูลใบสมัครที่บันทึก
    DAO-->>API: รหัสใบสมัครและสถานะ SUBMITTED
    API-->>C: รหัสใบสมัครและสถานะ SUBMITTED
    C-->>V: แจ้งว่าส่งใบสมัครสำเร็จและแสดงสถานะรอพิจารณา
```

นักศึกษา Login ผ่าน TU API ตาม [SD-00](SD-00-login-tu-api.md) แล้ว คำขอส่ง SESSION cookie และ X-CSRF-TOKEN
