"use client";

import React, { useState, useRef, useCallback, type ClipboardEvent } from "react";

interface CellProps {
    cellId: string;
    initialFormula: string;
    initialValue: string;
    onUpdate: (id: string, formula: string) => void;
}

const Cell = React.memo(function Cell({
    cellId,
    initialFormula,
    initialValue,
    onUpdate,
}: CellProps) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [localFormula, setLocalFormula] = useState<string>(initialFormula);
    const lastServerFormula = useRef<string>(initialFormula);

    // Sync when server-side formula changes
    const prevInitialFormula = useRef<string>(initialFormula);
    if (initialFormula !== prevInitialFormula.current) {
        prevInitialFormula.current = initialFormula;
        lastServerFormula.current = initialFormula;
        setLocalFormula(initialFormula);
    }

    const handleFocus = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        // Focus guard: only fire onUpdate if the formula actually changed
        if (localFormula !== lastServerFormula.current) {
            lastServerFormula.current = localFormula;
            onUpdate(cellId, localFormula);
        }
    }, [localFormula, onUpdate, cellId]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
        // 1. Intercept the clipboard data
        const text = e.clipboardData.getData("text/plain");

        // 2. Define the security constraints
        const hasForbiddenChars = text.includes("\n") || text.includes("\t");
        const isTooLong = text.length > 2000;

        // 3. The Guard Logic
        if (hasForbiddenChars || isTooLong) {
            e.preventDefault(); // This is the kill-switch
            alert("Paste blocked: Content contains multiple lines or exceeds 2000 characters.");
        }
    }, []);

    if (isEditing) {
        return (
            <input
                type="text"
                value={localFormula}
                onChange={(e) => setLocalFormula(e.target.value)}
                onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                onBlur={handleBlur}
                onPaste={handlePaste}
                maxLength={2000}
                autoFocus
                className="h-8 w-28 border border-blue-500 px-1 text-sm text-gray-900 outline-none ring-2 ring-blue-300"
            />
        );
    }

    return (
        <div
            tabIndex={0}
            onFocus={handleFocus}
            className="h-8 w-28 truncate border border-gray-300 px-1 text-sm text-gray-900 leading-8"
        >
            {initialValue}
        </div>
    );
});

Cell.displayName = "Cell";

export default Cell;
