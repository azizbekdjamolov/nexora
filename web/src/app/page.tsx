import { Hero } from "@/components/home/Hero";
import { Stats, Features, AI, HowItWorks, Telegram, Security, FAQ, CTA } from "@/components/home/Sections";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <AI />
        <HowItWorks />
        <Telegram />
        <Security />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}