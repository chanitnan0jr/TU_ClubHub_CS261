# เอกสารข้อกำหนดกรณีทดสอบการจัดการข้อมูลโปรไฟล์ชมรม (Club Profile Test Cases Specification)

- **รหัสงาน (Task ID):** `Task08:U06-QA-1`
- **User Story:** `US-06 (Club Profile Management & Committee Authorization)`
- **Success Criteria:** `SC-06 (การควบคุมสิทธิ์และเงื่อนไขชมรม)`, `SC-02 (การแสดงผลและปรับปรุงข้อมูลชมรม)`
- **ผู้รับผิดชอบ (QA/Tester):** สิรวิชญ์ กฤดาธิการวุฒิ (6809660027), QA / Tester & DevOps / Scrum Master
- **ผู้ร่วมทบทวน (System Analyst):** ชนิตว์นันท์ พาณิชพัฒน์ (6809490011), System Analyst / PO
- **Sprint:** Sprint 1
- **วันที่จัดทำ:** 17 ตุลาคม พ.ศ. 2569
- **สถานะเอกสาร:** **READY FOR REVIEW** 📋

---

## 1. บทนำและขอบเขตการทดสอบ (Introduction & Scope)

เอกสารฉบับนี้จัดทำขึ้นเพื่อกำหนดและออกแบบกรณีทดสอบ (Test Case Specification) สำหรับงาน **`Task08:U06-QA-1`** ภายใต้ User Story **`US-06: จัดการข้อมูลโปรไฟล์ชมรม`** เพื่อใช้เป็นเกณฑ์มาตรฐานในการตรวจสอบความถูกต้องของระบบ ทั้งในระดับ API Endpoint (`PUT /api/v1/clubs/{clubId}`) และ UI Form Validation บน Frontend

### ขอบเขตการทดสอบครอบคลุม:
1. **Positive Cases:** การแก้ไขข้อมูลโปรไฟล์สำเร็จด้วยข้อมูลที่ถูกต้องครบถ้วน ทั้งข้อมูลพื้นฐาน รูปภาพ และช่องทางติดต่อ
2. **Negative Cases (Data Validation):** การตรวจสอบรูปแบบข้อมูล (Validation Rules) เช่น ชื่อ/คำอธิบายว่างเปล่า, ความยาวเกินกำหนด, อีเมลผิดรูปแบบ
3. **Negative & Edge Cases (Security & Insecure URLs):** การตรวจสอบความปลอดภัยของ URL รูปภาพและ Social Media (บังคับ HTTPS, ตรวจจับโดเมนที่ถูกต้อง, สกัดกั้น Credentials/User-info ใน URL)
4. **Negative Cases (Authorization & Security):** การควบคุมสิทธิ์ระดับชมรม (Club-level Committee Authorization), การตรวจสอบสถานะการเข้าสู่ระบบ และการป้องกัน CSRF Token
5. **Edge Cases (Resource & ID Handling):** การจัดการรหัสชมรมผิดรูปแบบ (Non-decimal, Negative ID), การไม่พบข้อมูลชมรม (404 Not Found), และการล้างข้อมูลฟิลด์ไม่บังคับ (Nullable Fields)
6. **System Fault Tolerance & Contract:** การจัดการข้อผิดพลาดตามมาตรฐาน **RFC 7807 Problem Details** และความเสถียรเมื่อฐานข้อมูลขัดข้อง (503 Service Unavailable)

---

## 2. กฎการตรวจสอบข้อมูล (Validation Rules Matrix)

