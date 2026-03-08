"use client";

import { useState, useEffect } from "react";
import { subscribeToFormatting, type FormatMap } from "@/lib/formatting";

export default function useFormatting(docId: string): FormatMap {
    const [formatMap, setFormatMap] = useState<FormatMap>({});

    useEffect(() => {
        const unsubscribe = subscribeToFormatting(docId, (formats) => {
            setFormatMap(formats);
        });
        return unsubscribe;
    }, [docId]);

    return formatMap;
}
