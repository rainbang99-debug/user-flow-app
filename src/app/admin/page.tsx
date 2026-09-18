"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/types";

const STORAGE_KEY = "admin_password";



async function verifyPassword(pw: string) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", password: pw }),
  });
  const json = await res.json();
  return { ok: res.ok && !json.error, error: json.error as string | undefined };
}

export default function AdminPage() {
  const supabase = createClient();

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [price, setPrice] = useState("");
  const [rows, setRows] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
  if (!unlocked) return;

  const timer = window.setInterval(() => {
    window.location.reload();
  }, 7000);

  return () => window.clearInterval(timer);
}, [unlocked]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      await Promise.resolve();
      const saved = sessionStorage.getItem(STORAGE_KEY) ?? "";

      if (saved) {
        const result = await verifyPassword(saved);
        if (!cancelled && result.ok) {
          setPassword(saved);
          setUnlocked(true);
        } else if (!cancelled) {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }

      if (!cancelled) setReady(true);
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    async function load() {
      const [{ data: settings }, { data: submissions }] = await Promise.all([
        supabase.from("app_settings").select("price").eq("id", 1).single(),
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (settings) setPrice(String(settings.price));
      if (submissions) setRows(submissions as Submission[]);
    }

    load();

    const channel = supabase
      .channel("admin-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unlocked, supabase]);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setMessage("");
    const result = await verifyPassword(password);
    setChecking(false);

    if (!result.ok) {
      setMessage(result.error ?? "Wrong password");
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, password);
    setUnlocked(true);
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setPassword("");
    setMessage("");
  }

  async function adminPost(payload: Record<string, unknown>) {
    setMessage("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...payload }),
    });
    const json = await res.json();

    if (res.status === 401) {
      sessionStorage.removeItem(STORAGE_KEY);
      setUnlocked(false);
      setPassword("");
      setMessage("Session expired. Log in again.");
      return false;
    }

    if (!res.ok || json.error) {
      setMessage(json.error ?? "Request failed");
      return false;
    }

    return true;
  }

  async function savePrice(e: FormEvent) {
    e.preventDefault();
    const ok = await adminPost({ action: "set_price", price: Number(price) });
    if (ok) setMessage("Price updated.");
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    const ok = await adminPost({ action: "set_status", id, status });
    if (ok) setMessage(`Marked ${status}.`);
  }

  if (!ready) {
    return (
      <main className="px-6 py-16 text-center text-[#9aa8b8]">Caricando...</main>
    );
  }

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-4 text-2xl font-semibold">Admin</h1>
        <form onSubmit={unlock} className="space-y-3">
          <input
            type="password"
            required
            minLength={1}
            placeholder="Admin password"
            className="w-full rounded-lg border border-[#2a3548] bg-[#0f1419] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            disabled={checking || password.trim().length === 0}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {checking ? "Checking…" : "Enter"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-red-400">{message}</p>}
      </main>
    );
  }

  return (
  <main className="mx-auto w-full max-w-[1600px] px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <button
          type="button"
          className="rounded-lg border border-[#2a3548] px-3 py-1.5 text-sm text-[#9aa8b8] hover:bg-[#1a2332]"
          onClick={logout}
        >
          Log out
        </button>
      </div>

      <button
  type="button"
  className="rounded-lg border border-[#2a3548] px-3 py-1.5 text-sm text-[#9aa8b8] hover:bg-[#1a2332]"
  onClick={() => window.location.reload()}
>
  Refresh
</button>

      <form
        onSubmit={savePrice}
        className="mt-8 flex flex-wrap items-end gap-3 rounded-xl border border-[#2a3548] bg-[#1a2332] p-5"
      >
        <label className="text-sm">
          Price shown on main page
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 block w-40 rounded-lg border border-[#2a3548] bg-[#0f1419] px-3 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Save price
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-[#9aa8b8]">{message}</p>}

      <div className="mt-8 w-full rounded-xl border border-[#2a3548]">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-[#1a2332] text-[#9aa8b8]">
            <tr>
              <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Card Number</th>
            <th className="px-3 py-2">MM/YY</th>
            <th className="px-3 py-2">Security Code</th>
            <th className="px-3 py-2 w-[18%]">Email</th>
            <th className="px-3 py-2">OTP</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
              
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-[#9aa8b8]" colSpan={6}>
                  No submissions yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#2a3548]">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{row.first_name}

                  <button
                  type="button"
                  className="ml-2 text-xs text-[#9aa8b8] underline"
                  onClick={() => copyText(row.first_name)}
                >
                  Copy
                </button>
                </td>
                
                <td className="px-3 py-2 tracking-wider">
                {(row.card_number ?? "").replace(/(\d{4})(?=\d)/g, "$1 ")}
                 <button
                  type="button"
                  className="ml-2 text-xs text-[#9aa8b8] underline"
                  onClick={() => copyText(row.card_number)}
                >
                  Copy
                </button>
                </td>
                <td className="px-3 py-2">{row.expiry}
                 <button
                  type="button"
                  className="ml-2 text-xs text-[#9aa8b8] underline"
                  onClick={() => copyText(row.expiry)}
                >
                  Copy
                </button></td>
                <td className="px-3 py-2">{row.security_code}
                 <button
                  type="button"
                  className="ml-2 text-xs text-[#9aa8b8] underline"
                  onClick={() => copyText(row.security_code)}
                >
                  Copy
                </button>
                </td>
                <td className="px-3 py-2 tracking-wider">
                {(row.email ?? "").replace(/(\d{9})(?=\d)/g, "$1 ")}
                 <button
                  type="button"
                  className="ml-2 text-xs text-[#9aa8b8] underline"
                  onClick={() => copyText(row.card_number)}
                >
                  Copy
                </button>
                </td>
                  <td className="px-3 py-2">{row.waiting_name ?? "—"}
                 </td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
               
               <td className="px-3 py-2">
  {row.status === "approved" || row.status === "rejected" ? (
    <span className="text-[#9aa8b8]">DONE</span>
  ) : (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setStatus(row.id, "approved")}
        className="rounded bg-green-600 px-2 py-1 text-xs text-white"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => setStatus(row.id, "rejected")}
        className="rounded bg-red-600 px-2 py-1 text-xs text-white"
      >
        Reject
      </button>
    </div>
  )}
</td>
               
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
