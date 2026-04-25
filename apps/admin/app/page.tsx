export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_45%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_55%,_#f8fafc_100%)] px-6 py-12 text-slate-900">
      <section className="w-full max-w-3xl rounded-[32px] border border-white/80 bg-white/80 p-10 shadow-soft backdrop-blur md:p-14">
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-sm font-medium text-orange-600">
          Admin Shell Ready
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">归她 · 后台 CMS · 待登录</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
          Step 1 只交付骨架、规范和占位页面。登录、权限和业务模块在后续步骤接入。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5">
            <p className="text-sm font-medium text-slate-500">Framework</p>
            <p className="mt-2 text-lg font-semibold">Next.js 14</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5">
            <p className="text-sm font-medium text-slate-500">Styling</p>
            <p className="mt-2 text-lg font-semibold">Tailwind CSS v4</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5">
            <p className="text-sm font-medium text-slate-500">Status</p>
            <p className="mt-2 text-lg font-semibold">Waiting for auth</p>
          </div>
        </div>
      </section>
    </main>
  )
}
