import { Link } from 'react-router';

export default function MyApplicationsPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10 font-sans text-slate-800">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FCE9ED] text-2xl text-[#C81E3D]">
          …
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">
          ประวัติการสมัครของฉัน
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          หน้ารายการใบสมัครยังไม่พร้อมใช้งาน เนื่องจาก API ประวัติใบสมัคร (US-04)
          ยังไม่ได้เชื่อมต่อ
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#C81E3D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#A01830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C81E3D]"
        >
          กลับหน้าหลัก
        </Link>
      </section>
    </main>
  );
}
