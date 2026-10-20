import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AddQuestionModal } from './AddQuestionModal';
import { EditQuestionModal } from './EditQuestionModal';
import { DeleteQuestionModal } from './DeleteQuestionModal';
import {
  createScreeningQuestion,
  deleteScreeningQuestion,
  fetchScreeningQuestions,
  reorderScreeningQuestions,
  updateScreeningQuestion,
  type ScreeningQuestion,
  type ScreeningQuestionDraft,
} from '../api/questionApi';
import { ApiError, describeApiError } from '../../../lib/api';

// The questions endpoints answer 409 without a reason, and the backend only
// allows writes while the round is an open draft with no applications.
const NOT_EDITABLE_MESSAGE =
  'ไม่สามารถแก้ไขคำถามได้ในสถานะปัจจุบัน: แก้ไขได้เฉพาะรอบที่ยังเป็นฉบับร่าง ยังไม่ปิด และยังไม่มีผู้สมัคร (คำถามที่มีคำตอบแล้วลบไม่ได้)';

const describeWriteError = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.status === 409 && !err.message
    ? NOT_EDITABLE_MESSAGE
    : describeApiError(err, fallback);

interface QuestionManagementPageProps {
  clubId: string;
  roundId: string;
}

export const QuestionManagementPage = ({ clubId, roundId }: QuestionManagementPageProps) => {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [loaded, setLoaded] = useState<{ key: string; questions: ScreeningQuestion[] } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);

  // A load only counts for the round and retry it was fetched for.
  const requestKey = `${roundId}:${reloadKey}`;
  const questions = loaded?.key === requestKey ? loaded.questions : null;
  const loadError = failed?.key === requestKey ? failed.message : null;

  // True while a write request is in flight, so only one runs at a time.
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<ScreeningQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<ScreeningQuestion | null>(null);

  useEffect(() => {
    let ignore = false;

    fetchScreeningQuestions(roundId)
      .then((items) => {
        if (!ignore) setLoaded({ key: requestKey, questions: items });
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setFailed({
            key: requestKey,
            message: describeApiError(err, 'ไม่สามารถโหลดคำถามคัดเลือกได้ กรุณาลองใหม่อีกครั้ง'),
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [roundId, requestKey]);

  const replaceQuestions = (items: ScreeningQuestion[]) =>
    setLoaded({ key: requestKey, questions: items });

  const changeQuestions = (change: (current: ScreeningQuestion[]) => ScreeningQuestion[]) =>
    setLoaded((prev) =>
      prev?.key === requestKey ? { key: prev.key, questions: change(prev.questions) } : prev,
    );

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Runs one write request: shows its error, or its toast when it succeeds.
  const runWrite = async (
    action: () => Promise<void>,
    successMessage: string,
    failureFallback: string,
  ) => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await action();
      showToast(successMessage);
    } catch (err: unknown) {
      setErrorMessage(describeWriteError(err, failureFallback));
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdd = (draft: ScreeningQuestionDraft) =>
    runWrite(
      async () => {
        const created = await createScreeningQuestion(roundId, draft);
        changeQuestions((current) => [...current, created]);
        setIsAdding(false);
      },
      'เพิ่มคำถามคัดเลือกเรียบร้อยแล้ว',
      'ไม่สามารถเพิ่มคำถามคัดเลือกได้',
    );

  const handleSaveEdit = (draft: ScreeningQuestionDraft) => {
    if (!editingQuestion) return Promise.resolve();
    const target = editingQuestion;

    return runWrite(
      async () => {
        const updated = await updateScreeningQuestion(roundId, target.id, draft);
        changeQuestions((current) => current.map((q) => (q.id === updated.id ? updated : q)));
        setEditingQuestion(null);
      },
      'อัปเดตคำถามคัดเลือกเรียบร้อยแล้ว (มีผลต่อผู้สมัครรายใหม่)',
      'ไม่สามารถอัปเดตคำถามคัดเลือกได้',
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingQuestion) return Promise.resolve();
    const target = deletingQuestion;

    return runWrite(
      async () => {
        await deleteScreeningQuestion(roundId, target.id);
        setDeletingQuestion(null);
        // Reload so the remaining questions show the server's display order.
        replaceQuestions(await fetchScreeningQuestions(roundId));
      },
      'ลบคำถามคัดเลือกเรียบร้อยแล้ว',
      'ไม่สามารถลบคำถามคัดเลือกได้',
    );
  };

  const handleMove = (index: number, offset: -1 | 1) => {
    if (!questions) return Promise.resolve();
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= questions.length) return Promise.resolve();

    const ids = questions.map((q) => q.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];

    return runWrite(
      async () => {
        replaceQuestions(await reorderScreeningQuestions(roundId, ids));
      },
      'จัดลำดับคำถามเรียบร้อยแล้ว',
      'ไม่สามารถจัดลำดับคำถามได้',
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Success Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800 text-sm font-semibold shadow-lg"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">
            ✓
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Toast Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="fixed top-5 right-5 z-[60] max-w-md flex items-center justify-between gap-3 rounded-xl bg-rose-50 border border-rose-200 px-5 py-4 text-rose-800 text-sm font-semibold shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-xs font-bold">
              ✕
            </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 ml-4 font-bold"
            aria-label="ปิดข้อความแจ้งข้อผิดพลาด"
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
            <Link to={`/clubs/${clubId}`} className="hover:underline">
              ชมรม {clubId}
            </Link>{' '}
            / รอบรับสมัคร {roundId} /{' '}
            <span className="text-slate-800 font-medium">คำถามคัดเลือก</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">คำถามคัดเลือก</h1>
          <p className="text-xs text-slate-500">
            คำถามที่ผู้สมัครต้องตอบในแบบฟอร์มสมัครของรอบนี้ เรียงตามลำดับที่แสดง
          </p>
          <p className="text-xs text-slate-500 mt-1">
            เพิ่ม แก้ไข ลบ และจัดลำดับได้เฉพาะรอบที่ยังเป็นฉบับร่าง ยังไม่ปิด และยังไม่มีผู้สมัคร
          </p>
        </div>

        {questions === null && loadError === null && (
          <p className="text-sm text-slate-500">กำลังโหลดคำถามคัดเลือก...</p>
        )}

        {loadError !== null && (
          <div
            role="alert"
            className="bg-white p-6 rounded-2xl border border-rose-200 flex flex-col items-start gap-3"
          >
            <p className="text-sm font-semibold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-semibold text-white"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {questions !== null && (
          <div className="flex flex-col gap-4">
            {questions.length === 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-500 text-center">
                ยังไม่มีคำถามคัดเลือกในรอบนี้
              </div>
            )}

            {questions.map((q, index) => (
              <div
                key={q.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>คำถามที่ {index + 1}</span>
                    {q.isRequired && <span className="text-rose-600 font-bold">จำเป็นต้องตอบ</span>}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      disabled={isBusy || index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-sm disabled:opacity-30 disabled:hover:bg-transparent"
                      title="เลื่อนขึ้น"
                      aria-label={`เลื่อนคำถามที่ ${index + 1} ขึ้น`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || index === questions.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-sm disabled:opacity-30 disabled:hover:bg-transparent"
                      title="เลื่อนลง"
                      aria-label={`เลื่อนคำถามที่ ${index + 1} ลง`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setEditingQuestion(q)}
                      className="p-1.5 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-sm disabled:opacity-50"
                      title="แก้ไขคำถาม"
                      aria-label={`แก้ไขคำถามที่ ${index + 1}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeletingQuestion(q)}
                      className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-sm disabled:opacity-50"
                      title="ลบคำถาม"
                      aria-label={`ลบคำถามที่ ${index + 1}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <p className="font-bold text-slate-800 text-sm p-1 whitespace-pre-line">
                  {q.questionText}
                </p>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
                  พื้นที่สำหรับคำตอบของผู้สมัคร
                </div>
              </div>
            ))}

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-rose-300 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              + เพิ่มคำถามคัดเลือก
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <AddQuestionModal
          isSaving={isBusy}
          onClose={() => setIsAdding(false)}
          onConfirm={handleAdd}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          key={editingQuestion.id}
          isOpen
          originalQuestion={editingQuestion.questionText}
          originalRequired={editingQuestion.isRequired}
          isSaving={isBusy}
          onClose={() => setEditingQuestion(null)}
          onConfirm={handleSaveEdit}
        />
      )}

      {deletingQuestion && (
        <DeleteQuestionModal
          key={deletingQuestion.id}
          isOpen
          isDeleting={isBusy}
          onClose={() => setDeletingQuestion(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};
