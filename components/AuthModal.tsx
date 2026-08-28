"use client";

import { useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import { useI18n } from "@/lib/i18n";

export function AuthModal() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isOpen, mode, closeAuthModal } = useAuthModal();

  useEffect(() => {
    if (user && isOpen) closeAuthModal();
  }, [user, isOpen, closeAuthModal]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeAuthModal() : undefined)}>
      <DialogContent className="p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-2">
            <DialogTitle>{t("auth.modalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <AuthForm initialMode={mode} onSuccess={closeAuthModal} showBackLink={false} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

