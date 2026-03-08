"use client";

import React, { useState, useRef, useCallback, type ClipboardEvent } from "react";
import { updateActiveCell } from "@/lib/presence";

interface RemoteUser {
    name: string;
    color: string;
}

interface CellProps {
    cellId: string;
    docId: string;
    currentUid: string;
    initialFormula: string;
    initialValue: string;
    onUpdate: (id: string, formula: string) => void;
    onFocusCell: (cellId: string) => void;
    onBlurCell: () => void;
    isOffline: boolean;
    remoteUser?: RemoteUser;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedUpdateActiveCell(docId: string, uid: string, cellId: string | null): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        void updateActiveCell(docId, uid, cellId);
    }, 150);
}

const Cell = React.memo(function Cell({
    cellId,
    docId,
    currentUid,
    initialFormula,
    initialValue,
    onUpdate,
    onFocusCell,
    onBlurCell,
    isOffline,
    remoteUser,
}: CellProps) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [localFormula, setLocalFormula] = useState<string>(initialFormula);
    const lastServerFormula = useRef<string>(initialFormula);

    const prevInitialFormula = useRef<string>(initialFormula);
    if (initialFormula !== prevInitialFormula.current) {
        prevInitialFormula.current = initialFormula;
        lastServerFormula.current = initialFormula;
        if (!isEditing) {
            setLocalFormula(initialFormula);
        }
    }

    const handleFocus = useCallback(() => {
        if (isOffline) return;
        setIsEditing(true);
        onFocusCell(cellId);
        debouncedUpdateActiveCell(docId, currentUid, cellId);
    }, [isOffline, onFocusCell, cellId, docId, currentUid]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        onBlurCell();
        debouncedUpdateActiveCell(docId, currentUid, null);
        if (localFormula !== lastServerFormula.current) {
            lastServerFormula.current = localFormula;
            onUpdate(cellId, localFormula);
        }
    }, [localFormula, onUpdate, onBlurCell, cellId, docId, currentUid]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text/plain");
        const hasForbiddenChars = /[\n\r\t]/.test(text);
        const isTooLong = text.length > 2000;
        if (hasForbiddenChars || isTooLong) {
            e.preventDefault();
            alert("Paste blocked: Multi-line, Tabs, or Overflow detected. Please paste single-line text only.");
        }
    }, []);

    if (isEditing) {
        return (
            <div className="relative">
                <input
                    type="text"
                    value={localFormula}
                    onChange={(e) => setLocalFormula(e.target.value)}
                    onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                            e.currentTarget.blur();
                        }
                    }}
                    onPaste={handlePaste}
                    maxLength={2000}
                    autoFocus
                    className="h-8 w-28 px-1 text-sm text-gray-900 outline-none"
                    style={remoteUser
                        ? { border: `2px solid ${remoteUser.color}`, boxShadow: `0 0 0 2px ${remoteUser.color}40` }
                        : { border: "2px solid #3b82f6", boxShadow: "0 0 0 2px #93c5fd" }
                    }
                />
                {remoteUser && (
                    <div
                        className="absolute -top-4 left-0 z-30 whitespace-nowrap rounded-sm px-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: remoteUser.color }}
                    >
                        {remoteUser.name.split(" ")[0]}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="relative"
            style={remoteUser ? { boxShadow: `inset 0 0 0 2px ${remoteUser.color}` } : undefined}
        >
            <div
                tabIndex={0}
                onFocus={handleFocus}
                className={`h-8 w-28 truncate px-1 text-sm text-gray-900 leading-8 ${isOffline ? "cursor-not-allowed bg-gray-50" : ""
                    } ${remoteUser ? "" : "border border-gray-300"}`}
            >
                {initialValue}
            </div>
            {remoteUser && (
                <div
                    className="absolute -top-4 left-0 z-30 whitespace-nowrap rounded-sm px-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: remoteUser.color }}
                >
                    {remoteUser.name.split(" ")[0]}
                </div>
            )}
        </div>
    );
});

Cell.displayName = "Cell";

export default Cell;
