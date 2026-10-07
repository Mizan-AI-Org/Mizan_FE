import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("errors.not_found.title")}</h1>
        <p className="mb-4 text-xl text-gray-600">{t("errors.not_found.message")}</p>
        <Link to="/" className="text-blue-500 underline hover:text-blue-700">
          {t("errors.not_found.home")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
