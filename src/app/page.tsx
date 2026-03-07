"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Grid from "@/components/Grid";
import useIsOffline from "@/hooks/useIsOffline";
import { getUserColor } from "@/lib/colors";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const isOffline = useIsOffline();

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
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-sm font-semibold text-gray-800">My Spreadsheet</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user.displayName ?? user.email}
          </span>
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Offline - Saving Disabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Cloud Synced
            </span>
          )}
        </div>
        <button
          onClick={() => void signOut(auth)}
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          Sign Out
        </button>
      </header>
      <div className="flex-1 overflow-hidden">
        <Grid isOffline={isOffline} />
      </div>
    </main>
  );
}
