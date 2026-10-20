-- seed-dev-demo.sql
-- DEV ONLY: demo data on top of backend/src/test/resources/db/migration/
-- V2__seed_test_data.sql. Run it through scripts/seed-dev-data.sh, which
-- applies V2 first (this file needs its seed_admin user and clubs).
--
-- Makes the local mock-auth account (student-demo / tu-clubhub-demo) the
-- PRESIDENT of "ชมรมเขียนโปรแกรม" so the club editor and question pages work,
-- and adds recruitment rounds with questions.
--
-- Re-runnable: rows are inserted only when missing, and the demo rounds'
-- application windows are moved back to "now" so the open round stays open.

BEGIN;

-- 1. The mock-auth account. Login finds this row by tu_username and keeps it.
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

-- 2. Membership and PRESIDENT assignment in ชมรมเขียนโปรแกรม.
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

-- 3. Rounds. The PUBLISHED ones show on the public club page. Question
-- writes are only allowed on a DRAFT round, so the draft one is for trying
-- the question page.
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

UPDATE recruitment_rounds
SET opens_at = now() - interval '1 day',
    closes_at = now() + interval '30 days',
    confirmation_deadline = now() + interval '45 days',
    updated_at = now()
WHERE title LIKE 'DEMO: %'
  AND closed_at IS NULL
  AND publication_status <> 'CANCELLED';

-- 4. Questions.
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

COMMIT;
