import { db } from "@/lib/firebase";
import {
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    collection,
    onSnapshot,
    type Unsubscribe,
    type Timestamp,
} from "firebase/firestore";

export interface PresenceData {
    uid: string;
    name: string;
    color: string;
    activeCell: string | null;
    lastSeen: Timestamp | null;
}

export async function updatePresence(
    docId: string,
    uid: string,
    data: { name: string; color: string; activeCell: string | null }
): Promise<void> {
    const ref = doc(db, "docs", docId, "presence", uid);
    await setDoc(ref, {
        name: data.name,
        color: data.color,
        activeCell: data.activeCell,
        lastSeen: serverTimestamp(),
    });
}

export async function sendHeartbeat(
    docId: string,
    uid: string
): Promise<void> {
    const ref = doc(db, "docs", docId, "presence", uid);
    await updateDoc(ref, { lastSeen: serverTimestamp() });
}

export async function updateActiveCell(
    docId: string,
    uid: string,
    cellId: string | null
): Promise<void> {
    const ref = doc(db, "docs", docId, "presence", uid);
    await updateDoc(ref, { activeCell: cellId });
}

export async function removePresence(
    docId: string,
    uid: string
): Promise<void> {
    const ref = doc(db, "docs", docId, "presence", uid);
    await deleteDoc(ref);
}

export function subscribeToPresence(
    docId: string,
    callback: (users: PresenceData[]) => void
): Unsubscribe {
    const presenceRef = collection(db, "docs", docId, "presence");

    return onSnapshot(presenceRef, (snapshot) => {
        const users: PresenceData[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                uid: docSnap.id,
                name: data.name as string,
                color: data.color as string,
                activeCell: (data.activeCell as string | null) ?? null,
                lastSeen: (data.lastSeen as Timestamp | null) ?? null,
            };
        });
        callback(users);
    });
}
