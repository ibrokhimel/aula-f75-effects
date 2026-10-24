import type { Metadata } from 'next';
import '@fontsource-variable/geist';
import { Studio } from '@/components/studio/Studio';
import './studio.css';

export const metadata: Metadata = {
  title: 'AULA F75 — Lighting studio',
  description: 'The new AULA F75 lighting studio. A live browser preview using the real keyboard effects engine.',
};

export default function StudioPage() {
  return <Studio />;
}
