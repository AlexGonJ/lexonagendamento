"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado na aplicação", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-white">
      <section className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Não foi possível carregar esta página</h1>
        <p className="text-zinc-300">Tente novamente. Se o problema continuar, entre em contato com o estabelecimento.</p>
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-lg bg-amber-500 px-5 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-400"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
