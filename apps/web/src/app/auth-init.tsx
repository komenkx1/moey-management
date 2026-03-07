"use client";

import { useAuth } from "@/hooks/useAuth";

export default function AuthInit() {
    // This hook will initialize the Supabase auth listener on mount
    useAuth();

    return null;
}
