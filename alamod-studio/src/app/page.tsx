import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBookBar } from "@/components/MobileBookBar";
import { Cursor } from "@/components/Cursor";
import { StructuredData } from "@/components/StructuredData";
import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { WhyAlamod } from "@/components/sections/WhyAlamod";
import { Equipment } from "@/components/sections/Equipment";
import { Showcase } from "@/components/sections/Showcase";
import { WhoFor } from "@/components/sections/WhoFor";
import { Rates } from "@/components/sections/Rates";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <>
      <StructuredData />
      <Header />
      <main id="main">
        <Hero />
        <Intro />
        <WhyAlamod />
        <Equipment />
        <Showcase />
        <WhoFor />
        <Rates />
        <HowItWorks />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <MobileBookBar />
      <Cursor />
    </>
  );
}
