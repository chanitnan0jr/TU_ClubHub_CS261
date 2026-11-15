# Task84 [PIPELINE-03] ตั้งค่า GitHub Actions CD Workflow ติดตั้งระบบขึ้น Staging อัตโนมัติ

| รายการ | รายละเอียด |
|---|---|
| **Task ID** | `Task84` |
| **Feature Code** | `PIPELINE-03` |
| **สถานะบน Trello** | ยังไม่ได้ตรวจสอบจากการ์ด |
| **สถานะเอกสาร** | `In Progress / Pending Review` |
| **ผู้รับผิดชอบ (Owner)** | สิรวิชญ์ (DevOps Lead) |
| **ผู้ตรวจรับ (Reviewer)** | วรพล (DevOps) |
| **งานที่ต้องทำก่อน (Dependency)** | CI จาก Task82–83; Task56 ใช้ผล smoke test ใน runner ตามขอบเขตที่ผู้ร้องขอระบุ |
| **SDLC Labels** | 5. Deployment & DevOps |
| **สมาชิกบนการ์ด Trello** | Sirawich Kridatikanwut_6809660027, 34Woraphon Pupatanun |
| **Trello Card Link** | [https://trello.com/c/nIuNToIt](https://trello.com/c/nIuNToIt) |
| **Artefacts** | [`.github/workflows/cd-deploy.yml`](../../../.github/workflows/cd-deploy.yml), [`compose.yaml`](../../../compose.yaml), [`Dockerfile`](../../../Dockerfile), [`database/Dockerfile`](../../../database/Dockerfile), [`docs/testing/task84-cd-staging-deploy-report.md`](../../testing/task84-cd-staging-deploy-report.md) |

---

## 1. รายละเอียดงาน (Card Description)

- **Label:** 5. Deployment & DevOps
- **Owner:** สิรวิชญ์ (DevOps Lead)
- **Reviewer:** วรพล (DevOps)
- **Dependency:** CI จาก Task82–83; Task56 ใช้ผล smoke test ใน runner ตามขอบเขตที่ผู้ร้องขอระบุ

**จุดประสงค์ & บริบทของงาน**
ทำให้กระบวนการ Deploy ระบบขึ้นเซิร์ฟเวอร์ Staging เป็นไปโดยอัตโนมัติเมื่อ Merge โค้ดเข้า Branch หลัก ลดเวลาและลดความผิดพลาดจากการทำมือ

**ขอบเขตงานที่ต้องทำ (Actionable Scope)**
1. **CD Workflow:** เขียน workflow `.github/workflows/cd-deploy.yml`
2. **Container Build & Push:** Build Docker Images ของ Frontend และ Backend แล้ว Push ไปยัง Registry
3. **Staging Deployment:** ติดตั้งเวอร์ชันใหม่ขึ้น Staging Server โดยอัตโนมัติ
4. **Post-deploy Health Check:** ยิง Health Check ตรวจสอบระบบหลัง Deploy หากพังให้แจ้งเตือนทันที

**ขอบเขตที่ผู้ร้องขอระบุภายหลัง:** ไม่ต้องมี server จริง ให้ตรวจ Compose และ smoke test บน GitHub-hosted runner ชั่วคราว พร้อม publish image เมื่อเข้าเงื่อนไข release; ไม่เกิด Staging URL หรือ deployment ที่คงอยู่หลัง job จบ ขอบเขตนี้ต่างจากการ์ดเดิมด้านล่าง ต้องให้ Owner/Reviewer ยืนยันเกณฑ์ก่อนปิด Task

**สถานะหลักฐาน:** ผล runner เป็นหลักฐานของการทดสอบ stack ชั่วคราว ไม่ใช่หลักฐาน deployment ไป Staging ถาวร; ดู run และข้อจำกัดใน [รายงานผล](../../testing/task84-cd-staging-deploy-report.md)

**Artefact (ชิ้นงานที่ต้องส่ง)**
- ไฟล์ GitHub Actions Workflow (`cd-deploy.yml`) พร้อมบันทึกการ Deploy สำเร็จ

---

## 2. รายการตรวจสอบ (Checklists)

### เกณฑ์ตรวจรับ (Acceptance Criteria)

- [ ] เมื่อโค้ดถูก Merge เข้า `main` หรือติด Release Tag ระบบจะ Deploy ขึ้น Staging อัตโนมัติ
- [ ] มีขั้นตอน Health Check ตรวจสอบหลัง Deploy หากล้มเหลวจะแจ้งเตือนทันที

### Definition of Done (Checklist กลาง)

- [ ] ขอบเขตและ API/Data Contract ที่เกี่ยวข้องชัดเจน
- [ ] พัฒนาและทดสอบครบเกณฑ์เฉพาะของการ์ด
- [ ] แนบ PR, ผลทดสอบ, Artefact ที่กำหนด และวิธีตรวจงานให้ Reviewer
- [ ] CI ที่เกี่ยวข้องผ่าน รวม Frontend Tests เมื่อแก้ Logic ฝั่ง Frontend
- [ ] แก้ข้อเสนอแนะที่ขัดการตรวจรับครบ และ Reviewer อนุมัติ
- [ ] รวมโค้ดแล้ว พร้อมอัปเดตเอกสารที่ได้รับผลกระทบ
