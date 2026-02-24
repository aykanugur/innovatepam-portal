import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata = {
  title: 'Create account — InnovatEPAM',
}

export default async function RegisterPage() {
  // Redirect authenticated users away from the registration page
  const session = await auth()
  if (session) redirect('/dashboard')

  return <RegisterForm />
}
