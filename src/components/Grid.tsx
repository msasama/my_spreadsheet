"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Cell from "@/components/Cell";
import { updateCell, subscribeToRows, type RowData } from "@/lib/sync";
import { type PresenceData } from "@/lib/presence";

const COLUMNS: string[] = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
);
const ROWS: number[] = Array.from({ length: 50 }, (_, i) => i + 1);

interface CellData {
    formula: string;
    value: string;
}

type GridData = Record<string, CellData>;

interface RemoteUser {
    name: string;
    color: string;
}

interface GridProps {
    isOffline: boolean;
    docId: string;
    currentUid: string;
    activeUsers: PresenceData[];
    onSyncStateChange?: (state: "saved" | "saving") => void;
}

export default function Grid({ isOffline, docId, currentUid, activeUsers, onSyncStateChange }: GridProps) {
    const serverData = useRef<GridData>({});
    const activeCellRef = useRef<string | null>(null);

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

    const remotePresenceMap = useMemo(() => {
        const map: Record<string, RemoteUser> = {};
        for (const u of activeUsers) {
            if (u.uid === currentUid) continue;
            if (!u.activeCell) continue;
            map[u.activeCell] = { name: u.name, color: u.color };
        }
        return map;
    }, [activeUsers, currentUid]);

    /*
     * Flat formula map for the parser: cellId -> raw formula string.
     * This is what Cell passes into evaluateFormula for recursive resolution.
     */
    const formulaMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const id of Object.keys(renderData)) {
            map[id] = renderData[id].formula;
        }
        return map;
    }, [renderData]);

    useEffect(() => {
        const unsubscribe = subscribeToRows(docId, (rows: RowData[], isPending: boolean) => {
            onSyncStateChange?.(isPending ? "saving" : "saved");
            const incoming: GridData = {};
            for (const row of rows) {
                for (const col of COLUMNS) {
                    const id = `${col}${row.id}`;
                    const rawFormula = row.cells[col]?.value ?? "";
                    incoming[id] = { formula: rawFormula, value: rawFormula };
                }
            }

            serverData.current = incoming;

            setRenderData((prev) => {
                const next = { ...prev };
                let hasChanges = false;

                for (const id of Object.keys(incoming)) {
                    const incomingCell = incoming[id];
                    const currentCell = prev[id];

                    if (id === activeCellRef.current) continue;

                    if (
                        !currentCell ||
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

    const handleCellFocus = useCallback((cellId: string) => {
        activeCellRef.current = cellId;
    }, []);

    const handleCellBlur = useCallback(() => {
        activeCellRef.current = null;
    }, []);

    const handleCellUpdate = useCallback(
        (id: string, newFormula: string) => {
            const col = id.charAt(0);
            const rowId = id.slice(1);

            const serverFormula = serverData.current[id]?.formula ?? "";
            if (newFormula === serverFormula) return;

            setRenderData((prev) => ({
                ...prev,
                [id]: { formula: newFormula, value: newFormula },
            }));

            void updateCell(docId, rowId, col, newFormula);
        },
        [docId]
    );

    return (
        <div className="h-full w-full overflow-auto border border-gray-400 bg-white">
            <table className="border-collapse">
                <thead>
                    <tr className="sticky top-0 z-10">
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
                            <td className="sticky left-0 z-10 h-8 w-12 border border-gray-300 bg-gray-100 text-center text-xs font-semibold text-gray-500">
                                {row}
                            </td>
                            {COLUMNS.map((col) => {
                                const id = `${col}${row}`;
                                const cell = renderData[id];
                                const remote = remotePresenceMap[id];
                                return (
                                    <td key={id} className="p-0">
                                        <Cell
                                            cellId={id}
                                            docId={docId}
                                            currentUid={currentUid}
                                            initialFormula={cell.formula}
                                            initialValue={cell.value}
                                            gridData={formulaMap}
                                            onUpdate={handleCellUpdate}
                                            onFocusCell={handleCellFocus}
                                            onBlurCell={handleCellBlur}
                                            isOffline={isOffline}
                                            remoteUser={remote}
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
