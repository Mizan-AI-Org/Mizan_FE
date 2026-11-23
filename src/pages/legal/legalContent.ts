/*
 * DRAFT — TO BE REVIEWED BY LEGAL before launch.
 * Professional template for the Terms of Use and the Privacy Policy. The owner of the business behind Mizan must
 * have a lawyer (Moroccan law 09-08 / CNDP, GDPR for EU users) check and complete the text, then bump LEGAL_VERSION
 * in src/lib/accountErrors.ts and LEGAL_TERMS_VERSION in the backend settings together. Do NOT show a "draft"
 * marker on the page itself: this comment is the only marker.
 * Things to confirm: legal entity name and address, contact addresses (privacy@ / support@ heymizan.ai), retention
 * periods, CNDP authorisation numbers for geolocation and selfies, subprocessors list, governing law and courts.
 */
export type LegalLang = "en" | "fr" | "ar";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = "terms" | "privacy";

export const LEGAL_CONTACT = { privacy: "privacy@heymizan.ai", support: "support@heymizan.ai" };

const TERMS_EN: LegalDocument = {
  title: "Terms of Use",
  updated: "Version 2026-11-12",
  intro:
    "These terms govern your use of Mizan AI (\"Mizan\"), the operations assistant for restaurants and other businesses, " +
    "available on the web and on WhatsApp. By creating an account you accept them together with the Privacy Policy.",
  sections: [
    {
      heading: "1. The service",
      paragraphs: [
        "Mizan lets a business manage its team, schedules, tasks, incidents, inventory, purchasing, invoices and approvals, and talk to its assistant Miya on the web and on WhatsApp. Modules can be added or removed; some are optional and billed separately.",
        "Miya prepares actions and asks for confirmation before changing business data. You stay responsible for what you confirm.",
      ],
    },
    {
      heading: "2. Your account",
      paragraphs: [
        "The person who creates the business account is its owner and declares being authorised to act for the business. You must give accurate information, keep your password confidential and keep your WhatsApp number up to date: it receives sign-in codes and password-reset links.",
        "The owner decides who joins the business, with which role, and is responsible for the people they add, including informing them as described in the Privacy Policy.",
      ],
    },
    {
      heading: "3. Acceptable use",
      paragraphs: [
        "You will not use Mizan to break the law, send spam or unsolicited messages, harass anyone, upload malicious files, probe or overload the service, or access data of another business.",
        "You must have the right to message the people you add on WhatsApp and to collect the data you record in Mizan, including staff selfies and location for clock-in.",
      ],
    },
    {
      heading: "4. Plans, trial and payment",
      paragraphs: [
        "A new business starts with a free trial. After the trial, the modules you use are invoiced per billing period at the prices shown in the app, by bank transfer or the payment methods offered. Invoices are issued in Moroccan dirhams unless stated otherwise and are due on the date shown.",
        "Unpaid invoices may lead to paused modules. You can close the business at any time (see section 8).",
      ],
    },
    {
      heading: "5. Your data",
      paragraphs: [
        "The business data you put in Mizan belongs to you. You give Mizan the right to host and process it only to provide the service, as described in the Privacy Policy. The owner can export all of it at any time from Settings and can ask Miya for it.",
      ],
    },
    {
      heading: "6. Availability and AI",
      paragraphs: [
        "We work to keep Mizan available but do not guarantee uninterrupted service. WhatsApp delivery depends on Meta and on the recipient's phone. Answers from Miya come from an AI model and can be wrong: check important figures and decisions.",
      ],
    },
    {
      heading: "7. Liability",
      paragraphs: [
        "To the extent permitted by law, Mizan is not liable for indirect losses, lost profits, or decisions taken on the basis of information produced by the service. Our total liability for a claim is limited to the amounts you paid in the 12 months before it. Nothing here limits liability that cannot be limited by law.",
      ],
    },
    {
      heading: "8. Closing the business and ending the contract",
      paragraphs: [
        "The owner can close the business from Settings. Sign-ins, billing and WhatsApp messages stop immediately; the data is kept for 30 days so the owner can still export it or ask us to reopen the business, then it is permanently deleted. Invoices issued by Mizan are kept as long as accounting law requires.",
        "We may suspend or end an account that breaks these terms, after notice when possible.",
      ],
    },
    {
      heading: "9. Changes",
      paragraphs: [
        "We may update these terms. When we do, the version date changes and you are asked to accept the new version. If you disagree, you can close the business.",
      ],
    },
    {
      heading: "10. Governing law and contact",
      paragraphs: [
        "These terms are governed by Moroccan law. Disputes go to the competent courts of Casablanca, unless mandatory consumer law says otherwise. Questions: " +
          LEGAL_CONTACT.support +
          ".",
      ],
    },
  ],
};

