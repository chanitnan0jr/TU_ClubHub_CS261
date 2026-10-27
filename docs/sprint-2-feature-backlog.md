# TU ClubHub — Sprint 2 Task Backlog ตาม SDLC และ Feature

**โครงการ:** TU ClubHub (CS261 Software Engineering, กลุ่ม 5, Section 100001)  
**วันที่ปรับปรุงล่าสุด:** 25 ตุลาคม 2026  
**สถานะเอกสาร:** แผนงานและข้อกำหนดการ์ดงานฉบับปรับปรุงคำอธิบายให้เข้าใจง่าย สอดคล้องกับบอร์ด Trello และบทบาทของทีม (รวม US-03 ครบ 6 ฟีเจอร์)  
**บอร์ด Trello:** [Sprint & Release Planning Board (VGby0fDM)](https://trello.com/b/VGby0fDM/sprint-release-planning-group5section-100001)

---

## 0. บทสรุปผู้บริหารและการจัดโครงสร้าง Sprint 2

### 1. เป้าหมายและขอบเขตฟีเจอร์หลัก (6 Core Features)
Sprint 2 มุ่งเน้นการส่งมอบฟีเจอร์หลักครบทั้ง 6 รายการให้พร้อมใช้งานและทดสอบได้อย่างสมบูรณ์ ได้แก่:
1. **US-01: ค้นหาและกรองชมรม (Club Search & Filter)** — ค้นหาตามชื่อ หมวดหมู่ และสถานะการเปิดรับสมัคร (Task62, 63, 81)
2. **US-03: ส่งใบสมัครชมรม (Application Submission)** — ผู้สมัครกรอกฟอร์ม ตอบคำถามคัดเลือก แนบลิงก์ และส่งใบสมัครเข้าสู่ระบบ (Task52, 53, 54)
3. **US-04: ติดตามสถานะและประวัติใบสมัคร (Application Tracking)** — ผู้สมัครเปิดดูประวัติและผลการคัดเลือกของตนเอง (Task64)
4. **US-05: ยืนยันสิทธิ์สมาชิก (Membership Confirmation)** — ผู้ผ่านการคัดเลือกกดยืนยันสิทธิ์หรือสละสิทธิ์ และบันทึกเข้าตารางสมาชิก (Task69, 70)
5. **US-09: ตรวจและประกาศผลการคัดเลือก (Application Review & Result)** — กรรมการชมรมตรวจคำตอบ บันทึกผล และสั่งประกาศผลอย่างปลอดภัย (Task65, 66, 67, 68)
6. **US-10: แดชบอร์ดสถิติส่วนกลาง (Central Dashboard & Stats)** — ผู้ดูแลระบบกลาง (Admin) เรียกดูตัวเลขสถิติและกราฟภาพรวมทั้งมหาวิทยาลัย (Task71, 72)

---

### 2. โครงสร้างทีมงานและบทบาทหน้าที่ (7 คน)

| ลำดับ | ชื่อ - นามสกุล | บทบาทในทีม | บทบาททางเทคนิค | รหัสอ้างอิง |
|---|---|---|---|---|
| 1 | สิรวิชญ์ กฤดาธิการวุฒิ | QA Lead / DevOps / Scrum Master | System Architect / QA & DevOps | SE / DO / SM |
| 2 | วรพล ปุพพัธนันท์ | Backend / DevOps Engineer | Backend API / Security & Infrastructure | BE1 |
| 3 | ชนิตว์นันท์ กิตนันท์ขุน | Product Owner / System Analyst | Requirements / State Flow / Permission Matrix | PO / SA |
| 4 | อริยะวีร์ กฤตยบันลือ | Backend Engineer | Backend API / Concurrency & Exception Handling | BE2 |
| 5 | ณัฐชนินทร์ (Boom) | Fullstack / Backend Engineer | Backend API / Admin Dashboard / Route Whitelist | FS / BE |
| 6 | ภูบดี ศรีทัน | Frontend Engineer | Frontend UI / Responsive / Club & Review UI | FE1 |
| 7 | เขมจิรา แสนกล้า | Frontend Engineer | Frontend UI / Dashboard & Tracking UI | FE2 |

---

### 3. ลำดับขั้นตอนการทำงานตามวงจร SDLC (6 Phases)

```
[Phase 1: Analysis & Design] (Task74, Task75)
          │
          ▼
[Phase 2: Data Foundation & Bug Fix] (Task51, Task55)
          │
          ▼
[Phase 3: Auth & Security Hardening] (Task76, Task77, Task78, Task79, Task80, Task57)
          │
          ▼
[Phase 4: Feature Implementation] (US-01, US-03, US-04, US-05, US-09, US-10) ──► คู่ขนานกับ [Phase 5: CI/CD Pipeline] (Task82, Task83, Task84)
          │
          ▼
[Feature Mini Retros (10-15 นาที)] (Task85–Task91)
          │
          ▼
[Phase 6: Release & Sprint Retrospective] (Task56, Task73, Task92)
```

1. **Phase 1: Analysis & System Design:** สรุป Business Flow, State Machine และ Permission Matrix (Task74) ก่อนลงมือทำ OpenAPI Spec, Database Schema ERD, และตกลง Error Response กลาง (Task75) เพื่อให้ทีม Frontend/Backend เริ่มงานคู่ขนานได้ทันที
2. **Phase 2: Data Foundation & Bug Fix:** แก้บักคำถามคัดเลือกห้ามลบ/แก้คำถามที่มีคำตอบ (Task51) และเตรียม Flyway Migration กับ Seed Data จำลอง (Task55)
3. **Phase 3: Auth & Security Hardening:** จัดระเบียบ Error 401/403/404 เป็น RFC 7807 (Task80), ทำ Route Whitelist (Task77), Sync Role จาก DB แบบเรียลไทม์ (Task79), ป้องกัน Race Condition ด้วย Lock (Task78), บันทึก Student Profile จาก TU Login (Task76), และทดสอบ TU Auth จริงบน Staging (Task57)
4. **Phase 4: Feature Implementation & Coding:** พัฒนาฟีเจอร์หลักครบทั้ง 6 Stories (รวมการส่งใบสมัคร US-03) โดยแยกจับคู่ Backend + Frontend ในแต่ละฟีเจอร์
5. **Phase 5: CI/CD & DevOps Pipeline:** ทำ GitHub Actions Automations (Unit Tests Task82, PostgreSQL Integration Tests Task83, และ Staging CD Task84) ตั้งแต่ต้น Sprint
6. **Phase 6: Release Verification & Retrospective:** ตรวจ Smoke Test บน Staging (Task56), ทดสอบ End-to-End ครบทุกฟีเจอร์ (Task73), มินิรีวิวหลังจบแต่ละฟีเจอร์ (Task85–91), และประชุมใหญ่สรุป Sprint 2 Review & Retrospective (Task92)

---

## 1. ตารางสรุปภาพรวมการ์ดงาน Sprint 2 (38 Active Cards)

| Task | Feature Code | ชื่องาน (ฉบับเข้าใจง่าย) | ผู้รับผิดชอบ (Owner) | ผู้ตรวจรับ (Reviewer) | SDLC Phase |
|---|---|---|---|---|---|
| **Task74** | `SYS-ANALYSIS` | สรุปความต้องการ Flow ใบสมัคร และตารางสิทธิ์ระบบ Sprint 2 | ชนิตว์นันท์ (PO/SA) | สิรวิชญ์ (SM/QA) | 1. Requirements & Analysis |
| **Task75** | `SYS-DESIGN` | ออกแบบ API Contract, Database Schema และหน้าจอร่วมกัน | สิรวิชญ์ (SE) + ทีม Dev | ชนิตว์นันท์ (PO/SA) | 2. System & Architecture Design |
| **Task51** | `RECRUIT-01` | แก้บักระบบคำถามคัดเลือก (ห้ามแก้/ลบคำถามที่มีคำตอบแล้ว) | อริยะวีร์ (BE2) | สิรวิชญ์ (SE/QA) | 3. Development + 4. Testing & QA |
| **Task52** | `APP-01` | ทำ Backend API ส่งใบสมัครและบันทึกประวัติเริ่มต้น | อริยะวีร์ (BE2) | สิรวิชญ์ (SE/QA) | 3. Development + 4. Testing & QA |
| **Task53** | `APP-02` | พัฒนาหน้าจอและฟอร์มส่งใบสมัครชมรม (Validation & UI) | ภูบดี (FE1) | สิรวิชญ์ (SE/QA) | 3. Development + 4. Testing & QA |
| **Task54** | `APP-03` | ตรวจรับกระบวนการส่งใบสมัครจากหน้าจอถึงฐานข้อมูล (E2E Test) | ณัฐชนินทร์ (Boom) & สิรวิชญ์ | สิรวิชญ์ (QA Lead) | 4. Testing & QA |
| **Task55** | `RELEASE-01` | เตรียมสคริปต์ Database Migration และข้อมูลจำลอง (Seed Data) | วรพล (BE1) & ณัฐชนินทร์ | สิรวิชญ์ (QA/DO) | 3. Development + 5. Deployment |
| **Task76** | `AUTH-02` | ดึงข้อมูลนักศึกษาจาก TU API บันทึกเป็น Student Profile | วรพล (BE1) | สิรวิชญ์ (SE/QA) | 3. Development + 4. Testing & QA |
| **Task77** | `AUTH-03` | กำหนด Security Route Whitelist รวมศูนย์ API สาธารณะ | ณัฐชนินทร์ (Boom) | สิรวิชญ์ (SE/DO) | 3. Development + 4. Testing & QA |
| **Task78** | `AUTH-04` | ป้องกันการแก้สิทธิ์กรรมการชมรมชนกัน (Concurrency Lock) | อริยะวีร์ (BE2) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task79** | `AUTH-05` | อัปเดตสิทธิ์ผู้ใช้แบบเรียลไทม์ (Real-time Role Sync ใน /me) | วรพล (BE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task80** | `AUTH-06` | จัดระเบียบ Error 401/403/404 และ Response (RFC 7807) | อริยะวีร์ (BE2) | สิรวิชญ์ (SE/QA) | 3. Development + 4. Testing & QA |
| **Task57** | `AUTH-01` | ทดสอบเชื่อมต่อ TU Login จริงและ Session บน Staging | วรพล (BE1) & สิรวิชญ์ | สิรวิชญ์ (SE/QA) | 4. Testing & QA |
| **Task62** | `CLUB-01` | ทำ Backend API ค้นหาและกรองชมรม (Public API) | วรพล (BE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task63** | `CLUB-02` | พัฒนาหน้าค้นหาและกรองชมรม (Frontend UI) | ภูบดี (FE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task81** | `CLUB-03` | จัดการสิทธิ์แก้ไขโปรไฟล์ชมรม (ซ่อนปุ่ม & Route Guard) | ณัฐชนินทร์ (Boom) & ภูบดี | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task64** | `APP-04` | พัฒนาระบบติดตามสถานะและประวัติใบสมัครของตนเอง | เขมจิรา (FE2) & ณัฐชนินทร์ | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task65** | `REVIEW-01` | ทำ Backend API รายการและรายละเอียดผู้สมัครสำหรับกรรมการ | อริยะวีร์ (BE2) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task66** | `REVIEW-02` | พัฒนาหน้าจอดูรายชื่อและตรวจใบสมัครสำหรับกรรมการ | ภูบดี (FE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task67** | `RESULT-01` | ทำ Backend API บันทึกผลการคัดเลือกและประกาศผล | อริยะวีร์ (BE2) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task68** | `RESULT-02` | พัฒนาหน้าจอประเมินคะแนนและกดยืนยันประกาศผล | ภูบดี (FE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task69** | `MEMBER-01` | ทำ Backend API ยืนยันสิทธิ์/สละสิทธิ์ และเพิ่มเป็นสมาชิกชมรม | วรพล (BE1) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task70** | `MEMBER-02` | พัฒนาหน้าจอให้ผู้สมัครกดยืนยันสิทธิ์หรือสละสิทธิ์ | เขมจิรา (FE2) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task71** | `REPORT-01` | ทำ Backend API คำนวณสถิติภาพรวมสำหรับ Admin | ณัฐชนินทร์ (Boom) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task72** | `REPORT-02` | พัฒนาหน้า Central Dashboard แสดงกราฟและสถิติภาพรวม | เขมจิรา (FE2) | สิรวิชญ์ (SE) | 3. Development + 4. Testing & QA |
| **Task82** | `PIPELINE-01` | ตั้งค่า GitHub Actions CI สำหรับ Build และรัน Unit Tests | สิรวิชญ์ (DO) & ณัฐชนินทร์ | สิรวิชญ์ (DO/QA) | 5. Deployment & DevOps |
| **Task83** | `PIPELINE-02` | ตั้งค่า GitHub Actions CI สำหรับ Integration Tests พร้อม DB | สิรวิชญ์ (DO) & วรพล | สิรวิชญ์ (DO/QA) | 5. Deployment & DevOps |
| **Task84** | `PIPELINE-03` | ตั้งค่า GitHub Actions CD Workflow ติดตั้งระบบขึ้น Staging อัตโนมัติ | สิรวิชญ์ (DO) | วรพล (DO) | 5. Deployment & DevOps |
| **Task56** | `RELEASE-02` | ติดตั้งระบบทดสอบและผ่าน Smoke Test บน Staging | สิรวิชญ์ (QA/DO) & วรพล | สิรวิชญ์ (QA) | 5. Deployment & DevOps |
| **Task73** | `RELEASE-05` | ตรวจรับระบบรวม End-to-End และเตรียมพร้อมส่งมอบ Sprint 2 | สิรวิชญ์ (QA Lead) + ทุกคน | ชนิตว์นันท์ (PO) | 4. Testing & QA |
| **Task85** | `FEEDBACK-AUTH` | ประชุมสั้นทบทวนฟีเจอร์ AUTH (Mini Retro) | วรพล & ณัฐชนินทร์ | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task86** | `FEEDBACK-CLUB` | ประชุมสั้นทบทวนฟีเจอร์ CLUB (Mini Retro) | ภูบดี & วรพล | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task87** | `FEEDBACK-RECRUIT` | ประชุมสั้นทบทวนฟีเจอร์ RECRUIT (Mini Retro) | อริยะวีร์ | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task88** | `FEEDBACK-APP` | ประชุมสั้นทบทวนฟีเจอร์ ส่งและติดตามใบสมัคร US-03, US-04 (Mini Retro) | เขมจิรา & ณัฐชนินทร์ | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task89** | `FEEDBACK-REVIEW-RESULT` | ประชุมสั้นทบทวนฟีเจอร์ ตรวจและประกาศผล (Mini Retro) | อริยะวีร์ & ภูบดี | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task90** | `FEEDBACK-MEMBER` | ประชุมสั้นทบทวนฟีเจอร์ ยืนยันสิทธิ์สมาชิก (Mini Retro) | วรพล & เขมจิรา | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task91** | `FEEDBACK-REPORT` | ประชุมสั้นทบทวนฟีเจอร์ Admin Dashboard (Mini Retro) | ณัฐชนินทร์ & เขมจิรา | สิรวิชญ์ (SM) | 6. Scrum / Review & Retro |
| **Task92** | `SPRINT-RETRO` | ประชุมสรุปผลงาน Sprint 2 Review และ Retrospective ระดับทีม | สิรวิชญ์ (SM) นำทีม | สมาชิกทั้ง 7 คน | 6. Scrum / Review & Retro |

---

## 2. รายละเอียดการ์ดงานรายข้อ (Task Specifications)

ทุกการ์ดงานจะต้องยึดตาม **Definition of Done (Checklist กลาง)** ควบคู่กับ **เกณฑ์ตรวจรับ (Acceptance Criteria)** เฉพาะของการ์ดนั้นๆ

> **Checklist กลาง: Definition of Done (DoD)**
> 1. [ ] ขอบเขตงานและ Data/API Contract ชัดเจน ตรงตามข้อตกลงทีม
> 2. [ ] พัฒนาและทดสอบผ่านครบตามเกณฑ์ Acceptance Criteria เฉพาะของการ์ด
> 3. [ ] แนบ Pull Request, ผลการทดสอบ (Unit/Integration Tests), และ Artefact ครบถ้วน
> 4. [ ] CI Pipeline รันผ่าน 100% (ทั้ง Frontend และ Backend)
> 5. [ ] ผ่านการ Code Review จาก Reviewer และแก้ไขข้อเสนอแนะครบถ้วน
> 6. [ ] Merge โค้ดเข้า Branch หลักเรียบร้อย พร้อมอัปเดตเอกสารที่เกี่ยวข้อง

---

### [Phase 1: Analysis & System Design]

#### Task74 [SYS-ANALYSIS] สรุปความต้องการ Flow ใบสมัคร และตารางสิทธิ์ระบบ Sprint 2
- **Label:** 1. Requirements & Analysis
- **Owner:** ชนิตว์นันท์ (PO / System Analyst)
- **Reviewer:** สิรวิชญ์ (Scrum Master / QA Lead)
- **Dependency:** เอกสาร Requirements เดิมของ Sprint 1
- **จุดประสงค์ & บริบท:** วิเคราะห์ Business Logic, State Transition ของใบสมัคร และตารางสิทธิ์ (Permission Matrix) ของระบบ TU ClubHub ใน Sprint 2 ให้ทุกคนในทีมเข้าใจตรงกันก่อนเริ่มพัฒนา
- **ขอบเขตงานที่ต้องทำ:**
  1. สรุปเงื่อนไขและ State Transition ของใบสมัคร (`SUBMITTED` -> `UNDER_REVIEW` -> `INTERVIEW` -> `ACCEPTED` / `REJECTED` -> `CONFIRMED` / `DECLINED`)
  2. จัดทำตารางสิทธิ์ (Permission Matrix) ระบุบทบาทชัดเจน (`USER`, `CLUB_COMMITTEE` ของชมรมตนเอง, `ADMIN`)
  3. กำหนดเงื่อนไข Business Rule ของเวลาการรับสมัครและการยืนยันสิทธิ์
  4. ประชุมสรุปเงื่อนไขร่วมกับ Frontend, Backend และ QA
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] เอกสาร State Machine Flow และเงื่อนไขการเปลี่ยนสถานะใบสมัครครบถ้วน
  - [ ] ตารางสิทธิ์ (Permission Matrix) ระบุ Action และ Role ครบทุกกรณี
  - [ ] ทีม Dev (Frontend/Backend) และ QA ร่วมตรวจสอบและเห็นชอบตรงกัน
- **Artefact:** เอกสารสรุป Business Flow และ Permission Matrix ใน Repository (`docs/`)

#### Task75 [SYS-DESIGN] ออกแบบ API Contract, Database Schema และหน้าจอร่วมกัน
- **Label:** 2. System & Architecture Design
- **Owner:** สิรวิชญ์ (SE / System Architect) ร่วมกับทีม Backend & Frontend
- **Reviewer:** ชนิตว์นันท์ (PO / SA)
- **Dependency:** Task74 (ต้องได้ Requirements และ Permission Matrix ก่อน)
- **จุดประสงค์ & บริบท:** กำหนดข้อตกลงทางเทคนิค (Contract) ร่วมกันระหว่าง Frontend และ Backend เพื่อให้ทั้งสองฝ่ายเริ่มเขียนโค้ดคู่ขนานกันได้ทันที
- **ขอบเขตงานที่ต้องทำ:**
  1. จัดทำ OpenAPI / Swagger Specification สำหรับทุก Endpoints ใน Sprint 2 พร้อม Request/Response ตัวอย่าง
  2. ออกแบบ Database ERD และ Schema การเชื่อมโยงตารางสิทธิ์ สถิติ และการยืนยันสมาชิก
  3. กำหนดมาตรฐาน Error Response กลางตาม RFC 7807 Problem Details
  4. ตกลง Wireframe และ UI Component Contract ร่วมกับฝั่ง Frontend
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] OpenAPI Spec ระบุ Endpoint ครบทุกฟีเจอร์ใน Sprint 2 พร้อมตัวอย่าง Response
  - [ ] Database Schema และความสัมพันธ์ระหว่างตารางผ่านการรีวิวเรียบร้อย
  - [ ] กำหนดมาตรฐาน Error Response RFC 7807 ชัดเจนตรงกัน
  - [ ] ทีม Frontend และ Backend ตกลง Data Structure ตรงกัน 100%
- **Artefact:** ไฟล์ `openapi.yaml`, แผนภาพ ERD Schema, และ UI Component Contract

---

### [Phase 2: Data Foundation & Bug Fix]

#### Task51 [RECRUIT-01] แก้บักระบบคำถามคัดเลือก (ห้ามแก้/ลบคำถามที่มีคำตอบแล้ว)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** โค้ดระบบคำถามคัดเลือก (US-08) จาก Sprint 1
- **จุดประสงค์ & บริบท:** ป้องกันข้อมูลคำตอบของผู้สมัครเพี้ยน โดยล็อกไม่ให้กรรมการแก้ไขหรือลบคำถามคัดเลือก หากมีผู้สมัครเริ่มตอบคำถามเข้ามาในระบบแล้ว
- **ขอบเขตงานที่ต้องทำ:**
  1. ใน Backend ก่อนลบหรือแก้ไขคำถาม ตรวจสอบว่ามีคำตอบในตารางคำตอบหรือไม่ หากมี ให้คืน Error `409 Conflict` (reason: `QUESTION_HAS_ANSWERS`)
  2. ปรับ Frontend Error Handling ให้ดักจับเหตุผลนี้และแสดงกล่องข้อความแจ้งเตือนผู้ใช้เข้าใจง่าย
  3. เขียน Automated Tests ครอบคลุมกรณีการแก้ไขคำถามที่มีคำตอบและยังไม่มีคำตอบ
  4. อัปเดต API Documentation
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ยิง API แก้ไขหรือลบคำถามที่มีคนตอบแล้ว ได้รับ `409 Conflict` (reason: `QUESTION_HAS_ANSWERS`)
  - [ ] คำถามที่ยังไม่มีใครตอบ สามารถแก้ไข ลบ หรือจัดเรียงลำดับได้ตามปกติ
  - [ ] หน้า Frontend แสดงกล่องข้อความแจ้งเตือนอย่างชัดเจนเมื่อพบ Error นี้
- **Artefact:** PR แก้ไข Backend Validation และ Frontend Alert พร้อม Automated Tests

#### Task55 [RELEASE-01] เตรียมสคริปต์ Database Migration และข้อมูลจำลอง (Seed Data)
- **Label:** 3. Development (Coding) + 5. Deployment & DevOps
- **Owner:** วรพล (BE1) & ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (QA / DevOps)
- **Dependency:** Database Schema จาก Task75
- **จุดประสงค์ & บริบท:** จัดเตรียมโครงสร้างฐานข้อมูลและข้อมูลจำลอง (Mock/Seed Data) ที่สมบูรณ์ เพื่อให้ทุกคนในทีมสามารถนำไปใช้ทดสอบระบบ Sprint 2 ได้ทันที
- **ขอบเขตงานที่ต้องทำ:**
  1. เขียนสคริปต์ Flyway Migration สำหรับสร้างหรืออัปเดตตารางฐานข้อมูลให้ตรงกับ ERD Sprint 2
  2. จัดทำข้อมูลจำลอง Seed Data ครบวงจร: ข้อมูลชมรม, บัญชีกรรมการชมรม, รอบรับสมัคร, และใบสมัครตัวอย่างที่มีสถานะต่าง ๆ
  3. ตรวจสอบว่าในไฟล์ Seed Data ต้องไม่มีรหัสผ่านจริงของนักศึกษา มธ.
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] รัน Flyway Migration บน Database ใหม่แล้วผ่าน 100% สามารถรันซ้ำได้ (Idempotent)
  - [ ] มีชุดข้อมูลจำลองสำหรับชมรม, กรรมการ, และใบสมัครครบทุกสถานะ พร้อมใช้ทดสอบทันที
  - [ ] ตรวจสอบแล้วว่าไม่มีข้อมูลความลับหรือรหัสผ่านจริงในชุด Seed Data
- **Artefact:** สคริปต์ Flyway Migration (`V...__*.sql`) และชุด Seed Data พร้อมคู่มือวิธีรัน

---

### [Phase 3: Authentication & Security Hardening]

#### Task76 [AUTH-02] ดึงข้อมูลนักศึกษาจาก TU API บันทึกเป็น Student Profile
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task74–75 (Profile Contract และ TU Login เดิม)
- **จุดประสงค์ & บริบท:** ปรับระบบ TU Login ให้ดึงและบันทึกข้อมูล Student Profile ลงฐานข้อมูลอย่างถูกต้องสมบูรณ์ ป้องกันข้อมูลสูญหายและแยกแยะประเภทบัญชีอย่างรัดกุม
- **ขอบเขตงานที่ต้องทำ:**
  1. รักษาเลข 0 นำหน้าของรหัสนักศึกษา (เช่น `066...`) ไม่ให้ถูกแปลงเป็นตัวเลขแล้วเลข 0 หาย
  2. ตรวจสอบสถานะบัญชี หากเป็นบุคลากร/อาจารย์ (employee) ต้องไม่สร้าง Student Profile ในระบบ
  3. หากการบันทึก User หรือ Student Profile ล้มเหลว ต้อง Rollback และไม่อนุญาตให้สร้าง Session สำเร็จ
  4. เขียน Automated Mock Tests จำลองกรณีนักศึกษาใหม่, นักศึกษาเดิม, และบัญชีบุคลากร
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ล็อกอินด้วยบัญชีนักศึกษาใหม่ สร้าง Student Profile ใน DB สำเร็จ และเลข 0 นำหน้าไม่หาย
  - [ ] บัญชีบุคลากร (employee) ไม่ถูกสร้างเป็น Student Profile ในระบบ
  - [ ] หากบันทึกข้อมูลไม่สำเร็จ ระบบไม่ออก Session และไม่ปล่อยให้เข้าสู่ระบบได้
- **Artefact:** PR ปรับปรุง TU Auth Service และ Student Profile Mapper พร้อมชุด Tests

#### Task77 [AUTH-03] กำหนด Security Route Whitelist รวมศูนย์ API สาธารณะ
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE / DevOps)
- **Dependency:** Public Route Contract จาก Task75
- **จุดประสงค์ & บริบท:** จัดระเบียบเส้นทาง API ทั้งหมดใน Spring Security ให้ปลอดภัย โดยล็อกทุก Endpoint ให้ต้อง Login ยกเว้นเฉพาะ Public API ที่อนุญาตให้คนทั่วไปเข้าถึงได้จริง ๆ
- **ขอบเขตงานที่ต้องทำ:**
  1. รวมศูนย์รายการ Public Route ใน `SecurityConfig` ให้เหลือเฉพาะที่จำเป็น (เช่น ค้นหาชมรม `/api/v1/clubs`, ข้อมูลชมรม, และ `/actuator/health`)
  2. กำหนดให้เส้นทาง API อื่น ๆ ทั้งหมดต้องผ่าน Authentication เสมอ
  3. ตรวจสอบว่า Endpoint ตรวจสอบสถานะระบบ (`/actuator/health`) ยังทำงานได้ปกติสำหรับระบบ Deployment
  4. เขียน Automated Tests จำลองการเรียก API ทั้งแบบ Public และแบบที่ต้อง Login
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] API ที่อยู่ใน Whitelist สามารถเข้าถึงได้โดยไม่ต้อง Login
  - [ ] API อื่น ๆ ทั้งหมด หากไม่แนบ Session/Token จะได้รับ `401 Unauthorized` ทันที
  - [ ] เส้นทาง `/actuator/health` ใช้งานได้สำหรับ DevOps Health Check
- **Artefact:** PR ปรับปรุง `SecurityConfig` พร้อมชุด Automated Route Security Tests

#### Task78 [AUTH-04] ป้องกันการแก้สิทธิ์กรรมการชมรมชนกัน (Concurrency Lock)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Member Assignment Data Model จาก Task75
- **จุดประสงค์ & บริบท:** ป้องกันข้อมูลสิทธิ์เพี้ยนหากมี Admin สองคนเปิดหน้าจอพร้อมกันแล้วกดแก้ไข/แต่งตั้ง/ปลดสิทธิ์กรรมการชมรมในเสี้ยววินาทีเดียวกัน (Race Condition)
- **ขอบเขตงานที่ต้องทำ:**
  1. ใช้ Transaction Locking (เช่น `@Version` Optimistic Lock หรือ Pessimistic Lock) ในตาราง Assignment/Club Member
  2. จัดลำดับการบันทึกข้อมูลและการตัดสิทธิ์ให้เป็น Transaction เดียวกัน
  3. เขียน Automated Test จำลองการส่งคำขอแก้ไขสิทธิ์พร้อมกันหลายๆ Threads เพื่อพิสูจน์ว่าข้อมูลไม่เพี้ยน
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ทดสอบยิง Request แก้ไขสิทธิ์พร้อมกัน ข้อมูลผลลัพธ์ในฐานข้อมูลถูกต้องเสมอ ไม่เกิด Race Condition
  - [ ] หากเกิดข้อขัดแย้ง (Conflict) ระบบส่ง Error แจ้งเตือนอย่างถูกต้อง และข้อมูลไม่เสียหาย
- **Artefact:** PR จัดการ Lock ใน Assignment Service พร้อม Concurrent Multi-threaded Tests

#### Task79 [AUTH-05] อัปเดตสิทธิ์ผู้ใช้แบบเรียลไทม์ (Real-time Role Sync ใน /me)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Role Contract จาก Task75 (ทำก่อน Admin API Task71)
- **จุดประสงค์ & บริบท:** แก้ปัญหาระบบจำสิทธิ์เก่าค้างไว้ใน Session โดยปรับปรุง Endpoint `/api/v1/auth/me` และระบบตรวจสอบสิทธิ์ให้ดึง Role ล่าสุดจากฐานข้อมูลเสมอ
- **ขอบเขตงานที่ต้องทำ:**
  1. ปรับปรุง `/api/v1/auth/me` ให้อ่าน Role และ Assignment ล่าสุดจาก Database ไม่ใช้ค่า Cache เก่า
  2. ปรับตัวตรวจสิทธิ์ (Security Interceptor) ให้ Re-check สิทธิ์ผู้ใช้จริงจาก Database ในการเรียก API ที่สำคัญ
  3. ตรวจสอบไม่ให้ผู้ใช้ Role ADMIN ก้าวก่ายสิทธิ์ของกรรมการชมรมโดยไม่ได้รับอนุญาต
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] เมื่อแก้ไข Role ใน Database ผู้ใช้จะได้รับสิทธิ์ใหม่ทันทีในการเรียก `/api/v1/auth/me`
  - [ ] หากผู้ใช้ถูกปลดสิทธิ์ จะไม่สามารถเรียก API ของกรรมการชมรมได้อีก แม้ Session เดิมยังไม่หมดอายุ
