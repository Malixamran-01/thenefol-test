import { ShieldBan, Mail, Home, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNefolSocialBan } from '../contexts/NefolSocialBanContext'

export default function NefolSocialBannedPage() {
  const { logout } = useAuth()
  const { banPublicMessage } = useNefolSocialBan()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f9f9] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <ShieldBan className="h-9 w-9 text-rose-600" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">Nefol Social access restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your author account has been restricted from Nefol Social for not following our community guidelines.
        </p>
        {banPublicMessage?.trim() ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800">
            {banPublicMessage.trim()}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            If you think this is a mistake, you can reach out to our support team.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="#/user/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1B4965] bg-[#1B4965] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163a52]"
          >
            <Mail className="h-4 w-4" />
            Contact support
          </a>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/user/'
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Back to store
          </button>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
