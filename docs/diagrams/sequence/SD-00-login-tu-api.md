# SD-00: เข้าสู่ระบบผ่าน TU API

อ้างอิง: [API Contract](../../api/API_v1.md)

<!-- ponytail: show successful exchanges between layers only. -->

ภาพ Happy path เมื่อใช้ TU API จริง โดยย่อ Service และ TuAuthClient ไว้ใน REST API Controller; DAO แทน UserAccountRepository

```mermaid
---
title: "SD-00: เข้าสู่ระบบผ่าน TU API"
---
sequenceDiagram
    autonumber
    participant V as View
    participant C as Client-side Controller
    participant API as REST API Controller
    participant DAO as Data Access Object
    participant DB as Relational Database<br/>PostgreSQL
    participant TU as TU API

    V->>C: เข้าสู่ระบบด้วย username และ password
    C->>API: GET /api/v1/auth/csrf
    API-->>C: 200 OK + CSRF token
    C->>API: POST /api/v1/auth/login<br/>username, password, X-CSRF-TOKEN
    API->>TU: POST ไปยัง TU Authentication endpoint<br/>UserName, PassWord, Application-Key
    TU-->>API: status: true + ข้อมูลผู้ใช้ TU
    API->>DAO: อ่านและบันทึกบัญชีผู้ใช้จากข้อมูล TU
    DAO->>DB: อ่านและบันทึกข้อมูลใน users
    DB-->>DAO: ข้อมูลบัญชีผู้ใช้
    DAO-->>API: UserAccount
    API-->>C: 200 OK + user, csrf<br/>Set-Cookie: SESSION
    C->>API: GET /api/v1/auth/me<br/>SESSION cookie
    API-->>C: 200 OK + user (id, role)
    C-->>V: แสดงหน้าหลังเข้าสู่ระบบ
```

View คือหน้า Login, Client-side Controller คือ AuthContext และ REST API Controller คือ AuthController การเรียก API ที่ต้อง Login หลังจากนี้ใช้ SESSION cookie
