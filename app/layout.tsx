import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Aizawa Attractor',
  description: 'Visualização do Atrator de Aizawa em 3D',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
