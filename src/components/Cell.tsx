"use client";

import React, { useState, useRef, useCallback, type ClipboardEvent } from "react";

interface CellProps {
    cellId: string;
    initialFormula: string;
    initialValue: string;
    onUpdate: (id: string, formula: string) => void;
    onFocusCell: (cellId: string) => void;
    onBlurCell: () => void;
    isOffline: boolean;
}

const Cell = React.memo(function Cell({
    cellId,
    initialFormula,
    initialValue,
    onUpdate,
    onFocusCell,
    onBlurCell,
    isOffline,
}: CellProps) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [localFormula, setLocalFormula] = useState<string>(initialFormula);
    const lastServerFormula = useRef<string>(initialFormula);

    // Sync when server-side value changes (only if not editing)
    const prevInitialFormula = useRef<string>(initialFormula);
    if (initialFormula !== prevInitialFormula.current) {
        prevInitialFormula.current = initialFormula;
        lastServerFormula.current = initialFormula;
        if (!isEditing) {
            setLocalFormula(initialFormula);
        }
    }

    const handleFocus = useCallback(() => {
        // The Lock: block editing when offline
        if (isOffline) return;
        setIsEditing(true);
        onFocusCell(cellId);
    }, [isOffline, onFocusCell, cellId]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        onBlurCell();
        // Focus guard: only fire onUpdate if the formula actually changed
        if (localFormula !== lastServerFormula.current) {
            lastServerFormula.current = localFormula;
            onUpdate(cellId, localFormula);
        }
    }, [localFormula, onUpdate, onBlurCell, cellId]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text/plain");

        // This regex looks for ANY newline (\n), carriage return (\r), or tab (\t)
        const hasForbiddenChars = /[\n\r\t]/.test(text);
        const isTooLong = text.length > 2000;

        if (hasForbiddenChars || isTooLong) {
            e.preventDefault();
            alert("Paste blocked: Multi-line, Tabs, or Overflow detected. Please paste single-line text only.");
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
            className={`h-8 w-28 truncate border border-gray-300 px-1 text-sm text-gray-900 leading-8 ${isOffline ? "cursor-not-allowed bg-gray-50" : ""}`}
        >
            {initialValue}
        </div>
    );
});

Cell.displayName = "Cell";

export default Cell;
