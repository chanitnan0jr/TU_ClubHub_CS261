-- V2__seed_test_data.sql
-- TU ClubHub | PostgreSQL | Flyway migration after V1
-- DEV/TEST ONLY: do not migrate this demo data into production.
-- Adjust seed usernames to any authentication mock/stub your team uses.
-- This V1 schema does NOT have a password/password_hash field. Login credentials
-- must be provided by your application's real/mock TU authentication service.
-- Username prefixes and @example.com addresses mark these rows as fictional.
--
-- Scope: 4 categories, 10 clubs, 8 test users, 7 student profiles,
--        10 discovery tags, 9 memberships, 5 club presidents,
--        3 recruitment rounds with 5 application questions.
-- student-demo is the one account the mock TU auth accepts (see 08), so it is
-- the only seeded user who can log in locally.
-- Existing V1 tables/constraints are used; no schema changes are made.
-- Flyway normally runs this migration once within a PostgreSQL transaction.
-- Inserts use ON CONFLICT DO NOTHING to allow safe manual test re-execution.

-- 01. Test users: system_role allows USER and ADMIN only.
-- Club presidents are identified using club_committee_assignments, NOT system_role.
INSERT INTO users (tu_username, display_name, email, system_role)
VALUES
    ('seed_admin', 'ผู้ดูแลระบบ (ทดสอบ)', 'seed-admin@example.com', 'ADMIN'),
    ('seed_president_tech', 'ประธานชมรมเทคโนโลยี (ทดสอบ)', 'seed-tech@example.com', 'USER'),
    ('seed_president_sport', 'ประธานชมรมกีฬา (ทดสอบ)', 'seed-sport@example.com', 'USER'),
    ('seed_president_arts', 'ประธานชมรมศิลปะ (ทดสอบ)', 'seed-arts@example.com', 'USER'),
    ('seed_president_volunteer', 'ประธานชมรมจิตอาสา (ทดสอบ)', 'seed-volunteer@example.com', 'USER'),
    ('seed_student_01', 'นักศึกษาทดสอบ คนที่ 1', 'seed-student01@example.com', 'USER'),
    ('seed_student_02', 'นักศึกษาทดสอบ คนที่ 2', 'seed-student02@example.com', 'USER')
ON CONFLICT DO NOTHING;

-- 02. Student profiles for all 6 non-admin test users.
INSERT INTO student_profiles (user_id, student_code, faculty_name, study_year, student_status)
SELECT u.id, seed.student_code, seed.faculty_name, seed.study_year, 'ACTIVE'
FROM (VALUES
    ('seed_president_tech', 'SEED-0001', 'วิทยาศาสตร์และเทคโนโลยี', 3),
    ('seed_president_sport', 'SEED-0002', 'วิทยาศาสตร์และเทคโนโลยี', 3),
    ('seed_president_arts', 'SEED-0003', 'ศิลปกรรมศาสตร์', 3),
    ('seed_president_volunteer', 'SEED-0004', 'สังคมสงเคราะห์ศาสตร์', 3),
    ('seed_student_01', 'SEED-0005', 'วิทยาศาสตร์และเทคโนโลยี', 2),
    ('seed_student_02', 'SEED-0006', 'ศิลปศาสตร์', 2)
) AS seed(tu_username, student_code, faculty_name, study_year)
JOIN users AS u ON u.tu_username = seed.tu_username
WHERE TRUE
ON CONFLICT DO NOTHING;

-- 03. Four club-discovery categories.
INSERT INTO club_categories (name, description)
VALUES
    ('เทคโนโลยีและนวัตกรรม', 'ชมรมด้านการเขียนโปรแกรม วิศวกรรม และนวัตกรรม'),
    ('กีฬาและสุขภาพ', 'ชมรมกีฬาและกิจกรรมส่งเสริมสุขภาพ'),
    ('ศิลปะและวัฒนธรรม', 'ชมรมศิลปะ ดนตรี และงานสร้างสรรค์'),
    ('จิตอาสาและสิ่งแวดล้อม', 'ชมรมบริการสังคมและอนุรักษ์สิ่งแวดล้อม')
ON CONFLICT DO NOTHING;

