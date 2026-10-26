# SD-04: อ่านข้อมูลชมรมและรอบรับสมัครสาธารณะ

อ้างอิง: [US-02](../../stories/sprint1/US-02.md) · [Public Club API](../../api/API_v1.md)

<!-- ponytail: show successful exchanges between layers only. -->

สถานะ 27 ต.ค. 2026: API สองรายการนี้มีแล้วและไม่ต้อง Login; หน้า `/clubs/:clubId` เชื่อมข้อมูลจากทั้งสอง API แล้ว ยังไม่มี API รายการ/ค้นหาชมรม การรับสมัครยังรอ Submission endpoint ไม่ใช่การตรวจรับ Flow ครบทุกขั้นตอน

ย่อ Service ไว้ใน REST API Controller; DAO แทน ClubRepository และ ClubProfileQueryRepository

```mermaid
---
title: "SD-04: อ่านข้อมูลชมรมและรอบรับสมัครสาธารณะ"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL

    V->>C: ขอรายละเอียดชมรม
    C->>API: GET /api/v1/public/clubs/{id}
    API->>DAO: อ่านโปรไฟล์ชมรมสาธารณะ
    DAO->>DB: อ่านข้อมูลชมรม หมวดหมู่ และแท็ก
    DB-->>DAO: ข้อมูลโปรไฟล์ชมรม
    DAO-->>API: ข้อมูลชมรมสาธารณะ
    API-->>C: 200 OK + PublicClubProfileDto
    C-->>V: แสดงรายละเอียดชมรม

    V->>C: ขอรอบรับสมัครที่กำลังเปิด
    C->>API: GET /api/v1/public/clubs/{id}/recruitment-rounds<br/>page, size
    API->>DAO: อ่านรอบที่เปิดรับตามหน้าที่ขอ
    DAO->>DB: อ่านรอบที่เปิดรับและจำนวนทั้งหมด
    DB-->>DAO: รายการรอบรับสมัครและจำนวน
    DAO-->>API: ข้อมูลรอบรับสมัครสำหรับแบ่งหน้า
    API-->>C: 200 OK + items, page
    C-->>V: แสดงรอบที่เปิดรับ
```
