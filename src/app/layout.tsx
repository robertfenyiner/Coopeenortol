import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coopeenortol - Sistema de Gestión de Cooperativa',
  description: 'Plataforma integral para la administración de cooperativas de empleados',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
