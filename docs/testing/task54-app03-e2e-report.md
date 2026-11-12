# Task54 [APP-03]: รายงานทดสอบการส่งใบสมัคร

| รายการ | รายละเอียด |
|---|---|
| สถานะ | Draft / Pending Review — ยังไม่ใช่หลักฐานอนุมัติหรือ merge |
| ขอบเขต | US-03; พึ่งพา [Task52](../tasks/sprint2/Task52.md) และ [Task53](../tasks/sprint2/Task53.md) |
| สภาพแวดล้อม | Mock authentication, Chromium, Spring Boot และ PostgreSQL ทดสอบแยก ไม่ใช้บัญชีหรือข้อมูลจริง |

## หลักฐานการตรวจ

ผลต่อไปนี้เป็นการรันในเครื่องระหว่างแก้ไขเมื่อ 12 พฤศจิกายน 2026 ไม่ใช่ผล CI ของ commit ใหม่:

| ชุดตรวจ | ผล |
|---|---|
| Frontend `npm test` | 151 ผ่าน; ใช้ unit/component tests และ mock ตามที่แต่ละไฟล์กำหนด |
| Frontend `npm run lint` และ `npm run build` | ผ่าน |
| Backend: `CurrentUserAssignmentsIntegrationTest`, `AuthSessionIntegrationTest`, `UserAccountConcurrencyIntegrationTest` กับ PostgreSQL แยก | 19 ผ่าน รวม login บัญชีเดิมและบัญชีใหม่พร้อมกัน |
| Backend `ApplicationServiceIntegrationTest` สำหรับเตรียมข้อมูลทดสอบ | 53 ผ่าน |
| [Playwright browser → HTTP → PostgreSQL](../../frontend/scripts/verify-task54-browser.mjs) | ผ่าน: ส่งสำเร็จและประวัติ สมัครซ้ำ ปิดรอบและระงับบัญชีขณะกรอก ข้อมูลเจ้าของบัญชี และ Unicode ด้วย mock account และฐานข้อมูลแยก |

ก่อนหน้านี้มีการตรวจ backend validator/service/MockMvc 194 กรณีบน commit ที่ตรวจเดิม ผลนั้นไม่ใช่ผลรันใหม่ของทุกกรณีหลังแก้ไข ชุด frontend สามไฟล์ที่รายงานเดิมอ้างบน commit เดิมมี 12 กรณี (7 + 3 + 2) ไม่ใช่ 14 กรณี การรวมผลจากชุดต่างชนิดกันเป็นเปอร์เซ็นต์เดียวไม่แสดงความครอบคลุม E2E

สคริปต์ Playwright ใช้เบราว์เซอร์จริงและตรวจข้อมูลใน PostgreSQL ส่วน [`verify-task54-e2e.ts`](../../frontend/scripts/verify-task54-e2e.ts) ใช้ JSDOM กับ HTTP จริง ไม่ใช่การทดสอบเบราว์เซอร์ ทั้งสองชุดใช้ mock authentication ไม่ยืนยันการเชื่อมต่อ TU API จริง

## ผลการแก้ข้อค้นพบ

