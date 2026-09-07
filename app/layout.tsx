import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Auren — Context-Aware Conversational Visual Intelligence", description: "A multi-model AI workspace for conversation, code and project intelligence." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
