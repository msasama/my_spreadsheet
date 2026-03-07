import { db } from "@/lib/firebase";
import { doc, getDoc, writeBatch } from "firebase/firestore";

export async function initializeGrid(docId: string): Promise<void> {
    // Check if the grid has already been allocated by reading the first row
    const rowSnap = await getDoc(doc(db, "docs", docId, "rows", "1"));

    if (!rowSnap.exists()) {
        // Allocate 50 empty rows in a single atomic batch
        const batch = writeBatch(db);

        for (let i = 1; i <= 50; i++) {
            const ref = doc(db, "docs", docId, "rows", i.toString());
            batch.set(ref, { cells: {} });
        }

        await batch.commit();
        console.log(`[sync] Grid allocated for doc "${docId}" — 50 rows created.`);
    }
}
