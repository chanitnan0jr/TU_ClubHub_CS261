import { useState } from 'react';
import { EditQuestionModal } from './EditQuestionModal';
import { DeleteQuestionModal } from './DeleteQuestionModal';
import { updateScreeningQuestion, deleteScreeningQuestion } from '../api/questionApi';

interface QuestionItem {
  id: string;
  questionText: string;
  isRequired: boolean;
  updatedAt?: string;
}

export const QuestionManagementPage = () => {
  const [applicantCount] = useState<number>(12);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q1',
      questionText: 'เหตุผลที่คุณอยากเข้าร่วมชมรมนี้คืออะไร?',
      isRequired: true,
    },
    {
      id: 'q2',
      questionText: 'คุณสามารถเข้าร่วมกิจกรรมในวันเสาร์-อาทิตย์ได้หรือไม่?',
      isRequired: false,
    },
  ]);

  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // ฟังก์ชันบันทึกการแก้ไขพร้อมเชื่อมต่อ API Service
  const handleSaveEdit = async (newText: string) => {
    if (!editingQuestion) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // เรียกใช้ API Service
      await updateScreeningQuestion('round_123', editingQuestion.id, {
        questionText: newText,
        isRequired: editingQuestion.isRequired,
      });

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? { ...q, questionText: newText, updatedAt: 'วันนี้/เวลา 14:30 น.' }
            : q
        )
      );
      setEditingQuestion(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      // เมื่อเกิดข้อผิดพลาดจาก API แสดง Error Toast
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันลบคำถามพร้อมเชื่อมต่อ API Service
  const handleConfirmDelete = async () => {
    if (!deletingQuestionId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await deleteScreeningQuestion('round_123', deletingQuestionId);
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestionId));
      setDeletingQuestionId(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถลบคำถามคัดเลือกได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ: QuestionItem = {
      id: `q_${Date.now()}`,
      questionText: '',
      isRequired: true,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800 text-sm font-semibold shadow-lg">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">
            ✓
          </span>
          <span>อัปเดตคำถามคัดเลือกเรียบร้อยแล้ว (มีผลต่อผู้สมัครรายใหม่)</span>
        </div>
      )}

      {/* Error Toast Banner */}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl bg-rose-50 border border-rose-200 px-5 py-4 text-rose-800 text-sm font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white text-xs font-bold">
              ✕
            </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold text-sm">
              TU
            </div>
            <span className="font-bold text-slate-800 text-lg">ClubHub</span>
          </div>
          <span className="text-xs text-slate-500">พื้นที่ผู้ดูแลชมรม</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            รอบรับสมัคร / ชมรมอาสาพัฒนา / <span className="text-slate-800 font-medium">คำถามคัดเลือก</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">คำถามคัดเลือก</h1>
          <p className="text-xs text-slate-500 mb-3">
            เปิดรับสมาชิกใหม่ ภาคเรียนที่ 1/2569 · ชมรมอาสาพัฒนา
          </p>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              เปิดรับสมัคร
            </span>
            <span className="text-xs font-medium text-slate-600">ผู้สมัคร {applicantCount} คน</span>
          </div>
        </div>

        <div className="flex gap-6 border-b border-slate-200 text-sm font-semibold text-slate-500">
          <button className="pb-3 border-b-2 border-transparent hover:text-slate-700">รายละเอียด</button>
          <button className="pb-3 border-b-2 border-rose-600 text-rose-600">คำถามคัดเลือก</button>
          <button className="pb-3 border-b-2 border-transparent hover:text-slate-700">ผู้สมัคร</button>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>คำถามที่ {index + 1} · คำตอบแบบยาว</span>
                  {q.isRequired && <span className="text-rose-600 font-bold">จำเป็นต้องตอบ</span>}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setEditingQuestion(q)}
                    className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-sm disabled:opacity-50"
                    title="แก้ไขคำถาม"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDeletingQuestionId(q.id)}
                    className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-sm disabled:opacity-50"
                    title="ลบคำถาม"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={q.questionText}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuestions((prev) =>
                    prev.map((item) => (item.id === q.id ? { ...item, questionText: val } : item))
                  );
                }}
                placeholder="กรอกข้อความคำถามคัดเลือก..."
                className="w-full font-bold text-slate-800 text-sm bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none p-1"
              />

              {q.updatedAt && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2.5 py-1 w-fit">
                  <span>⏱️ คำถามนี้ถูกแก้ไขเมื่อ {q.updatedAt}</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
                พื้นที่สำหรับคำตอบของผู้สมัคร
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={isLoading}
            onClick={handleAddQuestion}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-rose-300 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            + เพิ่มคำถามคัดเลือก
          </button>
        </div>
      </div>

      <EditQuestionModal
        isOpen={!!editingQuestion}
        applicantCount={applicantCount}
        originalQuestion={editingQuestion?.questionText || ''}
        onClose={() => setEditingQuestion(null)}
        onConfirm={handleSaveEdit}
      />

      <DeleteQuestionModal
        isOpen={!!deletingQuestionId}
        applicantCount={applicantCount}
        onClose={() => setDeletingQuestionId(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};