import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  fallbackPath: string;
  className?: string;
  ariaLabel?: string;
};

const BackButton: React.FC<BackButtonProps> = ({ fallbackPath, className, ariaLabel }) => {
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
    <Button
      variant="ghost"
      size="icon"
      onClick={goBack}
      className={className}
      aria-label={ariaLabel || `Go back from ${location.pathname}`}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
};

export default BackButton;