- **Artefact:** PR ปรับปรุง Auth Me Service และ Security Authority Resolver พร้อม Tests

#### Task80 [AUTH-06] จัดระเบียบ Error 401/403/404 และ Response (RFC 7807)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task74–75 (Permission Matrix และ OpenAPI Error Contract)
- **จุดประสงค์ & บริบท:** จัดระเบียบ HTTP Error Response ให้ปลอดภัยและเป็นมาตรฐานสากล (RFC 7807 Problem Details) ป้องกันข้อมูลลับของระบบรั่วไหล และให้ Frontend ดักจับแจ้งเตือนได้ถูกต้อง
- **ขอบเขตงานที่ต้องทำ:**
  1. ปรับให้ Error ทุกตัวส่ง JSON รูปแบบมาตรฐานตาม RFC 7807 (`type`, `title`, `status`, `detail`, `instance`)
  2. แยกสถานะ HTTP ให้ชัดเจน: `401 Unauthorized` (ยังไม่ล็อกอิน), `403 Forbidden` (ล็อกอินแล้วแต่ไม่มีสิทธิ์), `404 Not Found` (ไม่พบข้อมูล หรือข้อมูลลับที่ไม่ต้องการให้คนภายนอกรู้)
  3. ปิดกั้นไม่ให้มี Exception Stack Trace หรือโครงสร้าง Database หลุดใน Response
  4. ส่ง CSRF Token ให้ถูกต้องใน Integration Test เพื่อให้มั่นใจว่ากำลังเทสต์สิทธิ์ (RBAC) จริง ไม่ใช่เทสต์เฟลเพราะติด CSRF Filter
  5. อัปเดตตัวอย่าง Error ใน Swagger และแจ้ง Frontend ให้ดักจับไปแสดงผล Alert/Toast
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] เรียก API โดยไม่มีสิทธิ์ ได้รับ `403 Forbidden` พร้อม JSON format มาตรฐาน RFC 7807
  - [ ] เรียกข้อมูลที่ไม่พบ ได้รับ `404 Not Found`
  - [ ] ตรวจสอบ Payload แล้วว่าไม่มี Stack Trace หรือข้อมูลระบบภายในหลุดออกไป
  - [ ] Automated Tests สำหรับตรวจสอบสิทธิ์ (RBAC) ผ่านทั้งหมด โดยไม่ติดปัญหา CSRF Filter
  - [ ] หน้า Frontend ดักจับ Error Code และแสดง Alert/Toast แจ้งเตือนผู้ใช้ได้อย่างถูกต้อง
