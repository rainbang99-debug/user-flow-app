import { Suspense } from "react";
import NextClient from "./NextClient";

export default function NextPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-center">Caricando...</main>}>
      <NextClient />
    </Suspense>
  );
}