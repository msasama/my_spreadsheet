import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    getDoc,
    updateDoc,
    orderBy,
    type Timestamp,
} from "firebase/firestore";

export interface DocumentMetadata {
    id: string;
    title: string;
    ownerId: string;
    ownerName: string;
    updatedAt: Timestamp | Date;
}

export async function createDocument(
    title: string,
    uid: string,
    displayName: string
): Promise<string> {
    // Generate a new, unique document reference under the "docs" collection
    const newDocRef = doc(collection(db, "docs"));

    // Create the metadata document (setDoc is valid here — brand new document)
    await setDoc(newDocRef, {
        title,
        ownerId: uid,
        ownerName: displayName,
        updatedAt: serverTimestamp(),
    });

    return newDocRef.id;
}

export async function getUserDocuments(uid: string): Promise<DocumentMetadata[]> {
    const q = query(
        collection(db, "docs"),
        where("ownerId", "==", uid),
        orderBy("updatedAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            title: data.title as string,
            ownerId: data.ownerId as string,
            ownerName: data.ownerName as string,
            // Fallback to new Date() if serverTimestamp hasn't resolved yet
            updatedAt: (data.updatedAt as Timestamp | null) ?? new Date(),
        };
    });
}

export async function getDocument(docId: string): Promise<DocumentMetadata | null> {
    const docSnap = await getDoc(doc(db, "docs", docId));

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        id: docSnap.id,
        title: data.title as string,
        ownerId: data.ownerId as string,
        ownerName: data.ownerName as string,
        updatedAt: (data.updatedAt as Timestamp | null) ?? new Date(),
    };
}

export async function updateDocumentTitle(docId: string, newTitle: string): Promise<void> {
    const docRef = doc(db, "docs", docId);
    await updateDoc(docRef, { title: newTitle, updatedAt: serverTimestamp() });
}