- **Artefact:** PR ปรับปรุง Global Exception Handler, Security Error Contract, และชุด Security Tests

#### Task57 [AUTH-01] ทดสอบเชื่อมต่อ TU Login จริงและ Session บน Staging
- **Label:** 4. Testing & QA
- **Owner:** วรพล (BE1) & สิรวิชญ์ (QA / DevOps)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task76 (ต้องทำ Student Profile ให้เสร็จก่อน)
- **จุดประสงค์ & บริบท:** ทดสอบการเข้าสู่ระบบด้วยบัญชีนักศึกษาจริงของมหาวิทยาลัยธรรมศาสตร์บนสภาพแวดล้อม Staging เพื่อยืนยันว่าระบบเชื่อมต่อกับ TU API จริงได้สมบูรณ์
- **ขอบเขตงานที่ต้องทำ:**
  1. ตั้งค่า Environment Variables และ API Key สำหรับ TU Auth บน Staging
  2. ทดสอบ Login ด้วยบัญชีจริงของนักศึกษา, ตรวจสอบการสร้าง Session/Cookie, และทดสอบการ Logout
  3. บันทึกผลการทดสอบและข้อสังเกตลงใน Test Report
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] สามารถ Login ด้วยบัญชีนักศึกษา มธ. จริงบน Staging และดึงข้อมูล Profile ได้สมบูรณ์
  - [ ] ระบบออก Cookie และ Session ได้อย่างปลอดภัย และสามารถกด Logout ได้ถูกต้อง
