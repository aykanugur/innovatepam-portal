import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import IdeaForm from '@/components/ideas/idea-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit an Idea — InnovatEPAM',
}

/**
 * T010 — Submit new idea page (US-008).
 * Auth-guarded server component: unauthenticated visitors are redirected to
 * /login with callbackUrl preserved so they land back here after login (FR-001).
 * Reads FEATURE_FILE_ATTACHMENT_ENABLED from env and passes it down so IdeaForm
 * can conditionally render the file attachment field (T013).
 */
export default async function SubmitIdeaPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/ideas/new')

  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
          Submit an Idea
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#8888A8' }}>
          Share your idea with the InnovatEPAM community. Public ideas are visible to all employees;
          private ideas are visible only to you and admins.
        </p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <IdeaForm attachmentEnabled={attachmentEnabled} />
      </div>
    </div>
  )
}
