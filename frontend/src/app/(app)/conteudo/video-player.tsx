"use client";

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  caption,
}: {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
}) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
      {videoUrl ? (
        <video
          key={videoUrl}
          controls
          playsInline
          poster={thumbnailUrl ?? undefined}
          className="h-full w-full object-contain"
        >
          <source src={videoUrl} />
        </video>
      ) : (
        thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={caption ?? "Prévia do conteúdo"}
            className="h-full w-full object-cover"
          />
        )
      )}
    </div>
  );
}
