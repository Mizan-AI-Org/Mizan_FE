import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import BrandLogo from "@/components/BrandLogo";
import { AuthLanguagePicker } from "@/components/AuthLanguagePicker";
import { LEGAL_CONTACT, legalDocument, type LegalKind } from "./legalContent";

/** Public Terms of Use / Privacy Policy page (/legal/terms, /legal/privacy), in the visitor's language. */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, language } = useLanguage();
  const doc = legalDocument(kind, language);
  const other: LegalKind = kind === "terms" ? "privacy" : "terms";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/auth" aria-label={t("legal.back_to_app")}>
            <BrandLogo />
          </Link>
          <AuthLanguagePicker />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{doc.updated}</p>
        <p className="mt-6 leading-relaxed">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.paragraphs.map((text, i) => (
              <p key={i} className="mt-2 leading-relaxed text-foreground/90">
                {text}
              </p>
            ))}
          </section>
        ))}
        <footer className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-6 text-sm">
          <Link to={`/legal/${other}`} className="font-medium underline underline-offset-2">
            {other === "terms" ? t("auth.footer.terms_of_use") : t("auth.footer.privacy")}
          </Link>
          <a href={`mailto:${LEGAL_CONTACT.support}`} className="text-muted-foreground underline underline-offset-2">
            {LEGAL_CONTACT.support}
          </a>
          <Link to="/auth" className="text-muted-foreground underline underline-offset-2">
            {t("legal.back_to_app")}
          </Link>
        </footer>
      </main>
    </div>
  );
}