const PRIVACY_EN: LegalDocument = {
  title: "Privacy Policy",
  updated: "Version 2026-11-12",
  intro:
    "This policy explains what personal data Mizan processes, why, for how long, and what rights you have under Moroccan law 09-08 (CNDP) and, for people in the European Union, the GDPR.",
  sections: [
    {
      heading: "1. Who is responsible",
      paragraphs: [
        "For the data of a business's team and activity, the business (the owner) decides why and how it is used: it is the data controller, and Mizan acts as its processor. For account, billing and service-security data of the owner, Mizan is the controller. Contact: " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
    {
      heading: "2. Data we process",
      paragraphs: [
        "Account data: name, email, WhatsApp number, role, language, password (stored hashed).",
        "Team and payroll data: staff names, phone numbers, schedules, hours worked, timesheets, absences and justifications, payslips and pay information, notes and documents added by managers.",
        "Clock-in data: when staff clock in or out, their location at that moment, and a live selfie taken to prove presence. The selfie and the location are used only to check presence at the workplace and for review by managers.",
        "WhatsApp messages: messages, voice notes, photos and documents sent to or received from Miya and Mizan, and delivery status.",
        "Operations data: tasks, checklists, incidents with photos, inventory, suppliers, purchase orders, invoices, approvals, reservations.",
        "Technical data: IP address, device and browser information, sign-in and security logs, used to secure the service.",
      ],
    },
    {
      heading: "3. Why and on what basis",
      paragraphs: [
        "To provide the service you asked for (contract); to secure it and prevent fraud (legitimate interest); to meet accounting and legal duties (legal obligation); and, for geolocation and selfies, on the basis of the business's legitimate interest in checking attendance and, where the law requires it, the consent of the person concerned and the CNDP authorisation obtained by the business.",
        "Employers must inform their staff before using clock-in selfies and location, and obtain any authorisation required in their country. Mizan shows staff a notice when they first clock in.",
      ],
    },
    {
      heading: "4. Who receives data",
      paragraphs: [
        "Only the business's authorised users see its data. We use service providers to run Mizan: cloud hosting, the WhatsApp Business platform (Meta), AI model providers that process the text of conversations to answer, and email delivery. They process data on our instructions. Data may be processed outside Morocco and the EU with appropriate safeguards. We do not sell personal data.",
      ],
    },
    {
      heading: "5. How long we keep it",
      paragraphs: [
        "Clock-in selfies: 90 days, then deleted (the record that a clock-in happened is kept). Business data: as long as the business is active. When the owner closes the business, access stops at once and all business data is permanently deleted after 30 days. Mizan's own invoices and accounting records: as required by accounting law (up to 10 years). Security logs: up to 12 months.",
      ],
    },
    {
      heading: "6. Security",
      paragraphs: [
        "Passwords and reset tokens are stored hashed, links to uploaded files are signed and expire, access is limited by role and by business, and connections are encrypted. No system is perfectly secure; we will notify you of a breach affecting your data as the law requires.",
      ],
    },
    {
      heading: "7. Your rights",
      paragraphs: [
        "You can ask to access, correct, delete, restrict or export your personal data, and object to certain uses. Business owners can export all business data from Settings and close the business. Staff can ask their employer or write to " +
          LEGAL_CONTACT.privacy +
          ". In Morocco you may also contact the CNDP; in the EU, your data protection authority.",
      ],
    },
    {
      heading: "8. Children",
      paragraphs: ["Mizan is for businesses and their staff. It is not intended for people under 16."],
    },
    {
      heading: "9. Changes and contact",
      paragraphs: [
        "When this policy changes, its version date changes and we ask you to accept the new version. Questions or requests: " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
  ],
};

const TERMS_FR: LegalDocument = {
  title: "Conditions d'utilisation",
  updated: "Version 2026-11-12",
  intro:
    "Les présentes conditions régissent votre utilisation de Mizan AI (« Mizan »), l'assistant d'exploitation des restaurants et autres entreprises, disponible sur le web et sur WhatsApp. En créant un compte, vous les acceptez avec la Politique de confidentialité.",
  sections: [
    {
      heading: "1. Le service",
      paragraphs: [
        "Mizan permet à une entreprise de gérer son équipe, ses plannings, tâches, incidents, stocks, achats, factures et validations, et de dialoguer avec son assistante Miya sur le web et sur WhatsApp. Des modules peuvent être ajoutés ou retirés ; certains sont optionnels et facturés séparément.",
        "Miya prépare des actions et demande une confirmation avant de modifier les données de l'entreprise. Vous restez responsable de ce que vous confirmez.",
      ],
    },
    {
      heading: "2. Votre compte",
      paragraphs: [
        "La personne qui crée le compte de l'entreprise en est le propriétaire et déclare être autorisée à agir pour elle. Vous devez fournir des informations exactes, garder votre mot de passe confidentiel et tenir à jour votre numéro WhatsApp : il reçoit les codes de connexion et les liens de réinitialisation.",
        "Le propriétaire décide qui rejoint l'entreprise et avec quel rôle ; il est responsable des personnes qu'il ajoute, y compris de les informer comme décrit dans la Politique de confidentialité.",
      ],
    },
    {
      heading: "3. Utilisation acceptable",
      paragraphs: [
        "Vous n'utiliserez pas Mizan pour enfreindre la loi, envoyer du spam ou des messages non sollicités, harceler, téléverser des fichiers malveillants, sonder ou surcharger le service, ou accéder aux données d'une autre entreprise.",
        "Vous devez avoir le droit d'écrire sur WhatsApp aux personnes que vous ajoutez et de collecter les données enregistrées dans Mizan, y compris les selfies et la localisation des pointages.",
      ],
    },
    {
      heading: "4. Offres, essai et paiement",
      paragraphs: [
        "Toute nouvelle entreprise commence par un essai gratuit. Ensuite, les modules utilisés sont facturés par période aux prix affichés dans l'application, par virement ou par les moyens de paiement proposés. Les factures sont émises en dirhams marocains sauf indication contraire et sont payables à la date indiquée.",
        "Des factures impayées peuvent entraîner la mise en pause de modules. Vous pouvez fermer l'entreprise à tout moment (article 8).",
      ],
    },
    {
      heading: "5. Vos données",
      paragraphs: [
        "Les données de l'entreprise saisies dans Mizan vous appartiennent. Vous autorisez Mizan à les héberger et les traiter uniquement pour fournir le service, comme décrit dans la Politique de confidentialité. Le propriétaire peut tout exporter à tout moment depuis les Paramètres et le demander à Miya.",
      ],
    },
    {
      heading: "6. Disponibilité et IA",
      paragraphs: [
        "Nous veillons à la disponibilité de Mizan sans garantir un service ininterrompu. La livraison WhatsApp dépend de Meta et du téléphone du destinataire. Les réponses de Miya proviennent d'un modèle d'IA et peuvent être inexactes : vérifiez les chiffres et décisions importants.",
      ],
    },
    {
      heading: "7. Responsabilité",
      paragraphs: [
        "Dans la mesure permise par la loi, Mizan n'est pas responsable des pertes indirectes, des manques à gagner ni des décisions prises sur la base d'informations produites par le service. Notre responsabilité totale pour une réclamation est limitée aux sommes payées dans les 12 mois précédents. Rien ici ne limite une responsabilité qui ne peut l'être légalement.",
      ],
    },
    {
      heading: "8. Fermeture de l'entreprise et fin du contrat",
      paragraphs: [
        "Le propriétaire peut fermer l'entreprise depuis les Paramètres. Les connexions, la facturation et les messages WhatsApp s'arrêtent immédiatement ; les données sont conservées 30 jours pour permettre un export ou une réouverture sur demande, puis supprimées définitivement. Les factures émises par Mizan sont conservées aussi longtemps que la loi comptable l'exige.",
        "Nous pouvons suspendre ou clôturer un compte qui enfreint ces conditions, avec préavis lorsque c'est possible.",
      ],
    },
    {
      heading: "9. Modifications",
      paragraphs: [
        "Nous pouvons mettre à jour ces conditions. La date de version change alors et il vous est demandé d'accepter la nouvelle version. En cas de désaccord, vous pouvez fermer l'entreprise.",
      ],
    },
    {
      heading: "10. Droit applicable et contact",
      paragraphs: [
        "Ces conditions sont régies par le droit marocain. Les litiges relèvent des tribunaux compétents de Casablanca, sauf disposition impérative contraire. Questions : " +
          LEGAL_CONTACT.support +
          ".",
      ],
    },
  ],
};

const PRIVACY_FR: LegalDocument = {
  title: "Politique de confidentialité",
  updated: "Version 2026-11-12",
  intro:
    "Cette politique explique quelles données personnelles Mizan traite, pourquoi, pendant combien de temps, et vos droits au titre de la loi marocaine 09-08 (CNDP) et, pour les personnes dans l'Union européenne, du RGPD.",
  sections: [
    {
      heading: "1. Responsable du traitement",
      paragraphs: [
        "Pour les données de l'équipe et de l'activité d'une entreprise, c'est l'entreprise (le propriétaire) qui décide des finalités et moyens : elle est responsable du traitement et Mizan agit comme sous-traitant. Pour les données de compte, de facturation et de sécurité du propriétaire, Mizan est responsable du traitement. Contact : " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
    {
      heading: "2. Données traitées",
      paragraphs: [
        "Compte : nom, email, numéro WhatsApp, rôle, langue, mot de passe (stocké haché).",
        "Équipe et paie : noms, numéros de téléphone, plannings, heures travaillées, feuilles d'heures, absences et justificatifs, bulletins et informations de paie, notes et documents ajoutés par les managers.",
        "Pointage : heure d'arrivée ou de départ, localisation à ce moment et selfie pris en direct pour prouver la présence. Le selfie et la localisation servent uniquement à vérifier la présence sur le lieu de travail et à la revue par les managers.",
        "Messages WhatsApp : messages, notes vocales, photos et documents échangés avec Miya et Mizan, et statuts de livraison.",
        "Exploitation : tâches, checklists, incidents avec photos, stocks, fournisseurs, commandes, factures, validations, réservations.",
        "Données techniques : adresse IP, appareil et navigateur, journaux de connexion et de sécurité, pour sécuriser le service.",
      ],
    },
    {
      heading: "3. Finalités et bases",
      paragraphs: [
        "Fournir le service demandé (contrat) ; le sécuriser et prévenir la fraude (intérêt légitime) ; respecter les obligations comptables et légales (obligation légale) ; et, pour la localisation et les selfies, l'intérêt légitime de l'entreprise à contrôler la présence et, lorsque la loi l'exige, le consentement de la personne concernée et l'autorisation de la CNDP obtenue par l'entreprise.",
        "Les employeurs doivent informer leur personnel avant d'utiliser les selfies et la localisation de pointage et obtenir les autorisations requises dans leur pays. Mizan affiche une information au personnel lors du premier pointage.",
      ],
    },
    {
      heading: "4. Destinataires",
      paragraphs: [
        "Seuls les utilisateurs autorisés de l'entreprise voient ses données. Nous recourons à des prestataires pour faire fonctionner Mizan : hébergement cloud, plateforme WhatsApp Business (Meta), fournisseurs de modèles d'IA qui traitent le texte des conversations pour répondre, et envoi d'emails. Ils traitent les données sur nos instructions. Des données peuvent être traitées hors du Maroc et de l'UE avec des garanties appropriées. Nous ne vendons pas de données personnelles.",
      ],
    },
    {
      heading: "5. Durées de conservation",
      paragraphs: [
        "Selfies de pointage : 90 jours, puis supprimés (la trace du pointage est conservée). Données de l'entreprise : tant qu'elle est active. À la fermeture par le propriétaire, l'accès s'arrête immédiatement et toutes les données sont supprimées définitivement après 30 jours. Factures et pièces comptables de Mizan : selon la loi comptable (jusqu'à 10 ans). Journaux de sécurité : jusqu'à 12 mois.",
      ],
    },
    {
      heading: "6. Sécurité",
      paragraphs: [
        "Mots de passe et jetons de réinitialisation sont stockés hachés, les liens vers les fichiers téléversés sont signés et expirent, l'accès est limité par rôle et par entreprise, et les connexions sont chiffrées. Aucun système n'est parfaitement sûr ; nous vous informerons d'une violation touchant vos données comme la loi l'exige.",
      ],
    },
    {
      heading: "7. Vos droits",
      paragraphs: [
        "Vous pouvez demander l'accès, la rectification, la suppression, la limitation ou l'export de vos données personnelles, et vous opposer à certains usages. Les propriétaires peuvent exporter toutes les données de l'entreprise et la fermer depuis les Paramètres. Le personnel peut s'adresser à son employeur ou écrire à " +
          LEGAL_CONTACT.privacy +
          ". Au Maroc, vous pouvez aussi saisir la CNDP ; dans l'UE, votre autorité de protection des données.",
      ],
    },
    {
      heading: "8. Enfants",
      paragraphs: ["Mizan s'adresse aux entreprises et à leur personnel. Il n'est pas destiné aux moins de 16 ans."],
    },
    {
      heading: "9. Modifications et contact",
      paragraphs: [
        "Lorsque cette politique change, sa date de version change et nous vous demandons d'accepter la nouvelle version. Questions ou demandes : " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
  ],
};

const TERMS_AR: LegalDocument = {
  title: "شروط الاستخدام",
  updated: "الإصدار 2026-11-12",
  intro:
    "تنظّم هذه الشروط استخدامك لـ Mizan AI (\"ميزان\")، مساعد تسيير المطاعم والمقاولات الأخرى، المتوفر على الويب وعلى واتساب. بإنشاء حساب فإنك تقبلها مع سياسة الخصوصية.",
  sections: [
    {
      heading: "1. الخدمة",
      paragraphs: [
        "تتيح ميزان للمقاولة تدبير فريقها وجداول العمل والمهام والحوادث والمخزون والمشتريات والفواتير والموافقات، والتحدث مع مساعدتها ميّا على الويب وعلى واتساب. يمكن إضافة الوحدات أو إزالتها، وبعضها اختياري ويُفوتر على حدة.",
        "تُحضّر ميّا الإجراءات وتطلب التأكيد قبل تغيير بيانات المقاولة. وتبقى مسؤولاً عمّا تؤكده.",
      ],
    },
    {
      heading: "2. حسابك",
      paragraphs: [
        "من ينشئ حساب المقاولة هو مالكها ويصرّح بأنه مخوّل للتصرف باسمها. يجب تقديم معلومات صحيحة، والحفاظ على سرية كلمة المرور، وتحيين رقم واتساب لأنه يستقبل رموز الدخول وروابط إعادة تعيين كلمة المرور.",
        "يقرر المالك من ينضم إلى المقاولة وبأي دور، وهو مسؤول عن الأشخاص الذين يضيفهم، بما في ذلك إخبارهم كما هو مبيّن في سياسة الخصوصية.",
      ],
    },
    {
      heading: "3. الاستخدام المقبول",
      paragraphs: [
        "لن تستعمل ميزان لمخالفة القانون أو إرسال رسائل مزعجة أو غير مرغوب فيها أو مضايقة أي شخص أو رفع ملفات ضارة أو اختبار الخدمة أو إثقالها أو الولوج إلى بيانات مقاولة أخرى.",
        "يجب أن يكون لك الحق في مراسلة الأشخاص الذين تضيفهم على واتساب وفي جمع البيانات المسجلة في ميزان، بما فيها صور السيلفي والموقع عند تسجيل الحضور.",
      ],
    },
    {
      heading: "4. العروض والتجربة والأداء",
      paragraphs: [
        "تبدأ كل مقاولة جديدة بفترة تجريبية مجانية. بعدها تُفوتر الوحدات المستعملة عن كل فترة بالأثمنة المعروضة في التطبيق، عبر التحويل البنكي أو وسائل الأداء المتاحة. تصدر الفواتير بالدرهم المغربي ما لم يُذكر خلاف ذلك وتستحق في التاريخ المبين.",
        "قد يؤدي عدم أداء الفواتير إلى إيقاف بعض الوحدات. يمكنك إغلاق المقاولة في أي وقت (البند 8).",
      ],
    },
    {
      heading: "5. بياناتك",
      paragraphs: [
        "بيانات المقاولة التي تدخلها في ميزان ملك لك. وتأذن لميزان باستضافتها ومعالجتها فقط لتقديم الخدمة كما هو مبيّن في سياسة الخصوصية. يمكن للمالك تصديرها كلها في أي وقت من الإعدادات أو طلبها من ميّا.",
      ],
    },
    {
      heading: "6. التوفر والذكاء الاصطناعي",
      paragraphs: [
        "نعمل على إبقاء ميزان متاحاً دون ضمان خدمة غير منقطعة. يعتمد وصول رسائل واتساب على ميتا وعلى هاتف المستلم. أجوبة ميّا صادرة عن نموذج ذكاء اصطناعي وقد تكون خاطئة، فتحقق من الأرقام والقرارات المهمة.",
      ],
    },
    {
      heading: "7. المسؤولية",
      paragraphs: [
        "في حدود ما يسمح به القانون، لا تتحمل ميزان الخسائر غير المباشرة ولا فوات الربح ولا القرارات المتخذة بناءً على معلومات أنتجتها الخدمة. وتقتصر مسؤوليتنا الإجمالية عن أي مطالبة على المبالغ المؤداة خلال 12 شهراً السابقة لها. لا شيء هنا يحدّ من مسؤولية لا يجوز الحد منها قانوناً.",
      ],
    },
    {
      heading: "8. إغلاق المقاولة وإنهاء العقد",
      paragraphs: [
        "يمكن للمالك إغلاق المقاولة من الإعدادات. يتوقف الدخول والفوترة ورسائل واتساب فوراً، وتُحفظ البيانات 30 يوماً ليتمكن المالك من تصديرها أو طلب إعادة الفتح، ثم تُحذف نهائياً. وتُحفظ الفواتير الصادرة عن ميزان مدة ما يفرضه قانون المحاسبة.",
        "يجوز لنا تعليق أو إنهاء حساب يخالف هذه الشروط، مع إشعار مسبق متى أمكن.",
      ],
    },
    {
      heading: "9. التعديلات",
      paragraphs: [
        "قد نحيّن هذه الشروط، فيتغير تاريخ الإصدار ويُطلب منك قبول النسخة الجديدة. وإن لم توافق يمكنك إغلاق المقاولة.",
      ],
    },
    {
      heading: "10. القانون المطبق والتواصل",
      paragraphs: [
        "تخضع هذه الشروط للقانون المغربي، وتختص بالنزاعات المحاكم المختصة بالدار البيضاء ما لم يقض قانون آمر بخلاف ذلك. للأسئلة: " +
          LEGAL_CONTACT.support +
          ".",
      ],
    },
  ],
};

const PRIVACY_AR: LegalDocument = {
  title: "سياسة الخصوصية",
  updated: "الإصدار 2026-11-12",
  intro:
    "توضح هذه السياسة ما هي المعطيات الشخصية التي تعالجها ميزان ولماذا ولمدة كم، وما هي حقوقك بموجب القانون المغربي 09-08 (اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي CNDP) وبموجب اللائحة الأوروبية GDPR للأشخاص في الاتحاد الأوروبي.",
  sections: [
    {
      heading: "1. المسؤول عن المعالجة",
      paragraphs: [
        "بالنسبة لمعطيات فريق المقاولة ونشاطها، تقرر المقاولة (المالك) أغراض المعالجة ووسائلها وهي المسؤولة عنها، وتعمل ميزان كمناول. أما معطيات الحساب والفوترة وأمن الخدمة الخاصة بالمالك فميزان هي المسؤولة عنها. للتواصل: " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
    {
      heading: "2. المعطيات التي نعالجها",
      paragraphs: [
        "الحساب: الاسم والبريد الإلكتروني ورقم واتساب والدور واللغة وكلمة المرور (تُحفظ مُشفّرة).",
        "الفريق والأجور: أسماء العاملين وأرقام هواتفهم وجداول العمل وساعات العمل وكشوف الحضور والغيابات وتبريراتها وكشوف الأجور ومعلومات الأداء والملاحظات والوثائق التي يضيفها المسيّرون.",
        "تسجيل الحضور: وقت الدخول أو الخروج والموقع في تلك اللحظة وصورة سيلفي مباشرة لإثبات الحضور. تُستعمل الصورة والموقع فقط للتحقق من الحضور في مكان العمل ولمراجعة المسيّرين.",
        "رسائل واتساب: الرسائل والمقاطع الصوتية والصور والوثائق المتبادلة مع ميّا وميزان وحالة التسليم.",
        "التشغيل: المهام وقوائم المراجعة والحوادث مع صورها والمخزون والموردون وطلبات الشراء والفواتير والموافقات والحجوزات.",
        "معطيات تقنية: عنوان IP ونوع الجهاز والمتصفح وسجلات الدخول والأمان لتأمين الخدمة.",
      ],
    },
    {
      heading: "3. الأغراض والأسس",
      paragraphs: [
        "تقديم الخدمة المطلوبة (العقد)، وتأمينها ومنع الاحتيال (المصلحة المشروعة)، واحترام الالتزامات المحاسبية والقانونية (الالتزام القانوني)، وبالنسبة للموقع وصور السيلفي: المصلحة المشروعة للمقاولة في مراقبة الحضور، وعند اقتضاء القانون موافقة الشخص المعني وترخيص اللجنة الوطنية CNDP الذي تحصل عليه المقاولة.",
        "على المشغّلين إخبار مستخدميهم قبل استعمال صور السيلفي والموقع عند تسجيل الحضور والحصول على التراخيص المطلوبة في بلدهم. تعرض ميزان إشعاراً للعاملين عند أول تسجيل حضور.",
      ],
    },
    {
      heading: "4. المستلمون",
      paragraphs: [
        "لا يرى بيانات المقاولة إلا مستعملوها المخوّلون. نستعين بمزوّدي خدمات لتشغيل ميزان: الاستضافة السحابية ومنصة واتساب للأعمال (ميتا) ومزوّدو نماذج الذكاء الاصطناعي الذين يعالجون نص المحادثات للإجابة وإرسال البريد الإلكتروني. يعالجون المعطيات وفق تعليماتنا. قد تُعالج المعطيات خارج المغرب والاتحاد الأوروبي مع ضمانات مناسبة. لا نبيع المعطيات الشخصية.",
      ],
    },
    {
      heading: "5. مدة الاحتفاظ",
      paragraphs: [
        "صور السيلفي: 90 يوماً ثم تُحذف (ويبقى سجل تسجيل الحضور). معطيات المقاولة: ما دامت نشطة. عند إغلاق المالك للمقاولة يتوقف الولوج فوراً وتُحذف كل المعطيات نهائياً بعد 30 يوماً. فواتير ميزان ووثائقها المحاسبية: حسب قانون المحاسبة (حتى 10 سنوات). سجلات الأمان: حتى 12 شهراً.",
      ],
    },
    {
      heading: "6. الأمان",
      paragraphs: [
        "تُحفظ كلمات المرور ورموز إعادة التعيين مُشفّرة، وروابط الملفات المرفوعة موقّعة وتنتهي صلاحيتها، ويُحدّد الولوج حسب الدور والمقاولة، والاتصالات مشفّرة. لا يوجد نظام آمن تماماً، وسنخبرك بأي خرق يمس بياناتك كما يقتضي القانون.",
      ],
    },
    {
      heading: "7. حقوقك",
      paragraphs: [
        "يمكنك طلب الولوج إلى معطياتك الشخصية أو تصحيحها أو حذفها أو تقييد معالجتها أو تصديرها، والاعتراض على بعض الاستعمالات. يمكن للمالكين تصدير كل معطيات المقاولة وإغلاقها من الإعدادات. ويمكن للعاملين التوجه إلى مشغّلهم أو مراسلة " +
          LEGAL_CONTACT.privacy +
          ". وفي المغرب يمكنك أيضاً اللجوء إلى CNDP، وفي الاتحاد الأوروبي إلى سلطة حماية المعطيات.",
      ],
    },
    {
      heading: "8. الأطفال",
      paragraphs: ["ميزان موجّه للمقاولات وعامليها، وليس مخصصاً لمن تقل أعمارهم عن 16 سنة."],
    },
    {
      heading: "9. التعديلات والتواصل",
      paragraphs: [
        "عند تغيير هذه السياسة يتغير تاريخ إصدارها ونطلب منك قبول النسخة الجديدة. للأسئلة والطلبات: " +
          LEGAL_CONTACT.privacy +
          ".",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalKind, Record<LegalLang, LegalDocument>> = {
  terms: { en: TERMS_EN, fr: TERMS_FR, ar: TERMS_AR },
  privacy: { en: PRIVACY_EN, fr: PRIVACY_FR, ar: PRIVACY_AR },
};

export function legalDocument(kind: LegalKind, lang: string): LegalDocument {
  const code = (String(lang || "en").slice(0, 2) as LegalLang) in LEGAL_DOCUMENTS[kind] ? (String(lang).slice(0, 2) as LegalLang) : "en";
  return LEGAL_DOCUMENTS[kind][code];
}
