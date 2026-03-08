import { describe, it, expect } from "vitest";
import { evaluateFormula, type GridData } from "./parser";

describe("evaluateFormula", () => {
    it("evaluates basic math: =10+20*2 should equal 50", () => {
        const grid: GridData = {};
        const result = evaluateFormula("=10+20*2", grid);
        expect(result).toBe("50");
    });

    it("handles uppercase/sanitization: =sum(a1, A2) evaluates correctly", () => {
        const grid: GridData = { A1: "5", A2: "15" };
        const result = evaluateFormula("=sum(a1, A2)", grid);
        expect(result).toBe("20");
    });

    it("expands ranges: =SUM(A1:A3) with A1=10, A2=20, A3=30 equals 60", () => {
        const grid: GridData = { A1: "10", A2: "20", A3: "30" };
        const result = evaluateFormula("=SUM(A1:A3)", grid);
        expect(result).toBe("60");
    });

    it("passes through pure string references: =B1 where B1='hello' returns 'hello'", () => {
        const grid: GridData = { B1: "hello" };
        const result = evaluateFormula("=B1", grid);
        expect(result).toBe("hello");
    });

    it("detects cycles: A1=B1 and B1=A1 returns #ERR_CYCLE", () => {
        const grid: GridData = { A1: "=B1", B1: "=A1" };
        const result = evaluateFormula("=A1", grid);
        expect(result).toBe("#ERR_CYCLE");
    });
});