| ฟิลด์ (Field) | ชนิดข้อมูล | เงื่อนไขความถูกต้อง (Validation Rules) | ผลเมื่อไม่ผ่านเงื่อนไข |
|---|---|---|---|
| `name` | String (Required) | ห้ามว่าง (NotBlank), สูงสุด 200 ตัวอักษร | `400 VALIDATION_FAILED` (`name`) |
| `description` | String (Required) | ห้ามว่าง (NotBlank) | `400 VALIDATION_FAILED` (`description`) |
| `objectives` | String (Optional) | ข้อความทั่วไป (เป็น `null` ได้เพื่อล้างค่า) | - |
| `contactUrl` | String (Optional) | ต้องเป็น HTTPS URL ที่มีโครงสร้างถูกต้อง ห้ามมี User-info/Credentials | `400 VALIDATION_FAILED` (`contactUrl`) |
| `facebookUrl` | String (Optional) | ต้องเป็น HTTPS URL และ Host ต้องเป็น `facebook.com`, `www.facebook.com`, `m.facebook.com` เท่านั้น (พอร์ต 443 หรือ Default) | `400 VALIDATION_FAILED` (`facebookUrl`) |
| `instagramUrl` | String (Optional) | ต้องเป็น HTTPS URL และ Host ต้องเป็น `instagram.com`, `www.instagram.com` เท่านั้น (พอร์ต 443 หรือ Default) | `400 VALIDATION_FAILED` (`instagramUrl`) |
| `contactEmail` | String (Optional) | ต้องเป็นรูปแบบอีเมลตามมาตรฐาน RFC (`@Email`) | `400 VALIDATION_FAILED` (`contactEmail`) |
| `imageUrl` | String (Optional) | ต้องเป็น HTTPS URL ที่มีโครงสร้างถูกต้อง ไม่มี User-info | `400 VALIDATION_FAILED` (`imageUrl`) |
| `bannerUrl` | String (Optional) | ต้องเป็น HTTPS URL ที่มีโครงสร้างถูกต้อง ไม่มี User-info | `400 VALIDATION_FAILED` (`bannerUrl`) |
| `clubId` | Long (Path) | ตัวเลขฐานสิบที่เป็นบวกเท่านั้น (`[0-9]+`) | `400 INVALID_RESOURCE_ID` |

> **ข้อกำหนดฟิลด์สงวน (Immutable Fields):** ฟิลด์ `categoryId`, `status`, `affiliationLevel`, `affiliationName` และความสัมพันธ์ของ Tags/Rounds **ไม่อนุญาตให้แก้ไขผ่าน Endpoint นี้** โดยระบบจะต้องรักษาค่าเดิมไว้อย่างปลอดภัยเสมอ

---

## 3. รายละเอียดกรณีทดสอบ (Test Cases: TC-06-01 ถึง TC-06-07)

### **TC-06-01: แก้ไขชื่อ คำอธิบาย และวัตถุประสงค์สำเร็จ (Positive Case)**
- **คำอธิบาย:** กรรมการหรือประธานชมรมแก้ไขข้อมูลพื้นฐานของชมรมที่ตนดูแลด้วยข้อมูลที่ถูกต้อง
- **เงื่อนไขก่อนเริ่ม (Preconditions):**
  1. ผู้ใช้เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ `COMMITTEE` หรือ `PRESIDENT` ของชมรมเป้าหมาย (เช่น `clubId = 41`) ในวาระปัจจุบัน
  2. มี CSRF Token ที่ถูกต้องแนบมาใน Request Header (`X-CSRF-TOKEN`)
- **ข้อมูลนำเข้า (Request Payload):**
  ```json
  {
    "name": "ชมรมดนตรีสากล มหาวิทยาลัยธรรมศาสตร์ (Updated)",
    "description": "ชมรมสำหรับผู้รักในเสียงดนตรีและศิลปะการแสดงร่วมสมัย",
    "objectives": "เพื่อส่งเสริมทักษะดนตรีสากลและสร้างสรรค์กิจกรรมดนตรีในมหาวิทยาลัย"
  }
  ```
- **ขั้นตอนการทดสอบ (Test Steps):**
  1. ส่งคำขอ `PUT /api/v1/clubs/41` พร้อม Request Payload และ CSRF Token
  2. ตรวจสอบ HTTP Status Code ใน Response
  3. ตรวจสอบข้อมูลใน Response Body และตรวจสอบการบันทึกลงฐานข้อมูล
- **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  - ได้รับ HTTP Status `200 OK`
  - Response Body ส่งกลับ `ClubResponseDto` ที่มี `name`, `description`, `objectives` ตรงตามที่แก้ไข
  - ข้อมูลหมวดหมู่ (`category`), แท็ก (`tags`), และรอบรับสมัครที่เผยแพร่แล้ว (`recruitmentRounds`) ถูกรวมส่งกลับมาครบถ้วน
  - ข้อมูลเดิมที่ไม่ได้แก้ไข (เช่น `status: "ACTIVE"`) ยังคงค่าเดิม ไม่ถูกลบล้าง

---

