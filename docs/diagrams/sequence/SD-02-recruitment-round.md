# SD-02: สร้าง แก้ไข เผยแพร่ และปิดรอบรับสมัคร

อ้างอิง: [US-07](../../stories/US-07.md) · [Recruitment API](../../api/rounds.openapi.yaml)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ: Backend รองรับทั้งสี่รายการแล้ว ส่วนหน้าจอยังต้องเชื่อม API

ย่อ Service ไว้ใน REST API Controller; DAO แทน RecruitmentRoundRepository

```mermaid
---
title: "SD-02: สร้าง แก้ไข เผยแพร่ และปิดรอบรับสมัคร"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL

    V->>C: สร้างรอบรับสมัคร
    C->>API: POST /api/v1/clubs/{clubId}/rounds<br/>ข้อมูลรอบและคำถาม
    API->>DAO: บันทึกรอบรับสมัครใหม่พร้อมคำถาม
    DAO->>DB: บันทึกรอบรับสมัครและคำถาม
    DB-->>DAO: ข้อมูลรอบที่สร้าง
    DAO-->>API: ข้อมูลรอบรับสมัคร
    API-->>C: 201 Created + RecruitmentRound
    C-->>V: แสดงรอบที่สร้าง

    V->>C: บันทึกข้อมูลรอบที่แก้ไข
    C->>API: PUT /api/v1/clubs/{clubId}/rounds/{roundId}<br/>ข้อมูลรอบ คำถาม และ version
    API->>DAO: บันทึกข้อมูลรอบและชุดคำถาม
    DAO->>DB: อัปเดตรอบรับสมัครและคำถาม
    DB-->>DAO: ข้อมูลรอบที่อัปเดต
    DAO-->>API: ข้อมูลรอบรับสมัคร
    API-->>C: 200 OK + RecruitmentRound
    C-->>V: แสดงรอบที่อัปเดต

    V->>C: เผยแพร่ประกาศรับสมัคร
    C->>API: PATCH /api/v1/clubs/{clubId}/rounds/{roundId}<br/>action: PUBLISH, version
    API->>DAO: บันทึกการเผยแพร่รอบรับสมัคร
    DAO->>DB: อัปเดตข้อมูลการเผยแพร่
    DB-->>DAO: ข้อมูลรอบที่เผยแพร่
    DAO-->>API: ข้อมูลรอบรับสมัคร
    API-->>C: 200 OK + RecruitmentRound
    C-->>V: แจ้งว่าเผยแพร่แล้ว

    V->>C: ปิดรับสมัคร
    C->>API: PATCH /api/v1/clubs/{clubId}/rounds/{roundId}<br/>action: CLOSE, version
    API->>DAO: บันทึกการปิดรอบรับสมัคร
    DAO->>DB: อัปเดตข้อมูลการปิดรับสมัคร
    DB-->>DAO: ข้อมูลรอบที่ปิดรับ
    DAO-->>API: ข้อมูลรอบรับสมัคร
    API-->>C: 200 OK + RecruitmentRound
    C-->>V: แจ้งว่าปิดรับสมัครแล้ว
```

กรรมการชมรม Login ตาม [SD-00](SD-00-login-tu-api.md) แล้ว ทุกคำขอส่ง SESSION cookie และ X-CSRF-TOKEN
