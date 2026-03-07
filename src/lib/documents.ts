import { db } from "@/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

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
        lastModified: serverTimestamp(),
    });

    return newDocRef.id;
}
