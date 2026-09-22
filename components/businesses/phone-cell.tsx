"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { waLink } from "@/lib/phone";
import { tr } from "@/lib/tr";

interface PhoneCellProps {
  phone: string | null;
  phoneE164: string | null;
}

export function PhoneCell({ phone, phoneE164 }: PhoneCellProps) {
  if (!phone) {
    return <span className="text-sm text-muted-foreground">{tr.businesses.noPhone}</span>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone as string);
      toast.success(tr.common.copySuccess);
    } catch {
      toast.error(tr.common.copyError);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={copy} className="text-sm hover:underline">
        {phone}
      </button>
      {phoneE164 ? (
        <a
          href={waLink(phoneE164)}
          target="_blank"
          rel="noreferrer"
          aria-label={tr.businesses.whatsappAria}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          <MessageCircle className="size-4" />
        </a>
      ) : null}
    </div>
  );
}
