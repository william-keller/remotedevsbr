"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO 
        title="Página Não Encontrada | RemoteDevs BR" 
        description="A página que você procura não foi encontrada. Volte para a página inicial do RemoteDevs BR."
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