### **TC-06-02: ระบุ URL รูปภาพโปรไฟล์และแบนเนอร์ HTTPS ที่ถูกต้อง (Positive Case)**
- **คำอธิบาย:** กรรมการชมรมระบุ URL ของรูปโปรไฟล์ (`imageUrl`) และรูปภาพแบนเนอร์ (`bannerUrl`) เป็น HTTPS ที่สมบูรณ์
- **เงื่อนไขก่อนเริ่ม (Preconditions):**
  1. ผู้ใช้เข้าสู่ระบบด้วยสิทธิ์กรรมการของชมรมเป้าหมาย
  2. มี CSRF Token ถูกต้อง
- **ข้อมูลนำเข้า (Request Payload):**
  ```json
  {
    "name": "ชมรมดนตรีสากล",
    "description": "ชมรมสำหรับผู้รักเสียงดนตรี",
    "imageUrl": "https://cdn.tuclubhub.com/clubs/41/logo.png",
    "bannerUrl": "https://cdn.tuclubhub.com/clubs/41/banner-2026.jpg"
  }
  ```
- **ขั้นตอนการทดสอบ (Test Steps):**
  1. ส่งคำขอ `PUT /api/v1/clubs/41`
  2. ตรวจสอบ Response Body
- **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  - ได้รับ HTTP Status `200 OK`
  - ฟิลด์ `imageUrl` และ `bannerUrl` ใน Response Body แสดงลิงก์ HTTPS ตรงตามที่ส่งไป
  - ฝั่ง Frontend สามารถแสดงผลรูปภาพโปรไฟล์และแบนเนอร์ใหม่ได้ถูกต้อง ไม่เกิด Broken Image

---

### **TC-06-03: ระบุ URL รูปภาพผิดรูปแบบหรือไม่ใช่ HTTPS (Negative & Edge Cases)**
- **คำอธิบาย:** ตรวจสอบระบบความปลอดภัยไม่ยอมรับ URL รูปภาพที่ไม่ปลอดภัย (Insecure / Malformed URLs)
- **เงื่อนไขก่อนเริ่ม (Preconditions):** ผู้ใช้มีสิทธิ์กรรมการของชมรม
- **ชุดข้อมูลทดสอบ (Sub-cases):**
  - **3A (Non-HTTPS / Plain HTTP):** `"imageUrl": "http://example.com/logo.png"`
  - **3B (Invalid Protocol):** `"imageUrl": "ftp://example.com/logo.png"`
  - **3C (Embedded Credentials / User-info):** `"imageUrl": "https://admin:secret@images.com/logo.png"`
  - **3D (Malformed URL String):** `"bannerUrl": "ht!tp://not-a-valid-url"`
  - **3E (Invalid Port):** `"imageUrl": "https://example.com:99999/logo.png"`
- **ขั้นตอนการทดสอบ (Test Steps):**
  1. ส่งคำขอ `PUT /api/v1/clubs/41` ด้วยแต่ละชุดข้อมูลข้างต้น
- **ผลลัพธ์ที่คาดหวัง (Expected Results):**
  - ได้รับ HTTP Status `400 Bad Request`
  - Header `Content-Type: application/problem+json`
  - Response Body ตามมาตรฐาน RFC 7807:
    - `code`: `"VALIDATION_FAILED"`
    - `fieldErrors`: ระบุฟิลด์ (`imageUrl` หรือ `bannerUrl`) พร้อมข้อความผิดพลาดที่ชัดเจน เช่น `"Must be a valid HTTPS URL without credentials"`
  - ฐานข้อมูลต้องไม่มีการเปลี่ยนแปลงใดๆ (Rollback/Reject)

---

### **TC-06-04: ตรวจสอบช่องทาง Social Media และ Email (Positive & Negative Cases)**
- **คำอธิบาย:** ตรวจสอบความถูกต้องของลิงก์ Facebook, Instagram และรูปแบบอีเมลติดต่อ
- **ชุดข้อมูลทดสอบ (Sub-cases):**
  - **4A (Valid Social & Email - Positive):**
    - `facebookUrl`: `"https://www.facebook.com/tuorchestra"`
    - `instagramUrl`: `"https://instagram.com/tu_orchestra"`
    - `contactEmail`: `"music.club@dome.tu.ac.th"`
    - *ผลลัพธ์ที่คาดหวัง:* `200 OK` ข้อมูลถูกบันทึกสำเร็จ
  - **4B (Invalid Facebook Domain - Negative):**
    - `facebookUrl`: `"https://phishing-facebook.com/tuorchestra"`
    - *ผลลัพธ์ที่คาดหวัง:* `400 VALIDATION_FAILED` บนฟิลด์ `facebookUrl` (`"URL must belong to the correct social platform"`)
  - **4C (Invalid Instagram Domain - Negative):**
    - `instagramUrl`: `"https://twitter.com/tuorchestra"`
    - *ผลลัพธ์ที่คาดหวัง:* `400 VALIDATION_FAILED` บนฟิลด์ `instagramUrl`
  - **4D (Non-standard Port on Social URL - Negative):**
    - `facebookUrl`: `"https://facebook.com:8443/tuorchestra"`
    - *ผลลัพธ์ที่คาดหวัง:* `400 VALIDATION_FAILED` (`"Social media URL must use the default HTTPS port"`)
  - **4E (Invalid Email Format - Negative):**
    - `contactEmail`: `"invalid-email-format"` หรือ `"club@"`
    - *ผลลัพธ์ที่คาดหวัง:* `400 VALIDATION_FAILED` บนฟิลด์ `contactEmail`

