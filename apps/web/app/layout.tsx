import '../styles/globals.css'

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
        <div className="flex h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}