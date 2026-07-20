"use client";

import { useState, useEffect } from "react";
import PillNav from "./PillNav";

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sections = ["vantagens", "funcionalidades", "planos", "faq"];
    
    const handleScroll = () => {
      let currentSection = "";
      const scrollPosition = window.scrollY + 200; // offset for early detection

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSection = `#${section}`;
            break;
          }
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // run once on mount

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const items = [
    { label: "Vantagens", href: "#vantagens" },
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Planos", href: "#planos" },
    { label: "FAQ", href: "#faq" },
    { label: "Entrar", href: "/login" },
  ];

  return (
    <PillNav
      logo="/logo.png"
      logoAlt="Lexon Agenda"
      items={items}
      activeHref={activeSection}
      ease="power2.easeOut"
      baseColor="rgba(9, 11, 17, 0.85)" // matches landing page slate bg with dark glassmorphism
      pillColor="rgba(255, 255, 255, 0.03)" // subtle transparent white border/fill for pills
      pillTextColor="#94A3B8" // muted slate text
      hoveredPillTextColor="#FFFFFF" // clean white on hover
      initialLoadAnimation={true}
    />
  );
}
