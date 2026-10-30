import React, { useState } from 'react';
import type { ApplicationUIItem, BackendApplicationStatus } from '../types/application';

interface ApplicationCardProps {
  application: ApplicationUIItem;
  onConfirmMembership?: (id: string) => void;
  onDeclineMembership?: (id: string) => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onConfirmMembership,
  onDeclineMembership,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // ไอคอนประจำชมรม
  const getClubIcon = (clubName: string) => {
    if (clubName.includes('อาสา')) {
      return (
        <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    }
    if (clubName.includes('ถ่ายภาพ')) {
      return (
        <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
    if (clubName.includes('ดนตรี')) {
      return (
        <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    if (clubName.includes('โต้วาที')) {
      return (
        <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    }
    return (
      <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  // Status Badge
  const renderStatusBadge = (status: BackendApplicationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <span>🕒</span> รอพิจารณา
          </span>
        );
      case 'INTERVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <span>📅</span> นัดสัมภาษณ์
          </span>
        );
      case 'PASSED':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              ผ่านการคัดเลือก
            </span>
            <span className="text-xs text-gray-500 font-medium">รอยืนยันสิทธิ์</span>
          </div>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ยืนยันสิทธิ์แล้ว
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
            <span>⊖</span> สละสิทธิ์
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            ไม่ผ่านการคัดเลือก
          </span>
        );
    }
  };

  // ตัดคำว่า "ยื่นเมื่อ" ซ้ำซ้อน
  const cleanSubmittedText = application.submittedAtFormatted.replace(/^ยื่นเมื่อ\s*/, '');

  return (
    <>
      <div
        className={`bg-white rounded-2xl border p-6 mb-5 transition-all ${
          application.status === 'PASSED' ? 'border-emerald-600 shadow-sm' : 'border-gray-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* ซีกซ้าย */}
          <div className="flex-1 space-y-3.5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                {getClubIcon(application.clubName)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{application.clubName}</h3>
                <p className="text-sm text-gray-500 font-medium">{application.roundTitle}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 font-medium">
              ยื่นเมื่อ {cleanSubmittedText}
            </p>

            <div>
              <p className="text-sm font-medium text-gray-700">
                เหตุผลการสมัคร: <span className="text-gray-600 font-normal">“{application.reason}”</span>
              </p>
            </div>

            {application.portfolioName && (
              <div className="flex items-center gap-2 text-sm font-semibold text-[#C81E3D] pt-1">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <a href={application.portfolioUrl || '#'} target="_blank" rel="noreferrer" className="hover:underline">
                  {application.portfolioName}
                </a>
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            )}
          </div>

          {/* ซีกขวา */}
          <div className="w-full md:w-[420px] shrink-0 space-y-3.5">
            <div className="flex justify-start">{renderStatusBadge(application.status)}</div>

            {/* PENDING */}
            {application.status === 'PENDING' && (
              <div className="space-y-3">
                <div className="p-4 bg-amber-50/90 border border-amber-100 rounded-xl text-sm text-amber-900 leading-relaxed font-medium">
                  {application.note || 'กรรมการกำลังตรวจสอบใบสมัครของคุณ ผลจะประกาศทางการในวันที่ 20 พ.ย. 2567'}
                </div>
                <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  ดูรายละเอียดใบสมัคร
                </button>
              </div>
            )}

            {/* INTERVIEW */}
            {application.status === 'INTERVIEW' && (
              <div className="space-y-3">
                <div className="p-4 bg-purple-50/90 border border-purple-100 rounded-xl space-y-2 text-sm text-purple-900 font-medium">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>วัน-เวลาสัมภาษณ์ {application.interviewDateFormatted || '18 พ.ย. 2567 เวลา 13:30 - 14:00 น.'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>สถานที่ {application.interviewLocation || 'ห้องประชุมชมรม ชั้น 2 อาคารกิจกรรม'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>📝</span>
                    <span>หมายเหตุ {application.interviewNote || 'กรุณาเตรียมพอร์ตโฟลิโอฉบับจริงมาด้วย'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                    ดูรายละเอียดใบสมัคร
                  </button>
                  <button className="px-5 py-2.5 bg-[#C81E3D] text-white rounded-xl text-sm font-semibold hover:bg-[#A61832]">
                    รับทราบนัดหมาย
                  </button>
                </div>
              </div>
            )}

            {/* PASSED */}
            {application.status === 'PASSED' && (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 space-y-2">
                  <p className="font-bold text-emerald-950 text-base">ยินดีด้วย! คุณผ่านการคัดเลือกเข้าร่วมชมรม</p>
                  <p className="text-emerald-800 font-medium">
                    กรุณายืนยันสิทธิ์ภายในวันที่ {application.confirmationDeadlineFormatted || '25 พ.ย. 2567 เวลา 23:59 น.'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-emerald-700 pt-1 font-semibold">
                    <span>⏱</span>
                    <span>{application.remainingTimeText || 'เหลือเวลาอีก 2 วัน 5 ชั่วโมงในการยืนยันสิทธิ์'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-6 py-2.5 bg-[#C81E3D] hover:bg-[#A61832] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    ยืนยันสิทธิ์
                  </button>
                  <button
                    onClick={() => setShowDeclineModal(true)}
                    className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    สละสิทธิ์
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMED */}
            {application.status === 'CONFIRMED' && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-base">
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.39-2.823-1.07-4" />
                    </svg>
                    <span>สมาชิกชมรม</span>
                  </div>
                  <p className="text-blue-800 font-medium">คุณเป็นสมาชิกชมรมนี้เรียบร้อยแล้ว</p>
                </div>
                <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  ดูหน้าชมรม
                </button>
              </div>
            )}

            {/* REJECTED */}
            {application.status === 'REJECTED' && (
              <div className="space-y-3">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-900 leading-relaxed font-medium">
                  ขอขอบคุณที่ให้ความสนใจสมัครเข้าร่วมชมรม หวังว่าจะได้ร่วมกิจกรรมกันในโอกาสถัดไป
                </div>
                <a href="#search" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C81E3D] hover:underline">
                  ค้นหาชมรมอื่น <span>→</span>
                </a>
              </div>
            )}

            {/* DECLINED */}
            {application.status === 'DECLINED' && (
              <div className="p-4 bg-gray-100 rounded-xl text-sm text-gray-700 leading-relaxed font-medium space-y-1">
                <p>คุณได้ทำการสละสิทธิ์ หรือหมดเวลาการยืนยันสิทธิ์ในรอบนี้แล้ว</p>
                <p className="text-gray-500 text-xs">ระบบจะสละสิทธิ์อัตโนมัติเมื่อพ้นกำหนดยืนยันสิทธิ์</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Confirm */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">
              ✕
            </button>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">ยืนยันการเข้าร่วมเป็นสมาชิกชมรม</h3>
              <p className="text-sm text-gray-500 font-medium">{application.clubName} • ภาคเรียนที่ 1/2567</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              เมื่อยืนยันสิทธิ์แล้ว คุณจะได้รับสิทธิ์เป็นสมาชิก{application.clubName} อย่างเป็นทางการ
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900 font-medium">
              <span className="text-base leading-none">ⓘ</span>
              <span>นักศึกษาสามารถเป็นสมาชิกชมรมได้ไม่เกิน 5 ชมรม (ปัจจุบันคุณเป็นสมาชิกแล้ว 1 ชมรม)</span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowConfirmModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onConfirmMembership?.(application.id);
                  setShowConfirmModal(false);
                }}
                className="px-6 py-2.5 bg-[#C81E3D] hover:bg-[#A61832] text-white rounded-xl text-sm font-semibold shadow-sm"
              >
                ยืนยันสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Decline */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button onClick={() => setShowDeclineModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">
              ✕
            </button>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">ยืนยันการสละสิทธิ์?</h3>
              <p className="text-sm text-gray-500 font-medium">{application.clubName} • ภาคเรียนที่ 1/2567</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              การสละสิทธิ์จะไม่สามารถยกเลิกหรือขอคืนสิทธิ์ในภายหลังได้ คุณแน่ใจหรือไม่?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowDeclineModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDeclineMembership?.(application.id);
                  setShowDeclineModal(false);
                }}
                className="px-6 py-2.5 bg-[#C81E3D] hover:bg-[#A61832] text-white rounded-xl text-sm font-semibold shadow-sm"
              >
                ยืนยันสละสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};