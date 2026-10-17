// frontend/src/features/clubs/components/TagInput.tsx
import React, { useState } from 'react';
import { ClubTag } from '../types/club';

interface TagInputProps {
  availableTags: ClubTag[];
  selectedTags: ClubTag[];
  onChange: (tags: ClubTag[]) => void;
  disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  availableTags,
  selectedTags,
  onChange,
  disabled = false,
}) => {
  const [selectedTagId, setSelectedTagId] = useState<string>('');

  const handleAddTag = (tagIdToAdd: string) => {
    if (!tagIdToAdd) return;
    const tagToAdd = availableTags.find((t) => t.id === tagIdToAdd);
    if (tagToAdd && !selectedTags.some((t) => t.id === tagToAdd.id)) {
      onChange([...selectedTags, tagToAdd]);
    }
    setSelectedTagId('');
  };

  const handleRemoveTag = (tagIdToRemove: string) => {
    if (disabled) return;
    onChange(selectedTags.filter((t) => t.id !== tagIdToRemove));
  };

  const remainingTags = availableTags.filter(
    (tag) => !selectedTags.some((selected) => selected.id === tag.id)
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        แท็กความสนใจ (Interest Tags)
      </label>

      <div className="flex flex-wrap gap-2 mb-2 p-2 min-h-[42px] border border-gray-200 rounded-md bg-gray-50">
        {selectedTags.length === 0 ? (
          <span className="text-xs text-gray-400 self-center">ยังไม่ได้เลือกแท็กความสนใจ</span>
        ) : (
          selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 inline-flex items-center justify-center text-blue-600 hover:text-blue-900 transition-colors"
                >
                  ✕
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {!disabled && remainingTags.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedTagId}
            onChange={(e) => {
              setSelectedTagId(e.target.value);
              handleAddTag(e.target.value);
            }}
            className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">-- เลือกเพิ่มแท็กความสนใจ --</option>
            {remainingTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                + {tag.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};