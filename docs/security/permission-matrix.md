# TU-ClubHub — Permission Matrix

วันที่ตัดสินใจ: 19 ตุลาคม 2026 · Version: 1.0 · สถานะ: กำหนดนโยบายแล้วตามการมอบหมายของเจ้าของโปรเจกต์

เอกสารนี้เป็นแหล่งอ้างอิงหลักของสิทธิ์ Student, Club Committee และ Admin รวมการตรวจ Active, ช่วงวาระ, การพิจารณาใบสมัครของตนเอง และขอบเขต Admin ใช้ร่วมกับ [System architecture](../architecture/system-architecture.md), [API contract](../api/API_v1.md) และ [ERD](../database/TU-ClubHub-ERD-Updated.dbml) หากเอกสารอื่นระบุว่านโยบายเหล่านี้ยังรอตัดสินใจ ให้ยึดเอกสารนี้

การกำหนดสิทธิ์เป็นข้อกำหนดสำหรับ Backend และ QA ไม่ได้หมายความว่าทุก endpoint หรือ workflow พัฒนาแล้ว ส่วนที่ 9 ระบุความต่างจากโค้ด ณ วันที่จัดทำ เอกสารนี้ไม่เพิ่ม API หรือเปลี่ยน schema โดยตัวมันเอง

