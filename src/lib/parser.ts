import { evaluate } from "mathjs";

export type GridData = Record<string, string>;

const CELL_REF = /[A-Z]{1,2}\d{1,3}/g;
const RANGE_REF = /([A-Z]{1,2})(\d{1,3}):([A-Z]{1,2})(\d{1,3})/g;
const PURE_CELL_REF = /^[A-Z]{1,2}\d{1,3}$/;

const FUNCTION_MAP: Record<string, string> = {
    SUM: "sum",
    AVERAGE: "mean",
    AVG: "mean",
    MIN: "min",
    MAX: "max",
    ABS: "abs",
    SQRT: "sqrt",
    ROUND: "round",
    CEIL: "ceil",
    FLOOR: "floor",
    LOG: "log",
    POW: "pow",
    MOD: "mod",
};

function colToIndex(col: string): number {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
        idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx;
}

function indexToCol(idx: number): string {
    let result = "";
    while (idx > 0) {
        const rem = (idx - 1) % 26;
        result = String.fromCharCode(65 + rem) + result;
        idx = Math.floor((idx - 1) / 26);
    }
    return result;
}

function expandRange(startCol: string, startRow: number, endCol: string, endRow: number): string[] {
    const cells: string[] = [];
    const c1 = colToIndex(startCol);
    const c2 = colToIndex(endCol);
    const minCol = Math.min(c1, c2);
    const maxCol = Math.max(c1, c2);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    for (let c = minCol; c <= maxCol; c++) {
        for (let r = minRow; r <= maxRow; r++) {
            cells.push(`${indexToCol(c)}${r}`);
        }
    }
    return cells;
}

function mapFunctions(expr: string): string {
    for (const [spreadsheetName, mathjsName] of Object.entries(FUNCTION_MAP)) {
        const pattern = new RegExp(`\\b${spreadsheetName}\\b`, "g");
        expr = expr.replace(pattern, mathjsName);
    }
    return expr;
}

export function evaluateFormula(formula: string, gridData: GridData, depth = 0): string {
    if (!formula.startsWith("=")) return formula;
    if (depth > 10) return "#ERR_CYCLE";

    let expr = formula.slice(1).toUpperCase();

    if (PURE_CELL_REF.test(expr)) {
        const raw = gridData[expr] ?? "";
        const resolved = evaluateFormula(raw, gridData, depth + 1);
        return resolved;
    }

    expr = expr.replace(RANGE_REF, (_match, sc: string, sr: string, ec: string, er: string) => {
        const cells = expandRange(sc, parseInt(sr, 10), ec, parseInt(er, 10));
        return cells
            .map((id) => {
                const raw = gridData[id] ?? "";
                const val = evaluateFormula(raw, gridData, depth + 1);
                const num = parseFloat(val);
                return isNaN(num) ? 0 : num;
            })
            .join(", ");
    });

    expr = expr.replace(CELL_REF, (cellId: string) => {
        const raw = gridData[cellId] ?? "";
        const val = evaluateFormula(raw, gridData, depth + 1);
        if (val === "#ERR_CYCLE" || val === "#ERR") return val;
        const num = parseFloat(val);
        return isNaN(num) ? "0" : String(num);
    });

    if (expr.includes("#ERR_CYCLE")) return "#ERR_CYCLE";
    if (expr.includes("#ERR")) return "#ERR";

    expr = mapFunctions(expr);

    try {
        const result = evaluate(expr);
        if (typeof result === "number" && !isFinite(result)) return "#ERR";
        return String(result);
    } catch {
        return "#ERR";
    }
}