| รายการ | การแก้ไขและหลักฐาน | สถานะ |
|---|---|---|
| QA-01 | เพิ่ม Playwright scenario ส่งสำเร็จ ตรวจประวัติและข้อมูลที่บันทึก สมัครซ้ำ และปิดรอบ; เพิ่ม job ใน [CI](../../.github/workflows/ci.yml) โดยใช้ฐานข้อมูลแยก | รอ CI และ reviewer ตรวจ commit ใหม่ |
| QA-02 | ปรับ [Task54](../tasks/sprint2/Task54.md) ให้เป็น Pending Review และไม่ทำเครื่องหมาย review/merge ล่วงหน้า | รอหลักฐานจากผู้รับผิดชอบ |
| QA-03 | แยกประเภทการทดสอบและระบุจำนวนจากผลรันแต่ละรอบข้างต้น | แก้รายงานแล้ว |
| QA-04 | Browser scenario ตรวจลำดับส่งสำเร็จ 201 แล้วสมัครซ้ำ 409 กับฐานข้อมูลเดียวกัน | ตรวจในเครื่องแล้ว |
| QA-05 | Task53 ระบุการ merge PR #68 แล้ว; การปิดเกณฑ์อื่นต้องอาศัยหลักฐานจาก Owner | ติดตามโดย Owner |
| QA-06 | ปรับรูปแบบรายงาน | ตรวจด้วย `git diff --check` ก่อนส่ง review |
| BUG-01 | เอา native `maxLength` ที่นับ UTF-16 ออก และใช้ validation ตาม Unicode code points; เพิ่ม component และ browser checks | ตรวจในเครื่องแล้ว |
| BUG-02 | จัดการ concurrent refresh บัญชีด้วย database lock และทดสอบ login พร้อมกันบน PostgreSQL | ตรวจ integration ในเครื่องแล้ว; ไม่ได้ยิง TU API จริง |
| BUG-03 | ตรวจบัญชีที่ถูกระงับระหว่างขอ CSRF และคืน `403 ACCOUNT_NOT_ALLOWED` ก่อนส่งใบสมัคร | browser และ regression tests ผ่านในเครื่อง; รอ reviewer ตรวจ contract |
| GAP-01 | `/api/v1/auth/me` ส่งชื่อ รหัสนักศึกษา อีเมล และคณะของเจ้าของ session เมื่อมีข้อมูล พร้อมปรับ API contract และทดสอบการเข้าถึง | ตรวจในเครื่องแล้ว |
| DEP-01 | API ค้นหาชมรมเป็นขอบเขต [Task62](../tasks/sprint2/Task62.md) | ติดตามแยกตามที่ตกลง |

## วิธีตรวจซ้ำ

[CI workflow](../../.github/workflows/ci.yml) แสดงขั้นตอนสร้าง PostgreSQL ชั่วคราว ติดตั้ง Chromium สร้าง frontend เตรียมฐานข้อมูล เริ่ม backend ด้วย mock authentication และรัน browser test ชุดใหม่นี้ยังต้องรอผล CI จริงหลังส่งการเปลี่ยนแปลง

หากรันเอง ให้เตรียมฐานข้อมูล **ใหม่และใช้ทิ้งเท่านั้น** ชื่อขึ้นต้น `task54_e2e_` และ backend mock บน `127.0.0.1` ที่ชี้ฐานข้อมูลเดียวกัน ตามขั้นตอนใน CI; สคริปต์สร้างรอบและข้อมูลทดสอบ และเปลี่ยนสถานะบัญชี mock ชั่วคราว ห้ามใช้ฐานข้อมูลหรือบัญชีใช้งานจริง หลังตรวจให้ลบฐานข้อมูลทดสอบทั้งชุด

```sh
cd frontend
npm ci
npx playwright install chromium
TASK54_DISPOSABLE_TEST_ENV=1 \
TASK54_TEST_DB_NAME=task54_e2e_local \
TASK54_TEST_DB_PORT=55432 \
PGPASSWORD=task54_test_password \
APP_URL=http://127.0.0.1:18080 \
npm run test:task54:e2e
```

ค่า port และ password ในตัวอย่างต้องตรงกับฐานข้อมูลทดสอบที่เตรียมไว้ และต้องมี `psql` ใน PATH หากทดสอบไม่ผ่าน สคริปต์เก็บ screenshot และ trace ใน `/tmp/task54-browser-*` ให้ตรวจและจัดการหลักฐานตามนโยบายข้อมูลของทีม

## ข้อจำกัดและการปิดงาน

ยังไม่ได้ทดสอบ TU API ด้วยบัญชีจริง, race ระหว่างกดส่งกับปิดรอบผ่านเบราว์เซอร์, network หลุดหลัง commit หรือการเข้าถึงลิงก์ปลายทางจริง ผล CI ของการแก้ไขชุดนี้และการ review/approval ยังต้องเกิดขึ้นจริงก่อน merge และปิด Task54
