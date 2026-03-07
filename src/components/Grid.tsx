"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Cell from "@/components/Cell";
import { updateCell, subscribeToRows, type RowData } from "@/lib/sync";

const COLUMNS: string[] = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
);
const ROWS: number[] = Array.from({ length: 50 }, (_, i) => i + 1);

interface CellData {
    formula: string;
    value: string;
}

type GridData = Record<string, CellData>;

interface GridProps {
    isOffline: boolean;
    docId: string;
}

export default function Grid({ isOffline, docId }: GridProps) {
    // Server truth stored in ref — avoids 1,300-cell re-renders on every update
    const serverData = useRef<GridData>({});

    // Active cell ref for focus isolation
    const activeCellRef = useRef<string | null>(null);

    // Render data — initialized lazily, only updated for cells that actually changed
    const [renderData, setRenderData] = useState<GridData>(() => {
        const init: GridData = {};
        for (const col of COLUMNS) {
            for (const row of ROWS) {
                const id = `${col}${row}`;
                init[id] = { formula: "", value: "" };
            }
        }
        return init;
    });

    // Subscribe to real-time Firestore updates
    useEffect(() => {
        const unsubscribe = subscribeToRows(docId, (rows: RowData[]) => {
            // Build flat map from incoming row data
            const incoming: GridData = {};
            for (const row of rows) {
                for (const col of COLUMNS) {
                    const id = `${col}${row.id}`;
                    const cellValue = row.cells[col]?.value ?? "";
                    incoming[id] = { formula: cellValue, value: cellValue };
                }
            }

            // Update server ref (always — this is the truth)
            serverData.current = incoming;

            // Diff and selectively update render data
            setRenderData((prev) => {
                const next = { ...prev };
                let hasChanges = false;

                for (const id of Object.keys(incoming)) {
                    const incomingCell = incoming[id];
                    const currentCell = prev[id];

                    // Focus isolation: skip the actively edited cell
                    if (id === activeCellRef.current) continue;

                    // Only update if value actually changed
                    if (
                        !currentCell ||
                        currentCell.value !== incomingCell.value ||
                        currentCell.formula !== incomingCell.formula
                    ) {
                        next[id] = incomingCell;
                        hasChanges = true;
                    }
                }

                return hasChanges ? next : prev;
            });
        });

        return unsubscribe;
    }, [docId]);

    // Track active cell for focus isolation
    const handleCellFocus = useCallback((cellId: string) => {
        activeCellRef.current = cellId;
    }, []);

    const handleCellBlur = useCallback(() => {
        activeCellRef.current = null;
    }, []);

    // Write handler — compare-before-write, then push to Firestore
    const handleCellUpdate = useCallback(
        (id: string, newFormula: string) => {
            // Extract column and row from cell ID (e.g., "A1" -> col="A", rowId="1")
            const col = id.charAt(0);
            const rowId = id.slice(1);

            // Compare with last known server value
            const serverValue = serverData.current[id]?.value ?? "";
            if (newFormula === serverValue) return;

            // Update local render data immediately (optimistic)
            setRenderData((prev) => ({
                ...prev,
                [id]: { formula: newFormula, value: newFormula },
            }));

            // Write to Firestore
            void updateCell(docId, rowId, col, newFormula);
        },
        [docId]
    );

    return (
        <div className="h-full w-full overflow-auto border border-gray-400 bg-white">
            <table className="border-collapse">
                <thead>
                    <tr className="sticky top-0 z-10">
                        {/* Top-left corner cell */}
                        <th className="sticky left-0 z-20 h-8 w-12 border border-gray-300 bg-gray-200" />
                        {COLUMNS.map((col) => (
                            <th
                                key={col}
                                className="h-8 w-28 border border-gray-300 bg-gray-200 text-center text-xs font-semibold text-gray-600"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ROWS.map((row) => (
                        <tr key={row}>
                            {/* Row header */}
                            <td className="sticky left-0 z-10 h-8 w-12 border border-gray-300 bg-gray-100 text-center text-xs font-semibold text-gray-500">
                                {row}
                            </td>
                            {COLUMNS.map((col) => {
                                const id = `${col}${row}`;
                                const cell = renderData[id];
                                return (
                                    <td key={id} className="p-0">
                                        <Cell
                                            cellId={id}
                                            initialFormula={cell.formula}
                                            initialValue={cell.value}
                                            onUpdate={handleCellUpdate}
                                            onFocusCell={handleCellFocus}
                                            onBlurCell={handleCellBlur}
                                            isOffline={isOffline}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
