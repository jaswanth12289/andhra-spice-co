'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-spice-900 text-spice-200 py-8 text-center text-sm">
      &copy; {new Date().getFullYear()} Andhra Spice Co. All rights reserved.
    </footer>
  );
}
