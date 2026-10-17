// frontend/src/features/clubs/components/CategorySelector.tsx
import React from 'react';
import { ClubCategory } from '../types/club';

interface CategorySelectorProps {
  categories: ClubCategory[];
  selectedCategoryId: string | null;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onChange,
  disabled = false,
  error,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        หมวดหมู่ชมรม <span className="text-red-500">*</span>
      </label>
      <select
        value={selectedCategoryId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-md border p-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <option value="" disabled>
          -- กรุณาเลือกหมวดหมู่ชมรม --
        </option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};