-- 04. Ten clubs: created_by is required and points to the seed admin user.
INSERT INTO clubs (category_id, name, description, objectives, created_by, status)
SELECT category.id, seed.name, seed.description, seed.objectives, admin_user.id, 'ACTIVE'
FROM (VALUES
    ('เทคโนโลยีและนวัตกรรม', 'ชมรมเขียนโปรแกรม', 'เรียนรู้การเขียนโปรแกรมและพัฒนาเว็บแอปพลิเคชันร่วมกัน', 'ฝึกทักษะการพัฒนาซอฟต์แวร์ผ่านโครงงานจริง'),
    ('เทคโนโลยีและนวัตกรรม', 'ชมรมหุ่นยนต์และ IoT', 'ออกแบบหุ่นยนต์ เซนเซอร์ และระบบอัตโนมัติเบื้องต้น', 'ส่งเสริมการประดิษฐ์และการแก้ปัญหาด้วยเทคโนโลยี'),
    ('เทคโนโลยีและนวัตกรรม', 'ชมรม AI และวิทยาการข้อมูล', 'ศึกษาปัญญาประดิษฐ์และการวิเคราะห์ข้อมูล', 'แลกเปลี่ยนองค์ความรู้และทดลองทำโครงงาน AI'),
    ('กีฬาและสุขภาพ', 'ชมรมฟุตบอล', 'ฝึกซ้อมฟุตบอลและจัดกิจกรรมแข่งขันกระชับมิตร', 'ส่งเสริมสุขภาพและการทำงานเป็นทีม'),
    ('กีฬาและสุขภาพ', 'ชมรมแบดมินตัน', 'กิจกรรมแบดมินตันสำหรับผู้เล่นทุกระดับ', 'พัฒนาทักษะกีฬาและสร้างสังคมการออกกำลังกาย'),
    ('กีฬาและสุขภาพ', 'ชมรมวิ่งเพื่อสุขภาพ', 'นัดหมายวิ่งออกกำลังกายและแลกเปลี่ยนความรู้ด้านการวิ่ง', 'สร้างพฤติกรรมการดูแลสุขภาพอย่างสม่ำเสมอ'),
    ('ศิลปะและวัฒนธรรม', 'ชมรมดนตรีสากล', 'ฝึกเล่นดนตรีและทำกิจกรรมการแสดง', 'เปิดพื้นที่สร้างสรรค์ให้ผู้สนใจดนตรี'),
    ('ศิลปะและวัฒนธรรม', 'ชมรมถ่ายภาพสร้างสรรค์', 'ฝึกถ่ายภาพ องค์ประกอบภาพ และการแต่งภาพ', 'พัฒนาทักษะการเล่าเรื่องด้วยภาพ'),
    ('จิตอาสาและสิ่งแวดล้อม', 'ชมรมอาสาพัฒนาชุมชน', 'จัดกิจกรรมช่วยเหลือสังคมและพัฒนาชุมชน', 'ส่งเสริมจิตสาธารณะและความรับผิดชอบต่อสังคม'),
    ('จิตอาสาและสิ่งแวดล้อม', 'ชมรมอนุรักษ์สิ่งแวดล้อม', 'กิจกรรมคัดแยกขยะและรณรงค์รักษาสิ่งแวดล้อม', 'สนับสนุนการใช้ทรัพยากรอย่างยั่งยืน')
) AS seed(category_name, name, description, objectives)
JOIN club_categories AS category ON category.name = seed.category_name
CROSS JOIN users AS admin_user
WHERE admin_user.tu_username = 'seed_admin'
ON CONFLICT DO NOTHING;

-- 05. Search/discovery tags (1 tag per seeded club).
INSERT INTO tags (name)
VALUES
    ('โปรแกรมมิ่ง'),
    ('หุ่นยนต์'),
    ('AI'),
    ('ฟุตบอล'),
    ('แบดมินตัน'),
    ('วิ่ง'),
    ('ดนตรี'),
    ('ถ่ายภาพ'),
    ('จิตอาสา'),
    ('สิ่งแวดล้อม')
ON CONFLICT DO NOTHING;

INSERT INTO club_tags (club_id, tag_id)
SELECT c.id, t.id
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', 'โปรแกรมมิ่ง'),
    ('ชมรมหุ่นยนต์และ IoT', 'หุ่นยนต์'),
    ('ชมรม AI และวิทยาการข้อมูล', 'AI'),
    ('ชมรมฟุตบอล', 'ฟุตบอล'),
    ('ชมรมแบดมินตัน', 'แบดมินตัน'),
    ('ชมรมวิ่งเพื่อสุขภาพ', 'วิ่ง'),
    ('ชมรมดนตรีสากล', 'ดนตรี'),
    ('ชมรมถ่ายภาพสร้างสรรค์', 'ถ่ายภาพ'),
    ('ชมรมอาสาพัฒนาชุมชน', 'จิตอาสา'),
    ('ชมรมอนุรักษ์สิ่งแวดล้อม', 'สิ่งแวดล้อม')
) AS seed(club_name, tag_name)
JOIN clubs AS c ON c.name = seed.club_name
JOIN tags AS t ON t.name = seed.tag_name
WHERE TRUE
ON CONFLICT DO NOTHING;

