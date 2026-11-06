import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/classes';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '../../../components/ui/icons';
import type { ScreeningQuestionInput } from '../types/recruitment';

interface QuestionInputRowProps {
  index: number;
  question: ScreeningQuestionInput;
  onChangeText: (index: number, text: string) => void;
  onToggleRequired: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}

export const QuestionInputRow = ({
  index,
  question,
  onChangeText,
  onToggleRequired,
  onMove,
  onRemove,
  isFirst,
  isLast,
  disabled = false,
}: QuestionInputRowProps) => {
  const inputId = `round-question-${index}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
        คำถามที่ {index + 1}
      </label>
      <input
        id={inputId}
        type="text"
        value={question.questionText}
        onChange={(e) => onChangeText(index, e.target.value)}
        placeholder="ระบุข้อความคำถามคัดเลือก..."
        disabled={disabled}
        className={inputClass()}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={question.isRequired}
            onChange={() => onToggleRequired(index)}
            disabled={disabled}
            className="size-4 accent-tu-maroon"
          />
          จำเป็นต้องตอบ
          <span className="text-slate-600">· คำตอบแบบข้อความ</span>
        </label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(index, 'up')}
            disabled={disabled || isFirst}
            aria-label={`เลื่อนคำถามที่ ${index + 1} ขึ้น`}
            title="เลื่อนขึ้น"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(index, 'down')}
            disabled={disabled || isLast}
            aria-label={`เลื่อนคำถามที่ ${index + 1} ลง`}
            title="เลื่อนลง"
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            disabled={disabled}
            aria-label={`ลบคำถามที่ ${index + 1}`}
            title="ลบคำถาม"
          >
            <XIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};
