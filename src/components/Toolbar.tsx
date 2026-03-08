"use client";

import type { CellFormat } from "@/lib/formatting";

interface ToolbarProps {
    activeCellId: string | null;
    currentFormat: CellFormat;
    onFormatChange: (format: Partial<CellFormat>) => void;
}

export default function Toolbar({ activeCellId, currentFormat, onFormatChange }: ToolbarProps) {
    const disabled = !activeCellId;

    return (
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-4 py-1.5">
            <button
                disabled={disabled}
                onClick={() => onFormatChange({ bold: !currentFormat.bold })}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm font-bold transition-colors ${disabled
                        ? "cursor-not-allowed text-gray-300"
                        : currentFormat.bold
                            ? "bg-gray-300 text-gray-900"
                            : "text-gray-600 hover:bg-gray-200"
                    }`}
            >
                B
            </button>

            <button
                disabled={disabled}
                onClick={() => onFormatChange({ italic: !currentFormat.italic })}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm italic transition-colors ${disabled
                        ? "cursor-not-allowed text-gray-300"
                        : currentFormat.italic
                            ? "bg-gray-300 text-gray-900"
                            : "text-gray-600 hover:bg-gray-200"
                    }`}
            >
                I
            </button>

            <div className="mx-1 h-5 w-px bg-gray-300" />

            <label className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${disabled ? "cursor-not-allowed text-gray-300" : "text-gray-600 hover:bg-gray-200"}`}>
                <input
                    type="color"
                    disabled={disabled}
                    value={currentFormat.color ?? "#000000"}
                    onChange={(e) => onFormatChange({ color: e.target.value })}
                    className="h-5 w-5 cursor-pointer border-none bg-transparent"
                />
                Color
            </label>
        </div>
    );
}
