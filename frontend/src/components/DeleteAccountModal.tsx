"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function DeleteAccountModal({
  userEmail,
  onClose,
}: {
  userEmail: string;
  onClose: () => void;
}) {
  const [typedEmail, setTypedEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const matches = typedEmail.trim().toLowerCase() === userEmail.toLowerCase();

  async function handleDelete() {
    setDeleting(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Session expired — please log in again.");
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Delete failed");

      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setError("Something went wrong. Try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Delete account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This can't be undone.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          This permanently deletes your contracts, reports, and profile. Type{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {userEmail}
          </span>{" "}
          to confirm.
        </p>

        <input
          value={typedEmail}
          onChange={(e) => setTypedEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm mb-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-red-200"
        />

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="flex-1 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
