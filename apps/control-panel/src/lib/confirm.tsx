import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@modonome/design-system";

interface ConfirmRequest {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
}

type ConfirmFn = (req: ConfirmRequest) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Provides an imperative confirm() that resolves true when the operator approves.
 * Every destructive control in the panel awaits this before it fires, satisfying the
 * control-panel requirement of a confirmation on every destructive action.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [resolver, setResolver] = useState<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((req) => {
    setRequest(req);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const settle = useCallback(
    (ok: boolean) => {
      if (resolver) resolver(ok);
      setResolver(null);
      setRequest(null);
    },
    [resolver],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={request !== null}
        title={request?.title ?? ""}
        confirmLabel={request?.confirmLabel}
        tone={request?.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      >
        {request?.body}
      </ConfirmDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside a ConfirmProvider");
  return ctx;
}