---

### **TC-06-05: ตรวจสอบการควบคุมสิทธิ์และผู้ไม่มีสิทธิ์แก้ไข (Security & Authorization Cases)**
- **คำอธิบาย:** ป้องกันผู้ใช้ที่ไม่ได้รับอนุญาต หรือผู้ใช้ที่ไม่มีสิทธิ์ในชมรมนั้น ทำการแก้ไขข้อมูล
- **ชุดข้อมูลทดสอบ (Sub-cases):**
  - **5A (Unauthenticated User):** ผู้ใช้ไม่มี Session หรือ Session หมดอายุ
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `401 Unauthorized`, `code: "AUTHENTICATION_REQUIRED"`
  - **5B (Ordinary Student Member):** สมาชิกทั่วไปของชมรมที่ไม่มีตำแหน่งกรรมการ
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `403 Forbidden`, `code: "ACCESS_DENIED"`
  - **5C (Committee of Another Club):** กรรมการของชมรมอื่น (เช่น กรรมการชมรม 42 พยายามแก้ชมรม 41)
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `403 Forbidden`, `code: "ACCESS_DENIED"` (Zero Cross-Club Privilege Escalation)
  - **5D (Expired / Revoked Committee):** กรรมการที่พ้นวาระ หรือถูกสั่งระงับสิทธิ์ (`REVOKED`)
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `403 Forbidden`, `code: "ACCESS_DENIED"`
  - **5E (Missing CSRF Token):** คำขอ PUT โดยไม่แนบ CSRF Token
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `403 Forbidden`, `code: "CSRF_INVALID"`

---

### **TC-06-06: รหัสชมรมผิดรูปแบบหรือไม่พบข้อมูลชมรม (Edge Cases - ID Handling)**
- **คำอธิบาย:** ทดสอบพฤติกรรมของระบบเมื่อระบุ `clubId` ไม่ถูกต้อง หรือไม่พบในระบบ
- **ชุดข้อมูลทดสอบ (Sub-cases):**
  - **6A (Non-decimal ID):** ส่งคำขอไปที่ `PUT /api/v1/clubs/abc`
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `400 Bad Request`, `code: "INVALID_RESOURCE_ID"`, `detail: "clubId must be a valid decimal ID."`
  - **6B (Negative ID):** ส่งคำขอไปที่ `PUT /api/v1/clubs/-1`
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `400 Bad Request`, `code: "INVALID_RESOURCE_ID"`
  - **6C (Club Not Found):** กรรมการส่งคำขอไปที่ `PUT /api/v1/clubs/999999` (ID ที่ไม่มีในระบบ)
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `404 Not Found`, `code: "CLUB_NOT_FOUND"`, `detail: "No club exists for this ID."`
  - **6D (Missing Path Variable):** ส่งคำขอไปที่ `PUT /api/v1/clubs/`
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `404 Not Found` (Unmatched Route Handler)

---

