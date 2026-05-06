'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HeatmapRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/exchange?mode=heatmap');
    }, [router]);
    return null;
}
