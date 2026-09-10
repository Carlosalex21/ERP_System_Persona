"use client";

import dynamic from 'next/dynamic';
import type { ReactElement } from 'react';

const LibrosTable = dynamic(() => import('./LibrosTable'), { ssr: false });

export default function LibrosPage(): ReactElement {
  return <LibrosTable />;
}
