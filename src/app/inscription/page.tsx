"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function InscriptionPage() {
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [cloverClickCount, setCloverClickCount] = useState(0);
  const [cloverLastClickAt, setCloverLastClickAt] = useState(0);
  const [pageTitle, setPageTitle] = useState("Mookup");
  const navBurgerRef = useRef<HTMLButtonElement>(null);
  const navMobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!burgerOpen) return;
      if (
        navBurgerRef.current?.contains(event.target as Node) ||
        navMobileMenuRef.current?.contains(event.target as Node)
      )
        return;
      setBurgerOpen(false);
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [burgerOpen]);

  function handleCloverClick() {
    const now = Date.now();
    const newCount =
      now - cloverLastClickAt > 1500 ? 1 : cloverClickCount + 1;
    setCloverLastClickAt(now);
    setCloverClickCount(newCount);
    if (newCount >= 10) {
      setPageTitle("I'm Feeling Lucky - Mookup");
    }
  }

  return (
    <>
      <style>{`
        html, body { height: 100%; margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f2f3f4;
          color: #2c2e33;
        }
        @media (prefers-color-scheme: dark) {
          html { color-scheme: dark; }
          body { background-color: #202225; color: #eceeef; }
        }
      `}
      </style>

      <div className="public-shell public-registration">
      {/* ===== HEADER ===== */}
      <div className="public-hero"
        style={{
          backgroundColor: "#5046e5",
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* Decorative shapes */}
        {[
          { cls: "circle", s: { width: 22, height: 22, top: "12%", left: "7%" } },
          { cls: "square", s: { width: 24, height: 24, top: "9%", right: "9%", transform: "rotate(15deg)" } },
          { cls: "cross",  s: { width: 26, height: 26, top: "45%", left: "4%" } },
          { cls: "circle", s: { width: 14, height: 14, top: "30%", right: "16%" } },
          { cls: "square", s: { width: 12, height: 12, bottom: "42%", left: "16%" } },
          { cls: "cross",  s: { width: 24, height: 24, top: "55%", right: "6%", transform: "rotate(10deg)" } },
          { cls: "circle", s: { width: 18, height: 18, bottom: "6%", left: "3%" } },
          { cls: "square", s: { width: 16, height: 16, bottom: "8%", right: "15%", transform: "rotate(-12deg)" } },
        ].map((shape, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              opacity: 0.45,
              ...(shape.cls === "circle" ? { borderRadius: "50%", background: "#fff" } : {}),
              ...(shape.cls === "square" ? { borderRadius: 6, background: "#fff" } : {}),
              ...(shape.cls === "cross"  ? { background: "none" } : {}),
              ...shape.s,
            }}
          />
        ))}

        {/* NAV */}
        <nav
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "20px 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a
              href="https://mookup.me"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <Image src="/Logo.png" alt="Mookup" width={32} height={32} style={{ display: "block" }} />
              <span
                style={{
                  color: "#ffffff",
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontWeight: 800,
                  fontSize: "1.1em",
                  letterSpacing: "0.02em",
                }}
              >
                Mookup
              </span>
            </a>
          </div>

          {/* Desktop right */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 18 }}
            className="nav-right-desktop"
          >
            <a
              href="https://discord.gg/kCVUFFcSta"
              target="_blank"
              rel="noopener"
              title="Rejoindre le Discord"
              style={{ color: "#fff", fontSize: 22, opacity: 0.9, textDecoration: "none" }}
            >
              <i className="fa-brands fa-discord" />
            </a>
          </div>

          {/* Burger */}
          <button
            ref={navBurgerRef}
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={burgerOpen}
            onClick={() => setBurgerOpen((v) => !v)}
            style={{
              display: "none",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: 40,
              height: 40,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            className="nav-burger"
          >
            <span style={{ display: "block", width: 22, height: 2.5, borderRadius: 2, background: "#fff" }} />
            <span style={{ display: "block", width: 22, height: 2.5, borderRadius: 2, background: "#fff" }} />
            <span style={{ display: "block", width: 22, height: 2.5, borderRadius: 2, background: "#fff" }} />
          </button>
        </nav>

        {/* Mobile menu */}
        {burgerOpen && (
          <div
            ref={navMobileMenuRef}
            style={{
              position: "absolute",
              top: 72,
              right: 32,
              left: 32,
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "#5046e5",
              border: "1.5px solid rgba(255,255,255,0.25)",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            }}
          >
            <a
              href="https://discord.gg/kCVUFFcSta"
              target="_blank"
              rel="noopener"
              style={{
                color: "#fff",
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "1em",
                fontWeight: 400,
              }}
            >
              Notre communauté Discord
            </a>
          </div>
        )}

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            minHeight: "calc(100vh - 72px)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              margin: "6vh 24px 0",
              maxWidth: 780,
              textAlign: "center",
              color: "#ffffff",
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8em, 4vw, 2.8em)",
              lineHeight: 1.25,
            }}
          >
            Votre espace cozy
          </h1>
          <p
            style={{
              margin: "14px 24px 0",
              maxWidth: 560,
              textAlign: "center",
              color: "#c7c6fb",
              fontWeight: 400,
              fontSize: "1em",
              lineHeight: 1.5,
            }}
          >
            Découvrez une nouvelle manière d&apos;interagir avec vos communautés : des threads nouvelle génération, pensés pour des échanges plus vivants.
          </p>
          <div style={{ margin: "34px 24px 0", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#e4e4e4",
                color: "#9a9a9a",
                fontWeight: 600,
                fontSize: "1.05em",
                padding: "14px 26px",
                borderRadius: 8,
                border: "none",
                cursor: "default",
                opacity: 0.5,
                filter: "grayscale(100%)",
                pointerEvents: "none",
              }}
            >
              Prochainement
            </button>
          </div>

          {/* Illustration */}
          <div
            style={{
              position: "relative",
              marginTop: "auto",
              width: "min(1050px, 96vw)",
            }}
          >
            <div style={{ overflow: "hidden", aspectRatio: "1000 / 474" }}>
              <Image
                src="/app-skeleton.svg"
                alt=""
                width={1050}
                height={497}
                style={{ display: "block", width: "100%", height: "auto", marginTop: "-10%" }}
              />
            </div>

            {/* Four-leaf clover SVG */}
            <svg
              style={{
                position: "absolute",
                right: "6%",
                bottom: "50%",
                transform: "translateY(115px)",
                width: "min(140px, 11vw)",
                aspectRatio: "1 / 1",
                zIndex: 1,
                pointerEvents: "none",
              }}
              viewBox="0 0 400 400"
              width="100%"
              height="100%"
              role="img"
              aria-hidden="true"
            >
              <defs>
                <g id="single-leaf">
                  <path
                    d="M 0 0 C -25 -35, -55 -30, -55 5 C -55 35, -20 48, 0 65 C 20 48, 55 35, 55 5 C 55 -30, 25 -35, 0 0 Z"
                    fill="#42cf00"
                    stroke="#1d5c00"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                  <path d="M 0 15 Q -2 35 0 55" fill="none" stroke="#1d5c00" strokeWidth="4" strokeLinecap="round" />
                </g>
              </defs>
              <g
                id="four-leaf-clover"
                onClick={handleCloverClick}
                style={{ cursor: "pointer", pointerEvents: "visiblePainted" }}
              >
                <path
                  d="M 194 205 Q 175 295 240 345 Q 246 348 251 340 Q 193 290 206 205 Z"
                  fill="#42cf00"
                  stroke="#1d5c00"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <use href="#single-leaf" transform="translate(200, 145) rotate(0)" />
                <use href="#single-leaf" transform="translate(255, 200) rotate(90)" />
                <use href="#single-leaf" transform="translate(200, 255) rotate(180)" />
                <use href="#single-leaf" transform="translate(145, 200) rotate(270)" />
                <circle cx="200" cy="200" r="14" fill="#42cf00" stroke="#1d5c00" strokeWidth="3" />
              </g>
            </svg>
          </div>
        </div>
      </div>
      {/* ===== END HEADER ===== */}

      {/* ===== SECTION 1 – Post card ===== */}
      <section className="public-section" style={{ backgroundColor: "#ffffff", minHeight: "10vh" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "140px 32px",
            display: "flex",
            alignItems: "center",
            gap: 110,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", justifyContent: "center" }}>
            <Image
              src="/post_card.svg"
              alt="Aperçu d'un fil de posts sur Mookup"
              width={420}
              height={420}
              style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }}
            />
          </div>
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2.2em, 4vw, 3.2em)",
                lineHeight: 1.2,
                margin: "0 0 20px",
                color: "#111214",
              }}
            >
              Des échanges<br />qui prennent<br />leur temps
            </h2>
            <p style={{ fontSize: "1.05em", lineHeight: 1.6, color: "#111214", margin: 0 }}>
              Oubliez le flux de messages qui défile sans fin et se perd aussitôt. Chaque post est un espace de discussion indépendant, plus facile à retrouver, plus facile à faire vivre dans la durée.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2 – Profile privacy (muted bg) ===== */}
      <section className="public-section-muted" style={{ backgroundColor: "#f0f1f3", position: "relative" }}>
        {/* Wave */}
        <svg
          style={{ position: "absolute", top: -69, left: 0, width: "100%", height: 70, display: "block" }}
          viewBox="0 0 1200 70"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z"
            fill="#f0f1f3"
          />
        </svg>

        {/* Muted shapes */}
        {[
          { cls: "circle", s: { width: 20, height: 20, top: "10%", left: "6%" } },
          { cls: "square", s: { width: 22, height: 22, top: "14%", right: "8%", transform: "rotate(12deg)" } },
          { cls: "cross",  s: { width: 24, height: 24, bottom: "12%", left: "10%", transform: "rotate(-8deg)" } },
          { cls: "circle", s: { width: 16, height: 16, top: "55%", right: "5%" } },
          { cls: "square", s: { width: 18, height: 18, bottom: "16%", right: "20%", transform: "rotate(20deg)" } },
          { cls: "cross",  s: { width: 14, height: 14, top: "60%", left: "4%" } },
        ].map((shape, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              opacity: 0.45,
              ...(shape.cls === "circle" ? { borderRadius: "50%", background: "#9a9ea8" } : {}),
              ...(shape.cls === "square" ? { borderRadius: 6, background: "#9a9ea8" } : {}),
              ...(shape.cls === "cross"  ? { background: "none" } : {}),
              ...shape.s,
            }}
          />
        ))}

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "140px 32px",
            display: "flex",
            alignItems: "center",
            gap: 110,
            flexWrap: "wrap",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Reverse: text first on desktop */}
          <div style={{ flex: "1 1 420px", minWidth: 0, order: 1 }}>
            <h2
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2.2em, 4vw, 3.2em)",
                lineHeight: 1.2,
                margin: "0 0 20px",
                color: "#111214",
              }}
            >
              Votre espace,<br />vos règles
            </h2>
            <p style={{ fontSize: "1.05em", lineHeight: 1.6, color: "#111214", margin: 0 }}>
              Définissez vos propres règles de confidentialité et contrôlez qui peut voir vos publications et interagir avec elles.
            </p>
          </div>
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", justifyContent: "center", order: 2 }}>
            <Image
              src="/profile-privacy.svg"
              alt="Aperçu d'un profil Mookup et de son contrôle de confidentialité"
              width={420}
              height={420}
              style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }}
            />
          </div>
        </div>
      </section>

      {/* ===== SECTION 3 – Personnalisation ===== */}
      <section className="public-section" style={{ backgroundColor: "#ffffff", position: "relative" }}>
        <svg
          style={{ position: "absolute", top: -69, left: 0, width: "100%", height: 70, display: "block" }}
          viewBox="0 0 1200 70"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z"
            fill="#ffffff"
          />
        </svg>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "180px 32px",
            display: "flex",
            alignItems: "center",
            gap: 140,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", justifyContent: "center" }}>
            <Image
              src="/personnalisation.svg"
              alt="Aperçu d'une communauté personnalisée sur Mookup"
              width={420}
              height={420}
              style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }}
            />
          </div>
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2.2em, 4vw, 3.2em)",
                lineHeight: 1.2,
                margin: "0 0 20px",
                color: "#111214",
              }}
            >
              Communautés<br />à votre image
            </h2>
            <p style={{ fontSize: "1.05em", lineHeight: 1.6, color: "#111214", margin: 0 }}>
              Créez une communauté sur le thème de votre choix, personnalisez sa bannière et son icône, et lancez-la en quelques clics.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="public-section-muted" style={{ backgroundColor: "#f0f1f3", position: "relative", padding: "140px 32px", textAlign: "center" }}>
        <svg
          style={{ position: "absolute", top: -69, left: 0, width: "100%", height: 70, display: "block" }}
          viewBox="0 0 1200 70"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 40 C 150 10, 300 60, 450 45 C 650 25, 750 5, 950 30 C 1050 42, 1150 50, 1200 35 L1200 70 L0 70 Z"
            fill="#f0f1f3"
          />
        </svg>

        {/* CTA decorative shapes */}
        {[
          { cls: "square", s: { width: 26, height: 26, top: "10%", left: "8%", background: "#fbcfe8", transform: "rotate(10deg)" } },
          { cls: "cross",  s: { width: 20, height: 20, top: "22%", left: "16%" } },
          { cls: "square", s: { width: 22, height: 22, top: "14%", right: "22%", background: "#99f6e4", transform: "rotate(-14deg)" } },
          { cls: "cross",  s: { width: 26, height: 26, top: "18%", right: "8%", transform: "rotate(8deg)" } },
          { cls: "square", s: { width: 20, height: 20, top: "62%", left: "12%", background: "#fed7aa", transform: "rotate(18deg)" } },
          { cls: "cross",  s: { width: 24, height: 24, top: "70%", left: "22%" } },
          { cls: "square", s: { width: 18, height: 18, top: "60%", right: "18%", background: "#fde68a", transform: "rotate(-8deg)" } },
          { cls: "cross",  s: { width: 26, height: 26, top: "68%", right: "8%", transform: "rotate(15deg)" } },
          { cls: "cross",  s: { width: 18, height: 18, top: "40%", left: "4%", transform: "rotate(-20deg)" } },
          { cls: "square", s: { width: 20, height: 20, top: "42%", right: "5%", background: "#ddd6fe", transform: "rotate(-6deg)" } },
        ].map((shape, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              opacity: 0.85,
              ...(shape.cls === "square" ? { borderRadius: 8 } : {}),
              ...(shape.cls === "cross"  ? { background: "none" } : {}),
              ...shape.s,
            }}
          />
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2.2em, 4vw, 3.2em)",
              lineHeight: 1.2,
              margin: 0,
              color: "#111214",
            }}
          >
            Prêt à commencer ?
          </h2>
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#e4e4e4",
              color: "#9a9a9a",
              fontWeight: 600,
              fontSize: "1.05em",
              padding: "14px 28px",
              borderRadius: 8,
              border: "none",
              cursor: "default",
              marginTop: 36,
              opacity: 0.5,
              filter: "grayscale(100%)",
              pointerEvents: "none",
            }}
          >
            Prochainement
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="public-footer" style={{ backgroundColor: "#1a1a1a", padding: "24px 32px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            color: "#787c84",
            fontSize: "0.85em",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px" }}>
            <a href="/politique-confidentialite?from=inscription" style={{ color: "inherit", textDecoration: "none" }}>Politique de confidentialité</a>
            <a href="/conditions-utilisation?from=inscription" style={{ color: "inherit", textDecoration: "none" }}>Conditions d&apos;utilisation</a>
            <a href="/cookies?from=inscription" style={{ color: "inherit", textDecoration: "none" }}>Cookies</a>
          </div>
          <div style={{ marginTop: 10 }}>© 2026 Mookup. Tous droits réservés.</div>
        </div>
      </footer>
      </div>

      {/* Font Awesome CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
    </>
  );
}
