import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aizawa Attractor',
  description: 'Visualização do Atrator de Aizawa em 3D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}