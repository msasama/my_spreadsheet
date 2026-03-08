"use client";

import { useState, useEffect, useRef } from "react";
import { type User } from "firebase/auth";
import {
    updatePresence,
    removePresence,
    subscribeToPresence,
    type PresenceData,
} from "@/lib/presence";

const HEARTBEAT_MS = 8000;
const STALE_THRESHOLD_MS = 30000;

export default function usePresence(
    docId: string,
    user: User | null,
    color: string
): PresenceData[] {
    const [activeUsers, setActiveUsers] = useState<PresenceData[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const userRef = useRef<User | null>(user);
    const colorRef = useRef<string>(color);

    userRef.current = user;
    colorRef.current = color;

    useEffect(() => {
        if (!user) return;

        const uid = user.uid;
        const name = user.displayName ?? user.email ?? "Anonymous";

        const sendHeartbeat = (): void => {
            void updatePresence(docId, uid, {
                name,
                color: colorRef.current,
                activeCell: null,
            });
        };

        sendHeartbeat();
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_MS);

        const unsubscribe = subscribeToPresence(docId, (users: PresenceData[]) => {
            const now = Date.now();
            const filtered = users.filter((u) => {
                const ts = u.lastSeen;
                if (!ts) return true; // Pending local writes are safe
                if (typeof ts.toMillis !== "function") return true;

                // Use Math.abs to protect against Windows clock sync drift
                const age = Math.abs(now - ts.toMillis());

                return age < STALE_THRESHOLD_MS;
            });
            setActiveUsers(filtered);
        });

        const handleUnload = (): void => {
            void removePresence(docId, uid);
        };
        window.addEventListener("beforeunload", handleUnload);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            unsubscribe();
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [docId, user?.uid]);

    return activeUsers;
}