- **Artefact:** รายงานผลการทดสอบการเชื่อมต่อ TU API จริงบนระบบ Staging

---

### [Phase 4: Feature Implementation]

#### [Feature: CLUB (US-01)]
##### Task62 [CLUB-01] ทำ Backend API ค้นหาและกรองชมรม (Public API)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** OpenAPI Spec จาก Task75 และ Seed Data จาก Task55
- **จุดประสงค์ & ขอบเขต:** พัฒนา Backend API `GET /api/v1/clubs` ค้นหาตามชื่อชมรม (ไทย/อังกฤษ), กรองหมวดหมู่ และสถานะการเปิดรับสมัคร พร้อมระบบแบ่งหน้า (Pagination) และ Sorting
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ค้นหาตามชื่อชมรมได้ทั้งภาษาไทยและภาษาอังกฤษ และผลลัพธ์ตรงกับเงื่อนไข
  - [ ] กรองตามหมวดหมู่ชมรมและสถานะการเปิดรับสมัครได้ถูกต้อง
  - [ ] ระบบแบ่งหน้า (Pagination) ทำงานถูกต้อง และตอบสนองรวดเร็ว
- **Artefact:** PR Backend Club Search API พร้อมชุด Automated Tests

##### Task63 [CLUB-02] พัฒนาหน้าค้นหาและกรองชมรม (Frontend UI)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task62 (Search API) และ Wireframe จาก Task75
- **จุดประสงค์ & ขอบเขต:** สร้างหน้าจอค้นหาชมรม มีช่องค้นหาข้อความ, Dropdown ตัวกรอง, Grid แสดงการ์ดชมรม, สถานะ Loading/Empty State, และแสดงผล Responsive บนทุกหน้าจอ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ผู้ใช้สามารถพิมพ์ค้นหาและเลือกตัวกรองแล้วผลลัพธ์อัปเดตอย่างถูกต้อง
  - [ ] คลิกที่การ์ดชมรมเพื่อเปิดดูหน้ารายละเอียดชมรมได้
  - [ ] แสดงผล Responsive ใช้งานได้ดีทั้งบนมือถือและคอมพิวเตอร์
