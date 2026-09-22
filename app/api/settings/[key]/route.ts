import type { NextResponse } from "next/server";
import {
  apiError,
  ok,
  readJson,
  validationError,
  type ApiErrorBody,
  type ApiSuccess,
} from "@/lib/api";
import type { SettingKey } from "@/lib/config";
import { getSetting, isSettingKey, setSetting, settingValueSchema } from "@/lib/settings";
import { tr } from "@/lib/tr";

interface RouteContext {
  params: Promise<{ key: string }>;
}

interface SettingDto {
  key: SettingKey;
  value: string[];
}

type Res = NextResponse<ApiSuccess<SettingDto>> | NextResponse<ApiErrorBody>;

function notFound(): NextResponse<ApiErrorBody> {
  return apiError(404, "NOT_FOUND", tr.errors.settingNotFound);
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Res> {
  const { key } = await params;
  if (!isSettingKey(key)) return notFound();
  return ok({ key, value: await getSetting(key) });
}

export async function PUT(request: Request, { params }: RouteContext): Promise<Res> {
  const { key } = await params;
  if (!isSettingKey(key)) return notFound();

  const parsed = settingValueSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  return ok({ key, value: await setSetting(key, parsed.data.value) });
}
