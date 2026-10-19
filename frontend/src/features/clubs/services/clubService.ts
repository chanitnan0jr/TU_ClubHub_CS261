import type { ClubDetailData } from '../types/club';

export const fetchClubDetailAPI = async (
  clubId: string
): Promise<ClubDetailData> => {
  console.log('Fetching club detail for ID:', clubId);

  const mockClubDetail: ClubDetailData = {
    id: 'volunteer',
    name: 'ชมรมอาสาพัฒนาชุมชน',
    category: 'บำเพ็ญประโยชน์',
    tagline: 'อาสาด้วยใจ เติบโตไปด้วยกัน พลังเล็ก ๆ ของเรา สร้างความเปลี่ยนแปลงให้ชุมชน',
    tags: ['#จิตอาสา', '#พัฒนาชุมชน', '#สิ่งแวดล้อม'],
    logoUrl: '',
    coverImageUrl: '',
    objective:
      'ส่งเสริมให้นักศึกษาร่วมทำงานอาสา เรียนรู้วิถีชุมชน และใช้ความรู้สร้างประโยชน์ให้สังคม พร้อมพัฒนาทักษะการทำงานเป็นทีมและความรับผิดชอบต่อส่วนรวม',
    activities: [
      'ค่ายอาสาพัฒนาโรงเรียนและพื้นที่สาธารณะ',
      'กิจกรรมสอนหนังสือและแบ่งปันความรู้ให้เด็ก ๆ',
      'โครงการสิ่งแวดล้อมร่วมกับชุมชนรอบมหาวิทยาลัย',
    ],
    announcementNote: 'ยินดีต้อนรับนักศึกษาทุกคณะ ไม่จำเป็นต้องมีประสบการณ์',
    contacts: {
      facebook: 'facebook.com/tu.volunteer',
      instagram: '@tu_volunteer',
      email: 'volunteer@club.tu.ac.th',
    },
    activeRound: {
      title: 'รอบรับสมัครสมาชิกใหม่ ประจำภาคเรียนที่ 1/2567',
      term: 'ภาคเรียนที่ 1/2567',
      startDate: '1 พ.ย. 2567 (09:00 น.)',
      endDate: '15 พ.ย. 2567 (23:59 น.)',
      qualification: 'นักศึกษา มธ. ทุกชั้นปี ทุกคณะ',
      questionSummary: 'มีคำถามคัดเลือก 3 ข้อ (ตอบแบบข้อความ)',
      isClosed: false,
    },
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockClubDetail);
    }, 800);
  });
};