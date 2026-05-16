"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function LoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        setProgress(30);
        const timer = setTimeout(() => setProgress(90), 200);

        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (!loading) return null;

    return (
        <ProgressPrimitive.Root
            className="fixed top-0 left-0 z-[9999] h-1 w-full overflow-hidden bg-transparent"
        >
            <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-out"
                style={{ transform: `translateX(-${100 - progress}%)` }}
            />
        </ProgressPrimitive.Root>
    );
}
