import { DM_Sans, Outfit, Caveat } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
})

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Honeydew - Cold DMs have never been sweeter",
  description:
    "AI-powered company research for job seekers. Get funding rounds, product launches, and team intel so your cold DMs actually get replies.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${outfit.variable} ${caveat.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  )
}
