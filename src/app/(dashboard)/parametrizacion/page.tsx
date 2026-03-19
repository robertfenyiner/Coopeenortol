'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ParametrizacionPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/parametrizacion/catalogos');
  }, [router]);
  return null;
}