**ทบทวนเอกสาร Task74: 27 ตุลาคม 2026 — Draft / Pending Team Review.** บันทึกข้อสรุปเพิ่มเติมจากคำสั่งผู้ใช้วันที่ 27 ตุลาคม 2026 ตาม [Decision Log](../architecture/system-architecture.md#s2-decision-log): D01/D02/D05/D07 มี Decision recorded; D03 ผู้ใช้ยืนยันสอง Draft Stories และ Scope Owner ชนิตว์นันท์ — PO/SA โดย FE/BE ยังรอมอบหมาย; D06 ตัดสินช่วงเวลา/จุดตรวจและงานหมดเวลาแล้วแต่ความถี่/ระยะหน่วงยังเปิด ข้อสรุปล่าสุดแก้ baseline วันที่ 19 ตุลาคมเฉพาะจุดที่ระบุ ไม่ใช่ formal PO sign-off, ความเห็นชอบร่วม FE/BE/QA หรือหลักฐาน Implementation ดู [Sprint 2 review packet](../architecture/task74-sprint2-analysis.md) สำหรับหลักฐาน Review ที่ยัง Pending

## 1. บทบาทและแหล่งข้อมูลที่ใช้ตัดสินสิทธิ์

| บทบาท | เงื่อนไข | ขอบเขต |
|---|---|---|
| Student | บัญชี Active และมี `student_profiles.student_status = 'ACTIVE'` ที่ยืนยันจากแหล่งข้อมูลที่เชื่อถือได้ | สมัครและยืนยันสิทธิ์ของตนเอง |
| Club Committee | ผ่านเงื่อนไข Student พร้อมสมาชิกภาพ Active และ assignment ที่มีผลในชมรม Active ตามส่วนที่ 2 | เฉพาะชมรมที่ได้รับมอบหมาย |
| Admin | บัญชี Active และ `users.system_role = 'ADMIN'` จากฐานข้อมูลล่าสุด | สถิติส่วนกลางและการแต่งตั้งกรรมการตาม matrix |

- `users.system_role` ยังคงมีเพียง `USER` / `ADMIN`; ไม่เพิ่ม `STUDENT` หรือ `CLUB_COMMITTEE` เป็น global role
- `COMMITTEE` และ `PRESIDENT` เป็นค่า `club_committee_assignments.permission_role` โดย PRESIDENT มีสิทธิ์กรรมการทั้งหมดและสิทธิ์เพิ่มเติมที่ระบุใน matrix
- คนเดียวมีหลายบทบาทได้ แต่ต้องผ่านเงื่อนไขของ action นั้น เช่น Admin ที่จะสมัครต้องผ่าน Student และ Admin ที่จะจัดการชมรมต้องมี assignment ของชมรมนั้นด้วย
- ข้อห้ามเรื่องบัญชีถูกระงับ การพิจารณารอบที่ตนเองสมัคร และขอบเขตทรัพยากร มีผลเหนือการรวมสิทธิ์หลายบทบาท
- ผู้ที่สถานะนักศึกษาเป็น `INACTIVE`, `GRADUATED`, `UNKNOWN` หรือไม่มี student profile ยังอ่านข้อมูลส่วนตัวเดิมและสละสิทธิ์ของตนได้เมื่อบัญชี Active แต่สมัครใหม่ ยืนยันสมาชิกภาพ หรือใช้สิทธิ์กรรมการไม่ได้
- Login สำเร็จหรือ username ดูเหมือนรหัสนักศึกษาไม่ใช่หลักฐานว่าเป็นนักศึกษา Active การแปลงสถานะจาก TU ต้องอ้างข้อมูลที่ยืนยันได้; ถ้ายืนยันไม่ได้ให้เป็น `UNKNOWN`

## 2. กฎ Active และช่วงวาระ

### 2.1 เงื่อนไขร่วมของ protected operations

ต้องมี session ที่ยังใช้ได้และ `users.account_status = 'ACTIVE'` ตรวจสถานะบัญชีจากฐานข้อมูลทุก request; role ที่เก็บใน session หรือ Frontend ใช้แทนการตรวจนี้ไม่ได้

บัญชี `SUSPENDED` ไม่มีสิทธิ์ใช้ protected operations ทุกบทบาท แม้ session ยังไม่หมดอายุ ให้ยกเลิก session เมื่อพบการระงับ Public endpoints ยังคงใช้ได้แบบ anonymous และการ logout เพื่อทำลาย session ต้องไม่ถูกปิดกั้นด้วยสถานะบัญชี ทั้งนี้ unsafe requests ยังคงต้องตรวจ CSRF

### 2.2 เงื่อนไขกรรมการที่มีผล

ทุกข้อด้านล่างต้องเป็นจริงพร้อมกัน ณ เวลาที่ Backend ตรวจสิทธิ์:

| ข้อมูล | เงื่อนไข |
|---|---|
| บัญชี | `users.account_status = 'ACTIVE'` |
| นักศึกษา | มี profile และ `student_profiles.student_status = 'ACTIVE'` |
| ชมรม | `clubs.status = 'ACTIVE'` และเป็นชมรมเจ้าของทรัพยากรจริง |
| สมาชิกภาพ | `club_memberships.user_id` ตรงกับผู้ใช้ และ `club_id` ตรงกับชมรมเป้าหมาย |
| สถานะสมาชิก | `club_memberships.status = 'ACTIVE'`, `ended_at IS NULL` และ `joined_at <= now` |
| Assignment | ผูกกับสมาชิกภาพข้างต้น, `status = 'ACTIVE'` และ `revoked_at IS NULL` |
| Permission role | `COMMITTEE` หรือ `PRESIDENT`; action เฉพาะประธานต้องมี `PRESIDENT` ที่มีผลจริง |
| ช่วงวาระ | `starts_at <= now AND now < ends_at` และ `starts_at < ends_at` |

ข้อมูลที่จำเป็นหายไปหรือขัดกันให้ปฏิเสธสิทธิ์ ไม่อนุมาน Active จาก field อื่น ตัวอย่างเช่น membership เป็น `ACTIVE` แต่มี `ended_at` หรือ assignment เป็น `ACTIVE` แต่มี `revoked_at` ต้องไม่ผ่าน

### 2.3 ความหมายของ Term Date

- ใช้ช่วง `[starts_at, ends_at)` คือรวมเวลาเริ่มและไม่รวมเวลาสิ้นสุด ไม่มีช่วงผ่อนผัน
- Backend ใช้ `Clock` และ UTC instant; ฐานข้อมูลใช้ `TIMESTAMPTZ` และ API ใช้ ISO 8601 พร้อม timezone UI แสดง Asia/Bangkok โดยไม่เปลี่ยน instant
- หากการแต่งตั้งระบุเป็นวันตามปฏิทินและต้องการให้วันสุดท้ายใช้งานได้ทั้งวัน ให้แปลง `ends_at` เป็น 00:00 ของวันถัดไปใน Asia/Bangkok ก่อนเก็บ UTC ห้ามใช้ 23:59:59 เป็นจุดสิ้นสุด
- `status = 'ACTIVE'` ของ assignment หมายถึงยังไม่ถูกถอน จึงอาจเป็นวาระอนาคตหรือวาระที่หมดแล้ว ต้องตรวจวันเวลาร่วมเสมอ ไม่ต้องรอ scheduled job เปลี่ยนสถานะ
- การหมดวาระหรือถอน assignment ตัดสิทธิ์กรรมการของ assignment นั้นทันทีในการตรวจครั้งถัดไป โดยไม่เปลี่ยนสถานะสมาชิกภาพและไม่ลบประวัติ หากมี assignment อื่นที่ยังมีผล ให้ประเมินสิทธิ์จากรายการนั้นตามปกติ
- เมื่อสมาชิกภาพเป็น `LEFT` หรือ `REMOVED` ต้องถอน assignment ปัจจุบันและอนาคตที่ยังไม่ถูกถอนใน transaction เดียวกัน เพื่อไม่ให้การกลับมาเป็นสมาชิกคืนสิทธิ์เดิม ส่วน `INACTIVE` ระงับการใช้สิทธิ์ชั่วคราว; เมื่อกลับเป็น Active ต้องตรวจทุกเงื่อนไขใหม่
- การต่อวาระต้องสร้าง assignment ใหม่ การแก้ role หรือช่วงเวลาของรายการเดิมใช้ revoke-and-create เพื่อรักษาประวัติ
- ห้ามช่วงวาระที่ไม่ถูกถอนซ้อนกันสำหรับ `(membership_id, permission_role)`; วาระหนึ่งสิ้นสุดตรงกับอีกวาระเริ่มได้ การมี COMMITTEE กับ PRESIDENT พร้อมกันไม่ขยายสิทธิ์ออกนอกชมรม
- Admin ไม่มี Term Date ใน schema ปัจจุบัน ใช้ account Active และ global role ปัจจุบัน; เมื่อทำงานในบทบาทกรรมการต้องผ่าน Term Date เช่นเดียวกับทุกคน

ตัวอย่าง: วาระ 1 สิงหาคม 2569 ถึงสิ้นวันที่ 31 กรกฎาคม 2570 ตามเวลาไทย เก็บ `starts_at = 2026-07-31T17:00:00Z` และ `ends_at = 2027-07-31T17:00:00Z` ที่เวลาไทย 1 สิงหาคม 2570 00:00:00 สิทธิ์จากวาระนี้หมดทันที

<a id="s2-permission-matrix"></a>

## 3. Permission Matrix

ทุก action ที่ไม่ระบุอนุญาตให้ปฏิเสธเป็นค่าเริ่มต้น คอลัมน์แต่ละบทบาทแสดงสิทธิ์ที่บทบาทนั้นให้ได้ การเข้าถึงข้อมูลของตนเองยังต้องตรวจ ownership แม้ผู้ใช้เป็นกรรมการหรือ Admin

แถวที่เป็น protected operations ใช้ session/account/CSRF ตามส่วนที่ 2.1 และผลปฏิเสธตามส่วนที่ 7; Public reads ไม่บังคับ Login งานกรรมการต้องตรวจชมรมเจ้าของทรัพยากรจริงและส่วนที่ 2.2; งานที่ผูกกับรอบใช้ข้อห้าม self-review ส่วนที่ 4 ไม่ขยายข้อห้ามของรอบเป็นการห้ามแก้โปรไฟล์ทั้งชมรมโดยอัตโนมัติ `position_name` เป็นชื่อตำแหน่ง ไม่ใช้แทน `permission_role` เพื่อให้สิทธิ์ PRESIDENT

| Action | Student | Club Committee | Admin | เงื่อนไขเพิ่มเติม |
|---|---|---|---|---|
| ค้นหา/อ่านโปรไฟล์ชมรมและรอบรับสมัครสาธารณะ | ได้ | ได้ | ได้ | Anonymous ใช้ได้; ชมรม Active; รอบต้องเผยแพร่และผ่านเงื่อนไข public endpoint |
| อ่าน `/auth/me` และ logout | ของตนเอง | ของตนเอง | ของตนเอง | ใช้กฎ session/account ในส่วนที่ 2.1 |
| เปิดแบบฟอร์มสมัคร — Task42 **Draft / Pending Review** | ของตนเองตาม Contract ที่รอ Review | ใช้สิทธิ์ Student | ใช้สิทธิ์ Student | [API §12](../api/API_v1.md#12-round-application-form-task42) ระบุบัญชี/นักศึกษา Active, ชมรม Active และรอบเผยแพร่ที่กำลังเปิด; ไม่เปลี่ยนสถานะ/จองสิทธิ์; duplicate/member/quota ยังตรวจที่ POST เว้นแต่ T74-D09 ตัดสินเปลี่ยน |
| ส่งใบสมัคร | ของตนเอง | ใช้สิทธิ์ Student | ใช้สิทธิ์ Student | นักศึกษา Active, ชมรม Active, รอบ `PUBLISHED`, `opens_at <= now < closes_at`, `closed_at IS NULL`; ผ่าน eligibility/duplicate/quota ของการรับสมัคร |
| อ่านใบสมัคร สถานะ และประวัติส่วนตัว | ของตนเอง | ของตนเอง | ของตนเอง | บัญชี Active; อ่านได้แม้สถานะนักศึกษาหรือชมรมไม่ Active; ซ่อนผลที่ยังไม่ประกาศและบันทึกภายใน |
| ยืนยันเข้าร่วมชมรม | ของตนเอง | ใช้สิทธิ์ Student | ใช้สิทธิ์ Student | การตัดสินใหม่: นักศึกษาและชมรม Active; `ACCEPTED` ยังไม่ตอบรับ รอบไม่ยกเลิก; `results_published_at <= now < confirmation_deadline` ที่จุดตัดสินใน Transaction หลังได้สิทธิ์เขียน; ต้องไม่มีแถวสมาชิกเดิมของคู่คน/ชมรมไม่ว่าสถานะใดตาม T74-D07; exact Retry ของใบสมัครเดิมคืนผลเดิม ไม่เขียนสมาชิก/history |
| สละสิทธิ์จากผลที่ได้รับ | ของตนเอง | ของตนเอง | ของตนเอง | การตัดสินใหม่: บัญชีเจ้าของ Active, `ACCEPTED` ยังไม่ตอบรับ รอบไม่ยกเลิก; `results_published_at <= now < confirmation_deadline` ที่จุดตัดสินใน Transaction หลังได้สิทธิ์เขียน; ไม่บังคับ student/club Active; Retry ผลเดิมตาม T74-D05 |
| อ่านสมาชิกภาพ/notification ส่วนตัว และทำเครื่องหมายอ่านแล้ว | ของตนเอง | ของตนเอง | ของตนเอง | บัญชี Active; ตรวจเจ้าของและสิทธิ์ของข้อมูลที่ notification อ้างถึง |
| แก้โปรไฟล์ชมรม | ไม่ได้ | ชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | ผ่านส่วนที่ 2.2; writable fields เป็นไปตาม API contract |
| อ่านรอบ draft และหน้าจัดการรอบ | ไม่ได้ | ชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | ตรวจ resource scope และข้อขัดกันทางผลประโยชน์ในส่วนที่ 4 |
| สร้าง/แก้รอบและคำถาม | ไม่ได้ | ชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | การแก้ไขจำกัด draft ที่ไม่มีใบสมัคร; ตรวจ version และกำหนดเวลา |
| เผยแพร่ประกาศรับสมัคร/ปิดรับสมัครก่อนกำหนด | ไม่ได้ | ชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | COMMITTEE หรือ PRESIDENT; ผ่าน state/time/version ของรอบ |
| ยกเลิกรอบรับสมัคร | ไม่ได้ | PRESIDENT เท่านั้น | ต้องมี PRESIDENT เพิ่ม | เฉพาะ draft หรือ published ที่ยังไม่ประกาศผล; บันทึกเหตุผลและรักษาใบสมัคร/คำตอบ/ประวัติ |
| อ่านใบสมัคร คำตอบ และลิงก์เอกสารของผู้สมัคร | ไม่ได้ | รอบในชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | ใช้ส่วนที่ 4; อ่านข้อมูลเท่าที่จำเป็นต่อการคัดเลือก |
| เริ่มพิจารณาอย่างชัดแจ้ง (`UNDER_REVIEW`) | ไม่ได้ | รอบในชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | ขั้น optional ตาม T74-D02; รอบ published ไม่ cancelled และไม่มี self-review; เป็น Action เขียนแยก ไม่เกิดจาก GET/US-09; เงื่อนไขเวลาของ Action ต้องลง Story/Design ตาม T74-D03 |
| บันทึก/แก้ผลคัดเลือกภายใน | ไม่ได้ | รอบในชมรมที่ได้รับสิทธิ์ | ต้องมีสิทธิ์กรรมการเพิ่ม | รอบ published ปิดรับแล้วและยังไม่ประกาศผล; ไม่บังคับผ่าน UNDER_REVIEW; ใช้ส่วนที่ 4; ไม่แก้คำตอบแทนผู้สมัคร |
| ประกาศผลคัดเลือก | ไม่ได้ | PRESIDENT เท่านั้น | ต้องมี PRESIDENT เพิ่ม | ใช้ส่วนที่ 4; ผลครบและก่อน deadline; ทำ transaction เดียว |
| แก้ผลหลังประกาศ/ยืนยันหรือสละสิทธิ์แทนผู้อื่น | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่มี administrative override ในขอบเขตนี้ |
| อ่านรายชื่อสมาชิกชมรม | อ่านสมาชิกภาพตนเอง | ชมรมที่ได้รับสิทธิ์ | เฉพาะข้อมูลจำเป็นต่อการแต่งตั้ง | จำกัด field ตามส่วนที่ 5 |
| ดู dashboard สถิติภาพรวมมหาวิทยาลัย | ไม่ได้ | ไม่ได้ | ได้ | ข้อมูลสรุปตามปี/ภาคเรียน/ชมรม; ไม่มีรายละเอียดคำตอบหรือเอกสารส่วนตัว |
| แต่งตั้ง/ถอน/ต่อวาระ COMMITTEE และ PRESIDENT | ไม่ได้ | ไม่ได้ | ได้ | ใช้กฎในส่วนที่ 5; การเป็น PRESIDENT ไม่ให้สิทธิ์แต่งตั้งตนเองหรือผู้อื่น |
| สร้างสมาชิกเริ่มต้นเพื่อแต่งตั้งกรรมการ | ไม่ได้ | ไม่ได้ | ได้อย่างจำกัด | สำหรับ bootstrap ที่มีหลักฐานอนุมัติ; ไม่ใช้แทนการยืนยันผลสมัครตามปกติ |
| เปลี่ยน global role, สถานะบัญชี หรือสถานะชมรมผ่านแอป | ไม่ได้ | ไม่ได้ | ยังไม่เปิดสิทธิ์ | ยังไม่มี workflow จัดการบัญชี/ชมรมส่วนกลาง; ไม่รวมอยู่ในสิทธิ์แต่งตั้งกรรมการ |
| ลบใบสมัคร คำตอบ ประวัติ หรือ assignment ถาวร | ไม่ได้ | ไม่ได้ | ไม่ได้ | ใช้สถานะ/การถอนสิทธิ์และเก็บประวัติ |

ความสามารถที่อนุญาตแต่ยังไม่มี endpoint ต้องพัฒนา contract และ workflow ก่อนใช้งาน เช่น cancellation, decisions, publication และ assignment management; สิทธิ์ตามตารางไม่ได้ทำให้ API ที่ยังไม่รองรับตอบ success ได้

**ขอบเขต Sprint 2 — Recorded User Instruction / Pending Team Review:** [US-09](../stories/sprint2/US-09.md) ครอบคลุมการอ่าน ไม่รวมการเริ่มพิจารณา/ตัดสิน/ประกาศผล ผู้ใช้ยืนยัน [สอง Draft Stories ของงานบันทึก/ประกาศผล](../stories/sprint2/selection-results-draft.md) แยกจาก US-09 และ Scope Owner ชนิตว์นันท์ — PO/SA ตาม [T74-D03](../architecture/system-architecture.md#t74-d03); FE/BE ยังรอมอบหมาย และ formal Team Review/Approval ยัง Pending การแต่งตั้ง/ถอน/ต่อวาระและ bootstrap เป็น Dependency เมื่อไม่มีผู้มีสิทธิ์ ไม่เพิ่มเป็นฟีเจอร์ Sprint 2 จาก Task74/US-10 ส่วน state/transition และดัชนีกฎอยู่ใน [Architecture](../architecture/system-architecture.md#s2-application-state-machine)

## 4. การพิจารณาใบสมัครและประกาศผล

1. ตรวจ `application.round_id` และ `application.club_id` จากข้อมูลจริงให้ตรงกับรอบและชมรม ห้ามอาศัย `clubId` ที่ผู้เรียกส่งมาเพียงอย่างเดียว
2. หากผู้ใช้มีใบสมัครในรอบใด ไม่ว่าสถานะใด ให้ปฏิเสธการใช้สิทธิ์กรรมการทั้งหมดกับรอบนั้น รวมอ่านข้อมูลภายใน แก้รอบ ปิด/ยกเลิก พิจารณา และประกาศผล เพื่อไม่ให้ถอนใบสมัครแล้วกลับมาจัดการรอบของตนได้
3. ผู้ใช้ดังกล่าวยังอ่านใบสมัครของตนผ่าน applicant API ได้ โดยเห็นข้อมูลเท่ากับผู้สมัครทั่วไป รายการ/จำนวนรวมของ API กรรมการต้องกรองรอบที่ติดข้อห้ามก่อน pagination และ count
4. COMMITTEE และ PRESIDENT ที่ไม่มีข้อขัดกันสามารถอ่านใบสมัครที่ส่งแล้วในรอบ published และบันทึกผลภายในหลังปิดรับจริง (`now >= closed_at` หากปิดก่อนกำหนด มิฉะนั้น `now >= closes_at`) ห้ามทำกับรอบ cancelled
5. การประกาศผลต้องมี PRESIDENT ที่มีผลของชมรมนั้น ณ เวลาประกาศ รอบต้องปิดรับแล้ว ทุกใบสมัครที่ยังอยู่ในการคัดเลือกต้องตัดสินเป็น `ACCEPTED` หรือ `REJECTED` และ `now < confirmation_deadline` บันทึก `results_published_at`, history และ notification ใน transaction เดียว
6. ไม่เปิดการแก้ผลที่ประกาศแล้ว และไม่ให้ Admin ข้าม self-review, Term Date, Active, deadline หรือ ownership ถ้าผู้มีสิทธิ์หมดวาระหรือทุกคนมีผลประโยชน์ขัดกัน Admin ต้องแต่งตั้งผู้มีคุณสมบัติคนอื่นตามกระบวนการปกติก่อน
7. ก่อนประกาศผล applicant API ต้องซ่อนทั้งผลภายในและ history/notification ที่เปิดเผยผล ใช้สถานะแสดงผลก่อนประกาศที่กำหนดใน DTO; review notes ภายในไม่เปิดเผยแก่ผู้สมัครแม้ประกาศผลแล้ว
8. ตามข้อสรุป T74-D02: MVP ไม่มี INTERVIEW; UNDER_REVIEW เป็นขั้น optional ที่เกิดจาก Action ชัดแจ้งเท่านั้น การอ่าน US-09 ไม่เปลี่ยนสถานะ การบันทึกผลหลังปิดรับสามารถเริ่มจาก SUBMITTED โดยไม่ต้องผ่าน UNDER_REVIEW; Story ของงานเขียนยังแยกจาก US-09
9. ตาม T74-D05/06: การตอบรับใหม่ตรวจ `results_published_at <= now < confirmation_deadline` ด้วยเวลา Server ณ จุดตัดสินใน Transaction หลังได้สิทธิ์เขียน ไม่ใช้เวลาเปิดฟอร์ม; Retry ยืนยัน/สละ Action เดิมคืนผลตัดสินเดิมโดยไม่เพิ่มสมาชิก/history คำขอสวนทางหลังจบรายการใช้ `409 RESOURCE_CONFLICT` ไม่มีเปลี่ยนใจใน MVP; payload/HTTP รายละเอียดของ Retry อยู่ใน Design
10. งานหมดเวลาทำงานอัตโนมัติได้โดยไม่มีผู้เปิดหน้า เปลี่ยนเฉพาะ published ACCEPTED ที่ยังไม่ตอบรับเป็น EXPIRED เมื่อถึง deadline เก็บความต่างจาก DECLINED และ UI แสดง “สละสิทธิ์ (หมดเวลาตอบรับ)”; ความถี่/ระยะหน่วงงานยังเปิดใน T74-D06
11. **T74-D07 — Decision recorded from user instruction / Pending Team Review:** ปฏิเสธการยืนยันใหม่ด้วย `409 RESOURCE_CONFLICT` ทุกกรณีที่คู่ผู้สมัคร/ชมรมมีแถวสมาชิกเดิม ไม่ว่าจะ ACTIVE/INACTIVE/LEFT/REMOVED ไม่เปลี่ยนสถานะสมาชิก ผลตอบรับ ประวัติ หรือ source เดิม และไม่เปิด reactivation ใน MVP ข้อยกเว้นมีเพียง exact Retry Action เดิมของใบสมัครที่ตัดสินสำเร็จแล้ว ให้คืนผลตัดสินเดิมโดยไม่เขียนข้อมูล แม้สถานะสมาชิกปัจจุบันเปลี่ยนไปก็ไม่สร้างหรือคืนสถานะสมาชิก; ผลเดิมคือผลตอบรับของใบสมัคร ไม่ใช่การยืนยันว่าสมาชิกปัจจุบันกลับมา Active คำอธิบายความปลอดภัยเมื่อสมาชิกเปลี่ยนสถานะในส่วนที่ 2.3 ไม่ได้เปิด Flow คืนสถานะสมาชิกใน MVP นี้

## 5. ขอบเขต Admin และข้อมูลที่แต่ละบทบาทมองเห็น

- Admin ใช้ global role เพื่อดูสถิติรวมและจัดการการแต่งตั้ง ไม่ได้สิทธิ์อ่านคำตอบ Portfolio หรือผลคัดเลือกรายบุคคลจาก role นี้
- การแต่งตั้งต้องตรวจบัญชีและ student profile ของผู้รับเป็น Active, ชมรม Active และสมาชิกภาพผ่านส่วนที่ 2.2 ต้องมี `assigned_by`, ช่วงวาระ และหลักฐาน/เหตุผลที่ตรวจสอบย้อนกลับได้ ห้ามแต่งตั้ง ต่อวาระ หรือแก้สิทธิ์กรรมการของตนเอง; ต้องใช้ Admin คนอื่น
- การถอน assignment ทำได้แม้ผู้รับ สมาชิกภาพ หรือชมรมไม่ Active เพื่อให้เพิกถอนสิทธิ์ได้ครบ โดย Admin ผู้ดำเนินการยังต้อง Active ห้ามจัดการ assignment ของตนเองผ่านช่องทางนี้
- การถอนต้องบันทึก `status = 'REVOKED'`, `revoked_at`, `revoked_by` และ `revocation_reason` ใน transaction เดียว การแก้ role/term ใช้ถอนรายการเดิมแล้วสร้างใหม่; ห้าม backdate เพื่อทำให้การกระทำที่ถูกปฏิเสธในอดีตกลายเป็นได้รับอนุญาต
- Bootstrap membership จำกัดเฉพาะการตั้งทีมกรรมการเริ่มต้นที่มีหลักฐานรับรอง ต้องตรวจผู้รับเป็นนักศึกษา Active และชมรม Active บันทึกผู้ดำเนินการ เหตุผล และ membership history; `source_application_id = NULL` ได้ตาม schema การรับสมาชิกผ่านรอบสมัครปกติต้องเกิดจากการยืนยันของผู้สมัคร
- กรรมการเห็นชื่อ รหัสนักศึกษา คณะ ข้อมูลใบสมัคร คำตอบและลิงก์ที่ส่งมาเท่าที่จำเป็นต่อการคัดเลือกในขอบเขตตนเอง รายชื่อสมาชิกแสดงเฉพาะตัวตน สถานะ และช่วงสมาชิกภาพ
- Admin อ่านตัวตน/สถานะสมาชิกและประวัติ assignment เท่าที่จำเป็นต่อการแต่งตั้งข้ามชมรมได้ รวมรายการที่ไม่ Active เพื่อการตรวจสอบและถอนสิทธิ์ ไม่ได้สิทธิ์เข้าถึงเนื้อหาใบสมัครจากการอ้าง `source_application_id`
- ไม่มีการจัดการ global roles หรือสถานะบัญชี/ชมรมผ่าน API ในขอบเขตนี้ การจัดเตรียมบัญชี Admin เริ่มต้นเป็นงานปฏิบัติการที่ต้องมีผู้รับผิดชอบและบันทึกการเปลี่ยนแปลงแยกจาก product API

## 6. การบังคับใช้ที่ Backend

1. Public reads ใช้ DTO สาธารณะและตรวจสถานะชมรม/การเผยแพร่ ส่วน protected requests ตรวจ session และ Active account จากฐานข้อมูล
2. ตรวจสิทธิ์ตาม action และเจ้าของทรัพยากรจริงทุก request ห้าม cache ผลอนุญาตจากเวลา login หรือใช้ global ADMIN ลัดขั้นตอน
3. Mutation ต้องตรวจซ้ำใน service transaction ก่อนเขียนข้อมูล ใช้เวลา Backend ณ จุดตรวจสิทธิ์ก่อนเขียน ไม่ใช้เวลาที่ browser ส่งหรือเวลาที่เริ่มกรอกฟอร์ม คำขอที่เริ่มก่อนหมดวาระแต่ตรวจเพื่อเขียนหลังหมดวาระต้องถูกปฏิเสธ
4. ใช้ locking/conditional updates ให้การตรวจสถานะ บทบาท assignment และการเขียนสอดคล้องกับการถอนสิทธิ์ การเปลี่ยน Active/role ต้องใช้ลำดับ lock เดียวกัน หากการถอน commit ก่อนจุดตรวจสิทธิ์ต้องปฏิเสธ; transaction ที่ตรวจผ่านและถือ lock ก่อนการถอนสามารถเสร็จก่อนได้ งานที่เลื่อนประมวลผลต้องตรวจสิทธิ์ใหม่เมื่อทำงานจริง
5. เปรียบเทียบ boundary ที่เกี่ยวข้องด้วย instant เดียวในรอบการตรวจหนึ่งครั้ง การหมดวาระใช้เวลาเป็นตัวตัดสินและไม่ต้องรอ refresh หน้าเว็บหรือหมด session
6. การเลื่อน/ลด global role ต้องอ่าน role ล่าสุดและ refresh หรือยกเลิก session ที่มี authorities เก่า การหมดวาระเฉพาะชมรมไม่จำเป็นต้อง logout ทั้งระบบ; สิทธิ์ส่วนตัวและชมรมอื่นยังประเมินแยกกัน
7. เก็บ audit ของการแต่งตั้ง/ถอน/ผลคัดเลือก/ประกาศผล พร้อม actor, action, resource, เวลา, เหตุผล และ trace ID ไม่เก็บรหัสผ่าน session ID หรือคำตอบ/ลิงก์ส่วนตัวเต็มชุดใน logs

## 7. ผลลัพธ์เมื่อปฏิเสธสิทธิ์

ใช้ `application/problem+json` ตาม [API contract](../api/API_v1.md) โดยไม่เปิดเผยรายละเอียด membership หรือ assignment ของผู้อื่น

| กรณี | HTTP / code |
|---|---|
| ไม่มี session หรือ session หมดอายุ | `401 AUTHENTICATION_REQUIRED` |
| ตรวจพบ account ถูกระงับใน request ที่ยังยืนยันตัวตนอยู่ | `403 ACCOUNT_NOT_ALLOWED` และ invalidate session; request ถัดไปที่ไม่มี session ใช้ `401` |
| ขาด Student Active, membership/assignment ไม่ Active, ยังไม่เริ่ม/หมดวาระ, ขาด PRESIDENT, ชมรมไม่ Active สำหรับงานกรรมการ หรือ self-review | `403 ACCESS_DENIED` |
| CSRF ไม่ผ่านใน unsafe request | `403 CSRF_INVALID`; CSRF filter อาจปฏิเสธก่อนตรวจ session/authorization |
| ใบสมัคร/private resource มีอยู่จริง แต่ผู้เรียกไม่มีสิทธิ์ใน US-04/US-09 รวมของผู้อื่น/ขอบเขต parent ที่ไม่มีสิทธิ์ | `403 ACCESS_DENIED` โดยไม่คืนเนื้อหา ตาม T74-D01 |
| ไม่พบใบสมัคร/private resource ที่อ้างจริง | `404 RESOURCE_NOT_FOUND` ตาม T74-D01; ไม่ใช้ 404 ซ่อนกรณีทรัพยากรมีอยู่แต่ไม่มีสิทธิ์ใน US-04/US-09 |
| Public club ไม่มีหรือไม่ Active | `404 CLUB_NOT_FOUND` |
| ผู้ใช้ไม่มีสิทธิ์กรรมการของ parent club | `403 ACCESS_DENIED` ก่อนเปิดเผย child resource |
| ผ่าน authorization แต่ state/deadline/version ไม่อนุญาต หรือวาระแต่งตั้งซ้อนกัน | `409 RESOURCE_CONFLICT` |

รหัส `ACCESS_DENIED` ใช้กับการปฏิเสธสิทธิ์ให้ตรงกับ SecurityConfiguration ปัจจุบัน การหมดวาระไม่ใช่ session expiry จึงใช้ `403` เมื่อ session ยังใช้ได้

**T74-D01 — Decision recorded from user instruction 27 ตุลาคม 2026 / Pending Team Review:** [US-04.AC-02/BR-02](../stories/sprint2/US-04.md) และ US-09 ใช้ `403 ACCESS_DENIED` เมื่อใบสมัคร/private resource มีอยู่แต่ไม่มีสิทธิ์ และใช้ `404 RESOURCE_NOT_FOUND` เมื่อไม่พบจริง แทนนโยบายเดิมที่ซ่อนใบสมัครผู้อื่นด้วย 404; ดู [หลักฐานการตัดสิน](../architecture/system-architecture.md#t74-d01) การบันทึกข้อสรุปนี้ไม่ใช่ formal PO sign-off หรือผล Review/Tests ผ่าน

## 8. ตัวอย่างผลการตัดสินสิทธิ์

ให้เงื่อนไขอื่นครบถ้วน เว้นแต่ที่ระบุในแต่ละแถว:

| สถานการณ์ | ผลที่ต้องได้ |
|---|---|
| `now < starts_at` แม้ assignment เป็น ACTIVE | ปฏิเสธสิทธิ์กรรมการ |
| `now = starts_at` | อนุญาตสิทธิ์ตาม assignment |
| `now = ends_at` | ปฏิเสธสิทธิ์จาก assignment นั้น |
| วาระเดิมหมดตรงกับวาระใหม่เริ่ม | ใช้ role ของวาระใหม่ ไม่มีสิทธิ์ตกค้างจากวาระเดิม |
| assignment ถูกถอนระหว่างมี session | การตรวจครั้งถัดไปปฏิเสธ แม้ยังล็อกอินอยู่ |
| membership เป็น INACTIVE/LEFT/REMOVED หรือ joined_at อยู่ในอนาคต | ปฏิเสธสิทธิ์กรรมการ |
| ไม่มี student profile หรือเป็น UNKNOWN/INACTIVE/GRADUATED | ปฏิเสธสมัครใหม่ ยืนยัน และงานกรรมการ; อ่านข้อมูลของตนได้เมื่อบัญชี Active |
| account เป็น SUSPENDED แม้เป็น ADMIN/PRESIDENT | ปฏิเสธ protected operations และยกเลิก session |
| กรรมการชมรม A เรียก resource ของชมรม B | ปฏิเสธ แม้เปลี่ยน clubId ใน request |
| Admin ไม่มี assignment เรียกแก้โปรไฟล์/ประกาศผล | ปฏิเสธ |
| PRESIDENT มีใบสมัครในรอบที่จะประกาศผล | ปฏิเสธ แม้ใบสมัครนั้นถูกถอนแล้ว |
| PRESIDENT หมดวาระแต่ COMMITTEE อีก assignment ยังมีผล | ทำงานกรรมการทั่วไปได้ แต่ประกาศผล/ยกเลิกรอบไม่ได้ |
| Admin แต่งตั้งตนเองเป็น PRESIDENT | ปฏิเสธ |
| ผู้ใช้ผ่านสิทธิ์แต่ตัดสินยืนยันใหม่เมื่อ `now = confirmation_deadline` | ปฏิเสธด้วย conflict; exact Retry ผลเดิมแยกตาม T74-D05/07 |
| ยืนยันใหม่เมื่อมีแถวสมาชิกเดิม ACTIVE/INACTIVE/LEFT/REMOVED ของคู่คน/ชมรม | 409 RESOURCE_CONFLICT ไม่แก้ข้อมูลเดิมและไม่ reactivate ใน MVP |
| exact Retry ยืนยันใบสมัครเดิมที่สำเร็จแล้ว แม้สมาชิกปัจจุบันเป็น INACTIVE/LEFT/REMOVED | คืนผลตัดสินเดิมหลังตรวจ Session/account/ownership โดยไม่เขียนข้อมูลหรือคืนสมาชิกเป็น Active |

## 9. สถานะ implementation และงานที่ต้องตามนโยบาย

ทบทวน source/เอกสารสำหรับ Task74 ณ วันที่ 27 ตุลาคม 2026 โดยรักษาประวัติผลรายงานเดิมไว้; รายการนี้ไม่ใช่การรันทดสอบใหม่หรือหลักฐานว่า Workflow Sprint 2 ผ่านแล้ว:

| ส่วน | สิ่งที่พบ | งานที่ยังต้องทำ |
|---|---|---|
| Committee guard | [Assignment repository](../../backend/src/main/java/com/tu/clubhub/committee/repository/ClubCommitteeAssignmentRepository.java) ตรวจ account, student Active, club Active, membership (`joined_at <= now`, `ended_at IS NULL`), assignment, revoked_at และ `[starts_at, ends_at)` แล้ว; การตรวจใน write transaction ล็อกแถว assignment ที่ให้สิทธิ์จนจบ transaction ตามส่วนที่ 6 ข้อ 4 (f17cdd4, ทดสอบสอง transaction บน PostgreSQL) — รับประกันเฉพาะการเปลี่ยนแถว assignment; สถานะ account, student, membership และ club อ่านค่าที่ commit แล้ว ณ เวลาตรวจ ไม่ถูกเรียงลำดับ | แยก guard สำหรับ PRESIDENT; Admin revocation ในอนาคตต้องเปลี่ยนแถว assignment เดียวกันจึงจะขัดกับ lock นี้ |
| Session/account | [Login service](../../backend/src/main/java/com/tu/clubhub/auth/service/LoginService.java) ตรวจ account ตอน login; [ActiveAccountFilter](../../backend/src/main/java/com/tu/clubhub/config/ActiveAccountFilter.java) ตรวจ account ทุก request ที่มี session และ invalidate เมื่อระงับ (protected API ได้ `403 ACCOUNT_NOT_ALLOWED`, public endpoint และ logout ใช้ต่อได้) | ใช้ global role ล่าสุดจากฐานข้อมูลแทนค่าที่เก็บใน session |
| Student status | [UserAccountService](../../backend/src/main/java/com/tu/clubhub/user/service/UserAccountService.java) สร้าง/อัปเดต student_profiles ของบัญชี `type=student` ใน Transaction เดียวกับบัญชี (efa2fda); map เฉพาะ `tu_status` ที่ระบุใน [TU API](../api/TU_API.md) ค่าว่าง/ไม่รู้จัก/ขัดกับ `statusid` เป็น `UNKNOWN`; บัญชีประเภทอื่นไม่สร้าง profile และ profile เดิมเป็น `UNKNOWN`; login ไม่สร้างสมาชิกภาพ assignment หรือ role | **ผ่าน Automated Tests — รอตรวจ TU จริง** (หลักฐาน Real Integration ของ Task57 ยังไม่ปิด); ยืนยันรายการ `statusid` ทั้งหมดจาก TU |
| Club profile | มี Public GET APIs และ PUT ที่ตรวจกรรมการ; Service ตรวจสิทธิ์กรรมการซ้ำใน Transaction ก่อนแก้ข้อมูล (01760ff, 265 tests ผ่านตามรายงาน; ปิดเฉพาะการตรวจซ้ำ); category/tags ยังไม่ใช่ writable fields ของ contract | GET `/api/v1/clubs/{clubId}` ที่ editor เรียกยังไม่มี handler; ใช้ guard ตามนโยบายใหม่และเชื่อม Frontend; การขยาย field ของ US-06 ต้องแก้ contract/DTO แยก |
| Public routes | [PublicRoutes](../../backend/src/main/java/com/tu/clubhub/config/PublicRoutes.java) เป็นรายการเดียว (method + path) ที่ Security chain และ session filters ใช้ร่วมกัน; `GET /api/v1/clubs/**` ไม่เป็น public แล้ว (1f5d43e) | เปิด GET ที่ต้องเป็นสาธารณะเฉพาะใน card ของฟีเจอร์นั้นพร้อม tests |
| Recruitment | มี create/update/publish/close และ API คำถามรายข้อ ตรวจ version และข้อห้ามจัดการรอบที่ตนสมัครแล้ว | GET สำหรับกรรมการและ CANCEL ยังไม่มี implementation; CANCEL ต้องตรวจ PRESIDENT และมีเหตุผลใน contract |
| Application/ผลคัดเลือก/ตอบรับ | มีตารางรองรับและ [Submission Contract §11](../api/API_v1.md#11-application-submission) แล้ว; Frontend เป็นฟอร์มต้นแบบ ยังไม่มี Submission/อ่านใบสมัคร/ตัดสิน/ประกาศ/ตอบรับ/งานหมดเวลา implementation | Implement Submission พร้อม student Active/ownership; กำหนด Contract ของ applicant reads, committee review, internal-result filtering, publication และ US-05; US-09 คงเป็นงานอ่าน งานบันทึก/ประกาศผลมีสอง Draft Stories และ Scope Owner ตาม T74-D03 แล้ว แต่ยัง Pending Team Review; นำข้อสรุป Retry/deadline/สมาชิกเดิม T74-D05/06/07 ไปออกแบบ โดยไม่มี MVP reactivation; publication audit ต้องไม่สร้าง status history ที่ from=to |
| Admin/assignment/dashboard | Schema รองรับ assignment และ history บางส่วน | ยังต้องมี service/API สำหรับการแต่งตั้ง/ถอน/bootstrap/สถิติ, การถอน assignment เมื่อสมาชิก LEFT/REMOVED และ audit ของเหตุผลแต่งตั้ง; เพิ่ม migration ใหม่หากต้องเก็บ field เพิ่ม |

เอกสาร OpenAPI อธิบายนโยบายเป้าหมายเดียวกัน แต่ยังต้องตรวจการบังคับใช้จริงก่อนส่งมอบแต่ละ workflow ห้ามอ้างว่าการอัปเดตเอกสารนี้ทำให้ช่องว่างข้างต้นถูกแก้แล้ว
