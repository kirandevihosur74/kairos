import Image from "next/image";

/** Displays the supplied artwork at its original proportions, with excess canvas clipped. */
export function Logo({ width = 120 }: { width?: number }) {
  return (
    <span className="relative block shrink-0 overflow-hidden" style={{ width, aspectRatio: "1080 / 346" }}>
      <Image
        src="/brand/kairos-logo.png"
        alt="Kairos"
        width={1774}
        height={887}
        unoptimized
        className="absolute top-[-78.035%] left-[-36.574%] h-auto w-[164.259%] max-w-none"
      />
    </span>
  );
}
