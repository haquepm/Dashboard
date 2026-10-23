import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Crescent | Management Control Centre", description: "Crescent Contractors live project management and executive dashboard" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
