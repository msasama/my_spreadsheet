import { db } from "@/lib/firebase";
import {
    doc,
    setDoc,
    collection,
    onSnapshot,
    type Unsubscribe,
} from "firebase/firestore";

export interface CellFormat {
    bold?: boolean;
    italic?: boolean;
    color?: string;
}

export type FormatMap = Record<string, CellFormat>;

export async function updateCellFormat(
    docId: string,
    cellId: string,
    format: Partial<CellFormat>
): Promise<void> {
    const ref = doc(db, "docs", docId, "formats", cellId);
    await setDoc(ref, format, { merge: true });
}

export function subscribeToFormatting(
    docId: string,
    callback: (formats: FormatMap) => void
): Unsubscribe {
    const formatsRef = collection(db, "docs", docId, "formats");

    return onSnapshot(formatsRef, (snapshot) => {
        const formats: FormatMap = {};
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            formats[docSnap.id] = {
                bold: data.bold as boolean | undefined,
                italic: data.italic as boolean | undefined,
                color: data.color as string | undefined,
            };
        }
        callback(formats);
    });
}