### **TC-06-07: ล้างข้อมูลฟิลด์ไม่บังคับและข้อผิดพลาดจากระบบ (Edge & System Error Cases)**
- **คำอธิบาย:** ทดสอบการล้างค่าฟิลด์ทางเลือก (Nullable fields) และการจัดการข้อผิดพลาดเมื่อระบบขัดข้อง
- **ชุดข้อมูลทดสอบ (Sub-cases):**
  - **7A (Optional Fields Nullification):**
    - กรรมการส่งค่าฟิลด์ทางเลือกเป็น `null` เพื่อลบข้อมูลเดิม:
      ```json
      {
        "name": "ชมรมดนตรีสากล",
        "description": "คำอธิบายชมรม",
        "contactUrl": null,
        "facebookUrl": null,
        "instagramUrl": null,
        "contactEmail": null,
        "imageUrl": null,
        "bannerUrl": null
      }
      ```
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `200 OK`, ฟิลด์ทางเลือกถูกล้างค่าเป็น `null` สมบูรณ์ โดยที่ฟิลด์สงวน (`categoryId`, `status`, `affiliationLevel`) ไม่ได้รับผลกระทบ
  - **7B (Database Dependency Failure / Downtime):**
    - จำลองสถานการณ์ฐานข้อมูล PostgreSQL ไม่ตอบสนอง (Connection Timeout / Failure)
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `503 Service Unavailable`, `code: "SERVICE_UNAVAILABLE"`, `detail: "The database is temporarily unavailable."` ปราศจากการรั่วไหลของ SQL Exception หรือ Stack Trace
  - **7C (Unsupported HTTP Method):**
    - ส่งคำขอ `PATCH /api/v1/clubs/41` หรือ `DELETE /api/v1/clubs/41`
    - *ผลลัพธ์ที่คาดหวัง:* HTTP `405 Method Not Allowed`, `code: "METHOD_NOT_ALLOWED"`, Header มี `Allow: GET, PUT`

---

## 4. เมทริกซ์ความครอบคลุมของการทดสอบ (Traceability Matrix)

| รหัสทดสอบ | เงื่อนไข / สถานการณ์ที่ทดสอบ | หมวดหมู่ | HTTP Status Code | Stable Error Code | ระดับการทดสอบ (Test Layer) |
|:---:|---|:---:|:---:|:---:|:---:|
| **TC-06-01** | แก้ไขชื่อ คำอธิบาย วัตถุประสงค์สำเร็จ | Positive | `200 OK` | - | Unit, WebMvc, E2E |
| **TC-06-02** | ระบุ URL รูปภาพโปรไฟล์และแบนเนอร์ HTTPS | Positive | `200 OK` | - | Unit, WebMvc, E2E |
| **TC-06-03** | URL รูปภาพไม่ใช่ HTTPS / มี Credentials / ผิดรูปแบบ | Negative / Edge | `400 Bad Request` | `VALIDATION_FAILED` | Unit, WebMvc, E2E |
| **TC-06-04** | ตรวจสอบโดเมน Facebook / Instagram / Email Format | Positive & Negative | `200 OK` / `400 Bad Request` | `VALIDATION_FAILED` | Unit, WebMvc, E2E |
| **TC-06-05** | ผู้ไม่มีสิทธิ์แก้ไข (Unauth, Non-committee, No CSRF) | Security | `401` / `403` | `AUTHENTICATION_REQUIRED`, `ACCESS_DENIED`, `CSRF_INVALID` | WebMvc, Integration |
| **TC-06-06** | `clubId` ผิดรูปแบบ (abc, -1) หรือไม่พบชมรม (999999) | Edge | `400` / `404` | `INVALID_RESOURCE_ID`, `CLUB_NOT_FOUND` | WebMvc, Integration |
| **TC-06-07** | ล้างค่าฟิลด์ทางเลือก (null) / ระบบฐานข้อมูลล่ม | Edge / System | `200` / `503` / `405` | `SERVICE_UNAVAILABLE`, `METHOD_NOT_ALLOWED` | Unit, WebMvc, Integration |

---

## 5. การตรวจสอบความสอดคล้องตามมาตรฐาน (Standards Compliance)

1. **RFC 7807 Problem Details:** ทุกกรณีข้อผิดพลาด (4xx, 5xx) ต้องส่งคืน Response Body ในรูปแบบ `application/problem+json` โดยมีฟิลด์ `type`, `title`, `status`, `detail`, `instance`, `code`, `traceId` และ `fieldErrors` เสมอ
2. **Security & Data Isolation:** ต้องไม่มีช่องโหว่ Cross-club Privilege Escalation หรือ Mass Assignment ในฟิลด์สงวน
3. **Cache Invalidation:** หลังการแก้ไขสำเร็จ Header ของ API ต้องระบุ `Cache-Control: no-store` หรือฝั่ง Client มีการ Invalidate cache เพื่อให้หน้าโปรไฟล์สาธารณะแสดงผลข้อมูลล่าสุดทันที
