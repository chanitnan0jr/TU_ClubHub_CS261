# SD-03: จัดการคำถามคัดเลือก

อ้างอิง: [US-08](../../stories/US-08.md) · [Recruitment API](../../api/rounds.openapi.yaml)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ: Backend รับคำถามพร้อมข้อมูลรอบผ่าน POST/PUT; ยังไม่มี API แยกรายคำถาม และ Frontend ยังไม่ได้เชื่อม API

ย่อ Service ไว้ใน REST API Controller; DAO แทน RecruitmentRoundRepository

```mermaid
---
title: "SD-03: จัดการคำถามคัดเลือก"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL

    V->>C: บันทึกชุดคำถามที่เพิ่ม แก้ไข ลบ หรือเรียงแล้ว
    C->>API: PUT /api/v1/clubs/{clubId}/rounds/{roundId}<br/>ข้อมูลรอบ questions และ version
    API->>DAO: บันทึกข้อมูลรอบและชุดคำถาม
    DAO->>DB: อัปเดตรอบรับสมัครและคำถาม
    DB-->>DAO: ข้อมูลรอบและคำถามที่บันทึก
    DAO-->>API: ข้อมูลรอบรับสมัคร
    API-->>C: 200 OK + RecruitmentRound
    C-->>V: แจ้งว่าบันทึกคำถามสำเร็จ
```

กรรมการชมรม Login ตาม [SD-00](SD-00-login-tu-api.md) แล้ว คำขอส่ง SESSION cookie และ X-CSRF-TOKEN กรณีสร้างรอบใหม่ให้ส่ง `questions` พร้อม POST ตาม [SD-02](SD-02-recruitment-round.md)
