import { createFileRoute } from "@tanstack/react-router";
import { BancaApp } from "@/components/banca/banca-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BancaApp />;
}