- **Artefact:** PR หน้าจอค้นหาและกรองชมรม พร้อม Component Tests

##### Task81 [CLUB-03] จัดการสิทธิ์แก้ไขโปรไฟล์ชมรม (ซ่อนปุ่ม & Route Guard)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom) & ภูบดี (FE1)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task75 (API Contract) และ Guard เดิม
- **จุดประสงค์ & ขอบเขต:** ปรับ API ให้ส่ง Flag `canEditProfile: true/false`, หน้า Frontend ซ่อนปุ่มแก้ไขหากไม่มีสิทธิ์ และใส่ Navigation Route Guard ป้องกันไม่ให้แอบพิมพ์ URL เข้าหน้าแก้ไขตรงๆ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] กรรมการชมรมมองเห็นปุ่มแก้ไขและสามารถเปิดหน้าฟอร์มแก้ไขข้อมูลได้ตามปกติ
  - [ ] นักศึกษาทั่วไปมองไม่เห็นปุ่มแก้ไข และหากพิมพ์ URL ตรงๆ จะถูกบล็อก/Redirect ทันที
  - [ ] Backend ปฏิเสธการบันทึกข้อมูล หากผู้ยิงคำขอไม่มีสิทธิ์ของชมรมนั้น
- **Artefact:** PR ปรับปรุง Backend API + Frontend Permission Guard และการซ่อนปุ่ม

