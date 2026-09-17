import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const ibmPlexSerif = IBM_Plex_Serif({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-ibm-plex-serif",
});

export const metadata: Metadata = {
    title: "Horizon",
    description: "Horizon Is A Modern Banking Platform For Everyone.",
    icons: {
        icon: "/icons/logo.svg",
    },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={`${inter.variable} ${ibmPlexSerif.variable}`}
        >
            <body className="h-screen overflow-hidden">{children}</body>
        </html>
    );
}
