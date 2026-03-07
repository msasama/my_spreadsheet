"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createDocument } from "@/lib/documents";

export default function Dashboard() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<boolean>(false);

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
        <p className="text-gray-500">Please log in to view or create documents.</p>
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
    <div className="flex h-screen flex-col items-center justify-center gap-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800">My Spreadsheets</h1>
      <p className="text-sm text-gray-500">
        Welcome, {user.displayName ?? user.email}
      </p>
      <button
        onClick={() => void handleCreateDoc()}
        disabled={isCreating}
        className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "Creating..." : "➕ Create New Spreadsheet"}
      </button>
    </div>
  );
}
