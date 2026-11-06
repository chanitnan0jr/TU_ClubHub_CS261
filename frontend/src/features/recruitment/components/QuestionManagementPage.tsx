import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
} from '../../../components/ui/icons';
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

// Preserve the existing fallback for other 409 conflicts; use the documented reason for answered questions.
const NOT_EDITABLE_MESSAGE =
  'ไม่สามารถแก้ไขคำถามได้ในสถานะปัจจุบัน: แก้ไขได้เฉพาะรอบที่ยังเป็นฉบับร่าง ยังไม่ปิด และยังไม่มีผู้สมัคร (คำถามที่มีคำตอบแล้วลบไม่ได้) หรือมีผู้แก้ไขพร้อมกัน กรุณารีเฟรชแล้วลองใหม่';

const describeWriteError = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.status === 409
    ? err.reason === 'QUESTION_HAS_ANSWERS'
      ? 'ไม่สามารถแก้ไขหรือลบคำถามนี้ได้ เนื่องจากมีผู้สมัครตอบคำถามแล้ว'
      : NOT_EDITABLE_MESSAGE
    : describeApiError(err, fallback);

interface QuestionManagementPageProps {
  roundId: string;
}

export const QuestionManagementPage = ({ roundId }: QuestionManagementPageProps) => {
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
    clearTimeout(toastTimer.current);
    setToastMessage(null);
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
    <div className="flex flex-col gap-6 pb-8">
      {/* Success Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed left-4 right-4 top-5 z-50 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-lg sm:left-auto sm:right-5 sm:max-w-md"
        >
          <CircleCheckIcon className="size-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Toast Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="fixed left-4 right-4 top-5 z-[60] flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 py-2 pl-5 pr-2 text-sm font-semibold text-red-800 shadow-lg sm:left-auto sm:right-5 sm:max-w-md"
        >
          <div className="flex items-center gap-2">
            <CircleAlertIcon className="size-5" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setErrorMessage(null)}
            aria-label="ปิดข้อความแจ้งข้อผิดพลาด"
          >
            <XIcon />
          </Button>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
        <InfoIcon className="mt-0.5 size-4 text-slate-600" />
        <span>
          แก้ไขและลบได้เฉพาะคำถามที่ยังไม่มีคำตอบ ในรอบฉบับร่างที่ยังไม่ปิด การจัดลำดับต้องคงตำแหน่งข้อที่มีคำตอบ และเพิ่มคำถามได้เมื่อยังไม่มีใบสมัคร
        </span>
      </p>

      {questions === null && loadError === null && (
        <p className="text-sm text-slate-600">กำลังโหลดคำถามคัดเลือก...</p>
      )}

      {loadError !== null && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-white p-6"
        >
          <p className="text-sm font-semibold text-red-800">{loadError}</p>
          <Button variant="primary" onClick={() => setReloadKey((key) => key + 1)}>
            ลองใหม่
          </Button>
        </div>
      )}

      {questions !== null && (
        <div className="flex flex-col gap-4">
          {questions.length === 0 && (
            <EmptyState headingLevel={2} title="ยังไม่มีคำถามคัดเลือกในรอบนี้" />
          )}

          {questions.map((q, index) => (
            <article
              key={q.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span>คำถามที่ {index + 1}</span>
                  {q.isRequired && (
                    <span className="rounded-full bg-tu-maroon-50 px-2 py-0.5 text-xs font-medium text-tu-maroon">
                      จำเป็นต้องตอบ
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isBusy || index === 0}
                    onClick={() => handleMove(index, -1)}
                    title="เลื่อนขึ้น"
                    aria-label={`เลื่อนคำถามที่ ${index + 1} ขึ้น`}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isBusy || index === questions.length - 1}
                    onClick={() => handleMove(index, 1)}
                    title="เลื่อนลง"
                    aria-label={`เลื่อนคำถามที่ ${index + 1} ลง`}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isBusy}
                    onClick={() => setEditingQuestion(q)}
                    title="แก้ไขคำถาม"
                    aria-label={`แก้ไขคำถามที่ ${index + 1}`}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isBusy}
                    onClick={() => setDeletingQuestion(q)}
                    title="ลบคำถาม"
                    aria-label={`ลบคำถามที่ ${index + 1}`}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>

              <p className="whitespace-pre-line text-sm font-semibold text-slate-900">
                {q.questionText}
              </p>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                พื้นที่สำหรับคำตอบของผู้สมัคร
              </div>
            </article>
          ))}

          <Button
            disabled={isBusy}
            onClick={() => setIsAdding(true)}
            className="w-full border-dashed"
          >
            + เพิ่มคำถามคัดเลือก
          </Button>
        </div>
      )}

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
