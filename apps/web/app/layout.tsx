import '../styles/globals.css'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata = {
  title: 'AI Knowledge Companion',
  description: 'Your personal and team-aware AI assistant with RAG, memory, and automations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}