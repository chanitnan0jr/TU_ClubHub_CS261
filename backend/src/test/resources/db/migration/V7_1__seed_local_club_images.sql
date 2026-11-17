-- DEV/TEST ONLY. Runs after V7, which allows bundled /images/ paths on clubs.
-- scripts/seed-dev-data.sh also applies this file; it is safe to repeat.
UPDATE clubs AS c
SET image_url = seed.image_url,
    banner_url = seed.image_url
FROM (VALUES
    ('ชมรมเขียนโปรแกรม', '/images/tu-clubhub-extra-clubs/club-programming.webp'),
    ('ชมรมหุ่นยนต์และ IoT', '/images/tu-clubhub-extra-clubs/club-robotics-iot.webp'),
    ('ชมรม AI และวิทยาการข้อมูล', '/images/tu-clubhub-extra-clubs/club-ai-data-science.webp'),
    ('ชมรมฟุตบอล', '/images/tu-clubhub-extra-clubs/club-football.webp'),
    ('ชมรมแบดมินตัน', '/images/tu-clubhub-extra-clubs/club-badminton.webp'),
    ('ชมรมวิ่งเพื่อสุขภาพ', '/images/tu-clubhub-extra-clubs/club-running.webp'),
    ('ชมรมดนตรีสากล', '/images/tu-clubhub-extra-clubs/club-music.webp'),
    ('ชมรมถ่ายภาพสร้างสรรค์', '/images/tu-clubhub-extra-clubs/club-photography.webp'),
    ('ชมรมอาสาพัฒนาชุมชน', '/images/tu-clubhub-extra-clubs/club-community-volunteer.webp'),
    ('ชมรมอนุรักษ์สิ่งแวดล้อม', '/images/tu-clubhub-extra-clubs/club-environment.webp')
) AS seed(name, image_url)
WHERE c.name = seed.name;
