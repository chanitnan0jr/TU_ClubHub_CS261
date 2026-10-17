import React, { useState, useEffect } from 'react';
import { useClubProfile } from '../hooks/useClubProfile';
import type { ClubUpdateRequestDto } from '../types/club';

interface Props {
  clubId: string;
}

export const ClubEditFormContainer: React.FC<Props> = ({ clubId }) => {
  const {
    data,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    handleUpdate,
  } = useClubProfile(clubId);

  const [formData, setFormData] = useState<ClubUpdateRequestDto>({
    name: '',
    description: '',
    objectives: '',
    contactUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    contactEmail: '',
    imageUrl: '',
    bannerUrl: '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        objectives: data.objectives || '',
        contactUrl: data.contactUrl || '',
        facebookUrl: data.facebookUrl || '',
        instagramUrl: data.instagramUrl || '',
        contactEmail: data.contactEmail || '',
        imageUrl: data.imageUrl || '',
        bannerUrl: data.bannerUrl || '',
      });
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ClubUpdateRequestDto) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdate(formData);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-600">กำลังโหลดข้อมูลชมรม...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">แก้ไขข้อมูลโปรไฟล์ชมรม</h2>

      {errorMessage && (
        <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">ข้อผิดพลาด:</span> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 text-sm text-green-800 bg-green-100 rounded-lg" role="alert">
          <span className="font-medium">สำเร็จ!</span> {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">ชื่อชมรม *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">คำอธิบายชมรม *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">วัตถุประสงค์</label>
          <textarea
            name="objectives"
            value={formData.objectives || ''}
            onChange={handleChange}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">อีเมลติดต่อ</label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Facebook URL (HTTPS)</label>
          <input
            type="url"
            name="facebookUrl"
            value={formData.facebookUrl || ''}
            onChange={handleChange}
            placeholder="https://facebook.com/..."
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Instagram URL (HTTPS)</label>
          <input
            type="url"
            name="instagramUrl"
            value={formData.instagramUrl || ''}
            onChange={handleChange}
            placeholder="https://instagram.com/..."
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
      </form>
    </div>
  );
};