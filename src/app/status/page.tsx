import { Suspense } from "react";
import StatusClient from "./StatusClient";

export default function StatusPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-center">Caricando...</main>}>
      <StatusClient />
    </Suspense>
  );
}