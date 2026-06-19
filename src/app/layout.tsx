import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Greencar - Israel's Premium Car Directory",
  description: "Find complete specifications, safety ratings, and details for every car model in Israel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {/* Sleek Navbar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00ff9d] to-[#00b8ff] flex items-center justify-center shadow-[0_0_20px_var(--color-primary-glow)] group-hover:scale-105 transition-transform">
                <span className="text-black font-bold text-xl">G</span>
              </div>
              <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Greencar
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8 font-medium text-gray-300">
              <Link href="/" className="hover:text-[#00ff9d] transition-colors">בית</Link>
              <Link href="#" className="hover:text-[#00ff9d] transition-colors">רכבים למכירה</Link>
              <Link href="#" className="hover:text-[#00ff9d] transition-colors">צור קשר</Link>
            </nav>
            
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-medium transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              אזור אישי
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-20 py-12 bg-black/50">
          <div className="max-w-7xl mx-auto px-6 text-center text-gray-500">
            <p>© {new Date().getFullYear()} Greencar. כל הזכויות שמורות.</p>
            <p className="mt-2 text-sm">הנתונים מבוססים על מאגרי המידע הממשלתיים (data.gov.il)</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
