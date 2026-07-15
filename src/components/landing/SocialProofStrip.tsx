"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const segments = [
  { image: "/landing/barbershop_premium.jpg", label: "Barbearias" },
  { image: "/landing/clinic_premium.jpg", label: "Clínicas" },
  { image: "/landing/salon_premium.jpg", label: "Salões" },
  { image: "/landing/gym_premium.jpg", label: "Personal Trainers" },
  { image: "/landing/office_premium.jpg", label: "Consultórios" },
  { image: "/landing/studio_premium.jpg", label: "Estúdios" },
];

export default function SocialProofStrip() {
  return (
    <section className="py-20 border-t border-landing-border/40 relative overflow-hidden section-alt">
      <div className="max-w-[100vw] mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm font-bold text-landing-text-muted tracking-widest uppercase mb-12"
        >
          Para todo tipo de negócio de serviços
        </motion.p>

        {/* Marquee Container */}
        <div className="marquee-container group">
          <div className="marquee-content">
            {/* Duplicating the array to create an infinite scroll effect */}
            {[...segments, ...segments, ...segments].map((seg, i) => (
              <div
                key={`${seg.label}-${i}`}
                className="relative flex flex-col justify-end w-72 h-96 rounded-[1.5rem] overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 group/card cursor-pointer"
              >
                {/* Background Image */}
                <Image
                  src={seg.image}
                  alt={seg.label}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                />
                
                {/* Overlay Gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent transition-opacity duration-300 group-hover/card:opacity-90" />
                
                {/* Glassmorphism Bottom Panel */}
                <div className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-md bg-white/10 border-t border-white/20">
                  <h3 className="text-xl font-bold text-white tracking-wide flex items-center justify-between">
                    {seg.label}
                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 -translate-x-4 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:translate-x-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