---

#### [Feature: APPLICATION SUBMISSION (US-03)]
##### Task52 [APP-01] ทำ Backend API ส่งใบสมัครและบันทึกประวัติเริ่มต้น
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Application Data Model จาก Task75 และ Recruitment Question จาก Task51
- **จุดประสงค์ & ขอบเขต:** พัฒนา Backend API `POST /api/v1/clubs/:id/applications` ตรวจสอบสถานะรอบรับสมัคร บันทึกคำตอบคำถามคัดเลือก ลิงก์แนบ และประวัติสถานะเริ่มต้น (`SUBMITTED`) ลงฐานข้อมูลใน Transaction เดียวกัน ป้องกันการส่งซ้ำ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ส่งข้อมูลการสมัครถูกต้อง ข้อมูลใบสมัคร คำตอบ และประวัติเริ่มต้นถูกบันทึกลงฐานข้อมูลครบถ้วน
  - [ ] หากรอบรับสมัครปิดแล้ว หรือผู้สมัครส่งใบสมัครซ้ำในรอบเดิม ระบบส่ง Error ปฏิเสธอย่างถูกต้อง
  - [ ] หากข้อมูลไม่ผ่านการตรวจสอบ (เช่น ข้ามคำถามบังคับ) ระบบ Rollback ไม่ทิ้งข้อมูลตกค้างในฐานข้อมูล
- **Artefact:** PR Backend Application Submission Controller, Service, Repository พร้อม Tests

##### Task53 [APP-02] พัฒนาหน้าจอและฟอร์มส่งใบสมัครชมรม (Validation & UI)
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE / QA)
- **Dependency:** Task52 (Application API) และ UI Wireframe จาก Task75
- **จุดประสงค์ & ขอบเขต:** สร้างแบบฟอร์มกรอกใบสมัครชมรมตามคำถามที่ชมรมกำหนด ทำ Form Validation (Required, URL link, Text length), แสดง Loading Spinner, ป้องกัน Double Submit และ Redirect ไปหน้าประวัติเมื่อส่งสำเร็จ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ฟอร์มแสดงคำถามคัดเลือกครบถ้วน และตรวจสอบช่องบังคับกรอกได้อย่างถูกต้องก่อนส่ง
  - [ ] ป้องกันการกดปุ่มส่งซ้ำ (Double Submit) ขณะที่ระบบกำลังประมวลผลคำขอ
  - [ ] เมื่อส่งสำเร็จ ระบบแสดงข้อความยืนยันและนำทางไปยังหน้าติดตามสถานะใบสมัคร (US-04) ได้อย่างราบรื่น
- **Artefact:** PR หน้าจอและแบบฟอร์มส่งใบสมัครชมรม พร้อม Frontend Component Tests

##### Task54 [APP-03] ตรวจรับกระบวนการส่งใบสมัครจากหน้าจอถึงฐานข้อมูล (E2E Test)
- **Label:** 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom) & สิรวิชญ์ (QA Lead)
- **Reviewer:** สิรวิชญ์ (QA Lead)
- **Dependency:** Task52 (Backend API) และ Task53 (Frontend Form)
- **จุดประสงค์ & ขอบเขต:** ทดสอบโฟลว์การสมัครชมรมตั้งแต่การกรอกฟอร์มหน้าเว็บไปจนถึงการบันทึกลง PostgreSQL จริง ทดสอบทั้งกรณีปกติ (Happy Path) และกรณีรอบปิดกะทันหัน ตรวจสอบตาราง `applications`, `answers`, `history`
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ทดสอบ Flow การสมัครตั้งแต่หน้าเว็บจนถึงฐานข้อมูลผ่าน 100% ข้อมูลบันทึกถูกต้องตรงกัน
  - [ ] เมื่อรอบรับสมัครปิดระหว่างกรอก ระบบแจ้งเตือนชัดเจนและไม่สร้างใบสมัครผิดเงื่อนไข
  - [ ] ผลการทดสอบทุก Test Cases ผ่านการตรวจรับและไม่มี Defect ตกค้าง
- **Artefact:** รายงานผลการตรวจรับ End-to-End Application Submission Test Report

---

#### [Feature: APP TRACKING (US-04)]
##### Task64 [APP-04] พัฒนาระบบติดตามสถานะและประวัติใบสมัครของตนเอง
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2) & ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Seed Data จาก Task55 และ API Contract จาก Task75
- **จุดประสงค์ & ขอบเขต:** พัฒนา Backend Endpoint `GET /api/v1/applications/my` และหน้าเว็บแสดงการ์ดประวัติใบสมัคร พร้อมป้ายสถานะ (รอตรวจ, นัดสัมภาษณ์, ผ่าน, ไม่ผ่าน) ไทม์ไลน์ และข้อความจากกรรมการชมรม
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] นักศึกษาที่ล็อกอินสามารถดูประวัติใบสมัครชมรมทั้งหมดของตนเองได้ครบถ้วน
  - [ ] สถานะใบสมัครและข้อความผลการคัดเลือกแสดงผลตรงตามข้อมูลในฐานข้อมูล
  - [ ] ไม่สามารถมองเห็นข้อมูลใบสมัครของนักศึกษาคนอื่นได้โดยเด็ดขาด
- **Artefact:** PR Backend My Applications API + หน้าเว็บประวัติใบสมัคร พร้อม Tests

---

#### [Feature: REVIEW & RESULT (US-09)]
##### Task65 [REVIEW-01] ทำ Backend API รายการและรายละเอียดผู้สมัครสำหรับกรรมการ
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task74–75 (Permission Matrix) และ Seed Data จาก Task55
- **จุดประสงค์ & ขอบเขต:** พัฒนา Endpoint `GET /api/v1/clubs/:id/applications` พร้อม Filter สถานะ และ `GET /api/v1/clubs/:id/applications/:appId` เพื่อดูคำตอบและเอกสารแนบของผู้สมัคร เฉพาะกรรมการชมรมนั้น
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] กรรมการชมรมดึงรายการและคำตอบของผู้สมัครในชมรมตนเองได้ครบถ้วน
  - [ ] กรรมการชมรมอื่นหรือผู้ใช้ทั่วไป ไม่สามารถเข้าถึงข้อมูลผู้สมัครได้ (`403 Forbidden`)
- **Artefact:** PR Backend Review API พร้อมชุด Automated Permission Tests

##### Task66 [REVIEW-02] พัฒนาหน้าจอดูรายชื่อและตรวจใบสมัครสำหรับกรรมการ
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task65 (Review API) และ Wireframe จาก Task75
- **จุดประสงค์ & ขอบเขต:** สร้างหน้าจอตารางแสดงรายชื่อผู้สมัคร, ตัวกรองสถานะ, และ Modal หรือหน้ารายละเอียดเพื่อตรวจคำตอบและดาวน์โหลดเอกสารแนบ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] กรรมการสามารถดูตารางรายชื่อผู้สมัครและกรองตามสถานะได้อย่างถูกต้อง
  - [ ] คลิกดูรายละเอียดคำตอบและเอกสารแนบของผู้สมัครแต่ละคนได้สะดวกและครบถ้วน
- **Artefact:** PR หน้าจอตารางและหน้ารายละเอียดตรวจใบสมัคร พร้อม Component Tests

