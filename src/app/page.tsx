"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  createDocument,
  getUserDocuments,
  type DocumentMetadata,
} from "@/lib/documents";
import { type Timestamp } from "firebase/firestore";

function formatDate(value: Timestamp | Date): string {
  const date = "toDate" in value ? value.toDate() : value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setIsLoadingDocs(false);
      return;
    }

    getUserDocuments(user.uid)
      .then((docs) => {
        setDocuments(docs);
        setIsLoadingDocs(false);
      })
      .catch((err) => {
        console.error("[dashboard] Failed to fetch documents:", err);
        setIsLoadingDocs(false);
      });
  }, [user]);

  const handleCreateDoc = async (): Promise<void> => {
    if (!user) return;
    setIsCreating(true);
    try {
      const newId = await createDocument(
        "Untitled Spreadsheet",
        user.uid,
        user.displayName ?? "Anonymous"
      );
      router.push("/sheet/" + newId);
    } catch (err) {
      console.error("[dashboard] Failed to create document:", err);
      setIsCreating(false);
    }
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
        <p className="text-gray-500">
          Please log in to view or create documents.
        </p>
        <button
          onClick={() => void signInWithGoogle()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800">My Spreadsheets</h1>
      <p className="mt-2 text-sm text-gray-500">
        Welcome, {user.displayName ?? user.email}
      </p>

      <button
        onClick={() => void handleCreateDoc()}
        disabled={isCreating}
        className="mt-8 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "Creating..." : "➕ Create New Spreadsheet"}
      </button>

      {/* Recent Spreadsheets */}
      <section className="mt-12 w-full max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">
          Recent Spreadsheets
        </h2>

        {isLoadingDocs ? (
          <p className="text-sm text-gray-400">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400">
            No spreadsheets found. Create one above!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => router.push(`/sheet/${doc.id}`)}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="font-medium text-gray-800">{doc.title}</span>
                <span className="text-xs text-gray-400">
                  {formatDate(doc.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
