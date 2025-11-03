import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  fallbackPath: string;
  children?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

const BackLink: React.FC<BackLinkProps> = ({ fallbackPath, children, className, ariaLabel }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={
        className ||
        "inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
      aria-label={ariaLabel || `Go back from ${location.pathname}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{children ?? "Back"}</span>
    </button>
  );
};

export default BackLink;