-- 06. Eight club memberships for four presidents and two regular members.
INSERT INTO club_memberships (club_id, user_id, status, joined_at)
SELECT c.id, u.id, 'ACTIVE', TIMESTAMPTZ '2026-08-01 00:00:00+07'
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', 'seed_president_tech'),
    ('ชมรมฟุตบอล', 'seed_president_sport'),
    ('ชมรมดนตรีสากล', 'seed_president_arts'),
    ('ชมรมอาสาพัฒนาชุมชน', 'seed_president_volunteer'),
    ('ชมรมเขียนโปรแกรม', 'seed_student_01'),
    ('ชมรมถ่ายภาพสร้างสรรค์', 'seed_student_01'),
    ('ชมรมฟุตบอล', 'seed_student_02'),
    ('ชมรมอนุรักษ์สิ่งแวดล้อม', 'seed_student_02')
) AS seed(club_name, tu_username)
JOIN clubs AS c ON c.name = seed.club_name
JOIN users AS u ON u.tu_username = seed.tu_username
JOIN student_profiles AS sp ON sp.user_id = u.id
WHERE TRUE
ON CONFLICT DO NOTHING;

-- 07. Assign PRESIDENT permissions through memberships (not users.system_role).
-- Fixed term dates make re-execution idempotent under the V1 unique constraint.
INSERT INTO club_committee_assignments
    (membership_id, position_name, permission_role, starts_at, ends_at, status, assigned_by)
SELECT m.id, seed.position_name, 'PRESIDENT',
       TIMESTAMPTZ '2026-08-01 00:00:00+07',
       TIMESTAMPTZ '2030-08-01 00:00:00+07',
       'ACTIVE', admin_user.id
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', 'seed_president_tech', 'ประธานชมรม'),
    ('ชมรมฟุตบอล', 'seed_president_sport', 'ประธานชมรม'),
    ('ชมรมดนตรีสากล', 'seed_president_arts', 'ประธานชมรม'),
    ('ชมรมอาสาพัฒนาชุมชน', 'seed_president_volunteer', 'ประธานชมรม')
) AS seed(club_name, tu_username, position_name)
JOIN clubs AS c ON c.name = seed.club_name
JOIN users AS u ON u.tu_username = seed.tu_username
JOIN club_memberships AS m ON m.club_id = c.id AND m.user_id = u.id
CROSS JOIN users AS admin_user
WHERE admin_user.tu_username = 'seed_admin'
ON CONFLICT DO NOTHING;

-- 08. The mock-auth account. Login finds this row by tu_username and keeps it.
INSERT INTO users (tu_username, display_name, email, system_role)
VALUES ('student-demo', 'Demo Student', 'student-demo@dome.tu.ac.th', 'USER')
ON CONFLICT (tu_username) DO NOTHING;

-- Login does not create a student profile, and committee checks need an
-- ACTIVE one.
INSERT INTO student_profiles
    (user_id, student_code, faculty_name, department_name, study_year, student_status)
SELECT u.id, 'DEMO-0001', 'Demo Faculty', 'Demo Department', 3, 'ACTIVE'
FROM users AS u
WHERE u.tu_username = 'student-demo'
ON CONFLICT (user_id) DO NOTHING;

-- 09. student-demo is a member and PRESIDENT of ชมรมเขียนโปรแกรม.
INSERT INTO club_memberships (club_id, user_id, status, joined_at)
SELECT c.id, u.id, 'ACTIVE', TIMESTAMPTZ '2026-01-01 00:00:00+07'
FROM clubs AS c
JOIN users AS u ON u.tu_username = 'student-demo'
WHERE c.name = 'ชมรมเขียนโปรแกรม'
ON CONFLICT (club_id, user_id) DO NOTHING;

INSERT INTO club_committee_assignments
    (membership_id, position_name, permission_role, starts_at, ends_at, status, assigned_by)
SELECT m.id, 'ประธานชมรม', 'PRESIDENT',
       TIMESTAMPTZ '2026-01-01 00:00:00+07',
       TIMESTAMPTZ '2030-01-01 00:00:00+07',
       'ACTIVE', admin_user.id
