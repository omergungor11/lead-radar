"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tr } from "@/lib/tr";

function safeNext(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const next = safeNext(searchParams.get("next"));
        router.replace(next);
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => null);
      const code = body?.error?.code as string | undefined;

      if (res.status === 401 && code === "INVALID_PASSWORD") {
        setError(tr.errors.invalidPassword);
      } else {
        toast.error(body?.error?.message ?? tr.auth.genericError);
      }
    } catch {
      toast.error(tr.auth.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{tr.auth.passwordLabel}</Label>
        <Input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder={tr.auth.passwordPlaceholder}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          disabled={submitting}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? tr.auth.submitting : tr.auth.submit}
      </Button>
    </form>
  );
}
