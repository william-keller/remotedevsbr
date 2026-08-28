"use client";

import { useEffect } from "react";
import "./globals.css";

// Last-resort boundary: replaces the root layout, so it runs outside
// I18nProvider and cannot use useI18n(). Copy is fixed to pt-BR, the
// default locale.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 text-center">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Encontramos um erro inesperado. Tente novamente.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">{error.digest}</p>
          )}
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
