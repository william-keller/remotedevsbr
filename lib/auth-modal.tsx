"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { AuthMode } from "@/components/AuthForm";

type AuthModalContextValue = {
  isOpen: boolean;
  mode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      mode,
      openAuthModal: (nextMode) => {
        setMode(nextMode ?? "signin");
        setIsOpen(true);
      },
      closeAuthModal: () => setIsOpen(false),
    }),
    [isOpen, mode],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside AuthModalProvider");
  return ctx;
}

