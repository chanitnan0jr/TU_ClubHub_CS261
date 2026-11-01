# Sprint 1 Retrospective, Velocity และ Action Plan (Task50:U03-SM-1, SM-2)

**สถานะ:** ร่างข้อมูลตั้งต้นจากหลักฐานใน repo ทีมต้องทบทวนและยืนยันในที่ประชุม Retrospective และ PO ต้องตัดสินว่ารับ Story ใดเป็น Done

## Velocity

อ้างอิง [Sprint 1 Test Report](testing/sprint1-test-report.md)

| Story | SP | ผล | นับเป็น Done |
|---|---:|---|---|
| US-02 | 2 | ผ่านครบ | ✔ |
| US-03 | 8 | ผ่าน 5/6, AC-06 ส่วนหน้าประวัติรอ US-04 | PO ตัดสิน ☐ |
| US-06 | 5 | ผ่าน 4/5, ยังแก้หมวดหมู่และแท็กไม่ได้ | ✘ (ยกส่วนที่เหลือ) |
| US-07 | 3 | ผ่าน 4/5, ยังไม่มี UI แก้ไขและปิดรอบ | ✘ (ยกส่วนที่เหลือ) |
| US-08 | 2 | ผ่านครบ | ✔ |

- **ที่วางแผนไว้:** 20 SP
- **นับตามเกณฑ์เคร่งครัด (ผ่านทุก AC):** 4 SP (US-02 + US-08)
- **ถ้า PO รับ US-03:** 12 SP เหตุผลที่รับได้คือ Post-conditions ของ US-03 ระบุไว้แล้วว่า "การอ่านประวัติเป็นงานต่อของ US-04"

## ข้อมูลตั้งต้นสำหรับ Retro

**สิ่งที่ทำได้ดี**
- เทสต์อัตโนมัติรันกับ PostgreSQL จริง รวมกรณีส่งพร้อมกัน, deadlock และ rollback (backend 427 tests ผ่าน)
- CI รันทุก PR เข้า `main` และ review จับปัญหาได้จริง เช่น ไม่มี lock timeout และการตรวจข้อมูลซ้ำที่อิงข้อความ error
- สาธิต U03 ผ่านเบราว์เซอร์ได้ครบ flow ([U03 flow report](testing/task48-u03-flow-report.md))

**สิ่งที่เป็นปัญหา (มีหลักฐาน)**
- PR #55 ถูก merge โดยมีแค่ review comment ไม่มี GitHub approval
- เอกสารล้าสมัยหลัง merge: สถานะใน US-03, `API_v1.md` และ `local-demo.md` เคยบอกว่ายังไม่มี endpoint
- สถานะการ์ดใน Trello ตามหลัง repo: งานเสร็จแล้วแต่ยังอยู่ To Do
- PR ที่แก้แค่เอกสารไม่รัน CI จน contract ผิดโดยไม่มีใครเห็น (ตอนนี้มี `api-contract.yml` แล้ว)
- Frontend สร้างก่อน contract นิ่ง: ฟอร์มรอบมีช่อง capacity ฟอร์มสมัครเป็น stub และ PR #62 ใช้ path และ schema ที่ไม่ตรง contract
- `compose.yaml` ใช้ `PORT` ผิด จนเปลี่ยน port แล้ว app เข้าไม่ถึง (เจอตอนติดตั้ง Task47)

## Action Plan สำหรับ Sprint 2 (ข้อเสนอ)

| # | Action | ผู้รับผิดชอบ |
|---:|---|---|
| 1 | ตั้ง branch protection ให้ต้องมี 1 approval และ CI ผ่านก่อน merge | Scrum Master |
| 2 | เพิ่มใน DoD: PR ต้องอัปเดตเอกสารสถานะที่เกี่ยวข้อง (README, Story, `API_v1.md`) | PO |
| 3 | Frontend ทำตาม `openapi.yaml` และทดสอบกับ Prism mock ก่อนต่อ backend | Frontend |
| 4 | อัปเดตสถานะการ์ด Trello ใน Daily Standup | ทุกคน |
| 5 | รัน `scripts/smoke-test.sh` ทุกครั้งหลังติดตั้ง | QA / DevOps |
| 6 | แก้ PR #62 ให้ตรง contract (`/api/v1/me/applications`, ระบุตัวตนจาก session) ก่อน merge | FE2 / Backend |

## ผลจากที่ประชุม (กรอกหลังประชุม)

| Start | Stop | Continue |
|---|---|---|
| | | |
