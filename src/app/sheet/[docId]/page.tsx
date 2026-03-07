"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Grid from "@/components/Grid";
import useIsOffline from "@/hooks/useIsOffline";
import { getUserColor } from "@/lib/colors";
import { getDocument, updateDocumentTitle } from "@/lib/documents";

export default function SheetPage() {
    const params = useParams<{ docId: string }>();
    const docId = params.docId;

    const { user, loading, signInWithGoogle } = useAuth();
    const isOffline = useIsOffline();

    const [title, setTitle] = useState<string>("Loading...");
    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
    const [localTitle, setLocalTitle] = useState<string>("");

    // Fetch document title on mount
    useEffect(() => {
        getDocument(docId)
            .then((doc) => {
                if (doc) {
                    setTitle(doc.title);
                    setLocalTitle(doc.title);
                } else {
                    setTitle("Document not found");
                }
            })
            .catch((err) => {
                console.error("[sheet] Failed to fetch document:", err);
                setTitle("Error loading document");
            });
    }, [docId]);

    const handleTitleSave = (newTitle: string): void => {
        const trimmed = newTitle.trim();
        if (trimmed.length === 0) {
            // Revert to current title if empty
            setLocalTitle(title);
            setIsEditingTitle(false);
            return;
        }
        setTitle(trimmed);
        setIsEditingTitle(false);
        void updateDocumentTitle(docId, trimmed);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-lg text-gray-500">
                Loading...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-6 bg-gray-50">
                <h1 className="text-3xl font-bold text-gray-800">My Spreadsheet</h1>
                <button
                    onClick={() => void signInWithGoogle()}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    const color = getUserColor(user.uid);

    return (
        <main className="flex h-screen flex-col">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
                {/* Left: Back arrow */}
                <Link
                    href="/"
                    className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                    ← Back
                </Link>

                {/* Center: Editable title */}
                <div className="flex items-center gap-3">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={() => handleTitleSave(localTitle)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleTitleSave(localTitle);
                                if (e.key === "Escape") {
                                    setLocalTitle(title);
                                    setIsEditingTitle(false);
                                }
                            }}
                            autoFocus
                            maxLength={100}
                            className="rounded-md border border-blue-400 px-3 py-1 text-sm font-semibold text-gray-800 outline-none ring-2 ring-blue-200"
                        />
                    ) : (
                        <button
                            onClick={() => {
                                setLocalTitle(title);
                                setIsEditingTitle(true);
                            }}
                            className="rounded-md px-3 py-1 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
                        >
                            {title}
                        </button>
                    )}
                </div>

                {/* Right: Status + User + Actions */}
                <div className="flex items-center gap-3">
                    {/* Save indicator */}
                    <span className="text-xs text-green-600">✅ Saved</span>

                    {/* Online/Offline status */}
                    {isOffline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Offline
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Synced
                        </span>
                    )}

                    <span className="text-xs text-gray-400">
                        {user.displayName ?? user.email}
                    </span>

                    <button
                        onClick={() => void signOut(auth)}
                        className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <Grid isOffline={isOffline} docId={docId} />
            </div>
        </main>
    );
}
