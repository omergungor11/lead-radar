"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "cn";
import { tr } from "@/lib/tr";
import type { PhotoRef } from "@/lib/types";

interface GalleryProps {
  photos: PhotoRef[];
  name: string;
}

export function Gallery({ photos, name }: GalleryProps) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground">
        <ImageOff className="size-5" />
        {tr.detail.gallery.empty}
      </div>
    );
  }

  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div className="flex flex-col gap-2">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxy görseli, next/image istenmiyor
        <img
          src={current.url}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-56 w-full rounded-lg object-cover"
        />
      ) : null}
      {photos.length > 1 ? (
        <div className="flex gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.name}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "overflow-hidden rounded-md ring-2 ring-transparent",
                index === active && "ring-primary",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- proxy görseli, next/image istenmiyor */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-14 object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
