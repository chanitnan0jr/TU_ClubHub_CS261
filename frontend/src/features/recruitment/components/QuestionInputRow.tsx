import type { ScreeningQuestionInput } from '../types/recruitment';

interface QuestionInputRowProps {
  index: number;
  question: ScreeningQuestionInput;
  onChangeText: (index: number, text: string) => void;
  onToggleRequired: (index: number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export const QuestionInputRow = ({
  index,
  question,
  onChangeText,
  onToggleRequired,
  onRemove,
  disabled = false,
}: QuestionInputRowProps) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-500 w-5">{index + 1}</span>
        <input
          type="text"
          value={question.questionText}
          onChange={(e) => onChangeText(index, e.target.value)}
          placeholder="ระบุข้อความคำถามคัดเลือก..."
          disabled={disabled}
          className="h-[44px] flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="h-[44px] w-[44px] inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="ลบคำถาม"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between pl-8">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={question.isRequired}
            onChange={() => onToggleRequired(index)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          จำเป็นต้องตอบ
        </label>
        <span className="text-xs text-gray-400">คำตอบแบบข้อความ</span>
      </div>
    </div>
  );
};