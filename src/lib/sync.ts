import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    writeBatch,
    setDoc,
    serverTimestamp,
    collection,
    onSnapshot,
    type Unsubscribe,
    type DocumentData,
} from "firebase/firestore";

export interface RowData {
    id: string;
    cells: Record<string, { value: string }>;
}

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

export async function updateCell(
    docId: string,
    rowId: string,
    colId: string,
    value: string
): Promise<void> {
    const ref = doc(db, "docs", docId, "rows", rowId);
    await setDoc(ref, {
        cells: {
            [colId]: {
                value: value
            }
        },
        lastChanged: serverTimestamp()
    }, { merge: true });
}

export function subscribeToRows(
    docId: string,
    callback: (rows: RowData[], isPending: boolean) => void
): Unsubscribe {
    const rowsRef = collection(db, "docs", docId, "rows");

    return onSnapshot(rowsRef, { includeMetadataChanges: true }, (snapshot) => {
        const isPending = snapshot.metadata.hasPendingWrites;
        const rows: RowData[] = snapshot.docs.map((docSnap) => {
            const data: DocumentData = docSnap.data();
            return {
                id: docSnap.id,
                cells: (data.cells as Record<string, { value: string }>) ?? {},
            };
        });
        callback(rows, isPending);
    });
}
