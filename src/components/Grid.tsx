"use client";

import { useState, useCallback } from "react";
import Cell from "@/components/Cell";

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
}

export default function Grid({ isOffline }: GridProps) {
    const [data, setData] = useState<GridData>(() => {
        const init: GridData = {};
        for (const col of COLUMNS) {
            for (const row of ROWS) {
                const id = `${col}${row}`;
                init[id] = { formula: "", value: "" };
            }
        }
        return init;
    });

    // Mutex: functional update + empty deps = stable reference, never breaks React.memo
    const handleCellUpdate = useCallback((id: string, newFormula: string) => {
        setData((prev) => ({
            ...prev,
            [id]: { formula: newFormula, value: newFormula },
        }));
    }, []);

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
                                const cell = data[id];
                                return (
                                    <td key={id} className="p-0">
                                        <Cell
                                            cellId={id}
                                            initialFormula={cell.formula}
                                            initialValue={cell.value}
                                            onUpdate={handleCellUpdate}
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