##### Task67 [RESULT-01] ทำ Backend API บันทึกผลการคัดเลือกและประกาศผล
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** อริยะวีร์ (BE2 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task65 และ Permission Matrix จาก Task74
- **จุดประสงค์ & ขอบเขต:** พัฒนา API บันทึกผลการคัดเลือก (ผ่าน/ไม่ผ่าน/ตัวสำรอง) และ Endpoint สั่งยืนยันประกาศผล (Publish Results) โดยสถานะฉบับร่างจะไม่แสดงต่อนักศึกษา พร้อมระบบ Audit Logging
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] บันทึกผลการคัดเลือกได้ถูกต้อง และสถานะใบสมัครเปลี่ยนตามที่กำหนด
  - [ ] ผลการคัดเลือกจะยังไม่แสดงต่อนักศึกษาจนกว่ากรรมการจะกดยืนยันประกาศผล (Publish)
  - [ ] มี Audit Log บันทึกประวัติการบันทึกและประกาศผลอย่างครบถ้วน
- **Artefact:** PR Backend Result & Publish API พร้อม Automated Tests

##### Task68 [RESULT-02] พัฒนาหน้าจอประเมินคะแนนและกดยืนยันประกาศผล
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ภูบดี (FE1 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task67 (Result API) และ Task66 (Review UI)
- **จุดประสงค์ & ขอบเขต:** พัฒนา UI บันทึกผลการคัดเลือก (Dropdown/Radio เลือก ผ่าน/ไม่ผ่าน), ช่องใส่หมายเหตุ, และปุ่ม "ประกาศผล" พร้อม Modal เตือนยืนยัน
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] กรรมการสามารถเลือกบันทึกผลการคัดเลือกและกรอกหมายเหตุได้สะดวก
  - [ ] มีกล่องข้อความเตือนยืนยันอย่างชัดเจนก่อนกดประกาศผล เพื่อป้องกันข้อผิดพลาด
- **Artefact:** PR หน้าจอประเมินผลและกดยืนยันประกาศผล พร้อม Tests

---

#### [Feature: MEMBER CONFIRMATION (US-05)]
##### Task69 [MEMBER-01] ทำ Backend API ยืนยันสิทธิ์/สละสิทธิ์ และเพิ่มเป็นสมาชิกชมรม
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** วรพล (BE1 - Backend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Result API จาก Task67 และ Schema จาก Task55
- **จุดประสงค์ & ขอบเขต:** พัฒนา `POST /api/v1/applications/:id/confirm` และ `/decline` เมื่อผู้สมัครกดยืนยันสิทธิ์ ให้สร้าง Record เข้าตารางสมาชิกชมรม (Club Member) ทันทีใน Transaction เดียวกัน
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ผู้สมัครที่ผ่านการคัดเลือกสามารถกดยืนยันสิทธิ์หรือสละสิทธิ์ได้ภายในเวลาที่กำหนด
  - [ ] เมื่อยืนยันสิทธิ์สำเร็จ ระบบเพิ่มชื่อเข้าตารางสมาชิกชมรม (Member) ทันทีอย่างถูกต้อง
  - [ ] ผู้ที่ไม่ผ่านการคัดเลือก หรือผู้ที่เลยกำหนดเวลา ไม่สามารถเรียก API นี้ได้
- **Artefact:** PR Backend Confirmation API พร้อม Transaction Tests

##### Task70 [MEMBER-02] พัฒนาหน้าจอให้ผู้สมัครกดยืนยันสิทธิ์หรือสละสิทธิ์
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task69 (Member API) และ Task64 (Tracking UI)
- **จุดประสงค์ & ขอบเขต:** แสดงปุ่ม "ยืนยันสิทธิ์" และ "สละสิทธิ์" เฉพาะใบสมัครที่สถานะผ่านการคัดเลือก พร้อม Confirmation Modal เตือนว่าการยืนยันไม่สามารถแก้ไขได้ และอัปเดตสถานะทันทีหลังทำรายการ
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ปุ่มยืนยันสิทธิ์และสละสิทธิ์จะแสดงเฉพาะใบสมัครที่อยู่ในสถานะผ่านการคัดเลือกเท่านั้น
  - [ ] มีกล่องยืนยัน (Confirmation Modal) ชัดเจนก่อนส่งคำขอ เพื่อป้องกันการกดพลาด
  - [ ] หลังทำรายการสำเร็จ หน้าจออัปเดตสถานะทันทีโดยไม่ต้อง Refresh หน้าเว็บ
- **Artefact:** PR หน้าจอยืนยันสิทธิ์/สละสิทธิ์ บนหน้าติดตามใบสมัคร พร้อม Tests

---

#### [Feature: REPORT & CENTRAL DASHBOARD (US-10)]
##### Task71 [REPORT-01] ทำ Backend API คำนวณสถิติภาพรวมสำหรับ Admin
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** ณัฐชนินทร์ (Boom - Fullstack / Backend)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task79 (Role Check) และ Seed Data จาก Task55
- **จุดประสงค์ & ขอบเขต:** พัฒนา Endpoint `GET /api/v1/admin/dashboard/stats` รวมยอดผู้สมัคร, สถิติตามหมวดหมู่, และชมรมยอดนิยม 5 อันดับแรก จำกัดสิทธิ์เฉพาะผู้ใช้ Role ADMIN เท่านั้น
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] คำนวณตัวเลขสถิติถูกต้องตรงกับข้อมูลจริงในฐานข้อมูล
  - [ ] จำกัดสิทธิ์เฉพาะผู้ใช้ Role ADMIN เท่านั้นที่เข้าถึงได้ (`403 Forbidden` สำหรับคนอื่น)
  - [ ] Query ทำงานรวดเร็ว มีประสิทธิภาพ
- **Artefact:** PR Backend Admin Dashboard Stats API พร้อม Aggregation Tests

##### Task72 [REPORT-02] พัฒนาหน้า Central Dashboard แสดงกราฟและสถิติภาพรวม
- **Label:** 3. Development (Coding) + 4. Testing & QA
- **Owner:** เขมจิรา (FE2 - Frontend Engineer)
- **Reviewer:** สิรวิชญ์ (SE)
- **Dependency:** Task71 (Report API) และ Wireframe จาก Task75
- **จุดประสงค์ & ขอบเขต:** สร้างหน้า Dashboard สำหรับผู้บริหาร/Admin มีการ์ดสรุปตัวเลขสำคัญ (ยอดผู้สมัคร, ชมรมเปิดรับ), แผนภูมิกราฟแท่ง/วงกลม และบล็อกไม่ให้คนทั่วไปเข้าถึงได้
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] แสดงตัวเลขสถิติและแผนภูมิกราฟถูกต้องตรงตามข้อมูลจาก API
  - [ ] แผนภูมิตอบสนองสวยงาม โหลดข้อมูลได้อย่างราบรื่น
  - [ ] ผู้ใช้ทั่วไปที่ไม่ใช่ Admin ไม่สามารถเข้าถึงหน้านี้ได้
- **Artefact:** PR หน้าเว็บ Central Dashboard พร้อม Component Tests

---

### [Phase 5: CI/CD & DevOps Pipeline]

#### Task82 [PIPELINE-01] ตั้งค่า GitHub Actions CI สำหรับ Build และรัน Unit Tests
- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ ณัฐชนินทร์ (Boom)
- **Reviewer:** สิรวิชญ์ (DevOps / QA)
- **Dependency:** คำสั่ง Build/Test ของ Frontend และ Backend ใน Task75
- **จุดประสงค์ & ขอบเขต:** สร้าง GitHub Actions Workflow `.github/workflows/ci-build-test.yml` รัน Linter, คอมไพล์โค้ด และรัน Unit Tests อัตโนมัติทุกครั้งที่มีการเปิด Pull Request
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ทุก Pull Request ที่เปิดขึ้นมา ระบบจะรัน CI ตรวจสอบโค้ดโดยอัตโนมัติ
  - [ ] หากมี Unit Test พัง หรือโค้ดคอมไพล์ไม่ผ่าน CI จะแจ้งเตือนและบล็อกการ Merge ทันที
