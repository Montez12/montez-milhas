import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Montez Milhas | Oportunidades em pontos e milhas", description: "Acompanhe oportunidades de transferência bonificada, passagens com milhas e compra de milhas." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
