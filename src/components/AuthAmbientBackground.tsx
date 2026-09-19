import React from "react";

/** Aurora / glow backdrop for the auth left panel — always dark. */
export const AuthAmbientBackground: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute inset-0 bg-[#060809]" />
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a1018] via-[#070b10] to-[#050608]" />

    <div
      className="absolute inset-0 opacity-100"
      style={{
        background: [
          "radial-gradient(ellipse 720px 560px at 88% 4%, rgba(0, 230, 118, 0.28), transparent 58%)",
          "radial-gradient(ellipse 520px 420px at 12% 8%, rgba(0, 230, 118, 0.14), transparent 52%)",
          "radial-gradient(ellipse 640px 480px at -8% 42%, rgba(251, 191, 36, 0.16), transparent 55%)",
          "radial-gradient(ellipse 400px 320px at 70% 88%, rgba(0, 180, 100, 0.08), transparent 60%)",
        ].join(", "),
      }}
    />

    <div className="auth-aurora-orb absolute -right-16 -top-20 h-[22rem] w-[22rem] rounded-full bg-[#00E676]/20 blur-[80px]" />
    <div className="auth-aurora-orb auth-aurora-orb-delay absolute -left-28 top-[28%] h-[20rem] w-[20rem] rounded-full bg-amber-400/18 blur-[90px]" />
    <div className="auth-aurora-orb auth-aurora-orb-delay-2 absolute bottom-[-6rem] left-[20%] h-64 w-64 rounded-full bg-[#00C853]/12 blur-[70px]" />

    <div className="auth-noise absolute inset-0 opacity-[0.045]" />

    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
      }}
    />

    <div className="absolute inset-0 bg-gradient-to-t from-[#040506] via-transparent to-[#040506]/40" />
    <div className="absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-l from-[#0A0D10] to-transparent lg:block" />
  </div>
);

export const authGlassCardClass =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:p-8";

export const authGlassTabsClass =
  "mb-6 flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl";

export const authFieldClass =
  "bg-black/30 border border-white/[0.08] focus:border-[#00E676]/70 text-white placeholder:text-[#94A3B8] rounded-lg backdrop-blur-md transition-all duration-300 focus:shadow-[0_0_0_1px_rgba(0,230,118,0.35),0_0_20px_rgba(0,230,118,0.12)]";
