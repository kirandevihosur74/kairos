import Image from "next/image";

export type IconName = "home" | "compass" | "mic" | "sheet" | "mail" | "filter" | "back" | "chev" | "download" | "search";

export function DesignIcon({ name }: { name: IconName }) {
  const size = name === "chev" ? 12 : name === "search" ? 16 : name === "download" ? 18 : name === "filter" ? 20 : 22;
  return <Image src={`/design/icon-${name}.svg`} alt="" width={size} height={size} unoptimized aria-hidden />;
}
