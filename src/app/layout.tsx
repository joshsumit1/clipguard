import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClipGuard — Short-Form Brand Compliance & Safe-Zone Engine',
  description:
    'Brand Compliance & Asset Portal for YouTube Shorts & Instagram Reels clipping campaigns. Hardcode safe-zone sponsor assets and generate verified compliance tags.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
      </head>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
