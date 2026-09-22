import type { NextResponse } from "next/server";
import { ok, type ApiSuccess } from "@/lib/api";
import { SETTING_KEYS } from "@/lib/config";
import { getServerEnv } from "@/lib/env";
import { getSetting, type SettingsResponse } from "@/lib/settings";

export async function GET(): Promise<NextResponse<ApiSuccess<SettingsResponse>>> {
  const env = getServerEnv();
  const [cities, bonusCategories] = await Promise.all([
    getSetting(SETTING_KEYS.cities),
    getSetting(SETTING_KEYS.bonusCategories),
  ]);
  return ok({
    cities,
    bonusCategories,
    placesKeyConfigured: env.googlePlacesApiKey !== undefined,
    placesMock: env.placesMock,
  });
}
