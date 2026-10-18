# ผลตรวจสอบ Migration ตาราง recruitment_rounds

วันที่ทดสอบ: 18 ตุลาคม 2026
ฐานข้อมูล: PostgreSQL 17.11

## ผลตรวจสอบ
- V1__init_schema.sql มีคำสั่งสร้าง recruitment_rounds อยู่แล้ว
- ทดสอบเริ่มแอปกับฐานข้อมูลว่าง พบว่า Flyway รัน V1 และ V3 สำเร็จ
- flyway_schema_history แสดง success = true ทั้งสองรายการ
- ตรวจพบตาราง public.recruitment_rounds พร้อม Primary Key,
  Foreign Key, Index และ Check Constraints

## ชื่อคอลัมน์ที่ต่างจากข้อความใน Task
| ใน Task | ในฐานข้อมูลปัจจุบัน |
|---|---|
| open_at | opens_at |
| close_at | closes_at |
| actual_closed_at | closed_at |
| status | publication_status |

โค้ด ClubProfileQueryRepository และชุดทดสอบใช้ชื่อคอลัมน์เดิมอยู่แล้ว
จึงคง schema เดิมไว้ โดยยังไม่ได้ยืนยันกับทีมว่าต้องเปลี่ยนชื่อให้ตรง Task หรือไม่

## การเปลี่ยนแปลง
เพิ่มเฉพาะบันทึกผลตรวจสอบ ไม่ได้เพิ่ม Migration หรือแก้ไข V1
เนื่องจากมีคำสั่งสร้างตารางอยู่แล้ว

## ขอบเขตการทดสอบ
ตรวจการรัน Migration และโครงสร้างตารางสำเร็จ
ยังไม่ได้ทดสอบ INSERT ข้อมูลที่ผิดเงื่อนไขเพื่อยืนยัน Constraint แต่ละข้อ