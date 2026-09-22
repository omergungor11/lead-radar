import { cn } from "cn";

interface BusinessAvatarProps {
  name: string;
  thumbnailUrl: string | null;
  className?: string;
}

export function BusinessAvatar({ name, thumbnailUrl, className }: BusinessAvatarProps) {
  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google/proxy görselleri, next/image istenmiyor
      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("size-10 shrink-0 rounded-md object-cover", className)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {initial}
    </div>
  );
}
