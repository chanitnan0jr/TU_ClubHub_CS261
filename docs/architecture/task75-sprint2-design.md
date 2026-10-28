# Task75 — เอกสารออกแบบระบบ สถาปัตยกรรม API Contract, Database Schema และ UI Wireframe สำหรับ Sprint 2

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | [`Task75 [SYS-DESIGN]`](../tasks/sprint2/Task75.md) — ออกแบบ API Contract, Database Schema และหน้าจอร่วมกัน |
| **Trello Card** | [https://trello.com/c/cauHoZZ5](https://trello.com/c/cauHoZZ5) |
| **Owner** | สิรวิชญ์ กฤดาธิการวุฒิ (`@sirkrid10` — SE / System Architect / QA Lead / Scrum Master) |
| **Reviewer** | ชนิตว์นันท์ กิตนันท์ขุน (`@chanitnan0jr` — PO / System Analyst) |
| **Upstream Dependency** | [`Task74 [SYS-ANALYSIS]`](task74-sprint2-analysis.md) (Merged in PR #58) |
| **Downstream Tasks** | `Task51`–`Task81` (Development, Security Hardening & QA Integration ใน Sprint 2) |
| **วันที่จัดทำ** | 28 ตุลาคม 2026 |
| **สถานะเอกสาร** | Ready for PO / Team Review (`docs/task75-sprint2-design`) |

---

## 1. วัตถุประสงค์และตารางเชื่อมโยงการออกแบบ (Design Traceability Matrix)

เอกสารฉบับนี้เป็นผลงานส่งมอบหลักของ **Task75 [SYS-DESIGN]** โดยนำข้อกำหนดและผลการตัดสินใจเชิงธุรกิจจาก [`task74-sprint2-analysis.md`](task74-sprint2-analysis.md) (`T74-D01` ถึง `T74-D09`), [`system-architecture.md`](system-architecture.md), และ [`permission-matrix.md`](../security/permission-matrix.md) มาแปลงเป็นข้อตกลงทางเทคนิค (Technical Contract) ที่ชัดเจน 100% ระหว่างทีม Frontend, Backend และ QA ก่อนเริ่มเขียนโค้ดใน Sprint 2

### 1.1 การแปลงผลการตัดสินใจจาก Task74 (`T74-D01` – `T74-D09`) สู่ Technical Contract

| Decision ID | ข้อสรุปจาก Task74 (`SYS-ANALYSIS`) | ข้อตกลงทางเทคนิคใน Task75 (`SYS-DESIGN`) | เอกสาร OpenAPI / Schema ที่อัปเดต |
|---|---|---|---|
| **T74-D01** | Private resource มีอยู่จริงแต่ไม่มีสิทธิ์ ใช้ `403 ACCESS_DENIED`; ไม่มีอยู่จริงใช้ `404 RESOURCE_NOT_FOUND` (ยกเว้น Public club / Form availability ที่คง `404` ซ่อนทรัพยากรไม่เปิดเผย) | กำหนดลำดับการตรวจสิทธิ์ (Guard Evaluation Order) และ Response Schema ของทุก Protected Endpoint ใน `openapi.yaml` และ `rounds.openapi.yaml` ให้แยก `403` กับ `404` อย่างชัดเจน | [`openapi.yaml`](../api/openapi.yaml), [`rounds.openapi.yaml`](../api/rounds.openapi.yaml), [§3](#3-มาตรฐาน-error-response-ตาม-rfc-7807-และ-reason-codes) |
| **T74-D02** | ตัด `INTERVIEW` ออกจาก MVP; `UNDER_REVIEW` เป็นขั้น Optional ผ่าน Explicit Action เท่านั้น (`GET` ห้ามเปลี่ยนสถานะ); ตัดสิน `SUBMITTED -> ACCEPTED/REJECTED` ได้โดยตรงหลังรอบปิดรับจริง | กำหนด `PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` ให้รับการเปลี่ยนสถานะจาก `SUBMITTED` หรือ `UNDER_REVIEW` ไปยัง `ACCEPTED`/`REJECTED` หลัง `serverNow >= COALESCE(closed_at, closes_at)` และเพิ่ม Optional `POST .../start-review` แยกจาก `GET` | [`openapi.yaml`](../api/openapi.yaml), [§2.6](#26-การเปิดอ่านใบสมัครสำหรับกรรมการ-us-09-และการบันทึกประกาศผลคัดเลือก-s2-decision-draft--s2-publication-draft--task65task68) |
| **T74-D03** | แยกงานอ่านใบสมัคร (`US-09`) ออกจากงานบันทึกผล (`S2-DECISION-DRAFT`) และงานประกาศผลโดย `PRESIDENT` (`S2-PUBLICATION-DRAFT`); การประกาศผลของรอบห้ามเขียน `ACCEPTED -> ACCEPTED` ลง `application_status_history` | ออกแบบ Endpoint `PUT .../decision` และ `POST /api/v1/rounds/{roundId}/publish-results` แยกจาก `GET`; การประกาศผลอัปเดต `recruitment_rounds.results_published_at`, เพิ่ม `version` และสร้าง `notifications` (`RESULT_PUBLISHED`) ใน Transaction เดียว | [`openapi.yaml`](../api/openapi.yaml), [§2.6](#26-การเปิดอ่านใบสมัครสำหรับกรรมการ-us-09-และการบันทึกประกาศผลคัดเลือก-s2-decision-draft--s2-publication-draft--task65task68), [§4.3](#43-การบันทึก-audit-ของการประกาศผลโดยไม่ขัด-chk_app_history_change) |
| **T74-D04** | ก่อน `results_published_at IS NOT NULL` ต้องซ่อนผลภายใน (`UNDER_REVIEW`, `ACCEPTED`, `REJECTED`), ข้อความผล, เวลาตัดสิน, ประวัติหลังส่ง และปุ่มยืนยัน/สละสิทธิ์; ห้ามเปิดเผย `application_reviews` แก่ผู้สมัครทุกกรณี | กำหนด Server-side Projection DTO (`ApplicantApplicationSummary`, `ApplicantApplicationDetail`) พร้อมฟิลด์ `applicantVisibleStatus`, `canConfirm`, `canDecline` และตาราง Mapping การกรอง `statusHistory` | [`openapi.yaml`](../api/openapi.yaml), [§2.4](#24-การติดตามสถานะและประวัติใบสมัครของตนเอง-us-04--task64), [§5.3](#53-ตาราง-mapping-สถานะและปุ่มดำเนินการสำหรับผู้สมัคร-t74-d04--us-04--us-05) |
| **T74-D05** | การเรียกซ้ำ Action เดิมที่สำเร็จแล้ว (`confirm` ซ้ำเมื่อ `CONFIRMED` หรือ `decline` ซ้ำเมื่อ `DECLINED`) คืนผลเดิมโดยไม่เขียนข้อมูลซ้ำ; การเรียก Action สวนทางหรือหลังจบรายการคืน `409 RESOURCE_CONFLICT` | กำหนด `POST /api/v1/me/applications/{applicationId}/confirm` และ `/decline` คืน `200 OK` (`MembershipOfferResponse` พร้อม `idempotentReplay: true`) เมื่อ Action ตรงกับสถานะสุดท้ายเดิม และคืน `409` (`reason: ALREADY_RESPONDED`) เมื่อสวนทาง | [`openapi.yaml`](../api/openapi.yaml), [§2.5](#25-การยืนยันสิทธิ์หรือสละสิทธิ์เข้าชมรม-us-05--task69--task70) |
| **T74-D06** | การตอบรับใหม่ตรวจ `results_published_at <= serverNow < confirmation_deadline` ณ จุดตัดสินหลังได้ DB Lock; เมื่อถึง `confirmation_deadline` งานอัตโนมัติเปลี่ยนเฉพาะ `ACCEPTED` ที่ประกาศแล้วและยังไม่ตอบรับเป็น `EXPIRED` | กำหนดลำดับ Row Lock, การอ่าน `Clock.instant()` หลังได้ Lock, และเสนอออกแบบ `ApplicationOfferExpiryWorker` (`@Scheduled` ทุก 60 วินาที + Startup Catch-up — **ข้อเสนอเชิงเทคนิค รอ PO/Reviewer ยืนยัน**) ที่เขียน `EXPIRED` พร้อม `actor_id = NULL`, `reason = 'CONFIRMATION_DEADLINE_EXPIRED'`, และ `changed_at = serverNow` | [§4.2](#42-ลำดับการล็อกข้อมูล-deterministic-locking-order-และการป้องกัน-race-condition), [§4.4](#44-การออกแบบ-background-worker-สำหรับตัดสิทธิ์เมื่อหมดเวลา-sd-11--t74-d06) |
| **T74-D07** | การยืนยันสิทธิ์ใหม่ปฏิเสธด้วย `409 RESOURCE_CONFLICT` (`EXISTING_CLUB_MEMBERSHIP`) ทุกกรณีที่มีแถวเดิมใน `club_memberships` ของ `(club_id, user_id)` ไม่ว่าสถานะ `ACTIVE`, `INACTIVE`, `LEFT`, หรือ `REMOVED` (ไม่มี Reactivation ใน MVP) และตรวจเพดาน 5 ชมรม (`MEMBERSHIP_LIMIT_REACHED`) | กำหนด Query ตรวจสอบ `EXISTS (SELECT 1 FROM club_memberships WHERE club_id = :clubId AND user_id = :userId)` และการล็อกแถว `student_profiles` (`FOR UPDATE`) เพื่อป้องกันการกดยืนยันข้ามชมรมพร้อมกันเกิน 5 ชมรม | [`openapi.yaml`](../api/openapi.yaml), [§2.5](#25-การยืนยันสิทธิ์หรือสละสิทธิ์เข้าชมรม-us-05--task69--task70), [§4.2](#42-ลำดับการล็อกข้อมูล-deterministic-locking-order-และการป้องกัน-race-condition) |
| **T74-D08** | แดชบอร์ดส่วนกลาง (`US-10`) สำหรับ `ADMIN` ต้องแยกระหว่างจำนวนใบสมัคร (`totalApplications`), จำนวนผู้สมัครไม่ซ้ำ (`uniqueApplicants`), สมาชิกใหม่ที่ยืนยันจากรอบที่กรอง (`confirmedNewMembers`) และสมาชิก Active ปัจจุบัน (`currentActiveMemberships`) โดยไม่เกิดยอดซ้ำจากการ Join | เสนอออกแบบ `GET /api/v1/admin/dashboard/stats` พร้อม Query Parameters (`q`, `categoryId`, `academicYear`, `semester`, `clubStatus`, `page`, `size`) และ Aggregation Schema ที่ใช้ Subquery/CTE แยกมิติชัดเจน (**ข้อเสนอเชิงเทคนิคใน Task75 รอ PO/Reviewer ยืนยัน**) | [`openapi.yaml`](../api/openapi.yaml), [§2.7](#27-แดชบอร์ดสถิติภาพรวมส่วนกลางสำหรับ-admin-us-10--task71--task72), [§4.5](#45-แนวทางการเขียน-aggregation-query-สำหรับ-admin-dashboard-us-10--t74-d08) |
| **T74-D09** | ยืนยันกฎการเปิดอ่านฟอร์มใบสมัคร (`Task42` / `US-03`): บังคับ Login (`SESSION`), บัญชี `ACTIVE`, นักศึกษา `ACTIVE`, ชมรม `ACTIVE` และรอบ `PUBLISHED` ที่เปิดอยู่; การตรวจสมัครซ้ำและโควตา 5 ชมรมตรวจที่ `POST` ตอนกดส่ง พร้อมส่งสถานะ Eligibility เบื้องต้นให้ UI | อัปเดตสถานะ `GET /api/v1/rounds/{roundId}/application-form` และ `POST /api/v1/rounds/{roundId}/applications` ใน `openapi.yaml` ให้เชื่อมโยงกับ `Task52` และ `Task53` | [`openapi.yaml`](../api/openapi.yaml), [§2.3](#23-แบบฟอร์มและการส่งใบสมัครออนไลน์-us-03--task42--task52--task53) |

---

## 2. สรุป API Contract ทั้งหมดสำหรับ Sprint 2

> [!NOTE]
> **Single Source of Truth สำหรับ Request/Response Schemas:**
> โครงสร้าง DTO ทั้งหมดยึด `components/schemas` ใน [`docs/api/openapi.yaml`](../api/openapi.yaml) และ [`docs/api/rounds.openapi.yaml`](../api/rounds.openapi.yaml) เป็นแหล่งอ้างอิงเดียว (Single Source of Truth) โดยมีการตรวจสอบความตรงกันระหว่าง `schema` กับ `example` ด้วย [`redocly.yaml`](../../redocly.yaml) (`no-invalid-media-type-examples: error`) ทุกครั้ง

ตารางด้านล่างรวบรวมทุก Endpoint ที่เกี่ยวข้องกับงานพัฒนาใน Sprint 2 (`Task51`–`Task81`):

| หมวดฟีเจอร์ | HTTP Method & Path | Operation ID | สิทธิ์การเข้าถึง (Auth & Guard) | ไฟล์ Spec | งานที่เกี่ยวข้อง |
|---|---|---|---|---|---|
| **Auth & Role Sync** | `GET /api/v1/auth/me` | `getCurrentUser` | `SESSION` (`ACTIVE` account); ดึง `role`, `studentStatus`, และ `activeCommitteeAssignments` สดจาก DB (`partially-implemented`, ขยายใน `Task79`) | `openapi.yaml` | `Task79`, `Task80`, `Task81` |
| **Public Club Search** | `GET /api/v1/public/clubs` | `searchPublicClubs` | Public (`security: []`); กรองเฉพาะ `clubs.status = 'ACTIVE'` | `openapi.yaml` | `US-01`, `Task62`, `Task63` |
| **Public Club Master** | `GET /api/v1/public/club-categories` | `listPublicClubCategories` | Public (`security: []`); รายการหมวดหมู่ชมรมจาก `club_categories` เรียง `name ASC, id ASC` | `openapi.yaml` | `US-01`, `Task62`, `Task63` |
| **Public Club Master** | `GET /api/v1/public/interest-tags` | `listPublicInterestTags` | Public (`security: []`); รายการแท็กความสนใจจาก `tags` เรียง `name ASC, id ASC` | `openapi.yaml` | `US-01`, `Task62`, `Task63` |
| **Public Club Detail** | `GET /api/v1/public/clubs/{id}` | `getPublicClubProfile` | Public (`security: []`); `Cache-Control: no-store`; เพิ่ม `canEditProfile` เมื่อมี Session ของกรรมการที่มีผลของชมรมนั้น (`partially-implemented`, ขยายใน `Task81`) | `openapi.yaml` | `US-02`, `Task81` |
| **Club Profile Edit** | `GET /api/v1/clubs/{clubId}`<br/>`PUT /api/v1/clubs/{clubId}` | `getClub`<br/>`updateClub` | `GET`: Public (`Cache-Control: no-store`, + `canEditProfile`)<br/>`PUT`: `SESSION` + `CSRF` + Effective `COMMITTEE`/`PRESIDENT` ของชมรมนั้นเท่านั้น | `openapi.yaml` | `US-06`, `Task81` |
| **Question Lock** | `PUT /api/v1/rounds/{roundId}/questions/{questionId}`<br/>`DELETE /api/v1/rounds/{roundId}/questions/{questionId}` | `replaceApplicationQuestion`<br/>`deleteApplicationQuestion` | `SESSION` + `CSRF` + Effective `COMMITTEE`/`PRESIDENT` (ห้าม Self-review); คืน `409 QUESTION_HAS_ANSWERS` เมื่อมีคำตอบแล้ว | `rounds.openapi.yaml` | `US-08`, `Task51`, `Task60` |
| **Application Form** | `GET /api/v1/rounds/{roundId}/application-form` | `getRoundApplicationForm` | `SESSION` + `ACTIVE` account + `ACTIVE` student; รอบต้อง `PUBLISHED` และอยู่ในช่วงเปิดรับ | `openapi.yaml` | `US-03`, `Task42`, `Task52`, `Task53` |
| **Submit Application** | `POST /api/v1/rounds/{roundId}/applications` | `submitApplication` | `SESSION` + `CSRF` + `ACTIVE` account + `ACTIVE` student; ตรวจเวลาเปิดรับ, สมัครซ้ำ, สมาชิกเดิม (`ALREADY_MEMBER`) และเพดาน 5 ชมรม | `openapi.yaml` | `US-03`, `Task42`, `Task52`, `Task53` |
| **My Applications** | `GET /api/v1/me/applications` | `listMyApplications` | `SESSION` + `ACTIVE` account; ดึงเฉพาะ `applicant_id = sessionUserId` พร้อม Mask สถานะก่อนประกาศผล | `openapi.yaml` | `US-04`, `Task64` |
| **My Application Detail** | `GET /api/v1/me/applications/{applicationId}` | `getMyApplicationDetail` | `SESSION` + `ACTIVE` account + Ownership (`403` ถ้าเป็นของคนอื่น, `404` ถ้าไม่มีจริง) | `openapi.yaml` | `US-04`, `Task64` |
| **Confirm Membership** | `POST /api/v1/me/applications/{applicationId}/confirm` | `confirmMembershipOffer` | `SESSION` + `CSRF` + `ACTIVE` account + Ownership (`ACTIVE` student & club สำหรับการยืนยันใหม่; Idempotent `200` สำหรับ Retry) | `openapi.yaml` | `US-05`, `Task69`, `Task70` |
| **Decline Membership** | `POST /api/v1/me/applications/{applicationId}/decline` | `declineMembershipOffer` | `SESSION` + `CSRF` + `ACTIVE` account + Ownership (ไม่บังคับ student/club `ACTIVE`; Idempotent `200` สำหรับ Retry) | `openapi.yaml` | `US-05`, `Task69`, `Task70` |
| **Committee Review List** | `GET /api/v1/rounds/{roundId}/applications` | `listRoundApplicationsForCommittee` | `SESSION` + Effective `COMMITTEE`/`PRESIDENT` ของชมรมเจ้าของรอบ + ไม่มีใบสมัครตนเองในรอบนั้น (`Read-only`) | `openapi.yaml` | `US-09`, `Task65`, `Task66` |
| **Committee Review Detail** | `GET /api/v1/rounds/{roundId}/applications/{applicationId}` | `getRoundApplicationDetailForCommittee` | `SESSION` + Effective `COMMITTEE`/`PRESIDENT` ของชมรมเจ้าของรอบ + ไม่มีใบสมัครตนเองในรอบนั้น (`Read-only`) | `openapi.yaml` | `US-09`, `Task65`, `Task66` |
| **Start Application Review** | `POST /api/v1/rounds/{roundId}/applications/{applicationId}/start-review` | `startApplicationReview` | `SESSION` + `CSRF` + Effective `COMMITTEE`/`PRESIDENT` + ไม่มี Self-review; เปลี่ยน `SUBMITTED -> UNDER_REVIEW` และ/หรือบันทึกความเห็นกรรมการ (`Optional`) | `openapi.yaml` | `T74-D02`, `US-09`, `Task65`, `Task66` |
| **Record Internal Decision** | `PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` | `recordApplicationDecision` | `SESSION` + `CSRF` + Effective `COMMITTEE`/`PRESIDENT` + ไม่มี Self-review; รอบต้องปิดรับจริงแล้วและยังไม่ประกาศผล | `openapi.yaml` | `S2-DECISION-DRAFT`, `Task67`, `Task68` |
| **Publish Round Results** | `POST /api/v1/rounds/{roundId}/publish-results` | `publishRoundSelectionResults` | `SESSION` + `CSRF` + Effective `PRESIDENT` เท่านั้น + ไม่มี Self-review; ใบสมัครคัดเลือกต้องตัดสินครบทุกใบและก่อน `confirmation_deadline` | `openapi.yaml` | `S2-PUBLICATION-DRAFT`, `Task67`, `Task68` |
| **Admin Dashboard Stats** | `GET /api/v1/admin/dashboard/stats` | `getAdminDashboardStats` | `SESSION` + `ACTIVE` account + Global `users.system_role = 'ADMIN'` จากฐานข้อมูลล่าสุด | `openapi.yaml` | `US-10`, `Task71`, `Task72` |

> [!IMPORTANT]
> **ข้อกำหนดเรื่อง Canonical Endpoint Paths (ห้ามสร้าง Duplicate Path Aliases):**
> - ในการ์ดงานต้นทางจาก Trello บางใบระบุ Path ย่อไว้ก่อนการออกแบบ เช่น `GET /api/v1/clubs` (`Task62`), `GET /api/v1/applications/my` (`Task64`), `POST /api/v1/applications/{id}/confirm` (`Task69`), หรือ `GET /api/v1/clubs/{clubId}/applications` (`Task65`)
> - ให้ทั้งทีม Frontend, Backend, และ QA ใช้ **Canonical Path** ตามตารางด้านบนและใน [`docs/api/openapi.yaml`](../api/openapi.yaml) เท่านั้น (`/api/v1/public/clubs`, `/api/v1/me/applications`, `/api/v1/me/applications/{applicationId}/confirm`, `/api/v1/rounds/{roundId}/applications`) โดย **ไม่** เปิด Path Alias ซ้ำซ้อนใน Controller เพื่อป้องกันช่องโหว่การตั้งค่า Security Matcher ไม่ตรงกัน ทั้งนี้ได้เพิ่มหมายเหตุอ้างอิง Canonical Path ไว้ในเอกสาร [`Task62.md`](../tasks/sprint2/Task62.md), [`Task64.md`](../tasks/sprint2/Task64.md), [`Task65.md`](../tasks/sprint2/Task65.md), และ [`Task69.md`](../tasks/sprint2/Task69.md) เรียบร้อยแล้ว

---

### 2.1 รายละเอียด Contract: `GET /api/v1/auth/me` และการตรวจสอบสิทธิ์แก้ไขโปรไฟล์ชมรม (`Task79`, `Task80`, `Task81`)

- **Schema อ้างอิง:** [`CurrentUserResponse`](../api/openapi.yaml), [`CurrentUser`](../api/openapi.yaml), [`ActiveCommitteeAssignmentSummary`](../api/openapi.yaml)

#### 1) การซิงค์สิทธิ์แบบเรียลไทม์ใน `GET /api/v1/auth/me` (`Task79`)
Backend ต้องไม่อ่านเฉพาะ Role ที่เก็บใน HTTP Session ตอน Login แต่ต้อง Query ตาราง `users`, `student_profiles`, `club_memberships`, และ `club_committee_assignments` ณ เวลาที่ถูกเรียกด้วย `Clock.instant()` ปัจจุบัน:

```json
{
  "user": {
    "id": "10001",
    "role": "USER",
    "studentStatus": "ACTIVE",
    "activeCommitteeAssignments": [
      {
        "clubId": "20001",
        "clubName": "ชมรมพัฒนาซอฟต์แวร์แห่งมหาวิทยาลัยธรรมศาสตร์",
        "permissionRole": "PRESIDENT",
        "positionName": "ประธานชมรม",
        "startsAt": "2026-08-01T00:00:00Z",
        "endsAt": "2027-05-31T16:59:59Z"
      }
    ]
  }
}
```

- **`user.id`** (`PositiveBigintId`) และ **`user.role`** (`USER` | `ADMIN`): คงไว้ตามโครงสร้างเดิม 100% เพื่อไม่ให้โค้ด Frontend เดิมพัง
- **`user.studentStatus`** (`ACTIVE` | `INACTIVE` | `GRADUATED` | `UNKNOWN` | `null`): อ่านจาก `student_profiles.student_status` (`null` หากยังไม่มีแถวใน `student_profiles`)
- **`user.activeCommitteeAssignments`**: คืนเฉพาะรายการที่ผ่านเกณฑ์กรรมการที่มีผลครบทุกข้อตาม Permission Matrix §2.2 ณ เวลา `serverNow` (`users.account_status = 'ACTIVE'`, `student_profiles.student_status = 'ACTIVE'`, `clubs.status = 'ACTIVE'`, `club_memberships.status = 'ACTIVE'`, `joined_at <= serverNow`, `ended_at IS NULL`, `club_committee_assignments.status = 'ACTIVE'`, `revoked_at IS NULL`, `starts_at <= serverNow`, และ `ends_at IS NULL OR serverNow < ends_at`) โดยแต่ละรายการต้องมี `permissionRole` (`COMMITTEE` | `PRESIDENT`) และ `positionName` (จาก `club_committee_assignments.position_name`)

#### 2) ฟิลด์ `canEditProfile` และการป้องกันการ Cache ในข้อมูลชมรม (`Task81`)
ใน `PublicClubProfile` (`GET /api/v1/public/clubs/{id}`) และ `ClubDetail` (`GET /api/v1/clubs/{clubId}` / `PUT /api/v1/clubs/{clubId}`):
- เพิ่มฟิลด์ `canEditProfile: boolean`
- **กฎสิทธิ์ที่ตรงกับ `PUT /api/v1/clubs/{clubId}` 100%:**
  - `canEditProfile` จะเป็น `true` **เฉพาะเมื่อ** ผู้เรียกมี Session ที่ `ACTIVE` และมีสถานะเป็นกรรมการที่มีผล (`COMMITTEE` หรือ `PRESIDENT`) ของชมรมนั้น ณ เวลาที่เรียกเท่านั้น
  - ผู้เรียกที่ไม่ได้ Login, นักศึกษาทั่วไป, หรือ **`ADMIN` ส่วนกลางที่ไม่ได้เป็นกรรมการที่มีผลของชมรมนั้น** ต้องได้รับ `canEditProfile: false` (เนื่องจาก `PUT /api/v1/clubs/{clubId}` ไม่อนุญาตให้ `ADMIN` แก้ไขโปรไฟล์ชมรมตาม [`permission-matrix.md`](../security/permission-matrix.md))
- **บังคับส่ง Header `Cache-Control: no-store`:** ทั้ง `GET /api/v1/public/clubs/{id}` และ `GET /api/v1/clubs/{clubId}` ต้องส่ง `Cache-Control: no-store` เสมอ เนื่องจากค่า `canEditProfile` แปรผันตาม Session และสถานะกรรมการแบบเรียลไทม์ของผู้เรียก
- ฝั่ง Frontend ใช้ `canEditProfile` ร่วมกับ `activeCommitteeAssignments` ในการแสดง/ซ่อนปุ่ม **"แก้ไขข้อมูลชมรม"** และทำ Route Guard บน `/clubs/:clubId/edit`

---

### 2.2 รายละเอียด Contract: ค้นหาและกรองชมรมสาธารณะ (`US-01` / `Task62` / `Task63`)

- **Schema อ้างอิง:** [`PublicClubSearchPage`](../api/openapi.yaml), [`PublicClubSummary`](../api/openapi.yaml), [`PublicClubCategoryList`](../api/openapi.yaml), [`PublicClubTagList`](../api/openapi.yaml)

#### 1) `GET /api/v1/public/clubs`
- **การเข้าถึง:** Public (`security: []`), ไม่บังคับ Session; ต้องเพิ่ม `get("/api/v1/public/clubs")`, `get("/api/v1/public/club-categories")`, และ `get("/api/v1/public/interest-tags")` ใน `PublicRoutes.MATCHER`
- **Query Parameters:**
  - `q` (`string`, optional, maxLength `200`): ตัดช่องว่างหัวท้าย (`trim()`); หากว่างเปล่าหลังตัดช่องว่างให้ถือว่าไม่กรองด้วยชื่อ ค้นหาแบบ Case-insensitive substring (`ILIKE`) บน `clubs.name` โดยต้อง Escape อักขระ `%`, `_`, `\` ก่อนค้นหา
  - `categoryId` (`PositiveBigintId`, optional): กรองตาม `clubs.category_id`
  - `tagId` (`PositiveBigintId`, optional): กรองชมรมที่มีแท็กความสนใจตรงกับ `tagId` โดยใช้ `EXISTS (SELECT 1 FROM club_tags ct WHERE ct.club_id = c.id AND ct.tag_id = :tagId)` เพื่อป้องกันไม่ให้ชมรมเดียวแสดงซ้ำเมื่อมีหลายแท็ก (`US-01.BR-08`)
  - `recruitmentStatus` (`string`, optional, enum: `ALL` | `OPEN` | `CLOSED`, default `ALL`): รองรับการกรองสถานะการเปิดรับสมัครตาม `Task62` โดยค่าเริ่มต้นคือ `ALL` เพื่อให้ชมรมสาธารณะที่ไม่ได้เปิดรับสมัครยังคงค้นพบได้ตาม `US-01.BR-08`
  - `page` (`integer`, default `0`, min `0`)
  - `size` (`integer`, default `20`, min `1`, max `100`)
  - `sort` (`string`, enum: `name,asc` | `name,desc`, default `name,asc`; ใช้ `c.id ASC` เป็น Secondary Sort เสมอเพื่อให้ลำดับการแบ่งหน้าคงที่)
- **การรวมเงื่อนไข (`US-01 §10`):** ใช้ `AND` ระหว่าง `clubs.status = 'ACTIVE'` กับทุกตัวกรองที่ระบุ
- **Response (`200 OK` — `PublicClubSearchPage`):**

```json
{
  "items": [
    {
      "id": "20001",
      "name": "ชมรมพัฒนาซอฟต์แวร์ มธ.",
      "description": "พื้นที่เรียนรู้การพัฒนาเว็บแอปพลิเคชันและระบบซอฟต์แวร์สำหรับนักศึกษาธรรมศาสตร์",
      "affiliationLevel": "University",
      "affiliationName": "Thammasat University",
      "imageUrl": "https://images.example.org/clubs/20001.png",
      "category": {
        "id": "30001",
        "name": "วิชาการ"
      },
      "tags": [
        {
          "id": "40001",
          "name": "Programming"
        },
        {
          "id": "40002",
          "name": "Technology"
        }
      ],
      "hasOpenRecruitment": true
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### 2) `GET /api/v1/public/club-categories` และ `GET /api/v1/public/interest-tags`
- `GET /api/v1/public/club-categories`: ดึงจากตาราง `club_categories` คืน `{"items": [{"id": "30001", "name": "วิชาการ"}, ...]}` เรียงตาม `name ASC, id ASC` (เนื่องจากตาราง `club_categories` ใน `V1__init_schema.sql` มีเฉพาะคอลัมน์ `id, code, name, description, created_at`)
- `GET /api/v1/public/interest-tags`: ดึงจากตาราง `tags` ใน `V1__init_schema.sql` คืน `{"items": [{"id": "40001", "name": "Programming"}, ...]}` เรียงตาม `name ASC, id ASC` เพื่อให้หน้าค้นหา (`Task63`) สร้างตัวกรองจากฐานข้อมูลจริง

---

### 2.3 แบบฟอร์มและการส่งใบสมัครออนไลน์ (`US-03` / `Task42` / `Task52` / `Task53`)

ใช้ Contract ที่นิยามไว้ใน [`openapi.yaml`](../api/openapi.yaml):
- `GET /api/v1/rounds/{roundId}/application-form` (`RoundApplicationForm`)
- `POST /api/v1/rounds/{roundId}/applications` (`ApplicationSubmissionRequest` -> `201 Created` `ApplicationSubmission` พร้อม Header `Location: /api/v1/me/applications/{id}`)
- **ข้อตกลงเพิ่มเติมสำหรับ `Task52` & `Task53` (`T74-D09`):**
  1. `motivation` บังคับกรอก (1–2,000 ตัวอักษร Unicode ก่อน `trim()`, ห้ามมีแต่ช่องว่าง)
  2. `answers` ส่งเฉพาะคำถามที่ตอบ (คำถามที่ `isRequired: true` ต้องมีคำตอบไม่ว่างและยาวไม่เกิน `maxLength` ของคำถามนั้น; คำถามที่ `isRequired: false` หากไม่ตอบให้ตัดออกจาก Array `answers` หรือถ้าส่งมาต้องไม่เป็นค่าว่าง)
  3. `links` ส่งได้ไม่เกิน 5 รายการ (`maxItems: 5`) โดย `url` ต้องเป็น `https://` ที่ถูกต้องและไม่มี userinfo/whitespace
  4. ลำดับการตรวจ `409 RESOURCE_CONFLICT` บน `POST /api/v1/rounds/{roundId}/applications` หลังผ่าน Auth & Visibility (`404` สำหรับชมรมไม่ Active หรือรอบที่ยังไม่เคย Publish):
     1. `ROUND_CANCELLED` (`publication_status = 'CANCELLED'`)
     2. `ROUND_NOT_OPEN` (`serverNow < opens_at`)
     3. `ROUND_CLOSED` (`closed_at IS NOT NULL OR serverNow >= closes_at`)
     4. `APPLICATION_ALREADY_EXISTS` (มีแถวใน `applications` ของ `(round_id, applicant_id)` แล้วไม่ว่าสถานะใด รวมถึง `WITHDRAWN`)
     5. `ALREADY_MEMBER` (เป็นสมาชิก `ACTIVE` ที่มีผลของชมรมนี้อยู่แล้ว — ใช้สำหรับตอนส่งใบสมัครตาม `US-03` แยกจาก `EXISTING_CLUB_MEMBERSHIP` ที่ใช้ตอนยืนยันสิทธิ์ใน `US-05` / `T74-D07`)
     6. `MEMBERSHIP_LIMIT_REACHED` (เป็นสมาชิก `ACTIVE` ที่มีผลครบ 5 ชมรมแล้ว)

---

### 2.4 การติดตามสถานะและประวัติใบสมัครของตนเอง (`US-04` / `Task64`)

- **Schema อ้างอิง:** [`ApplicantApplicationPage`](../api/openapi.yaml), [`ApplicantApplicationSummary`](../api/openapi.yaml), [`ApplicantApplicationDetail`](../api/openapi.yaml), [`ApplicantVisibleStatus`](../api/openapi.yaml)

#### 1) `GET /api/v1/me/applications`
- **สิทธิ์การเข้าถึง:** `SESSION` ที่ `users.account_status = 'ACTIVE'` (อนุญาตให้อ่านได้แม้ `student_profiles.student_status` หรือ `clubs.status` ไม่เป็น `ACTIVE` ตาม Permission Matrix §3)
- **Query Parameters:** `page` (default `0`), `size` (default `20`, max `100`)
- **การเรียงลำดับ:** `submitted_at DESC, id DESC`
- **Response (`200 OK` — `ApplicantApplicationPage`):**

```json
{
  "items": [
    {
      "id": "90001",
      "club": {
        "id": "20001",
        "name": "ชมรมพัฒนาซอฟต์แวร์ มธ.",
        "imageUrl": "https://images.example.org/clubs/20001.png"
      },
      "round": {
        "id": "70001",
        "title": "รับสมัครสมาชิกใหม่ ปีการศึกษา 2569 ภาคเรียนที่ 1",
        "academicYear": 2569,
        "semester": 1,
        "opensAt": "2026-10-01T00:00:00Z",
        "closesAt": "2026-10-25T16:59:59Z",
        "resultsPublishedAt": "2026-10-26T03:00:00Z",
        "confirmationDeadline": "2026-11-05T16:59:59Z"
      },
      "submittedAt": "2026-10-19T09:30:00Z",
      "applicantVisibleStatus": "ACCEPTED_PENDING_CONFIRMATION",
      "displayStatusLabel": "ผ่านการคัดเลือก (รอยืนยันสิทธิ์)",
      "canConfirm": true,
      "canDecline": true,
      "respondedAt": null
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### 2) `GET /api/v1/me/applications/{applicationId}`
- **การตรวจ Ownership (`T74-D01`):**
  1. ตรวจรูปแบบ `applicationId` (`400 INVALID_RESOURCE_ID` หากไม่ใช่เลขจำนวนเต็มบวก 64-bit)
  2. ค้นหาแถวใบสมัครจาก `applications`
  3. หากไม่พบแถวในฐานข้อมูล -> คืน `404 RESOURCE_NOT_FOUND`
  4. หากพบแถวแต่ `application.applicant_id != sessionUserId` -> คืน `403 ACCESS_DENIED` ทันทีโดยไม่คืนเนื้อหาใบสมัคร
- **การซ่อนข้อมูลก่อนประกาศผล (`T74-D04`):**
  - ตราบใดที่ `recruitment_rounds.results_published_at IS NULL` (แม้ถึงเวลา `results_scheduled_at` แล้วก็ตาม):
    - หากสถานะจริงใน DB คือ `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, หรือ `REJECTED` ให้แปลงเป็น `applicantVisibleStatus: "SUBMITTED"` และ `displayStatusLabel: "รอพิจารณา"`
    - ซ่อน `resultMessage: null`, `round.resultsPublishedAt: null`, `round.confirmationDeadline: null`
    - ตั้งค่า `canConfirm: false`, `canDecline: false` (`canConfirm` และ `canDecline` จะเป็น `true` ได้เฉพาะเมื่อประกาศผลแล้ว สถานะจริงเป็น `ACCEPTED` และ `results_published_at <= serverNow < confirmation_deadline` แบบ `<` เท่านั้น)
    - กรอง `statusHistory` ให้แสดงเฉพาะเหตุการณ์ `null -> SUBMITTED` (และ `WITHDRAWN` หากผู้สมัครถอนเอง); **ห้าม**ส่งแถว `UNDER_REVIEW`, `ACCEPTED`, `REJECTED` ออกไปใน JSON
  - ห้ามส่ง `application_reviews` (ความเห็นภายในของกรรมการ) หรือ `decided_by` ออกไปใน DTO ของผู้สมัครไม่ว่าก่อนหรือหลังประกาศผล

---

### 2.5 การยืนยันสิทธิ์หรือสละสิทธิ์เข้าชมรม (`US-05` / `Task69` / `Task70`)

- **Schema อ้างอิง:** [`MembershipOfferResponse`](../api/openapi.yaml), [`MembershipOfferConflict`](../api/openapi.yaml)

#### 1) `POST /api/v1/me/applications/{applicationId}/confirm` และ `POST /api/v1/me/applications/{applicationId}/decline`
- **Headers:** ต้องส่ง `Cookie: SESSION=...` และ `X-CSRF-TOKEN`
- **Request Body:** ไม่ต้องส่ง Body (หรือรับ `{}` เปล่าได้)
- **ลำดับการประมวลผลใน Transaction แบบ Lock-First เพื่อป้องกัน Race Condition (`T74-D05`, `T74-D06`, `T74-D07`):**
  1. ตรวจ Session, บัญชี `ACTIVE` (`403 ACCOUNT_NOT_ALLOWED` หากถูกระงับ), CSRF (`403 CSRF_INVALID`) และรูปแบบ `applicationId` (`400 INVALID_RESOURCE_ID`)
  2. อ่านข้อมูลระบุตัวตนของ `applicationId` (`id`, `applicant_id`, `round_id`, และ `club_id` จาก `recruitment_rounds`):
     - ไม่พบใบสมัคร -> `404 RESOURCE_NOT_FOUND`
     - `applicant_id != sessionUserId` -> `403 ACCESS_DENIED`
  3. **จับ Row Lock ตามลำดับมาตรฐานก่อนตรวจสถานะและเวลา (`§4.2`):**
     - ล็อกแถว `users` / `student_profiles` ของผู้สมัคร (`FOR UPDATE`) -> ล็อก `clubs` (`FOR SHARE`) -> ล็อก `recruitment_rounds` (`FOR SHARE`) -> ล็อก `applications` (`FOR UPDATE`)
     - อ่านเวลา `serverNow = clock.instant()` และอ่านค่าล่าสุดของ `application`, `round`, `student_profile`, `club` **หลังจากได้ Lock ครบแล้ว**
  4. **ตรวจสอบ Idempotent Same-Action Replay ภายใต้ Lock (`T74-D05` / `T74-D07`):**
     - หากเรียก `/confirm` และสถานะใบสมัครที่ล็อกไว้เป็น `CONFIRMED` อยู่แล้ว -> คืน `200 OK` (`idempotentReplay: true`) พร้อมข้อมูลการตอบรับเดิม (`responded_at` และ `membershipId` ที่ผูกกับ `source_application_id = application.id`) ทันที โดย **ไม่** ตรวจเวลา Deadline ซ้ำ, **ไม่** ตรวจสถานะนักศึกษา/ชมรมซ้ำ, และ **ไม่** เขียนตาราง `club_memberships`, `membership_history`, หรือ `application_status_history` เพิ่ม
     - หากเรียก `/decline` และสถานะใบสมัครที่ล็อกไว้เป็น `DECLINED` อยู่แล้ว -> คืน `200 OK` (`idempotentReplay: true`, `membershipId: null`) พร้อมข้อมูลการตอบรับเดิมทันที โดย **ไม่** เขียนข้อมูลเพิ่ม
  5. **ตรวจสอบ Opposite Action / สถานะที่ไม่สามารถตอบรับใหม่ได้ภายใต้ Lock (`409 RESOURCE_CONFLICT`):**
     - หากสถานะที่ล็อกไว้เป็น `CONFIRMED` แต่เรียก `/decline` หรือเป็น `DECLINED` แต่เรียก `/confirm` -> คืน `409 RESOURCE_CONFLICT` (`reason: ALREADY_RESPONDED`)
     - หากสถานะที่ล็อกไว้เป็น `EXPIRED` -> คืน `409 RESOURCE_CONFLICT` (`reason: CONFIRMATION_DEADLINE_EXPIRED`)
     - หากรอบมี `publication_status = 'CANCELLED'` -> คืน `409 RESOURCE_CONFLICT` (`reason: ROUND_CANCELLED`)
     - หากรอบมี `results_published_at IS NULL` หรือ `serverNow < round.results_published_at` -> คืน `409 RESOURCE_CONFLICT` (`reason: RESULTS_NOT_PUBLISHED`)
     - หากสถานะใบสมัครที่ล็อกไว้ไม่ใช่ `ACCEPTED` (เช่น `SUBMITTED`, `UNDER_REVIEW`, `REJECTED`, `WITHDRAWN`) -> คืน `409 RESOURCE_CONFLICT` (`reason: APPLICATION_NOT_ACCEPTED`)
  6. **ตรวจสอบสิทธิ์เฉพาะของ Action สำหรับการตัดสินใหม่ภายใต้ Lock:**
     - สำหรับ `/confirm` ใหม่: ผู้สมัครต้องมี `student_profiles.student_status = 'ACTIVE'` และชมรมต้องมี `clubs.status = 'ACTIVE'` มิฉะนั้นคืน `403 ACCESS_DENIED`
     - สำหรับ `/decline` ใหม่: ใช้เพียง `users.account_status = 'ACTIVE'` และความเป็นเจ้าของใบสมัคร (ไม่บังคับ `student_profiles` หรือ `clubs` ต้อง `ACTIVE` ตาม Permission Matrix §3)
  7. **ตรวจหน้าต่างเวลา Server ภายใต้ Lock (`T74-D06`):**
     - ตรวจ `round.results_published_at <= serverNow && serverNow < round.confirmation_deadline` (ใช้ `<` แบบเคร่งครัด)
     - หาก `serverNow >= round.confirmation_deadline` -> คืน `409 RESOURCE_CONFLICT` (`reason: CONFIRMATION_DEADLINE_EXPIRED`)
  8. **ตรวจสอบเงื่อนไขสมาชิกภาพสำหรับ `/confirm` ใหม่ภายใต้ Lock (`T74-D07`):**
     - ตรวจว่ามีแถวใน `club_memberships` ของคู่ `(club_id, user_id)` อยู่แล้วหรือไม่ **ในทุกสถานะ** (`ACTIVE`, `INACTIVE`, `LEFT`, `REMOVED`):
       - หากมีอยู่แล้ว -> คืน `409 RESOURCE_CONFLICT` (`reason: EXISTING_CLUB_MEMBERSHIP`) โดยไม่แก้ไขแถวเดิมและไม่ทำ Reactivation
     - นับจำนวนชมรมที่ผู้สมัครเป็นสมาชิกที่มีผล (`status = 'ACTIVE' AND joined_at <= serverNow AND ended_at IS NULL`):
       - หาก `>= 5` -> คืน `409 RESOURCE_CONFLICT` (`reason: MEMBERSHIP_LIMIT_REACHED`)
  9. **บันทึกข้อมูลใน Transaction เดียวกัน:**
     - กรณี `/confirm`:
       - อัปเดต `applications`: `status = 'CONFIRMED'`, `responded_at = serverNow`, `version = version + 1`, `updated_at = serverNow`
       - เพิ่มแถวใน `application_status_history`: `from_status = 'ACCEPTED'`, `to_status = 'CONFIRMED'`, `actor_id = sessionUserId`, `reason = 'APPLICANT_CONFIRMED'`, `changed_at = serverNow`
       - เพิ่มแถวใน `club_memberships`: `club_id`, `user_id`, `status = 'ACTIVE'`, `joined_at = serverNow`, `ended_at = NULL`, `source_application_id = application.id` (และบันทึก `membership_history` ตาม Schema)
     - กรณี `/decline`:
       - อัปเดต `applications`: `status = 'DECLINED'`, `responded_at = serverNow`, `version = version + 1`, `updated_at = serverNow`
       - เพิ่มแถวใน `application_status_history`: `from_status = 'ACCEPTED'`, `to_status = 'DECLINED'`, `actor_id = sessionUserId`, `reason = 'APPLICANT_DECLINED'`, `changed_at = serverNow`

- **Response (`200 OK` — `MembershipOfferResponse`):**

```json
{
  "applicationId": "90001",
  "clubId": "20001",
  "roundId": "70001",
  "status": "CONFIRMED",
  "displayStatusLabel": "ยืนยันสิทธิ์แล้ว",
  "respondedAt": "2026-10-28T04:15:00Z",
  "membershipId": "60001",
  "idempotentReplay": false
}
```

---

### 2.6 การเปิดอ่านใบสมัครสำหรับกรรมการ (`US-09`) และการบันทึก/ประกาศผลคัดเลือก (`S2-DECISION-DRAFT` / `S2-PUBLICATION-DRAFT` / `Task65`–`Task68`)

- **Schema อ้างอิง:** [`CommitteeApplicationPage`](../api/openapi.yaml), [`CommitteeApplicationDetail`](../api/openapi.yaml), [`StartApplicationReviewRequest`](../api/openapi.yaml), [`ApplicationDecisionRequest`](../api/openapi.yaml), [`PublishResultsRequest`](../api/openapi.yaml), [`PublishResultsResponse`](../api/openapi.yaml)

#### 1) `GET /api/v1/rounds/{roundId}/applications` (`US-09` / `Task65`)
- **สิทธิ์การเข้าถึง:** `SESSION` + กรรมการที่มีผล (`COMMITTEE` หรือ `PRESIDENT`) ของชมรมเจ้าของรอบ `roundId` + **ไม่มีใบสมัครของตนเองใน `roundId` ทุกสถานะ (รวม `WITHDRAWN`)**
- **การตรวจ `403` vs `404` (`T74-D01`):**
  - หาก `roundId` ไม่มีอยู่จริงในฐานข้อมูล -> `404 RESOURCE_NOT_FOUND`
  - หาก `roundId` มีอยู่จริง แต่ผู้เรียกไม่มีสิทธิ์กรรมการของชมรมเจ้าของรอบ หรือผู้เรียกมีใบสมัครในรอบนั้น (Self-review) -> `403 ACCESS_DENIED`
  - หากรอบยังเป็น `DRAFT` หรือ `CANCELLED` -> `409 RESOURCE_CONFLICT` (`reason: ROUND_NOT_PUBLISHED` หรือ `ROUND_CANCELLED`)
- **Query Parameters:**
  - `status` (optional enum: `SUBMITTED` | `UNDER_REVIEW` | `ACCEPTED` | `REJECTED` | `CONFIRMED` | `DECLINED` | `EXPIRED` | `WITHDRAWN`)
  - `q` (optional `string`: ค้นหาจากรหัสนักศึกษา `student_profiles.student_code` หรือชื่อแสดงผล `users.display_name`)
  - `page` (default `0`), `size` (default `20`, max `100`)
- **การเรียงลำดับ:** `submitted_at ASC, id ASC` (เรียงตามลำดับการส่งก่อน-หลังเพื่อความยุติธรรมในการตรวจ)

#### 2) `GET /api/v1/rounds/{roundId}/applications/{applicationId}` (`US-09` / `Task65`)
- **Strict Read-Only:** การเปิดอ่านรายละเอียดคำตอบและลิงก์พอร์ตโฟลิโอ **ห้าม** เปลี่ยนสถานะใบสมัครเป็น `UNDER_REVIEW` โดยอัตโนมัติ (`US-09.AC-04`, `T74-D02`)
- **การจับคู่คำถามและคำตอบ (`US-09.AC-03`):**
  - ดึงคำถามทั้งหมดของรอบจาก `application_questions` เรียงตาม `display_order ASC, id ASC`
  - จับคู่คำตอบจาก `application_answers` ด้วย `question_id`
  - หากคำถามข้อใดเป็น Optional (`is_required = false`) และผู้สมัครไม่ได้ตอบ ให้คืนรายการคำถามนั้นพร้อม `"answerText": null` เพื่อไม่ให้ลำดับคำตอบเลื่อนไปจับคู่ผิดข้อ (`US-09.BR-08`)

#### 3) `POST /api/v1/rounds/{roundId}/applications/{applicationId}/start-review` (`T74-D02` / `US-09` — Optional Explicit Review Action)
- **สิทธิ์การเข้าถึง:** `SESSION` + `CSRF` + Effective `COMMITTEE` หรือ `PRESIDENT` ของชมรมเจ้าของรอบ + ไม่มีใบสมัครตนเองในรอบนั้น
- **การทำงานใน Transaction:**
  - ล็อก `recruitment_rounds` (`FOR SHARE`) และ `applications` (`FOR UPDATE`); ตรวจ `round.results_published_at IS NULL` และ `application.version == request.version` (`409 VERSION_MISMATCH` หากไม่ตรง)
  - หาก `application.status == 'SUBMITTED'`: เปลี่ยนเป็น `UNDER_REVIEW`, เพิ่ม `version = version + 1`, และเพิ่มแถวใน `application_status_history` (`from_status = 'SUBMITTED'`, `to_status = 'UNDER_REVIEW'`, `actor_id = sessionUserId`, `reason = 'COMMITTEE_STARTED_REVIEW'`, `changed_at = serverNow`)
  - หากส่ง `recommendation` (`ACCEPT` | `REJECT` | `DISCUSS`) หรือ `internalComment` มาด้วย: Upsert แถวใน `application_reviews` สำหรับ `(application_id, reviewer_id = sessionUserId)` โดยใช้คอลัมน์จริงใน `V1__init_schema.sql` คือ `recommendation` (`NOT NULL`; หากส่งเฉพาะ `internalComment` โดยไม่ระบุ `recommendation` ให้ใช้ค่าเริ่มต้น `'DISCUSS'`) และ `internal_comment`

#### 4) `PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` (`S2-DECISION-DRAFT` / `Task67`)
- **สิทธิ์การเข้าถึง:** `SESSION` + `CSRF` + Effective `COMMITTEE` หรือ `PRESIDENT` ของชมรมเจ้าของรอบ + ไม่มีใบสมัครตนเองในรอบนั้น
- **เงื่อนไขเวลาและสถานะภายใต้ Lock (`T74-D02`, `S2-DECISION-DRAFT.AC-03/04/06`):**
  - ล็อก `recruitment_rounds` (`FOR SHARE`) และ `applications` (`FOR UPDATE`) ก่อนตรวจเงื่อนไข
  - รอบต้องมี `publication_status = 'PUBLISHED'` (`ROUND_CANCELLED` หรือ `ROUND_NOT_PUBLISHED` หากไม่ใช่)
  - รอบต้องปิดรับสมัครจริงแล้ว: `serverNow >= COALESCE(round.closed_at, round.closes_at)` (หากยังเปิดรับสมัครอยู่ คืน `409 RESOURCE_CONFLICT` พร้อม `reason: ROUND_STILL_OPEN`)
  - รอบต้องยังไม่ประกาศผลคัดเลือก: `round.results_published_at IS NULL` (หากประกาศผลแล้ว คืน `409 RESOURCE_CONFLICT` พร้อม `reason: RESULTS_ALREADY_PUBLISHED`)
  - สถานะปัจจุบันของใบสมัครต้องอยู่ใน `{SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED}` (อนุญาตให้ตัดสินจาก `SUBMITTED` ไป `ACCEPTED` หรือ `REJECTED` ได้โดยตรง และอนุญาตให้แก้ผลระหว่าง `ACCEPTED` กับ `REJECTED` ก่อนประกาศผลภายใต้การตรวจ `version`)
- **Request Body (`ApplicationDecisionRequest`):**

```json
{
  "decision": "ACCEPTED",
  "resultMessage": "ผ่านการคัดเลือกเข้าชมรม กรุณากดยืนยันสิทธิ์ภายในวันที่กำหนด",
  "internalNote": "มีประสบการณ์ทำโปรเจกต์เว็บและตอบคำถามครบถ้วน",
  "version": 0
}
```

- **การทำงานใน Transaction:**
  - ตรวจ Optimistic Lock `application.version == request.version` (หากไม่ตรง คืน `409 RESOURCE_CONFLICT` พร้อม `reason: VERSION_MISMATCH`)
  - อัปเดต `applications`: `status = request.decision`, `result_message = request.resultMessage`, `decided_by = sessionUserId`, `decided_at = serverNow`, `version = version + 1`, `updated_at = serverNow`
  - หาก `from_status != to_status`: เพิ่มแถวใน `application_status_history` (`from_status`, `to_status`, `actor_id = sessionUserId`, `reason = 'COMMITTEE_DECISION'`, `changed_at = serverNow`) — หากเป็นการแก้เฉพาะ `resultMessage` หรือ `internalNote` โดย `status` เดิมตรงกับ `decision` เดิม **ห้าม** insert แถวซ้ำลง `application_status_history` เพื่อไม่ให้ติด `chk_app_history_change` (`from_status <> to_status`)
  - หากระบุ `internalNote` ไม่ว่าง: Upsert แถวใน `application_reviews` สำหรับ `(application_id, reviewer_id = sessionUserId)` โดยบันทึก `recommendation = ('ACCEPT' เมื่อ decision == 'ACCEPTED' หรือ 'REJECT' เมื่อ decision == 'REJECTED')` และ `internal_comment = internalNote` ตามคอลัมน์ใน `V1__init_schema.sql`

#### 5) `POST /api/v1/rounds/{roundId}/publish-results` (`S2-PUBLICATION-DRAFT` / `Task67`)
- **สิทธิ์การเข้าถึง:** `SESSION` + `CSRF` + Effective **`PRESIDENT` เท่านั้น** ของชมรมเจ้าของรอบ + ไม่มีใบสมัครตนเองในรอบนั้น (`COMMITTEE` ทั่วไปหรือ `ADMIN` ที่ไม่ใช่ `PRESIDENT` ของชมรมนั้นได้ `403 ACCESS_DENIED`)
- **Request Body (`PublishResultsRequest`):**

```json
{
  "version": 1
}
```

- **การทำงานและลำดับการตรวจสอบใน Transaction เดียว (Lock-First เพื่อป้องกัน Duplicate Notification Race Condition):**
  1. หลังตรวจว่า `roundId` มีอยู่จริง (`404`) และผู้เรียกเป็น Effective `PRESIDENT` ที่ไม่ติด Self-review (`403`) แล้ว ให้ **จับ Lock แถว `recruitment_rounds` (`FOR UPDATE`) และล็อกแถว `applications` ในรอบนั้นทันที** ก่อนอ่าน `serverNow = clock.instant()`
  2. **ตรวจสอบเงื่อนไข `409 RESOURCE_CONFLICT` ทั้ง 7 ข้อภายใต้ `FOR UPDATE` Lock:**
     1. รอบถูกยกเลิก (`publication_status = 'CANCELLED'`) -> `reason: ROUND_CANCELLED`
     2. รอบยังไม่เผยแพร่ (`publication_status = 'DRAFT'`) -> `reason: ROUND_NOT_PUBLISHED`
     3. รอบยังไม่ปิดรับสมัครจริง (`serverNow < COALESCE(closed_at, closes_at)`) -> `reason: ROUND_STILL_OPEN`
     4. ประกาศผลไปแล้ว (`results_published_at IS NOT NULL`) -> `reason: RESULTS_ALREADY_PUBLISHED` (การตรวจหลังได้ `FOR UPDATE` Lock ป้องกันไม่ให้คำขอประกาศผลที่ยิงซ้ำพร้อมกันหลุดไป insert ตาราง `notifications` จนชน Unique Constraint ของ `deduplication_key` กลายเป็น `500`)
     5. เลยกำหนดเวลายืนยันสิทธิ์แล้ว (`serverNow >= confirmation_deadline`) -> `reason: CONFIRMATION_DEADLINE_EXPIRED`
     6. ยังมีใบสมัครในรอบที่ค้างอยู่ในสถานะ `SUBMITTED` หรือ `UNDER_REVIEW` แม้แต่ใบเดียว -> `reason: APPLICATIONS_INCOMPLETE`
     7. `round.version != request.version` -> `reason: VERSION_MISMATCH`
  3. อัปเดต `recruitment_rounds`: `results_published_at = serverNow`, `version = version + 1`, `updated_at = serverNow` (กำหนดเวลา `confirmation_deadline` ถูกเก็บอยู่บน `recruitment_rounds.confirmation_deadline` แล้ว)
  4. สร้างแถวในตาราง `notifications` (`type = 'RESULT_PUBLISHED'`) สำหรับผู้สมัครทุกคนในรอบที่มีสถานะ `ACCEPTED` หรือ `REJECTED`
  5. บันทึก Structured Audit Log (`action = PUBLISH_SELECTION_RESULTS`, `actorId = sessionUserId`, `roundId`, `clubId`, `acceptedCount`, `rejectedCount`, `publishedAt = serverNow`, `traceId`)
  6. **ห้าม** เปลี่ยน `applications.status` และ **ห้าม** insert `ACCEPTED -> ACCEPTED` หรือ `REJECTED -> REJECTED` ลงใน `application_status_history` (`S2-PUBLICATION-DRAFT.AC-05`)

---

### 2.7 แดชบอร์ดสถิติภาพรวมส่วนกลางสำหรับ Admin (`US-10` / `Task71` / `Task72`)

> [!NOTE]
> **สถานะการออกแบบ (`T74-D08`):** โครงสร้างตัวกรองและนิยามหน่วยนับของ `GET /api/v1/admin/dashboard/stats` ด้านล่างเป็น **ข้อเสนอเชิงเทคนิคใน Task75 (Design Proposal Pending PO / Reviewer Sign-off)** เพื่อให้ทีม Backend (`Task71`) และ Frontend (`Task72`) มี Schema อ้างอิงตรงกันตาม [`AdminDashboardStatsResponse`](../api/openapi.yaml)

#### `GET /api/v1/admin/dashboard/stats`
- **Schema อ้างอิง:** [`AdminDashboardStatsResponse`](../api/openapi.yaml), [`AdminDashboardAppliedFilters`](../api/openapi.yaml), [`AdminDashboardSummaryMetrics`](../api/openapi.yaml), [`AdminCategoryStatsItem`](../api/openapi.yaml), [`AdminTopClubItem`](../api/openapi.yaml), [`AdminClubStatsItem`](../api/openapi.yaml)
- **สิทธิ์การเข้าถึง:** `SESSION` + `users.account_status = 'ACTIVE'` + `users.system_role = 'ADMIN'` (ตรวจสดจากฐานข้อมูลทุกครั้งตาม `Task79`; ผู้ใช้ `USER` หรือกรรมการชมรมที่ไม่ได้มี `system_role = 'ADMIN'` จะได้รับ `403 ACCESS_DENIED`)
- **Query Parameters (`US-10.AC-03`, `T74-D08`):**
  - `q` (`string`, optional): ค้นหาชื่อชมรม (`ILIKE`)
  - `categoryId` (`PositiveBigintId`, optional): กรองตามหมวดหมู่ชมรม
  - `academicYear` (`integer`, optional, min `2500`, max `2700`): กรองสถิติรอบรับสมัครตาม `recruitment_rounds.academic_year`
  - `semester` (`integer`, optional, enum: `1` | `2` | `3`): กรองสถิติรอบรับสมัครตาม `recruitment_rounds.semester`
  - `clubStatus` (`string`, optional, enum: `ACTIVE` | `INACTIVE` | `ALL`, default `ACTIVE`): กรองตามสถานะชมรม
  - `page` (`integer`, default `0`), `size` (`integer`, default `20`, max `100`): สำหรับตารางรายชื่อชมรม (`clubs`)
- **นิยามหน่วยนับที่ชัดเจน (`T74-D08`):**
  - `totalApplications`: จำนวนใบสมัครทั้งหมด (`COUNT(a.id)`) ในรอบรับสมัครที่ตรงกับตัวกรอง `academicYear` และ `semester` (ไม่รวมรอบ `DRAFT`)
  - `uniqueApplicants`: จำนวนนักศึกษาไม่ซ้ำ (`COUNT(DISTINCT a.applicant_id)`) ที่ส่งใบสมัครในรอบที่ตรงกับตัวกรอง
  - `confirmedNewMembers`: จำนวนผู้สมัครที่ยืนยันสิทธิ์สำเร็จและขึ้นทะเบียนสมาชิกจากรอบที่ตรงกับตัวกรอง (`COUNT(DISTINCT cm.id)` ที่ `cm.source_application_id = a.id` และ `a.status = 'CONFIRMED'`) — **ไม่นับรวม** ผู้ที่ยังรอพิจารณา (`SUBMITTED`/`UNDER_REVIEW`), ผู้ที่ผ่านแต่ยังไม่ยืนยัน (`ACCEPTED`), ผู้ที่สละสิทธิ์ (`DECLINED`), หรือหมดเวลา (`EXPIRED`) ตาม `US-10.AC-04`
  - `currentActiveMemberships`: จำนวนสมาชิกชมรมที่มีสถานะ `ACTIVE` และ `ended_at IS NULL` ณ ปัจจุบันของชมรมที่ตรงกับตัวกรองชมรม
- **Response (`200 OK` — `AdminDashboardStatsResponse`):**

```json
{
  "generatedAt": "2026-10-28T10:30:00Z",
  "filters": {
    "academicYear": 2569,
    "semester": 1,
    "categoryId": null,
    "clubStatus": "ACTIVE"
  },
  "summary": {
    "totalClubs": 42,
    "activeClubs": 40,
    "inactiveClubs": 2,
    "clubsCurrentlyRecruiting": 15,
    "totalRecruitmentRounds": 48,
    "openRecruitmentRounds": 16,
    "totalApplications": 1280,
    "uniqueApplicants": 845,
    "confirmedNewMembers": 410,
    "currentActiveMemberships": 1950,
    "confirmationRatePercent": 78.85,
    "statusBreakdown": {
      "SUBMITTED": 120,
      "UNDER_REVIEW": 210,
      "ACCEPTED": 110,
      "REJECTED": 320,
      "CONFIRMED": 410,
      "DECLINED": 65,
      "WITHDRAWN": 15,
      "EXPIRED": 30
    }
  },
  "categoryBreakdown": [
    {
      "categoryId": "1",
      "categoryName": "วิชาการและนวัตกรรม",
      "clubCount": 12,
      "totalRounds": 14,
      "totalApplications": 490,
      "acceptedCount": 220,
      "confirmedCount": 185,
      "activeMemberCount": 640
    }
  ],
  "topClubs": [
    {
      "clubId": "20001",
      "clubName": "ชมรมพัฒนาซอฟต์แวร์แห่งมหาวิทยาลัยธรรมศาสตร์",
      "categoryName": "วิชาการและนวัตกรรม",
      "totalApplications": 165,
      "acceptedCount": 60,
      "confirmedCount": 54,
      "activeMemberCount": 142
    }
  ],
  "clubs": {
    "items": [
      {
        "clubId": "20001",
        "clubName": "ชมรมพัฒนาซอฟต์แวร์แห่งมหาวิทยาลัยธรรมศาสตร์",
        "category": {
          "id": "1",
          "name": "วิชาการและนวัตกรรม"
        },
        "clubStatus": "ACTIVE",
        "hasOpenRecruitment": true,
        "roundCount": 2,
        "totalApplications": 165,
        "submittedCount": 10,
        "underReviewCount": 25,
        "acceptedCount": 6,
        "rejectedCount": 60,
        "confirmedCount": 54,
        "declinedCount": 7,
        "withdrawnCount": 1,
        "expiredCount": 2,
        "activeMemberCount": 142
      }
    ],
    "page": {
      "number": 0,
      "size": 20,
      "totalElements": 40,
      "totalPages": 2
    }
  }
}
```

---

## 3. มาตรฐาน Error Response ตาม RFC 7807 และ Reason Codes

ทุก API ภายใต้ `/api/v1/**` ใช้ Content-Type `application/problem+json` ตามมาตรฐาน **RFC 7807 Problem Details for HTTP APIs** โดยมีโครงสร้าง JSON เดียวกันทั้งระบบ:

```json
{
  "type": "urn:tuclubhub:problem:resource-conflict",
  "title": "Resource state conflict",
  "status": 409,
  "detail": "Cannot modify or delete a screening question that already has submitted answers.",
  "instance": "/api/v1/rounds/70001/questions/81001",
  "code": "RESOURCE_CONFLICT",
  "reason": "QUESTION_HAS_ANSWERS",
  "fieldErrors": [],
  "traceId": "01J9EXAMPLE7K4D5"
}
```

### 3.1 ตารางรหัสข้อผิดพลาดหลัก (`status`, `code`, `type`)

| HTTP Status | `code` | `type` URN | ความหมายและการจัดการฝั่ง Frontend |
|---|---|---|---|
| `400` | `INVALID_RESOURCE_ID` | `urn:tuclubhub:problem:invalid-resource-id` | Path/Query ID ไม่ใช่ตัวเลขจำนวนเต็มบวก 64-bit ที่ถูกต้อง |
| `400` | `VALIDATION_FAILED` | `urn:tuclubhub:problem:validation-error` | ข้อมูลใน Request Body หรือ Query ไม่ผ่านการตรวจสอบ; แสดงข้อความตาม `fieldErrors[]` |
| `401` | `AUTHENTICATION_REQUIRED` | `urn:tuclubhub:problem:authentication-required` | ไม่มี Session หรือ Session หมดอายุ (30 นาที Idle / 8 ชั่วโมง Absolute); ล้างสถานะ Auth และนำทางไป `/login` |
| `401` | `AUTHENTICATION_FAILED` | `urn:tuclubhub:problem:authentication-failed` | ชื่อผู้ใช้หรือรหัสผ่าน TU ไม่ถูกต้องขณะ Login |
| `403` | `CSRF_INVALID` | `urn:tuclubhub:problem:csrf-invalid` | CSRF Token หายไปหรือหมดอายุ; เรียก `GET /api/v1/auth/csrf` ใหม่หรือแจ้งเตือนให้ลองอีกครั้ง |
| `403` | `ACCOUNT_NOT_ALLOWED` | `urn:tuclubhub:problem:account-not-allowed` | บัญชีมีสถานะ `SUSPENDED`; Backend ทำลาย Session ทันทีและ Frontend แสดงหน้าแจ้งระงับการใช้งาน |
| `403` | `ACCESS_DENIED` | `urn:tuclubhub:problem:access-denied` | ผู้ใช้ไม่มีสิทธิ์ใน Action นั้น, ติด Self-review, หมดวาระกรรมการ, หรือพยายามเข้าถึง Private Resource ที่มีอยู่จริงของผู้อื่น (`T74-D01`) |
| `404` | `CLUB_NOT_FOUND` | `urn:tuclubhub:problem:club-not-found` | ไม่พบชมรม หรือชมรมมีสถานะ `INACTIVE` บน Public Endpoint |
| `404` | `RESOURCE_NOT_FOUND` | `urn:tuclubhub:problem:resource-not-found` | ไม่พบทรัพยากรที่ระบุในฐานข้อมูลจริง (`T74-D01`) หรือรอบรับสมัครยังไม่เคยเผยแพร่เมื่อเรียกจากฝั่งผู้สมัคร (`US-03`) |
| `405` | `METHOD_NOT_ALLOWED` | `urn:tuclubhub:problem:method-not-allowed` | HTTP Method ไม่รองรับสำหรับ URL นั้น |
| `409` | `RESOURCE_CONFLICT` | `urn:tuclubhub:problem:resource-conflict` | ขัดแย้งกับสถานะธุรกิจ กำหนดเวลา ข้อมูลซ้ำ หรือ Optimistic Lock (`version`); ดูรายละเอียดในฟิลด์ `reason` |
| `500` | `INTERNAL_ERROR` | `urn:tuclubhub:problem:internal-error` | ข้อผิดพลาดภายในที่ไม่คาดคิด; แสดง `traceId` เพื่อให้ทีมตรวจสอบ Log |
| `503` | `AUTH_PROVIDER_UNAVAILABLE` / `SERVICE_UNAVAILABLE` | `urn:tuclubhub:problem:auth-provider-unavailable` / `service-unavailable` | ระบบยืนยันตัวตน TU หรือฐานข้อมูลไม่สามารถใช้งานได้ชั่วคราว |

### 3.2 ตารางรหัสสาเหตุความขัดแย้ง (`409 RESOURCE_CONFLICT` — `reason` Vocabulary)

เพื่อให้ Frontend แสดงข้อความแจ้งเตือนภาษาไทยได้ตรงจุดทุกกรณี ทุก Response ที่เป็น `409 RESOURCE_CONFLICT` ต้องส่งฟิลด์ `reason` ตามตารางมาตรฐานนี้:

| `reason` | Endpoint ที่เกี่ยวข้อง | เงื่อนไขที่ทำให้เกิด | ข้อความแจ้งเตือนแนะนำบน UI (ภาษาไทย) |
|---|---|---|---|
| `QUESTION_HAS_ANSWERS` | `PUT/DELETE /api/v1/rounds/{roundId}/questions/{questionId}`, `PUT /api/v1/clubs/{clubId}/rounds/{roundId}` | คำถามคัดเลือกข้อนี้มีผู้สมัครส่งคำตอบเข้ามาในระบบแล้ว (`Task51`) | ไม่สามารถแก้ไขหรือลบคำถามที่มีผู้สมัครตอบแล้วได้ เพื่อรักษาความถูกต้องของข้อมูลใบสมัคร |
| `ROUND_NOT_EDITABLE` | Round & Question Management APIs | พยายามแก้ไขโครงสร้างรอบหรือคำถามเมื่อรอบไม่ได้อยู่ในสถานะที่อนุญาตให้แก้ไข | ไม่สามารถแก้ไขรอบรับสมัครหรือคำถามในสถานะปัจจุบันได้ |
| `ROUND_CANCELLED` | Form Read, Submit, Review, Decision, Publish, Confirm/Decline | รอบรับสมัครมี `publication_status = 'CANCELLED'` | รอบรับสมัครนี้ถูกยกเลิกแล้ว |
| `ROUND_NOT_PUBLISHED` | Committee Review, Decision, Publish | รอบรับสมัครยังอยู่ในสถานะ `DRAFT` | รอบรับสมัครนี้ยังไม่ได้เผยแพร่ |
| `ROUND_NOT_OPEN` | Form Read, Submit Application | `serverNow < round.opens_at` | รอบรับสมัครนี้ยังไม่เปิดรับใบสมัคร |
| `ROUND_CLOSED` | Form Read, Submit Application | `round.closed_at IS NOT NULL OR serverNow >= round.closes_at` | รอบรับสมัครนี้ปิดรับใบสมัครแล้ว |
| `ROUND_STILL_OPEN` | Record Decision, Publish Results | พยายามบันทึกผลคัดเลือกหรือประกาศผลก่อนที่รอบจะปิดรับสมัครจริง | ยังไม่สามารถบันทึกผลหรือประกาศผลได้เนื่องจากรอบรับสมัครยังไม่ปิด |
| `APPLICATION_ALREADY_EXISTS` | Submit Application | ผู้สมัครมีใบสมัครในรอบนี้อยู่แล้ว (รวมถึงใบสมัครที่ถอนแล้ว) | คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว |
| `ALREADY_MEMBER` | Submit Application | ผู้สมัครเป็นสมาชิก `ACTIVE` ที่มีผลของชมรมนี้อยู่แล้ว | คุณเป็นสมาชิกปัจจุบันของชมรมนี้อยู่แล้ว |
| `EXISTING_CLUB_MEMBERSHIP` | Confirm Membership (`US-05`) | มีแถวใน `club_memberships` ของคู่ `(club_id, user_id)` อยู่แล้วไม่ว่าสถานะ `ACTIVE`, `INACTIVE`, `LEFT`, หรือ `REMOVED` (`T74-D07`) | พบประวัติสมาชิกภาพเดิมในชมรมนี้ ระบบไม่รองรับการคืนสถานะสมาชิกผ่านการยืนยันสิทธิ์ซ้ำ |
| `MEMBERSHIP_LIMIT_REACHED` | Submit Application, Confirm Membership | ผู้สมัครเป็นสมาชิก `ACTIVE` ที่มีผลครบ 5 ชมรมแล้ว | คุณเป็นสมาชิกชมรมครบจำนวนสูงสุด 5 ชมรมแล้ว |
| `RESULTS_NOT_PUBLISHED` | Confirm / Decline Membership | `round.results_published_at IS NULL` หรือ `serverNow < round.results_published_at` | ชมรมยังไม่ได้ประกาศผลการคัดเลือกอย่างเป็นทางการ |
| `RESULTS_ALREADY_PUBLISHED` | Record Decision, Publish Results, Cancel Round | `round.results_published_at IS NOT NULL` | ไม่สามารถดำเนินการได้เนื่องจากประกาศผลการคัดเลือกไปแล้ว |
| `APPLICATIONS_INCOMPLETE` | Publish Results (`S2-PUBLICATION-DRAFT`) | ยังมีใบสมัครในรอบที่ค้างอยู่ในสถานะ `SUBMITTED` หรือ `UNDER_REVIEW` | ยังไม่สามารถประกาศผลได้ เนื่องจากยังพิจารณาใบสมัครไม่ครบทุกใบ |
| `APPLICATION_NOT_ACCEPTED` | Confirm / Decline Membership | สถานะใบสมัครไม่ใช่ `ACCEPTED` (เช่น `REJECTED`, `SUBMITTED`) | ใบสมัครนี้ไม่ได้อยู่ในสถานะที่ผ่านการคัดเลือกเพื่อรอยืนยันสิทธิ์ |
| `ALREADY_RESPONDED` | Confirm / Decline Membership | ตอบรับไปแล้วและพยายามส่งคำขอสวนทาง (เช่น ยืนยันแล้วกดสละสิทธิ์ หรือสละสิทธิ์แล้วกดยืนยัน ตาม `T74-D05`) | คุณได้ดำเนินการตอบรับผลการคัดเลือกของใบสมัครนี้ไปแล้ว ไม่สามารถเปลี่ยนแปลงได้ |
| `CONFIRMATION_DEADLINE_EXPIRED` | Confirm / Decline Membership, Publish Results | `serverNow >= round.confirmation_deadline` หรือสถานะเป็น `EXPIRED` | หมดเวลาการยืนยันสิทธิ์สำหรับรอบรับสมัครนี้แล้ว |
| `VERSION_MISMATCH` | Update Round, Record Decision, Publish Results | ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นก่อนหน้า (`version` ไม่ตรงกับฐานข้อมูล) | ข้อมูลมีการเปลี่ยนแปลงจากผู้ใช้อื่น กรุณารีเฟรชหน้าจอและลองใหม่อีกครั้ง |

---

## 4. การออกแบบฐานข้อมูล (Database Schema Verification), ลำดับการ Lock และ Background Worker

### 4.1 ผลการตรวจสอบความสอดคล้องของ Database Schema และ ERD

จากการตรวจสอบเทียบกันแบบตารางต่อตารางระหว่าง [`backend/src/main/resources/db/migration/V1__init_schema.sql`](../../backend/src/main/resources/db/migration/V1__init_schema.sql) และ [`docs/database/TU-ClubHub-ERD-Updated.dbml`](../database/TU-ClubHub-ERD-Updated.dbml):
1. **ครบถ้วนทั้ง 17 ตารางธุรกิจใน `V1__init_schema.sql` (พร้อม `flyway_schema_history`):**
   - 17 ตารางใน `V1__init_schema.sql` ได้แก่: `users`, `student_profiles`, `club_categories`, `clubs`, `tags`, `club_tags`, `club_memberships`, `membership_history`, `club_committee_assignments`, `recruitment_rounds`, `application_questions`, `applications`, `application_answers`, `application_links`, `application_reviews`, `application_status_history`, และ `notifications` (หมายเหตุ: HTTP Session ของ MVP ใช้ In-memory `MapSessionRepository` ใน `SessionConfiguration.java` ไม่ได้ใช้ตาราง `spring_session`)
2. **รองรับทุกฟีเจอร์ใน Sprint 2 โดยไม่ต้องแก้โครงสร้างตารางเดิมแบบ Breaking Change:**
   - **Task51 (`QUESTION_HAS_ANSWERS`):** ตาราง `application_answers` มี Foreign Key `question_id REFERENCES application_questions(id) ON DELETE RESTRICT` และ Index `idx_answers_question_round (question_id, round_id)` พร้อมใช้งาน
   - **US-01 (`Task62`):** ตาราง `clubs`, `club_categories` (เรียงตาม `name ASC, id ASC`), `tags` (เรียงตาม `name ASC, id ASC`), และ `club_tags` มี Index `idx_clubs_category_status (category_id, status)` และ `idx_club_tags_tag (tag_id)` รองรับการกรองตามหมวดหมู่และแท็กโดยไม่เกิดแถวซ้ำ
   - **US-03 / US-04 / US-09 / S2-DECISION / S2-PUBLICATION (`Task52`, `Task64`, `Task65`, `Task67`):** ตาราง `recruitment_rounds` มี `academic_year`, `semester`, `opens_at`, `closes_at`, `closed_at`, `confirmation_deadline`, `results_scheduled_at`, `results_published_at`, `version` ครบถ้วน; ตาราง `applications` มี `status` (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`, `WITHDRAWN`, `EXPIRED`), `result_message`, `decided_by`, `decided_at`, `responded_at`, `version` และ Unique Constraint `uq_applications_round_applicant (round_id, applicant_id)`; ตาราง `application_reviews` มี `recommendation` (`NOT NULL`, `CHECK (recommendation IN ('ACCEPT', 'REJECT', 'DISCUSS'))`) และ `internal_comment`; ตาราง `application_status_history` มี `from_status`, `to_status`, `actor_id`, `reason`, และ `changed_at`
   - **US-05 (`Task69`):** ตาราง `club_memberships` มี Unique Constraint `uq_memberships_club_user (club_id, user_id)` และคอลัมน์ `source_application_id BIGINT UNIQUE` พร้อม Index `idx_memberships_user_status (user_id, status)` และตาราง `membership_history`

> [!TIP]
> **คำแนะนำด้าน Index สำหรับการค้นหาชมรม (`GET /api/v1/public/clubs`):**
> ปัจจุบัน `clubs` มี `uq_clubs_name` และ `idx_clubs_category_status (category_id, status)` อยู่แล้ว ซึ่งเพียงพอสำหรับชุดข้อมูลระดับมหาวิทยาลัย (หลักสิบถึงหลักร้อยชมรม) ทั้งนี้ใน Query `GET /api/v1/public/clubs` ให้กรอง `c.status = 'ACTIVE'` ร่วมกับ `c.category_id` ก่อนทำ `LOWER(c.name) LIKE LOWER(:pattern)` เสมอ

---

### 4.2 ลำดับการล็อกข้อมูล (Deterministic Locking Order) และการป้องกัน Race Condition

เพื่อป้องกัน Deadlock และ Race Condition ในสถานการณ์ที่มีคำขอเกิดพร้อมกัน ทุก Service Transaction ที่มีการเขียนข้อมูลต้องจับ Row Lock ตามลำดับขั้น (Hierarchy) เดียวกัน โดยระบุโหมด `FOR SHARE` (`PESSIMISTIC_READ`) และ `FOR UPDATE` (`PESSIMISTIC_WRITE`) ให้ชัดเจนดังนี้:

```mermaid
flowchart LR
    L1["1. users / student_profiles<br/>(FOR UPDATE on applicant;<br/>FOR SHARE on committee actor)"] --> L2["2. clubs<br/>(FOR SHARE / FOR UPDATE)"]
    L2 --> L3["3. club_committee_assignments<br/>(FOR SHARE / PESSIMISTIC_READ)"]
    L3 --> L4["4. recruitment_rounds<br/>(FOR SHARE for child writes;<br/>FOR UPDATE for round state / publish)"]
    L4 --> L5["5. applications<br/>(FOR UPDATE)"]
    L5 --> L6["6. club_memberships /<br/>application_questions"]
```

- **กฎการเลือกใช้ `FOR SHARE` vs `FOR UPDATE` บน `club_committee_assignments` และ `recruitment_rounds`:**
  - **`club_committee_assignments`:** ใช้ `PESSIMISTIC_READ` (`FOR SHARE`) ตามที่กำหนดไว้แล้วใน [`ClubCommitteeAssignmentRepository.java`](../../backend/src/main/java/th/ac/tu/cs/tuclubhub/repository/ClubCommitteeAssignmentRepository.java) เพื่อยืนยันว่าสิทธิ์กรรมการไม่ถูกเพิกถอนระหว่างทำรายการเขียนโดยไม่บล็อกกรรมการคนอื่นของชมรมเดียวกัน
  - **`recruitment_rounds` (`FOR SHARE`):** ใช้สำหรับรายการที่แก้ไขแถวลูกแต่ต้องการตรึงสถานะและหน้าต่างเวลาของรอบไม่ให้เปลี่ยนระหว่างทาง ได้แก่ `POST /api/v1/rounds/{roundId}/applications`, `POST .../start-review`, `PUT .../decision`, และ `POST /api/v1/me/applications/{applicationId}/confirm` / `/decline` (ช่วยให้ผู้สมัครและกรรมการหลายคนทำงานพร้อมกันได้โดยไม่บล็อกกันเอง แต่ยังป้องกันไม่ให้ `PATCH CLOSE`, `PATCH CANCEL`, หรือ `POST /publish-results` แทรกกลางคัน)
  - **`recruitment_rounds` (`FOR UPDATE`):** ใช้สำหรับรายการที่เปลี่ยนสถานะของรอบโดยตรงหรือเป็นจุดกั้นระดับรอบ ได้แก่ `PATCH .../status` (`PUBLISH`, `CLOSE`, `CANCEL`), `POST /api/v1/rounds/{roundId}/publish-results`, และการเพิ่ม/แก้ไข/ลบ `application_questions`

| สถานการณ์ที่เกิดพร้อมกัน (Concurrency Scenario) | กลไกการป้องกันที่ Backend ต้องใช้ |
|---|---|
| **1. ส่งใบสมัครแข่งกับการปิดรับสมัครก่อนกำหนด (`POST /applications` vs `PATCH CLOSE`)** | `POST /applications` จับ `FOR SHARE` บน `recruitment_rounds` ส่วน `PATCH CLOSE` จับ `FOR UPDATE` บน `recruitment_rounds` ก่อนอ่าน `serverNow = clock.instant()` และตรวจ `closed_at IS NULL AND serverNow < closes_at` |
| **2. ยืนยันสิทธิ์ข้ามชมรมพร้อมกันใกล้เพดาน 5 ชมรม (`POST /confirm` บนชมรม A และ B พร้อมกัน)** | ล็อกแถว `users` / `student_profiles` ของนักศึกษาคนนั้นด้วย `FOR UPDATE` เป็นลำดับที่ 1 ก่อนนับจำนวนสมาชิก `ACTIVE` ปัจจุบันใน `club_memberships` เพื่อบังคับให้การยืนยันสิทธิ์ของนักศึกษาคนเดียวกันทำงานเรียงทีละ Transaction เสมอ |
| **3. กดยืนยัน/สละสิทธิ์ซ้ำสองครั้งติดกัน หรือกดยืนยันพร้อมสละสิทธิ์ (`POST /confirm` vs `POST /decline`)** | จับ Lock ตามลำดับ (`student_profiles FOR UPDATE` -> `clubs FOR SHARE` -> `recruitment_rounds FOR SHARE` -> `applications FOR UPDATE`) ก่อนอ่านสถานะ; Transaction ที่สองเมื่อได้ Lock จะเห็นสถานะใหม่ทันที หากเป็น Action เดิมจะคืน `200 OK` (`idempotentReplay: true`) และหากเป็น Action สวนทางจะคืน `409 ALREADY_RESPONDED` |
| **4. ยืนยันสิทธิ์แข่งกับ Background Expiry Worker รอบเส้นตาย (`POST /confirm` vs `ExpiryWorker`)** | ทั้งคู่ล็อกแถว `applications` (`FOR UPDATE`) และอ่าน `serverNow = clock.instant()` หลังได้ Lock โดยใช้กฎเวลาที่ไม่อำพรางกัน: การยืนยันใหม่ต้อง `serverNow < confirmation_deadline` ส่วน Worker ต้อง `serverNow >= confirmation_deadline` |
| **5. แก้ผลคัดเลือกภายในแข่งกับการประกาศผลโดยประธาน (`PUT /decision` vs `POST /publish-results`) หรือกดประกาศผลซ้ำพร้อมกัน** | `PUT /decision` จับ `FOR SHARE` บน `recruitment_rounds` ส่วน `POST /publish-results` จับ `FOR UPDATE` บน `recruitment_rounds` (และล็อก `applications` ในรอบนั้น) **ก่อน** ตรวจสอบเงื่อนไข `409` ทั้ง 7 ข้อ (`RESULTS_ALREADY_PUBLISHED`, `APPLICATIONS_INCOMPLETE`, ฯลฯ) และก่อน insert `notifications` |

---

### 4.3 การบันทึก Audit ของการประกาศผลโดยไม่ขัด `chk_app_history_change`

ตาราง `application_status_history` ใน [`V1__init_schema.sql`](../../backend/src/main/resources/db/migration/V1__init_schema.sql) มี Constraint:
```sql
CONSTRAINT chk_app_history_change CHECK (from_status IS NULL OR from_status <> to_status)
```
ดังนั้น เมื่อ `PRESIDENT` เรียก `POST /api/v1/rounds/{roundId}/publish-results`:
1. **ห้าม** insert แถว `ACCEPTED -> ACCEPTED` หรือ `REJECTED -> REJECTED` ลงใน `application_status_history`
2. หลักฐานการประกาศผลในฐานข้อมูลถูกบันทึกไว้ที่:
   - `recruitment_rounds.results_published_at` (เวลาที่ประกาศจริง) และ `recruitment_rounds.updated_at`
   - ตาราง `notifications` (`type = 'RESULT_PUBLISHED'`, `created_at = results_published_at`) สำหรับผู้สมัครทุกคนที่ได้รับผลในรอบนั้น
3. บันทึก Application Audit Log ลง Structured Logger ของระบบ (`SLF4J` JSON/Key-Value format) โดยมี `event="ROUND_RESULTS_PUBLISHED"`, `roundId`, `clubId`, `publishedByUserId`, `publishedAt`, `acceptedCount`, `rejectedCount`, `traceId`

---

### 4.4 การออกแบบ Background Worker สำหรับตัดสิทธิ์เมื่อหมดเวลา (`SD-11` / `T74-D06`)

> [!NOTE]
> **สถานะการออกแบบ (`T74-D06`):** กฎธุรกิจเรื่องการตัดสิทธิ์เป็น `EXPIRED` เมื่อ `serverNow >= confirmation_deadline` ได้รับการยืนยันจาก `Task74` แล้ว ส่วนรายละเอียดการตั้งเวลา `@Scheduled` ทุก 60 วินาทีและ Startup Catch-up ด้านล่างเป็น **ข้อเสนอเชิงเทคนิคใน Task75 (Design Proposal Pending PO / Reviewer Sign-off)**

เพื่อตอบโจทย์ `US-05.AC-04` และ `T74-D06` ให้ครบถ้วน ระบบต้องมี Internal Scheduled Component (`ApplicationOfferExpiryWorker`) ใน Backend:

- **การตั้งค่า Schedule:**
  - เปิดใช้งาน `@EnableScheduling` ใน Spring Boot Configuration (สามารถเปิด/ปิดหรือปรับความถี่ผ่าน Property `app.recruitment.expiry-worker.fixed-delay-ms=60000`, ค่าเริ่มต้นทุก **60 วินาที**)
  - รองรับ **Startup Catch-up:** เมื่อแอปพลิเคชันเริ่มต้นทำงาน (`initialDelayString = "${app.recruitment.expiry-worker.initial-delay-ms:10000}"`) Worker จะกวาดใบสมัครที่พ้นกำหนดเวลาในช่วงที่เซิร์ฟเวอร์ปิดอยู่โดยอัตโนมัติ
- **เงื่อนไขการค้นหาใบสมัครที่เข้าข่ายหมดเวลา (Candidate Query):**
  ```sql
  SELECT a.id
  FROM applications a
  JOIN recruitment_rounds r ON r.id = a.round_id
  WHERE a.status = 'ACCEPTED'
    AND a.responded_at IS NULL
    AND r.publication_status = 'PUBLISHED'
    AND r.results_published_at IS NOT NULL
    AND r.results_published_at <= :serverNow
    AND r.confirmation_deadline <= :serverNow
  ORDER BY r.confirmation_deadline ASC, a.id ASC
  LIMIT 200
  ```
- **การประมวลผลแบบปลอดภัยต่อ Concurrency (Per-batch / Per-item Transaction):**
  1. สำหรับแต่ละ `applicationId` ที่พบ ให้ล็อกแถว `applications` (`FOR UPDATE SKIP LOCKED`) พร้อมอ่านข้อมูลรอบล่าสุด
  2. อ่านเวลา `serverNow = clock.instant()` หลังได้ Lock และตรวจซ้ำว่า `a.status == 'ACCEPTED'`, `a.responded_at == null`, `r.publication_status == 'PUBLISHED'`, `r.results_published_at <= serverNow`, และ `serverNow >= r.confirmation_deadline`
  3. อัปเดต `applications`:
     - `status = 'EXPIRED'`
     - `responded_at = NULL` (คงค่า `NULL` เพื่อแยกจากผู้ที่กดสละสิทธิ์เองซึ่งมี `responded_at` ไม่เป็น `NULL`)
     - `version = version + 1`, `updated_at = serverNow`
  4. เพิ่มแถวใน `application_status_history`:
     - `application_id = a.id`
     - `from_status = 'ACCEPTED'`
     - `to_status = 'EXPIRED'`
     - `actor_id = NULL` (ระบุว่าเป็น System Action ตาม Schema)
     - `reason = 'CONFIRMATION_DEADLINE_EXPIRED'`
     - `changed_at = serverNow`

---

### 4.5 แนวทางการเขียน Aggregation Query สำหรับ Admin Dashboard (`US-10` / `T74-D08`)

เพื่อป้องกันปัญหาตัวเลขเบิ้ลจากการ Join หลายตาราง (`US-10.BR-06`) ใน `GET /api/v1/admin/dashboard/stats` (`Task71`) ให้สอดคล้องกับ Schema [`AdminDashboardStatsResponse`](../api/openapi.yaml):
- **ห้าม** เขียน Query เดียวที่ `LEFT JOIN recruitment_rounds LEFT JOIN applications LEFT JOIN club_memberships LEFT JOIN club_tags` แล้วใช้ `COUNT(*)`
- ให้แยกการคำนวณด้วย **Subqueries หรือ Common Table Expressions (CTEs)** ตามขอบเขตดังนี้:
  1. **`round_stats_cte` (กรองตาม `academicYear` และ `semester` เฉพาะรอบที่ `publication_status <> 'DRAFT'`):**
     - คำนวณต่อ `club_id`:
       - `round_count = COUNT(DISTINCT r.id)`
       - `total_applications = COUNT(a.id)`
       - `unique_applicants = COUNT(DISTINCT a.applicant_id)`
       - `submitted_count = COUNT(a.id) FILTER (WHERE a.status = 'SUBMITTED')`
       - `under_review_count = COUNT(a.id) FILTER (WHERE a.status = 'UNDER_REVIEW')`
       - `accepted_count = COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED')`
       - `rejected_count = COUNT(a.id) FILTER (WHERE a.status = 'REJECTED')`
       - `confirmed_count = COUNT(a.id) FILTER (WHERE a.status = 'CONFIRMED')`
       - `declined_count = COUNT(a.id) FILTER (WHERE a.status = 'DECLINED')`
       - `withdrawn_count = COUNT(a.id) FILTER (WHERE a.status = 'WITHDRAWN')`
       - `expired_count = COUNT(a.id) FILTER (WHERE a.status = 'EXPIRED')`
  2. **`active_member_cte` (จำนวนสมาชิกปัจจุบันของชมรม):**
     - คำนวณต่อ `club_id` จาก `club_memberships` โดยตรง:
       - `active_member_count = COUNT(cm.id) FILTER (WHERE cm.status = 'ACTIVE' AND cm.joined_at <= :serverNow AND cm.ended_at IS NULL)`
  3. นำทั้งสอง CTE มา `LEFT JOIN` เข้ากับตาราง `clubs` และ `club_categories` ที่กรองด้วย `q`, `categoryId`, และ `clubStatus`

---

## 5. การออกแบบหน้าจอ (UI Wireframes), Route Structure และ Frontend-Backend Component Contract

### 5.1 โครงสร้าง Frontend Routes ทั้งหมดใน Sprint 2

| Route Path | ชื่อหน้าจอ (Screen) | สิทธิ์การเข้าถึง (Route Guard) | API ที่เรียกใช้ | งาน Frontend ที่รับผิดชอบ |
|---|---|---|---|---|
| `/` หรือ `/clubs` | หน้าค้นหาและกรองชมรมสาธารณะ (`ClubSearchPage`) | Public (ไม่ต้อง Login) | `GET /api/v1/public/clubs`<br/>`GET /api/v1/public/club-categories`<br/>`GET /api/v1/public/interest-tags` | `Task63` (`US-01`) |
| `/clubs/:clubId` | หน้ารายละเอียดชมรมและรอบรับสมัคร (`ClubDetailPage`) | Public (แสดงปุ่ม "แก้ไขข้อมูลชมรม" เฉพาะเมื่อ `canEditProfile === true`) | `GET /api/v1/public/clubs/{id}`<br/>`GET /api/v1/public/clubs/{id}/recruitment-rounds` | `US-02`, `Task81` |
| `/clubs/:clubId/edit` | หน้าแก้ไขโปรไฟล์ชมรม (`ClubEditPage`) | Protected: ต้อง Login และมีสิทธิ์กรรมการที่มีผลของชมรมนั้น (`canEditProfile === true` / `activeCommitteeAssignments`) | `GET /api/v1/clubs/{clubId}`<br/>`PUT /api/v1/clubs/{clubId}` | `US-06`, `Task81` |
| `/clubs/:clubId/rounds/:roundId/questions` | หน้าจัดการคำถามคัดเลือก (`RoundQuestionsPage`) | Protected: กรรมการชมรมนั้น (ไม่มี Self-review) | `GET/POST/PUT/DELETE /api/v1/rounds/{roundId}/questions...` | `US-08`, `Task51`, `Task60` |
| `/rounds/:roundId/apply` (หรือ `/clubs/:clubId/rounds/:roundId/apply`) | หน้าแบบฟอร์มส่งใบสมัครเข้าชมรม (`ApplicationFormPage`) | Protected: นักศึกษา `ACTIVE` | `GET /api/v1/rounds/{roundId}/application-form`<br/>`POST /api/v1/rounds/{roundId}/applications` | `US-03`, `Task53` |
| `/me/applications` | หน้ารายการใบสมัครของฉัน (`MyApplicationsPage`) | Protected: ผู้ใช้ที่ Login (`ACTIVE` account) | `GET /api/v1/me/applications` | `US-04`, `Task64` |
| `/me/applications/:applicationId` | หน้ารายละเอียดสถานะใบสมัครและปุ่มยืนยัน/สละสิทธิ์ (`MyApplicationDetailPage`) | Protected: เจ้าของใบสมัคร (`ACTIVE` account) | `GET /api/v1/me/applications/{applicationId}`<br/>`POST /api/v1/me/applications/{applicationId}/confirm`<br/>`POST /api/v1/me/applications/{applicationId}/decline` | `US-04`, `US-05`, `Task64`, `Task70` |
| `/clubs/:clubId/rounds/:roundId/applications` | หน้ารายชื่อผู้สมัครสำหรับกรรมการ (`CommitteeApplicantListPage`) | Protected: กรรมการชมรมนั้น (ไม่มี Self-review) | `GET /api/v1/rounds/{roundId}/applications`<br/>`POST /api/v1/rounds/{roundId}/publish-results` (เฉพาะ `PRESIDENT`) | `US-09`, `Task66`, `Task68` |
| `/clubs/:clubId/rounds/:roundId/applications/:applicationId` | หน้าตรวจคำตอบและบันทึกผลคัดเลือก (`CommitteeApplicationDetailPage`) | Protected: กรรมการชมรมนั้น (ไม่มี Self-review) | `GET /api/v1/rounds/{roundId}/applications/{applicationId}`<br/>`POST /api/v1/rounds/{roundId}/applications/{applicationId}/start-review`<br/>`PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` | `US-09`, `Task66`, `Task68` |
| `/admin/dashboard` | หน้าแดชบอร์ดสถิติภาพรวมมหาวิทยาลัย (`AdminDashboardPage`) | Protected: Global `role === 'ADMIN'` เท่านั้น | `GET /api/v1/admin/dashboard/stats`<br/>`GET /api/v1/public/club-categories` | `US-10`, `Task72` |

> [!IMPORTANT]
> **ข้อกำหนดการลงทะเบียน SPA Deep-Link Routes ใน Backend (`SpaForwardController.java` & `PublicRoutes.java`):**
> ปัจจุบัน [`SpaForwardController.java`](../../backend/src/main/java/th/ac/tu/cs/tuclubhub/config/web/SpaForwardController.java) และ [`PublicRoutes.java`](../../backend/src/main/java/th/ac/tu/cs/tuclubhub/config/security/PublicRoutes.java) เปิดรับเฉพาะ SPA Route Prefix `/login`, `/clubs/**`, `/profile`, และ `/dashboard/**` เท่านั้น ดังนั้นเมื่อพัฒนาหน้าจอที่มี Top-level Path ใหม่ ได้แก่ `/rounds/:roundId/apply` (`Task53`), `/me/applications` & `/me/applications/:applicationId` (`Task64`, `Task70`), และ `/admin/dashboard` (`Task72`, `Task80`) **ต้อง** เพิ่มการแมป `GET` สำหรับ `/rounds/{roundId}/apply`, `/me/applications`, `/me/applications/{applicationId}`, และ `/admin/dashboard` ในทั้ง `SpaForwardController.java` และ `PublicRoutes.java` เพื่อให้การกด Refresh หน้าเว็บหรือเปิดลิงก์ตรง (Deep Link) ส่ง `index.html` กลับไปยัง React Router ได้โดยไม่ติด `401` หรือ `404` จาก Spring MVC (ทั้งนี้ API จริงภายใต้ `/api/v1/**` ยังคงตรวจสิทธิ์ที่ Backend ทุกคำขอ)

---

### 5.2 โครงร่างหน้าจอ (UI Wireframes) และ States สำหรับแต่ละฟีเจอร์

#### 1) หน้าค้นหาและกรองชมรม (`ClubSearchPage` — `US-01` / `Task63`)
```text
+-----------------------------------------------------------------------------------+
| [TU-ClubHub Logo]         ค้นหาชมรม   | ใบสมัครของฉัน | [ชื่อผู้ใช้ / เข้าสู่ระบบ] |
+-----------------------------------------------------------------------------------+
| ค้นหาชมรมที่ใช่สำหรับคุณ                                                           |
| [ ค้นหาชื่อชมรม (ไทย/อังกฤษ)...                  ] [หมวดหมู่: ทั้งหมด v] [ล้างค่า] |
| แท็กความสนใจ: (ทั้งหมด) (Programming) (Music) (Volunteer) (Esports) (Photography) |
| กำลังกรองด้วย: หมวดหมู่ = "วิชาการ" x  | แท็ก = "Programming" x    (พบ 3 ชมรม)    |
+-----------------------------------------------------------------------------------+
| +-----------------------+  +-----------------------+  +-----------------------+   |
| | [Banner / Club Image] |  | [Banner / Club Image] |  | [Banner / Club Image] |   |
| | [กำลังเปิดรับสมัคร]    |  | [ปิดรับสมัคร]          |  | [กำลังเปิดรับสมัคร]    |   |
| | ชมรมพัฒนาซอฟต์แวร์ มธ.|  | ชมรมโรบอทและ AI       |  | ชมรมไซเบอร์ซีคิวริตี้    |   |
| | หมวดหมู่: วิชาการ     |  | หมวดหมู่: วิชาการ     |  | หมวดหมู่: วิชาการ     |   |
| | #Programming #Tech    |  | #AI #Hardware         |  | #Security #Network    |   |
| | [ ดูรายละเอียด -> ]   |  | [ ดูรายละเอียด -> ]   |  | [ ดูรายละเอียด -> ]   |   |
| +-----------------------+  +-----------------------+  +-----------------------+   |
|                                                                                   |
|                         [< ก่อนหน้า]  หน้า 1 / 1  [ถัดไป >]                        |
+-----------------------------------------------------------------------------------+
```
- **UI States บังคับ:**
  - `Loading`: แสดง Skeleton Cards ขณะรอผล API; ใช้ `AbortController` หรือ Request Sequence ID ป้องกันผลลัพธ์ของคำขอเก่าทับคำขอใหม่ (`US-01.TC-01-13`)
  - `Empty`: แสดงข้อความ *"ไม่พบชมรมที่ตรงกับเงื่อนไขการค้นหา"* พร้อมปุ่ม **[ล้างตัวกรองทั้งหมด]** (`US-01.BR-05`)
  - `Error`: แสดงกล่องแจ้งเตือน *"ไม่สามารถโหลดข้อมูลชมรมได้ในขณะนี้"* พร้อมปุ่ม **[ลองใหม่อีกครั้ง]** แยกจาก Empty State อย่างชัดเจน (`US-01.BR-09`)

---

#### 2) หน้าแบบฟอร์มส่งใบสมัคร (`ApplicationFormPage` — `US-03` / `Task53`)
```text
+-----------------------------------------------------------------------------------+
| <- กลับหน้ารายละเอียดชมรม                                                         |
| แบบฟอร์มสมัครเข้า: ชมรมพัฒนาซอฟต์แวร์ มธ.                                          |
| รอบรับสมัคร: รับสมัครสมาชิกใหม่ ปี 2569/1 (ปิดรับ: 31 ต.ค. 2569 23:59 น.)         |
+-----------------------------------------------------------------------------------+
| 1. เหตุผลและความตั้งใจในการสมัคร (Motivation) *                     [ 120 / 2000 ] |
| +-------------------------------------------------------------------------------+ |
| | ผมสนใจพัฒนาเว็บแอปพลิเคชันและต้องการร่วมทำโปรเจกต์จริงกับเพื่อนในชมรม...      | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| 2. คำถามคัดเลือกจากชมรม (Screening Questions)                                     |
| Q1: เล่าประสบการณ์หรือกิจกรรมที่คุณเคยร่วมจัด *                     [ 85 / 2000 ]  |
| +-------------------------------------------------------------------------------+ |
| | เคยเป็นฝ่ายเทคนิคจัดงานค่ายเขียนโปรแกรมสำหรับน้องมัธยม...                     | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| Q2: ทักษะอื่นๆ ที่อยากบอกกรรมการ (ไม่บังคับ)                        [ 0 / 1000 ]   |
| +-------------------------------------------------------------------------------+ |
| |                                                                               | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| 3. ลิงก์ผลงานหรือพอร์ตโฟลิโอ (สูงสุด 5 ลิงก์ เฉพาะ https://)        [+ เพิ่มลิงก์] |
| [ ชื่อเอกสาร เช่น GitHub / Portfolio ] [ https://github.com/example         ] [ลบ] |
|                                                                                   |
|                                         [ ยกเลิก ]   [ ส่งใบสมัคร (Submitting...) ] |
+-----------------------------------------------------------------------------------+
```
- **UI States & Validation (`Task53`):**
  - ตรวจสอบ Client-side ก่อนยิง API: ช่องบังคับกรอกห้ามว่าง/มีแต่ Space, ความยาวตัวอักษรไม่เกิน `maxLength`, URL ต้องขึ้นต้นด้วย `https://`
  - ขณะกำลังส่ง (`isSubmitting === true`): ปิดปุ่ม **[ส่งใบสมัคร]** (`disabled`) พร้อมแสดง Spinner ป้องกัน Double Submit
  - เมื่อได้รับ `201 Created`: แสดง Toast ยืนยันส่งใบสมัครสำเร็จ และ Redirect ไปยัง `/me/applications/:id` (หรือ `/me/applications`)

---

#### 3) หน้าติดตามสถานะและยืนยันสิทธิ์ของตนเอง (`MyApplicationsPage` & `MyApplicationDetailPage` — `US-04` & `US-05` / `Task64` & `Task70`)
```text
+-----------------------------------------------------------------------------------+
| <- กลับหน้ารายการใบสมัครของฉัน                                                     |
| ใบสมัคร #90001 — ชมรมพัฒนาซอฟต์แวร์ มธ.                                           |
| รอบ: รับสมัครสมาชิกใหม่ ปี 2569/1  | ส่งเมื่อ: 19 ต.ค. 2569 16:30 น.              |
+-----------------------------------------------------------------------------------+
| สถานะปัจจุบัน: [ ผ่านการคัดเลือก (รอยืนยันสิทธิ์) ]                                |
| ข้อความจากชมรม: "ผ่านการคัดเลือกเข้าชมรม กรุณากดยืนยันสิทธิ์ภายในวันที่กำหนด"     |
| กำหนดเวลายืนยันสิทธิ์ภายใน: 5 พ.ย. 2569 23:59 น.                                   |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | การตอบรับสิทธิ์เข้าชมรม (เมื่อยืนยันหรือสละสิทธิ์แล้วจะไม่สามารถเปลี่ยนใจได้)   | |
| |    [ ยืนยันสิทธิ์เข้าชมรม (Confirm) ]      [ สละสิทธิ์ (Decline) ]              | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
| ประวัติการดำเนินการ (Status Timeline)                                             |
| (o) 26 ต.ค. 2569 10:00 น. — ประกาศผล: ผ่านการคัดเลือก (รอยืนยันสิทธิ์)            |
| (o) 19 ต.ค. 2569 16:30 น. — ส่งใบสมัครเข้าระบบเรียบร้อยแล้ว                       |
+-----------------------------------------------------------------------------------+
| รายละเอียดคำตอบและลิงก์พอร์ตโฟลิโอที่ส่ง                                          |
| - เหตุผลที่สมัคร: ...                                                             |
| - Q1: ... -> ตอบ: ...                                                             |
| - ลิงก์แนบ: [Portfolio -> https://example.org/portfolio]                          |
+-----------------------------------------------------------------------------------+
```

---

#### 4) หน้าตรวจใบสมัคร บันทึกผล และประกาศผลสำหรับกรรมการ (`CommitteeApplicantListPage` & `CommitteeApplicationDetailPage` — `US-09`, `Task66`, `Task68`)
```text
+-----------------------------------------------------------------------------------+
| จัดการผู้สมัคร — ชมรมพัฒนาซอฟต์แวร์ มธ.                                           |
| เลือกรอบรับสมัคร: [ รับสมัครสมาชิกใหม่ ปี 2569/1 (ปิดรับแล้ว - รอประกาศผล) v ]    |
| สถานะการตัดสิน: ตัดสินแล้ว 12 / 12 ใบ  | [ ประกาศผลคัดเลือกอย่างเป็นทางการ (PRESIDENT) ]
+-----------------------------------------------------------------------------------+
| ค้นหาผู้สมัคร: [ ชื่อ หรือ รหัสนักศึกษา... ]  สถานะ: [ ทั้งหมด v ]                 |
+-----------------------------------------------------------------------------------+
| รหัสนักศึกษา | ชื่อ-นามสกุล       | คณะ          | เวลาที่ส่ง       | สถานะภายใน | การจัดการ   |
|--------------|-------------------|--------------|-----------------|------------|-------------|
| 6609650001   | สมชาย ใจดี        | วิทยาศาสตร์ฯ | 19 ต.ค. 16:30   | ACCEPTED   | [เปิดตรวจ]  |
| 6609650002   | สมหญิง รักเรียน   | วิศวกรรมฯ    | 20 ต.ค. 11:15   | REJECTED   | [เปิดตรวจ]  |
+-----------------------------------------------------------------------------------+
```

---

#### 5) หน้าแดชบอร์ดสถิติส่วนกลางสำหรับ Admin (`AdminDashboardPage` — `US-10` / `Task72`)
```text
+-----------------------------------------------------------------------------------+
| แดชบอร์ดสถิติภาพรวมส่วนกลาง (Admin / กิจการนักศึกษา)                              |
+-----------------------------------------------------------------------------------+
| ตัวกรอง: [ ค้นหาชื่อชมรม... ] [ หมวดหมู่: ทั้งหมด v ] [ ปีการศึกษา: 2569 v ]      |
|          [ ภาคการศึกษา: 1 v ] [ สถานะชมรม: ACTIVE v ]               [ ล้างตัวกรอง ] |
+-----------------------------------------------------------------------------------+
| +-------------------+ +-------------------+ +-------------------+ +-------------+ |
| | ชมรมทั้งหมด       | | ใบสมัครในรอบที่กรอง| | สมาชิกใหม่ยืนยันสิทธิ์| | สมาชิกปัจจุบัน| |
| |     42 ชมรม       | |   1,280 ใบสมัคร   | |      410 คน       | |   1,950 คน  | |
| | (เปิดรับ 15 ชมรม) | | (ผู้สมัคร 845 คน) | | (อัตราตอบรับ 78.85%)| | (Active)    | |
| +-------------------+ +-------------------+ +-------------------+ +-------------+ |
+-----------------------------------------------------------------------------------+
| [สัดส่วนตามหมวดหมู่ชมรม]                    | [5 อันดับชมรมที่มีผู้สมัครสูงสุด]    |
| - วิชาการและนวัตกรรม: 12 ชมรม (490 ใบสมัคร) | 1. ชมรมพัฒนาซอฟต์แวร์ (165 ใบสมัคร) |
| - กีฬา: 10 ชมรม (310 ใบสมัคร)               | 2. ชมรมดนตรีสากล (120 ใบสมัคร)      |
+-----------------------------------------------------------------------------------+
| ตารางสรุปข้อมูลรายชมรม                                                            |
| ชื่อชมรม | หมวดหมู่ | สถานะชมรม | เปิดรับสมัคร | ใบสมัคร | รอยืนยัน | ยืนยันแล้ว | สมาชิก Active |
+-----------------------------------------------------------------------------------+
```

---

### 5.3 ตาราง Mapping สถานะและปุ่มดำเนินการสำหรับผู้สมัคร (`T74-D04` / `US-04` / `US-05`)

Backend เป็นผู้คำนวณ `applicantVisibleStatus`, `displayStatusLabel`, `canConfirm`, และ `canDecline` ส่งมาใน DTO เสมอ เพื่อไม่ให้ข้อมูลภายในรั่วไปที่ Browser:

| สถานะจริงใน DB (`applications.status`) | เงื่อนไข `results_published_at` และ `confirmation_deadline` | `applicantVisibleStatus` บน DTO | `displayStatusLabel` (ป้ายแสดงผลบน UI) | สี Badge แนะนำ | `canConfirm` | `canDecline` |
|---|---|---|---|---|---|---|
| `SUBMITTED` | ทุกกรณี | `SUBMITTED` | `รอพิจารณา` | สีเหลือง/เทา (`warning`/`neutral`) | `false` | `false` |
| `UNDER_REVIEW` | `results_published_at IS NULL` | `SUBMITTED` | `รอพิจารณา` | สีเหลือง/เทา (`warning`/`neutral`) | `false` | `false` |
| `ACCEPTED` | `results_published_at IS NULL` | `SUBMITTED` | `รอพิจารณา` (ซ่อนผลก่อนประกาศ!) | สีเหลือง/เทา (`warning`/`neutral`) | `false` | `false` |
| `REJECTED` | `results_published_at IS NULL` | `SUBMITTED` | `รอพิจารณา` (ซ่อนผลก่อนประกาศ!) | สีเหลือง/เทา (`warning`/`neutral`) | `false` | `false` |
| `ACCEPTED` | ประกาศผลแล้ว และ `serverNow < confirmation_deadline` (รอบไม่ยกเลิก) | `ACCEPTED_PENDING_CONFIRMATION` | `ผ่านการคัดเลือก (รอยืนยันสิทธิ์)` | สีน้ำเงิน/ฟ้า (`info`) | `true` (เมื่อ Student & Club `ACTIVE`) | `true` |
| `ACCEPTED` | ประกาศผลแล้ว แต่ `serverNow >= confirmation_deadline` (แม้ Worker ยังไม่รัน) | `EXPIRED` | `สละสิทธิ์ (หมดเวลาตอบรับ)` | สีเทาเข้ม (`secondary`) | `false` | `false` |
| `REJECTED` | ประกาศผลแล้ว (`results_published_at IS NOT NULL`) | `REJECTED` | `ไม่ผ่านการคัดเลือก` | สีแดง (`danger`) | `false` | `false` |
| `CONFIRMED` | ประกาศผลแล้ว | `CONFIRMED` | `ยืนยันสิทธิ์แล้ว` | สีเขียว (`success`) | `false` | `false` |
| `DECLINED` | ประกาศผลแล้ว | `DECLINED` | `สละสิทธิ์` | สีเทาเข้ม (`secondary`) | `false` | `false` |
| `EXPIRED` | ประกาศผลแล้ว | `EXPIRED` | `สละสิทธิ์ (หมดเวลาตอบรับ)` | สีเทาเข้ม (`secondary`) | `false` | `false` |
| `WITHDRAWN` | ทุกกรณี | `WITHDRAWN` | `ถอนใบสมัครแล้ว` | สีเทา (`neutral`) | `false` | `false` |

---

## 6. รายการตรวจสอบเกณฑ์ตรวจรับของ Task75 (Acceptance Criteria Verification)

- [x] **OpenAPI Spec ระบุ Endpoint ครบทุกฟีเจอร์ใน Sprint 2 พร้อมตัวอย่าง Response:**
  - อัปเดต [`docs/api/openapi.yaml`](../api/openapi.yaml) (v1.2.0) และ [`docs/api/rounds.openapi.yaml`](../api/rounds.openapi.yaml) (v1.1.0) ครอบคลุม `US-01`, `US-03`, `US-04`, `US-05`, `US-08 (Task51)`, `US-09 (รวม Optional start-review)`, `S2-DECISION-DRAFT`, `S2-PUBLICATION-DRAFT`, `US-10`, และ `AUTH/CLUB Security Hardening (Task79, Task81)` พร้อมตรวจสอบด้วย [`redocly.yaml`](../../redocly.yaml) (`no-invalid-media-type-examples: error`) ผ่าน 100%
- [ ] **Database Schema และความสัมพันธ์ระหว่างตารางผ่านการรีวิวเรียบร้อย (รอ PO / Reviewer Sign-off บน PR #59):**
  - ตรวจสอบ [`V1__init_schema.sql`](../../backend/src/main/resources/db/migration/V1__init_schema.sql) เทียบกับ [`TU-ClubHub-ERD-Updated.dbml`](../database/TU-ClubHub-ERD-Updated.dbml) ครบทั้ง 17 ตาราง พร้อมกำหนด Deterministic Locking Order (`FOR SHARE` / `FOR UPDATE`) และเสนอแผน Background Expiry Worker (`T74-D06`) รอการตรวจรับจาก `@chanitnan0jr`
- [x] **กำหนดมาตรฐาน Error Response RFC 7807 ชัดเจนตรงกัน:**
  - กำหนด Schema `Problem` (`application/problem+json`), กฎ `403 ACCESS_DENIED` vs `404 RESOURCE_NOT_FOUND` (`T74-D01`), และตาราง `reason` ของ `409 RESOURCE_CONFLICT` ครบทุกกรณี
- [ ] **ทีม Frontend และ Backend ตกลง Data Structure ตรงกัน 100% (รอ PO / Team Sign-off บน PR #59):**
  - กำหนด Route Table, SPA Forward Requirements, DTO Schemas (ยึด `openapi.yaml#/components/schemas` เป็น Single Source of Truth), Query Parameters, ข้อเสนอหน่วยนับแดชบอร์ด (`T74-D08`), และตาราง Mapping สถานะก่อน/หลังประกาศผลในเอกสารนี้และใน OpenAPI Spec ตรงกันทั้งหมด รอการยืนยันขั้นสุดท้ายจากทีม

