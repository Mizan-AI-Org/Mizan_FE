import React from "react";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
};

const sizeMap = {
  sm: { outer: "w-10 h-10", inner: "w-6 h-6", dot: "w-3 h-3" },
  md: { outer: "w-12 h-12", inner: "w-6 h-6", dot: "w-3 h-3" },
  lg: { outer: "w-16 h-16", inner: "w-8 h-8", dot: "w-4 h-4" },
};

const BrandLogo: React.FC<BrandLogoProps> = ({ size = "sm", className, ariaLabel }) => {
  const s = sizeMap[size];
  return (
    <div
      className={`inline-flex items-center justify-center ${s.outer} rounded-full bg-[#00E676] shadow-lg pointer-events-none select-none cursor-default ${className || ""}`}
      aria-label={ariaLabel || "Mizan AI brand logo"}
    >
      <div className={`bg-white rounded-full flex items-center justify-center ${s.inner}`}>
        <div className={`bg-[#00E676] rounded-full ${s.dot}`} />
      </div>
    </div>
  );
};

export default BrandLogo;