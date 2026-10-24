import Image from "next/image";
import logo from "@/public/logo.png";
import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return <Image src={logo} alt="Critiq" priority className={cn("h-auto", className)} />;
}