FROM club_memberships AS m
JOIN clubs AS c ON c.id = m.club_id AND c.name = 'ชมรมเขียนโปรแกรม'
JOIN users AS u ON u.id = m.user_id AND u.tu_username = 'student-demo'
CROSS JOIN users AS admin_user
WHERE admin_user.tu_username = 'seed_admin'
ON CONFLICT DO NOTHING;

-- 10. Recruitment rounds. The PUBLISHED ones show on the public club page.
-- Question writes are only allowed on a DRAFT round, so the draft one is for
-- trying the question page.
-- shortcut: the windows run from 1 day before to 30 days after this runs, to
-- renew them recreate the database (docker compose down -v) or edit the dates.
INSERT INTO recruitment_rounds
    (club_id, title, academic_year, semester, description,
     opens_at, closes_at, confirmation_deadline,
     publication_status, published_at, created_by)
SELECT c.id, demo.title, 2569, 1, demo.description,
       now() - interval '1 day',
       now() + interval '30 days',
       now() + interval '45 days',
       demo.status,
       CASE WHEN demo.status = 'PUBLISHED' THEN now() - interval '1 day' END,
       admin_user.id
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รับสมาชิกใหม่', 'PUBLISHED',
     'รับสมัครสมาชิกใหม่ ปีการศึกษา 2569 (ข้อมูลทดสอบ)'),
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รอบฉบับร่าง', 'DRAFT',
     'รอบฉบับร่างสำหรับทดลองจัดการคำถามคัดเลือก (ข้อมูลทดสอบ)'),
    ('ชมรมฟุตบอล', 'DEMO: ชมรมฟุตบอล รับสมาชิกใหม่', 'PUBLISHED',
     'รับสมัครสมาชิกใหม่ ปีการศึกษา 2569 (ข้อมูลทดสอบ)')
) AS demo(club_name, title, status, description)
JOIN clubs AS c ON c.name = demo.club_name
CROSS JOIN users AS admin_user
WHERE admin_user.tu_username = 'seed_admin'
  AND NOT EXISTS (
      SELECT 1 FROM recruitment_rounds AS r
      WHERE r.club_id = c.id AND r.title = demo.title
  );

-- 11. Application questions.
INSERT INTO application_questions (round_id, prompt, is_required, display_order)
SELECT r.id, q.prompt, q.is_required, q.display_order
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รอบฉบับร่าง', 1,
     'ทำไมถึงอยากเข้าร่วมชมรมนี้?', true),
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รอบฉบับร่าง', 2,
     'ว่างเข้าร่วมกิจกรรมวันเสาร์-อาทิตย์ได้หรือไม่?', false),
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รอบฉบับร่าง', 3,
     'มีประสบการณ์เขียนโปรแกรมอะไรบ้าง?', true),
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รับสมาชิกใหม่', 1,
     'แนะนำตัวและเหตุผลที่สนใจสมัคร', true),
    ('ชมรมเขียนโปรแกรม', 'DEMO: ชมรมเขียนโปรแกรม รับสมาชิกใหม่', 2,
     'ทักษะหรือความสามารถพิเศษของคุณ', false)
) AS q(club_name, round_title, display_order, prompt, is_required)
JOIN clubs AS c ON c.name = q.club_name
JOIN recruitment_rounds AS r ON r.club_id = c.id AND r.title = q.round_title
WHERE NOT EXISTS (
    SELECT 1 FROM application_questions AS existing
    WHERE existing.round_id = r.id AND existing.display_order = q.display_order
);

-- Optional manual checks after migration:
-- SELECT cc.name, COUNT(c.id) AS clubs
-- FROM club_categories cc LEFT JOIN clubs c ON c.category_id = cc.id
-- WHERE cc.name IN ('เทคโนโลยีและนวัตกรรม', 'กีฬาและสุขภาพ',
--                   'ศิลปะและวัฒนธรรม', 'จิตอาสาและสิ่งแวดล้อม')
-- GROUP BY cc.name ORDER BY cc.name;
-- SELECT tu_username, display_name, system_role FROM users
-- WHERE tu_username LIKE 'seed_%' ESCAPE '\' ORDER BY tu_username;
-- SELECT c.name, u.tu_username, a.permission_role
-- FROM club_committee_assignments a
-- JOIN club_memberships m ON a.membership_id = m.id
-- JOIN clubs c ON c.id = m.club_id
-- JOIN users u ON u.id = m.user_id
-- WHERE u.tu_username LIKE 'seed_%' ESCAPE '\';
