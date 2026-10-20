import React, { useState, useEffect } from 'react';
import { useClubProfile } from '../hooks/useClubProfile';
import {
  EMPTY_CLUB_EDIT_FORM,
  toClubEditFormValues,
  toClubUpdateRequest,
  validateClubEditForm,
  type ClubEditFormErrors,
  type ClubEditFormValues,
} from '../utils/clubEditForm';

interface Props {
  clubId: string;
}

const inputClass = 'mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm';

export const ClubEditFormContainer: React.FC<Props> = ({ clubId }) => {
  const {
    data,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    handleUpdate,
    refetch,
    clearAlerts,
  } = useClubProfile(clubId);

  const [formData, setFormData] = useState<ClubEditFormValues>(EMPTY_CLUB_EDIT_FORM);
  const [fieldErrors, setFieldErrors] = useState<ClubEditFormErrors>({});

  useEffect(() => {
    if (data) {
      setFormData(toClubEditFormValues(data));
      setFieldErrors({});
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const errors = validateClubEditForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    handleUpdate(toClubUpdateRequest(formData));
  };

  const renderField = (
    name: keyof ClubEditFormValues,
    label: string,
    options: { type?: string; placeholder?: string; multiline?: number } = {},
  ) => (
    <div>
      <label htmlFor={`club-${name}`} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {options.multiline ? (
        <textarea
          id={`club-${name}`}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          rows={options.multiline}
          aria-invalid={Boolean(fieldErrors[name])}
          className={inputClass}
        />
      ) : (
        <input
          id={`club-${name}`}
          type={options.type ?? 'text'}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={options.placeholder}
          aria-invalid={Boolean(fieldErrors[name])}
          className={inputClass}
        />
      )}
      {fieldErrors[name] && <p className="mt-1 text-sm text-red-600">{fieldErrors[name]}</p>}
    </div>
  );

  if (isLoading) {
    return <div className="p-4 text-center text-gray-600">กำลังโหลดข้อมูลชมรม...</div>;
  }

  // โหลดข้อมูลเดิมไม่สำเร็จ: ไม่แสดงฟอร์มว่าง เพราะบันทึกแล้วจะทับข้อมูลชมรมด้วยค่าว่าง
  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow text-center space-y-4">
        <div className="p-4 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
          {errorMessage || 'ไม่สามารถโหลดข้อมูลชมรมได้'}
        </div>
        <button
          type="button"
          onClick={refetch}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          ลองใหม่
        </button>
      </div>
    );
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
        <div className="mb-4 p-4 text-sm text-green-800 bg-green-100 rounded-lg" role="status">
          <span className="font-medium">สำเร็จ!</span> {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {renderField('name', 'ชื่อชมรม *')}
        {renderField('description', 'คำอธิบายชมรม *', { multiline: 3 })}
        {renderField('objectives', 'วัตถุประสงค์', { multiline: 2 })}
        {renderField('contactEmail', 'อีเมลติดต่อ', { type: 'email' })}
        {renderField('contactUrl', 'เว็บไซต์หรือลิงก์ติดต่อ (HTTPS)', {
          type: 'url',
          placeholder: 'https://...',
        })}
        {renderField('facebookUrl', 'Facebook URL (HTTPS)', {
          type: 'url',
          placeholder: 'https://facebook.com/...',
        })}
        {renderField('instagramUrl', 'Instagram URL (HTTPS)', {
          type: 'url',
          placeholder: 'https://instagram.com/...',
        })}
        {renderField('imageUrl', 'รูปโปรไฟล์ชมรม URL (HTTPS)', {
          type: 'url',
          placeholder: 'https://...',
        })}
        {renderField('bannerUrl', 'รูปแบนเนอร์ URL (HTTPS)', {
          type: 'url',
          placeholder: 'https://...',
        })}

        <p className="text-xs text-gray-500">
          ช่องที่เว้นว่างไว้จะถูกล้างค่าในโปรไฟล์ชมรม หมวดหมู่และแท็กแก้ไขจากหน้านี้ไม่ได้
        </p>

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
