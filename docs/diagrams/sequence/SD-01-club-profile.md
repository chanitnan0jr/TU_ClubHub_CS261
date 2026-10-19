# SD-01: อ่านและอัปเดตโปรไฟล์ชมรม

อ้างอิง: [US-06](../../stories/US-06.md) · [API Contract](../../api/API_v1.md)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ: ภาพ Happy path ตามแบบ; GET ที่ฟอร์มเรียกยังไม่มี handler; PUT มีแล้ว แต่หน้าฟอร์มยังไม่ได้เชื่อมเข้าหน้าหลักของแอป

ย่อ Service ไว้ใน REST API Controller; DAO แทน ClubRepository และ ClubProfileQueryRepository

```mermaid
---
title: "SD-01: อ่านและอัปเดตโปรไฟล์ชมรม"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL

    V->>C: ขอข้อมูลชมรมสำหรับหน้าแก้ไข
    C->>API: GET /api/v1/clubs/{clubId}
    API->>DAO: อ่านโปรไฟล์ชมรมตาม clubId
    DAO->>DB: อ่านข้อมูลชมรมและข้อมูลประกอบ
    DB-->>DAO: ข้อมูลชมรม
    DAO-->>API: ข้อมูลโปรไฟล์ชมรม
    API-->>C: 200 OK + ClubResponseDto
    C-->>V: แสดงข้อมูลชมรมในฟอร์ม

    V->>C: บันทึกข้อมูลโปรไฟล์ที่แก้ไข
    C->>API: PUT /api/v1/clubs/{clubId}<br/>ClubUpdateRequestDto
    API->>DAO: บันทึกโปรไฟล์ชมรม
    DAO->>DB: อัปเดตโปรไฟล์และอ่านข้อมูลชมรม
    DB-->>DAO: ข้อมูลชมรมที่อัปเดต
    DAO-->>API: ข้อมูลโปรไฟล์ที่บันทึกแล้ว
    API-->>C: 200 OK + ClubResponseDto
    C-->>V: แจ้งว่าบันทึกโปรไฟล์สำเร็จ
```

กรรมการชมรม Login ตาม [SD-00](SD-00-login-tu-api.md) แล้ว คำขอบันทึกส่ง SESSION cookie และ X-CSRF-TOKEN ส่วน API อ่านโปรไฟล์สาธารณะที่มีอยู่ดู [SD-04](SD-04-public-club-data.md)
