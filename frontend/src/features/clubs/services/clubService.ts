import type { ClubDetailData } from '../types/club';

export const fetchClubDetailAPI = async (clubId: string): Promise<ClubDetailData | null> => {
  try {
    // 1. ยิง API จริงไปที่ Backend
    const response = await fetch(`/api/v1/public/clubs/${clubId}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // ดึงข้อมูลรอบรับสมัครถ้ามี
      let activeRoundData = undefined;
      try {
        const roundRes = await fetch(`/api/v1/public/clubs/${clubId}/recruitment-rounds`);
        if (roundRes.ok) {
          const rounds = await roundRes.json();
          if (Array.isArray(rounds) && rounds.length > 0) {
            activeRoundData = rounds[0];
          }
        }
      } catch {
        // ถ้าดึงรอบไม่ผ่าน ไม่ให้แครช
      }

      return {
        id: data.id || clubId,
        name: data.name || 'ชมรมธรรมศาสตร์',
        category: typeof data.category === 'object' ? data.category?.name : (data.category || 'ทั่วไป'),
        tagline: data.tagline || 'ชมรมกิจกรรมนักศึกษามหาวิทยาลัยธรรมศาสตร์',
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'object' ? t.name : t) : ['กิจกรรม', 'จิตอาสา'],
        logoUrl: data.logoUrl || '',
        coverImageUrl: data.coverImageUrl || data.bannerUrl || '',
        objective: data.objective || data.objectives || 'มุ่งเน้นการทำกิจกรรมเพื่อพัฒนาทักษะและเสริมสร้างความสัมพันธ์ระหว่างนักศึกษา',
        activities: data.activities || ['ประชุมประจำสัปดาห์', 'กิจกรรมรับน้อง', 'ค่ายอาสาพัฒนา'],
        announcementNote: data.announcementNote || 'เปิดรับสมัครสมาชิกใหม่ประจำปีการศึกษา!',
        contacts: {
          facebook: data.contacts?.facebook || data.facebookUrl || '',
          instagram: data.contacts?.instagram || data.instagramUrl || '',
          email: data.contacts?.email || data.contactEmail || '',
        },
        activeRound: activeRoundData || data.activeRound || {
          id: `round-${clubId}`,
          title: `เปิดรับสมัครสมาชิกชมรม (${clubId})`,
          term: 'ภาคเรียนที่ 1/2567',
          startDate: '10 ต.ค. 2567',
          endDate: '31 ต.ค. 2567',
          qualification: 'นักศึกษามหาวิทยาลัยธรรมศาสตร์ทุกชั้นปี',
          questionSummary: 'คำถามความสนใจ และประสบการณ์ทำกิจกรรม',
          isClosed: false,
        },
      };
    }
  } catch (err) {
    console.warn('API connection failed, falling back to dynamic structure:', err);
  }

  // Fallback Dynamic Mock เมื่อไม่มี Backend หรือ Network error
  return {
    id: clubId,
    name: clubId === 'volunteer' ? 'ชมรมค่ายอาสาพัฒนาธรรมศาสตร์' : `ชมรม ${clubId}`,
    category: 'วิชาการและสังคม',
    tagline: 'มุ่งมั่นสร้างสรรค์สังคมและพัฒนาศักยภาพนักศึกษา',
    tags: ['จิตอาสา', 'พัฒนาสังคม', 'ธรรมศาสตร์'],
    logoUrl: '',
    coverImageUrl: '',
    objective: 'ส่งเสริมให้นักศึกษาใช้เวลาว่างให้เกิดประโยชน์ผ่านการทำกิจกรรมเพื่อส่วนรวม',
    activities: ['กิจกรรมลงพื้นที่ชุมชน', 'ค่ายอาสาต่างจังหวัด', 'เวิร์กชอปพัฒนาทักษะ'],
    announcementNote: 'เปิดรับสมัครสมาชิกใหม่แล้ววันนี้!',
    contacts: {
      facebook: 'https://facebook.com/tuclub',
      instagram: 'https://instagram.com/tuclub',
      email: 'contact@tuclub.org',
    },
    activeRound: {
      id: `round-${clubId}-2567`,
      title: `เปิดรับสมัครสมาชิกประจำปีการศึกษา 2567 (${clubId})`,
      term: 'ภาคเรียนที่ 1/2567',
      startDate: '10 ต.ค. 2567',
      endDate: '31 ต.ค. 2567',
      qualification: 'นักศึกษามหาวิทยาลัยธรรมศาสตร์ทุกระดับชั้นปี',
      questionSummary: 'แบบฟอร์มสัมภาษณ์และเลือกฝ่ายที่สนใจ',
      isClosed: false,
    },
  };
};