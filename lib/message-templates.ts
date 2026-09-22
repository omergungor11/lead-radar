// `MessageTemplate` için zod şemaları ve DTO dönüşümü. Sunucu tarafı (route handler'lar).
// Client-safe tipler/sabitler `lib/templates.ts`'de.

import { z } from "zod";
import type { MessageTemplate } from "@prisma/client";
import {
  hasOptOut,
  TEMPLATE_BODY_MAX,
  TEMPLATE_CHANNELS,
  TEMPLATE_NAME_MAX,
  type Template,
  type TemplateChannel,
} from "@/lib/templates";
import { tr } from "@/lib/tr";

const name = z.string().trim().min(1).max(TEMPLATE_NAME_MAX);
const channel = z.enum(TEMPLATE_CHANNELS);
// Gövde trim edilmez: WhatsApp metninde baştaki/sondaki satır kırma kullanıcının tercihi olabilir
const body = z
  .string()
  .max(TEMPLATE_BODY_MAX)
  .refine((s) => s.trim().length > 0, { error: "Boş olamaz" });

export const createTemplateSchema = z.object({ name, channel, body });

export const updateTemplateSchema = z
  .object({ name: name.optional(), channel: channel.optional(), body: body.optional() })
  .refine((v) => v.name !== undefined || v.channel !== undefined || v.body !== undefined, {
    error: tr.errors.emptyUpdate,
  });

function isChannel(value: string): value is TemplateChannel {
  return (TEMPLATE_CHANNELS as readonly string[]).includes(value);
}

export function toTemplateDto(row: MessageTemplate): Template {
  return {
    id: row.id,
    name: row.name,
    // DB'de string; bilinmeyen değer (elle düzenleme) WHATSAPP'a düşer
    channel: isChannel(row.channel) ? row.channel : "WHATSAPP",
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    hasOptOut: hasOptOut(row.body),
  };
}