- **Artefact:** ไฟล์ GitHub Actions Workflow (`ci-build-test.yml`) พร้อมผลรันบน PR

#### Task83 [PIPELINE-02] ตั้งค่า GitHub Actions CI สำหรับ Integration Tests พร้อม Database
- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead / QA) ร่วมกับ วรพล (DevOps)
- **Reviewer:** สิรวิชญ์ (DevOps / QA)
- **Dependency:** Task82 (CI พื้นฐาน) และ Flyway Migration จาก Task55
- **จุดประสงค์ & ขอบเขต:** สร้าง GitHub Actions Workflow `.github/workflows/ci-integration.yml` ที่ยก PostgreSQL Service Container ขึ้นมา รัน Flyway Migration และรัน Integration Tests ทุก Feature
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] Pipeline เริ่มรัน PostgreSQL และรัน Flyway Migration ได้สำเร็จอัตโนมัติ
  - [ ] Integration Tests รันผ่านครบ 100% บน GitHub Actions
  - [ ] มีสรุปผลการทดสอบ (Test Report Summary) แสดงให้เห็นบน GitHub Actions
- **Artefact:** ไฟล์ GitHub Actions Workflow (`ci-integration.yml`) พร้อม Test Report บน GitHub

#### Task84 [PIPELINE-03] ตั้งค่า GitHub Actions CD Workflow ติดตั้งระบบขึ้น Staging อัตโนมัติ
- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead)
- **Reviewer:** วรพล (DevOps)
- **Dependency:** Staging Server จาก Task56 และ CI จาก Task82–83
- **จุดประสงค์ & ขอบเขต:** สร้าง GitHub Actions Workflow `.github/workflows/cd-deploy.yml` ทำการ Build Docker Images, Push ขึ้น Registry, Deploy ขึ้น Staging Server อัตโนมัติ และยิง Health Check หลัง Deploy
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] เมื่อโค้ดถูก Merge เข้า `main` หรือติด Release Tag ระบบจะ Deploy ขึ้น Staging อัตโนมัติ
  - [ ] มีขั้นตอน Health Check ตรวจสอบหลัง Deploy หากล้มเหลวจะแจ้งเตือนทันที
- **Artefact:** ไฟล์ GitHub Actions Workflow (`cd-deploy.yml`) พร้อมบันทึกการ Deploy สำเร็จ

---

### [Phase 6: Release Verification & Retrospective]

#### Task56 [RELEASE-02] ติดตั้งระบบทดสอบและผ่าน Smoke Test บน Staging
- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (QA / DevOps) & วรพล
- **Reviewer:** สิรวิชญ์ (QA)
- **Dependency:** Deployment Workflow จาก Task84 และ Seed Data จาก Task55
- **จุดประสงค์ & ขอบเขต:** ตรวจสอบความพร้อมของเซิร์ฟเวอร์ Staging และรัน Smoke Test เพื่อยืนยันว่า Container, Database และ Endpoint พื้นฐานทำงานได้สมบูรณ์
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] คอนเทนเนอร์และฐานข้อมูลรันขึ้นอย่างเสถียรบน Staging
  - [ ] Health Check Endpoint ตอบกลับสถานะ UP
  - [ ] สามารถเข้าถึงหน้าแรกของเว็บไซต์ได้โดยไม่มี Error 500
- **Artefact:** บันทึกผลการรัน Smoke Test บน Staging Environment

#### Task73 [RELEASE-05] ตรวจรับระบบรวม End-to-End และเตรียมพร้อมส่งมอบ Sprint 2
- **Label:** 4. Testing & QA
- **Owner:** สิรวิชญ์ (QA Lead) ร่วมกับทีมทั้ง 7 คน
- **Reviewer:** ชนิตว์นันท์ (PO) & สมาชิกทุกคน
- **Dependency:** ทุก Feature Tasks (Task62–72) ต้องเสร็จสิ้นเรียบร้อย
- **จุดประสงค์ & ขอบเขต:** ทดสอบโฟลว์การทำงานจริงทุกฟีเจอร์ของ Sprint 2 ตั้งแต่ต้นจนจบ (End-to-End Test), แก้ไขบักตกค้าง, และเตรียม Release Notes กับ Demo Script สำหรับนำเสนออาจารย์
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] ทดสอบ Flow การทำงานของ Sprint 2 ครบถ้วนทุกฟีเจอร์ และไม่มีบักระดับ Critical ตกค้าง
  - [ ] มีเอกสาร Release Notes สรุปผลงานของ Sprint 2 อย่างเป็นทางการ
  - [ ] เตรียมขั้นตอน Demo Script สำหรับการนำเสนออาจารย์เรียบร้อย
- **Artefact:** เอกสาร End-to-End Test Report, Release Notes, และ Demo Script สำหรับพรีเซนต์

#### Feature Mini Retrospectives (Task85–Task91)
ประชุมสั้น 10–15 นาทีเมื่อแต่ละฟีเจอร์ผ่าน DoD เพื่อตรวจรับงานและส่งต่องาน ไม่ต้องรอทั้งทีม:
- **Task85 [FEEDBACK-AUTH]:** วรพล & ณัฐชนินทร์ (Review ฟีเจอร์ AUTH & Security)
- **Task86 [FEEDBACK-CLUB]:** ภูบดี & วรพล (Review หน้าค้นหาชมรม และสิทธิ์แก้ไข)
- **Task87 [FEEDBACK-RECRUIT]:** อริยะวีร์ (Review การแก้บักคำถามคัดเลือก)
- **Task88 [FEEDBACK-APP]:** เขมจิรา & ณัฐชนินทร์ (Review หน้าส่งใบสมัคร US-03 และหน้าติดตามสถานะ US-04)
- **Task89 [FEEDBACK-REVIEW-RESULT]:** อริยะวีร์ & ภูบดี (Review โฟลว์การตรวจและประกาศผล)
- **Task90 [FEEDBACK-MEMBER]:** วรพล & เขมจิรา (Review การกดยืนยันสิทธิ์สมาชิก)
- **Task91 [FEEDBACK-REPORT]:** ณัฐชนินทร์ & เขมจิรา (Review หน้า Dashboard และสถิติ Admin)

#### Task92 [SPRINT-RETRO] ประชุมสรุปผลงาน Sprint 2 Review และ Retrospective ระดับทีม
- **Label:** 6. Scrum / Review & Retro
- **Owner:** สิรวิชญ์ (Scrum Master) นำทีม
- **Reviewer:** สมาชิกทั้ง 7 คน
- **Dependency:** สิ้นสุดระยะเวลาของ Sprint 2
- **จุดประสงค์ & ขอบเขต:** ประชุมสรุปผลการทำงานจริงของ Sprint 2 (Sprint Review) เทียบกับแผนงาน และทบทวนกระบวนการทำงานในทีม (Retrospective: What went well / What went wrong / Action Items) เพื่อนำไปปรับปรุงในรอบถัดไป
- **เกณฑ์ตรวจรับ (Acceptance Criteria):**
  - [ ] สมาชิกทั้ง 7 คนเข้าร่วมประชุมและให้ความคิดเห็นครบถ้วน
  - [ ] ได้ Action Items ที่ชัดเจนและนำไปปรับใช้จริงใน Sprint ถัดไป
- **Artefact:** เอกสารสรุปผล Sprint 2 Review & Retrospective ใน Repository
