import { useState } from 'react';
import type { RecruitmentRoundFormInput } from '../types/recruitment';
import { RecruitmentRoundForm } from './RecruitmentRoundForm';

export const RecruitmentRoundPreview = () => {
  const [message, setMessage] = useState('');

  const handleSubmit = async (
    _data: RecruitmentRoundFormInput,
    isDraft: boolean,
  ) => {
    setMessage(
      isDraft
        ? 'ตัวอย่างเท่านั้น: แบบร่างนี้ยังไม่ได้บันทึก'
        : 'ตัวอย่างเท่านั้น: ข้อมูลนี้ยังไม่ได้ส่งไปยังเซิร์ฟเวอร์',
    );
  };

  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        หน้าแสดงตัวอย่างสำหรับทดสอบการจัดเรียงคำถามเท่านั้น ข้อมูลจะไม่ถูกบันทึก
      </div>
      {message && (
        <p
          role="status"
          className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-900"
        >
          {message}
        </p>
      )}
      <RecruitmentRoundForm
        onSubmit={handleSubmit}
        onCancel={() => setMessage('ปิดหน้าแสดงตัวอย่างได้โดยกลับไปยังหน้าหลัก')}
      />
    </>
  );
};
