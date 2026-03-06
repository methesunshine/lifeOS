import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import ActiveReminderAlert from '@/components/ActiveReminderAlert'
import { createClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'LifeOS | Master Your Life Systems',
  description: 'Intelligent life management and optimization dashboard.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" data-theme="dark">
      <body style={{ display: 'flex', minHeight: '100vh' }}>
        {user && <Sidebar userEmail={user.email} />}
        <div style={{
          flex: 1,
          marginLeft: user ? '260px' : '0',
          transition: 'margin-left 0.3s ease'
        }}>
          {children}
        </div>

        {/* Global Reminder Alerts */}
        {user && <ActiveReminderAlert />}
      </body>
    </html>
  )
}
