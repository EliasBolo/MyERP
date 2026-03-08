import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as any).role;
    redirect(role === 'master_admin' ? '/admin' : '/dashboard');
  } else {
    redirect('/login');
  }
}
