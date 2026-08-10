#!/usr/bin/env python3
"""Sync OS / Miya / nav i18n keys into en/fr/ar and fill en-only gaps."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "locales"

KEYS: dict[str, dict[str, str]] = {
    # --- Missing from all locales (used in code) ---
    "ai.chat_error": {
        "en": "Something went wrong talking to Miya.",
        "fr": "Une erreur s'est produite en parlant à Miya.",
        "ar": "حدث خطأ أثناء التحدث مع ميا.",
    },
    "ai.chat_online": {"en": "Online", "fr": "En ligne", "ar": "متصلة"},
    "ai.suggest.attention": {
        "en": "What needs attention?",
        "fr": "Qu'est-ce qui demande mon attention ?",
        "ar": "ما الذي يحتاج انتباهي؟",
    },
    "ai.suggest.overloaded": {
        "en": "Who is overloaded?",
        "fr": "Qui est surchargé ?",
        "ar": "من هو المثقل بالعمل؟",
    },
    "ai.suggest.ops_update": {
        "en": "Give me an ops update",
        "fr": "Donne-moi une mise à jour ops",
        "ar": "أعطني تحديثاً تشغيلياً",
    },
    "ai.attach_document": {
        "en": "Attach document",
        "fr": "Joindre un document",
        "ar": "إرفاق مستند",
    },
    "ai.send_message": {"en": "Send message", "fr": "Envoyer", "ar": "إرسال الرسالة"},
    "ai.upload_failed": {
        "en": "Could not upload that file. Try again.",
        "fr": "Impossible d'envoyer ce fichier. Réessayez.",
        "ar": "تعذر رفع الملف. حاول مرة أخرى.",
    },
    "common.save": {"en": "Save", "fr": "Enregistrer", "ar": "حفظ"},
    "common.skip_to_content": {
        "en": "Skip to main content",
        "fr": "Aller au contenu principal",
        "ar": "تخطي إلى المحتوى الرئيسي",
    },
    "dashboard.tasks_demands.mark_accepted": {
        "en": "Mark accepted",
        "fr": "Marquer accepté",
        "ar": "تعليم كمقبول",
    },
    "dashboard.tasks_demands.mark_unable": {
        "en": "Mark unable",
        "fr": "Marquer incapable",
        "ar": "تعليم كغير قادر",
    },
    "onboarding.owners.unknown_staff": {
        "en": "Unknown staff",
        "fr": "Personnel inconnu",
        "ar": "موظف غير معروف",
    },
    "staff.requests.download_proof": {
        "en": "Download proof",
        "fr": "Télécharger la preuve",
        "ar": "تحميل الإثبات",
    },
    "staff.requests.invoice_payment": {
        "en": "Payment",
        "fr": "Paiement",
        "ar": "الدفع",
    },
    "staff.requests.invoice_proof_of_payment": {
        "en": "Proof of payment",
        "fr": "Preuve de paiement",
        "ar": "إثبات الدفع",
    },
    "staff.requests.invoice_returned_reason": {
        "en": "Return reason",
        "fr": "Motif du renvoi",
        "ar": "سبب الإرجاع",
    },
    "staff.requests.invoice_status_approved": {
        "en": "Approved",
        "fr": "Approuvée",
        "ar": "موافق عليها",
    },
    "staff.requests.invoice_status_payment_failed": {
        "en": "Payment failed",
        "fr": "Paiement échoué",
        "ar": "فشل الدفع",
    },
    "staff.requests.invoice_status_payment_in_progress": {
        "en": "Payment in progress",
        "fr": "Paiement en cours",
        "ar": "الدفع قيد التنفيذ",
    },
    "staff.requests.invoice_status_pending_approval": {
        "en": "Pending approval",
        "fr": "En attente d'approbation",
        "ar": "بانتظار الموافقة",
    },
    "staff.requests.invoice_status_rejected": {
        "en": "Rejected",
        "fr": "Rejetée",
        "ar": "مرفوضة",
    },
    "staff.requests.invoice_status_returned": {
        "en": "Returned",
        "fr": "Renvoyée",
        "ar": "مُرجَعة",
    },
    "staff.requests.invoice_status_submitted": {
        "en": "Submitted",
        "fr": "Soumise",
        "ar": "مُقدَّمة",
    },
    "staff.requests.invoice_status_under_review": {
        "en": "Under review",
        "fr": "En revue",
        "ar": "قيد المراجعة",
    },
    "staff.requests.photo_proof": {
        "en": "Photo proof",
        "fr": "Preuve photo",
        "ar": "إثبات بالصورة",
    },
    "staff.requests.photo_proof_needed": {
        "en": "Photo proof needed",
        "fr": "Preuve photo requise",
        "ar": "يلزم إثبات بالصورة",
    },
    "staff.requests.status_accepted": {
        "en": "Accepted",
        "fr": "Acceptée",
        "ar": "مقبولة",
    },
    "staff.requests.status_unable": {
        "en": "Unable",
        "fr": "Impossible",
        "ar": "غير قادر",
    },
    # --- en-only gaps -> ar/fr ---
    "dashboard.task_detail.add_assignee": {
        "en": "Add staff",
        "fr": "Ajouter un membre",
        "ar": "إضافة موظف",
    },
    "dashboard.task_detail.assignees": {
        "en": "Assignees",
        "fr": "Assignés",
        "ar": "المُسند إليهم",
    },
    "dashboard.task_detail.assignees_saved": {
        "en": "Assignees saved - staff notified on WhatsApp.",
        "fr": "Assignés enregistrés - personnel notifié sur WhatsApp.",
        "ar": "تم حفظ المكلفين - تم إشعار الموظفين عبر واتساب.",
    },
    "locations_overview.branch.empty_clocks": {
        "en": "No clock-ins or clock-outs at this branch today.",
        "fr": "Aucun pointage à cette branche aujourd'hui.",
        "ar": "لا يوجد حضور أو انصراف في هذا الفرع اليوم.",
    },
    "locations_overview.branch.empty_clocks_hint": {
        "en": "Staff clock in via WhatsApp or the time clock - events appear when they match this branch or their home branch.",
        "fr": "Le personnel pointe via WhatsApp ou l'horloge - les événements apparaissent pour cette branche ou leur branche principale.",
        "ar": "يسجّل الموظفون الحضور عبر واتساب أو ساعة الوقت - تظهر الأحداث عند مطابقة هذا الفرع أو فرعهم الأساسي.",
    },
    "locations_overview.branch.empty_shifts": {
        "en": "No shifts scheduled at this branch today.",
        "fr": "Aucun shift planifié dans cette branche aujourd'hui.",
        "ar": "لا ورديات مجدولة في هذا الفرع اليوم.",
    },
    "locations_overview.branch.empty_shifts_hint": {
        "en": "Create shifts with this branch selected in Schedule, or set staff home branches so their shifts roll up here.",
        "fr": "Créez des shifts avec cette branche dans Planning, ou définissez la branche principale du personnel.",
        "ar": "أنشئ ورديات لهذا الفرع من الجدولة، أو عيّن الفرع الأساسي للموظفين لتظهر وردياتهم هنا.",
    },
    "locations_overview.branch.empty_staff": {
        "en": "No staff assigned to this branch yet.",
        "fr": "Aucun personnel assigné à cette branche pour l'instant.",
        "ar": "لا يوجد موظفون معيّنون لهذا الفرع بعد.",
    },
    "locations_overview.branch.empty_staff_hint": {
        "en": "Assign a home branch in the Staff tab, or move people here from another branch.",
        "fr": "Assignez une branche principale dans l'onglet Personnel, ou déplacez des personnes ici.",
        "ar": "عيّن فرعاً أساسياً من تبويب الموظفين، أو انقل أشخاصاً إلى هنا من فرع آخر.",
    },
    "staff.requests.invoice_approval_error": {
        "en": "Could not update approval.",
        "fr": "Impossible de mettre à jour l'approbation.",
        "ar": "تعذر تحديث الموافقة.",
    },
    "staff.requests.invoice_approval_note": {
        "en": "Optional note for approver or requester…",
        "fr": "Note optionnelle pour l'approbateur ou le demandeur…",
        "ar": "ملاحظة اختيارية للموافق أو مقدّم الطلب…",
    },
    "staff.requests.invoice_approval_saved": {
        "en": "Approval updated.",
        "fr": "Approbation mise à jour.",
        "ar": "تم تحديث الموافقة.",
    },
    "staff.requests.invoice_approve": {
        "en": "Approve",
        "fr": "Approuver",
        "ar": "موافقة",
    },
    "staff.requests.invoice_choose_proof": {
        "en": "Choose file",
        "fr": "Choisir un fichier",
        "ar": "اختر ملفاً",
    },
    "staff.requests.invoice_paid_on": {
        "en": "Paid on",
        "fr": "Payée le",
        "ar": "دُفعت في",
    },
    "staff.requests.invoice_payguard": {
        "en": "PayGuard approval",
        "fr": "Approbation PayGuard",
        "ar": "موافقة PayGuard",
    },
    "staff.requests.invoice_payment_method": {
        "en": "Method (e.g. BANK_TRANSFER)",
        "fr": "Méthode (ex. BANK_TRANSFER)",
        "ar": "الطريقة (مثال BANK_TRANSFER)",
    },
    "staff.requests.invoice_payment_ref": {
        "en": "Reference #",
        "fr": "Référence n°",
        "ar": "رقم المرجع",
    },
    "staff.requests.invoice_proof_error": {
        "en": "Could not upload proof.",
        "fr": "Impossible d'envoyer la preuve.",
        "ar": "تعذر رفع الإثبات.",
    },
    "staff.requests.invoice_proof_uploaded": {
        "en": "Proof uploaded.",
        "fr": "Preuve envoyée.",
        "ar": "تم رفع الإثبات.",
    },
    "staff.requests.invoice_record_payment": {
        "en": "Record payment",
        "fr": "Enregistrer le paiement",
        "ar": "تسجيل الدفع",
    },
    "staff.requests.invoice_reject": {
        "en": "Reject",
        "fr": "Rejeter",
        "ar": "رفض",
    },
    "staff.requests.invoice_request_info": {
        "en": "Request info",
        "fr": "Demander des infos",
        "ar": "طلب معلومات",
    },
    "staff.requests.invoice_timeline": {
        "en": "Activity timeline",
        "fr": "Journal d'activité",
        "ar": "سجل النشاط",
    },
    "staff.requests.invoice_timeline_empty": {
        "en": "No activity recorded yet.",
        "fr": "Aucune activité pour l'instant.",
        "ar": "لا نشاط مسجلاً بعد.",
    },
    "staff.requests.invoice_upload_proof": {
        "en": "Upload proof of payment",
        "fr": "Envoyer la preuve de paiement",
        "ar": "رفع إثبات الدفع",
    },
    # --- Navigation ---
    "nav.ask_miya": {"en": "Ask Miya", "fr": "Demander à Miya", "ar": "اسأل ميا"},
    "nav.command": {"en": "Command", "fr": "Commande", "ar": "القيادة"},
    "nav.attention": {"en": "Attention", "fr": "Attention", "ar": "الانتباه"},
    "nav.work": {"en": "Work", "fr": "Travail", "ar": "العمل"},
    "nav.people": {"en": "People", "fr": "Équipe", "ar": "الأشخاص"},
    "nav.business": {"en": "Business", "fr": "Business", "ar": "الأعمال"},
    "nav.automation": {"en": "Automation", "fr": "Automatisation", "ar": "الأتمتة"},
    "nav.knowledge": {"en": "Knowledge", "fr": "Connaissances", "ar": "المعرفة"},
    "nav.settings": {"en": "Settings", "fr": "Paramètres", "ar": "الإعدادات"},
    "nav.overview": {"en": "Overview", "fr": "Vue d'ensemble", "ar": "نظرة عامة"},
    "nav.work.live_operations": {
        "en": "Live operations",
        "fr": "Opérations en direct",
        "ar": "العمليات المباشرة",
    },
    "nav.work.tasks": {"en": "Tasks", "fr": "Tâches", "ar": "المهام"},
    "nav.work.incidents": {"en": "Incidents", "fr": "Incidents", "ar": "الحوادث"},
    "nav.work.requests": {"en": "Requests", "fr": "Demandes", "ar": "الطلبات"},
    "nav.people.staff": {"en": "Staff", "fr": "Personnel", "ar": "الموظفون"},
    "nav.people.scheduling": {"en": "Scheduling", "fr": "Planning", "ar": "الجدولة"},
    "nav.business.analytics": {"en": "Analytics", "fr": "Analyses", "ar": "التحليلات"},
    "nav.business.locations": {"en": "Locations", "fr": "Établissements", "ar": "الفروع"},
    "nav.business.approvals": {"en": "Approvals", "fr": "Approbations", "ar": "الموافقات"},
    "nav.settings.role_permissions": {
        "en": "Role permissions",
        "fr": "Permissions des rôles",
        "ar": "صلاحيات الأدوار",
    },
    "nav.collapse": {"en": "Collapse", "fr": "Réduire", "ar": "طي"},
    "nav.expand": {
        "en": "Expand navigation",
        "fr": "Développer la navigation",
        "ar": "توسيع التنقل",
    },
    "nav.primary": {
        "en": "Primary navigation",
        "fr": "Navigation principale",
        "ar": "التنقل الرئيسي",
    },
    "nav.mobile": {
        "en": "Mobile navigation",
        "fr": "Navigation mobile",
        "ar": "تنقل الجوال",
    },
    # --- Ask Miya prompts ---
    "ai.prompt.attention": {
        "en": "What needs my attention right now?",
        "fr": "Qu'est-ce qui demande mon attention maintenant ?",
        "ar": "ما الذي يحتاج انتباهي الآن؟",
    },
    "ai.prompt.attention_named": {
        "en": "Help me with this attention item: {{title}}. What should I do?",
        "fr": "Aide-moi avec cet élément : {{title}}. Que dois-je faire ?",
        "ar": "ساعدني في عنصر الانتباه: {{title}}. ماذا أفعل؟",
    },
    "ai.prompt.overdue_tasks": {
        "en": "Which tasks are overdue and how should I resolve them?",
        "fr": "Quelles tâches sont en retard et comment les résoudre ?",
        "ar": "ما المهام المتأخرة وكيف أحلها؟",
    },
    "ai.prompt.incidents": {
        "en": "Show unresolved incidents and recommend next actions.",
        "fr": "Montre les incidents ouverts et recommande les prochaines actions.",
        "ar": "اعرض الحوادث غير المحلولة واقترح الخطوات التالية.",
    },
    "ai.prompt.incident_named": {
        "en": 'Why is incident "{{label}}" still open, and what should we do next?',
        "fr": 'Pourquoi l\'incident "{{label}}" est-il encore ouvert, et que faire ensuite ?',
        "ar": 'لماذا لا يزال الحادث "{{label}}" مفتوحاً، وما الخطوة التالية؟',
    },
    "ai.prompt.task_named": {
        "en": 'Help me handle the task "{{label}}". What\'s blocking it and who should own it?',
        "fr": 'Aide-moi avec la tâche "{{label}}". Qu\'est-ce qui la bloque et qui doit la porter ?',
        "ar": 'ساعدني في المهمة "{{label}}". ما الذي يعيقها ومن يجب أن يملكها؟',
    },
    "ai.prompt.staff_named": {
        "en": "What is blocking {{name}}? Summarize their load and recommend rebalancing.",
        "fr": "Qu'est-ce qui bloque {{name}} ? Résume sa charge et propose un rééquilibrage.",
        "ar": "ما الذي يعيق {{name}}؟ لخّص حمله واقترح إعادة توزيع.",
    },
    "ai.prompt.overloaded": {
        "en": "Who is overloaded right now?",
        "fr": "Qui est surchargé en ce moment ?",
        "ar": "من هو المثقل بالعمل الآن؟",
    },
    "ai.prompt.schedule_gaps": {
        "en": "Are we understaffed tomorrow? Show coverage gaps and recommendations.",
        "fr": "Sommes-nous en sous-effectif demain ? Montre les trous de couverture et des recommandations.",
        "ar": "هل لدينا نقص غداً؟ اعرض فجوات التغطية والتوصيات.",
    },
    "ai.prompt.invoice_named": {
        "en": 'Is invoice "{{label}}" safe to approve? Explain risk and policy.',
        "fr": 'La facture "{{label}}" est-elle sûre à approuver ? Explique le risque et la politique.',
        "ar": 'هل فاتورة "{{label}}" آمنة للموافقة؟ اشرح المخاطر والسياسة.',
    },
    "ai.prompt.invoices_approval": {
        "en": "Which invoices need my approval and which are safe?",
        "fr": "Quelles factures nécessitent mon approbation et lesquelles sont sûres ?",
        "ar": "ما الفواتير التي تحتاج موافقتي وأيها آمن؟",
    },
    "ai.prompt.compliance": {
        "en": "What compliance items need attention?",
        "fr": "Quels documents de conformité demandent de l'attention ?",
        "ar": "ما مستندات الامتثال التي تحتاج انتباهاً؟",
    },
    "ai.prompt.focus_today": {
        "en": "What should I focus on today?",
        "fr": "Sur quoi dois-je me concentrer aujourd'hui ?",
        "ar": "على ماذا أركّز اليوم؟",
    },
    "ai.prompt.activity_today": {
        "en": "Show me what Miya has done today.",
        "fr": "Montre-moi ce que Miya a fait aujourd'hui.",
        "ar": "أرني ما فعلته ميا اليوم.",
    },
    # --- Command Center / attention ---
    "command.eyebrow": {"en": "Mizan Command", "fr": "Commande Mizan", "ar": "قيادة ميزان"},
    "command.needs_you": {"en": "Needs you", "fr": "Besoin de vous", "ar": "تحتاجك"},
    "command.needs_you_desc": {
        "en": "Decisions and interventions only.",
        "fr": "Décisions et interventions uniquement.",
        "ar": "قرارات وتدخلات فقط.",
    },
    "command.all_attention": {
        "en": "All attention",
        "fr": "Toute l'attention",
        "ar": "كل الانتباه",
    },
    "command.glance": {"en": "Glance", "fr": "Aperçu", "ar": "لمحة"},
    "command.glance_desc": {
        "en": "Where things stand right now.",
        "fr": "Où en sont les choses maintenant.",
        "ar": "أين تقف الأمور الآن.",
    },
    "command.watch": {"en": "Watch", "fr": "Surveillance", "ar": "مراقبة"},
    "command.watch_desc": {
        "en": "Signals Miya detected that are not yet decisions.",
        "fr": "Signaux détectés par Miya qui ne sont pas encore des décisions.",
        "ar": "إشارات رصدتها ميا وليست قرارات بعد.",
    },
    "command.handled": {
        "en": "Handled by Miya",
        "fr": "Traité par Miya",
        "ar": "عالجتها ميا",
    },
    "command.business_signals": {
        "en": "Business signals",
        "fr": "Signaux business",
        "ar": "إشارات الأعمال",
    },
    "command.empty_attention": {
        "en": "Nothing needs you right now.",
        "fr": "Rien ne nécessite votre intervention pour l'instant.",
        "ar": "لا شيء يحتاجك الآن.",
    },
    "command.load_error": {
        "en": "Couldn't load Command",
        "fr": "Impossible de charger Commande",
        "ar": "تعذر تحميل القيادة",
    },
    "command.load_error_detail": {
        "en": "Miya couldn't prepare the operational briefing.",
        "fr": "Miya n'a pas pu préparer le briefing opérationnel.",
        "ar": "لم تتمكن ميا من إعداد الإحاطة التشغيلية.",
    },
    "command.tile.people_working": {
        "en": "People working",
        "fr": "Personnes au travail",
        "ar": "أشخاص يعملون",
    },
    "command.tile.active_work": {
        "en": "Active work",
        "fr": "Travail actif",
        "ar": "عمل نشط",
    },
    "command.tile.open_incidents": {
        "en": "Open incidents",
        "fr": "Incidents ouverts",
        "ar": "حوادث مفتوحة",
    },
    "command.tile.pending_approvals": {
        "en": "Pending approvals",
        "fr": "Approbations en attente",
        "ar": "موافقات معلّقة",
    },
    "command.tile.ops_health": {
        "en": "Operational health",
        "fr": "Santé opérationnelle",
        "ar": "الصحة التشغيلية",
    },
    "os.attention.why": {
        "en": "Why it matters:",
        "fr": "Pourquoi c'est important :",
        "ar": "لماذا يهم:",
    },
    "os.attention.impact": {"en": "Impact:", "fr": "Impact :", "ar": "الأثر:"},
    "os.attention.recommends": {
        "en": "Miya recommends:",
        "fr": "Miya recommande :",
        "ar": "توصي ميا:",
    },
    "os.attention.owner": {"en": "Owner:", "fr": "Responsable :", "ar": "المالك:"},
    "os.attention.review": {"en": "Review", "fr": "Examiner", "ar": "مراجعة"},
    "os.insights.title": {
        "en": "Proactive insights",
        "fr": "Insights proactifs",
        "ar": "رؤى استباقية",
    },
    "os.insights.desc": {
        "en": "Situations Miya detected before you asked.",
        "fr": "Situations détectées par Miya avant que vous demandiez.",
        "ar": "مواقف رصدتها ميا قبل أن تسأل.",
    },
    "os.insights.why": {"en": "Why", "fr": "Pourquoi", "ar": "لماذا"},
    "os.insights.impact": {"en": "Impact", "fr": "Impact", "ar": "الأثر"},
    "os.insights.recommendation": {
        "en": "Recommendation",
        "fr": "Recommandation",
        "ar": "التوصية",
    },
    "os.insights.evidence": {"en": "Evidence", "fr": "Preuves", "ar": "الأدلة"},
    # --- AI workspace ---
    "ai.workspace.reviewing": {
        "en": "Reviewing this area…",
        "fr": "Analyse de cette zone…",
        "ar": "جارٍ مراجعة هذه المنطقة…",
    },
    "ai.workspace.items_need_attention": {
        "en": "{{count}} item needs attention",
        "fr": "{{count}} élément demande de l'attention",
        "ar": "عنصر واحد يحتاج انتباهاً",
    },
    "ai.workspace.items_need_attention_plural": {
        "en": "{{count}} items need attention",
        "fr": "{{count}} éléments demandent de l'attention",
        "ar": "{{count}} عناصر تحتاج انتباهاً",
    },
    "ai.workspace.no_urgent": {
        "en": "No urgent signals",
        "fr": "Aucun signal urgent",
        "ar": "لا إشارات عاجلة",
    },
    "ai.workspace.ai_summary": {"en": "AI summary", "fr": "Résumé IA", "ar": "ملخص الذكاء"},
    "ai.workspace.attention": {"en": "Attention", "fr": "Attention", "ar": "الانتباه"},
    "ai.workspace.recommended": {
        "en": "Recommended actions",
        "fr": "Actions recommandées",
        "ar": "إجراءات موصى بها",
    },
    "ai.workspace.do_with_miya": {
        "en": "Do with Miya",
        "fr": "Faire avec Miya",
        "ar": "نفّذ مع ميا",
    },
    "ai.workspace.ask": {"en": "Ask", "fr": "Demander", "ar": "اسأل"},
    "ai.workspace.open": {"en": "Open", "fr": "Ouvrir", "ar": "فتح"},
    "ai.workspace.commands": {
        "en": "Natural language commands",
        "fr": "Commandes en langage naturel",
        "ar": "أوامر باللغة الطبيعية",
    },
    "ai.workspace.related": {
        "en": "Related entities",
        "fr": "Entités liées",
        "ar": "كيانات ذات صلة",
    },
    "ai.workspace.timeline": {"en": "Timeline", "fr": "Chronologie", "ar": "الجدول الزمني"},
    "ai.workspace.automations": {
        "en": "Automation opportunities",
        "fr": "Opportunités d'automatisation",
        "ar": "فرص الأتمتة",
    },
    "ai.workspace.draft": {
        "en": "Draft with Miya",
        "fr": "Rédiger avec Miya",
        "ar": "مسودة مع ميا",
    },
    "ai.workspace.no_attention": {
        "en": "No attention items in this area.",
        "fr": "Aucun élément d'attention dans cette zone.",
        "ar": "لا عناصر انتباه في هذه المنطقة.",
    },
    "ai.workspace.no_recommended": {
        "en": "No recommended actions.",
        "fr": "Aucune action recommandée.",
        "ar": "لا إجراءات موصى بها.",
    },
    "ai.workspace.load_error": {
        "en": "Couldn't load Miya workspace for this area.",
        "fr": "Impossible de charger l'espace Miya pour cette zone.",
        "ar": "تعذر تحميل مساحة ميا لهذه المنطقة.",
    },
    # --- Branch detail extras ---
    "locations_overview.branch.unfilled_shifts": {
        "en": "Unfilled shifts",
        "fr": "Shifts non pourvus",
        "ar": "ورديات شاغرة",
    },
    "locations_overview.branch.pending_swaps": {
        "en": "Pending swaps",
        "fr": "Échanges en attente",
        "ar": "تبديلات معلّقة",
    },
    "locations_overview.branch.cash_variance": {
        "en": "Cash variance",
        "fr": "Écart de caisse",
        "ar": "فروقات النقد",
    },
    "locations_overview.branch.today_label": {"en": "Today", "fr": "Aujourd'hui", "ar": "اليوم"},
    "locations_overview.branch.awaiting_approval": {
        "en": "Awaiting approval",
        "fr": "En attente d'approbation",
        "ar": "بانتظار الموافقة",
    },
    "locations_overview.branch.all_sessions": {
        "en": "Today, all sessions",
        "fr": "Aujourd'hui, toutes sessions",
        "ar": "اليوم، كل الجلسات",
    },
    "locations_overview.branch.attendance_30d": {
        "en": "Attendance (30d)",
        "fr": "Présence (30 j)",
        "ar": "الحضور (30 يوماً)",
    },
    "locations_overview.branch.attendance_7d": {
        "en": "Attendance (7d)",
        "fr": "Présence (7 j)",
        "ar": "الحضور (7 أيام)",
    },
    "locations_overview.branch.no_shows_30d": {
        "en": "No-shows (30d)",
        "fr": "Absences (30 j)",
        "ar": "الغياب (30 يوماً)",
    },
    "locations_overview.branch.labor_30d": {
        "en": "Labor cost (30d)",
        "fr": "Coût salarial (30 j)",
        "ar": "تكلفة العمالة (30 يوماً)",
    },
    "locations_overview.branch.labor_7d": {
        "en": "Labor (7d)",
        "fr": "Main-d'œuvre (7 j)",
        "ar": "العمالة (7 أيام)",
    },
    "locations_overview.branch.mismatches_30d": {
        "en": "Mismatches (30d)",
        "fr": "Décalages (30 j)",
        "ar": "عدم التطابق (30 يوماً)",
    },
    "locations_overview.branch.shifts_7d": {
        "en": "Shifts scheduled (7d)",
        "fr": "Shifts planifiés (7 j)",
        "ar": "ورديات مجدولة (7 أيام)",
    },
    "locations_overview.branch.avg_labor": {
        "en": "Avg labor / active day",
        "fr": "Coût moyen / jour actif",
        "ar": "متوسط العمالة / يوم نشط",
    },
    "locations_overview.branch.avg_hours": {
        "en": "Avg hours / active day",
        "fr": "Heures moyennes / jour actif",
        "ar": "متوسط الساعات / يوم نشط",
    },
    "locations_overview.branch.busiest_day": {
        "en": "Busiest day",
        "fr": "Jour le plus chargé",
        "ar": "أكثر يوم ازدحاماً",
    },
    "locations_overview.branch.completed_30d": {
        "en": "Completed shifts (30d)",
        "fr": "Shifts terminés (30 j)",
        "ar": "ورديات مكتملة (30 يوماً)",
    },
    "locations_overview.branch.daily_labor": {
        "en": "Labor",
        "fr": "Main-d'œuvre",
        "ar": "العمالة",
    },
    "locations_overview.branch.daily_labor_sub": {
        "en": "Last 30 days · cost and hours",
        "fr": "30 derniers jours · coût et heures",
        "ar": "آخر 30 يوماً · التكلفة والساعات",
    },
    "locations_overview.branch.daily_attendance": {
        "en": "Attendance",
        "fr": "Présence",
        "ar": "الحضور",
    },
    "locations_overview.branch.daily_attendance_sub": {
        "en": "Last 30 days · scheduled vs completed",
        "fr": "30 derniers jours · planifié vs terminé",
        "ar": "آخر 30 يوماً · المجدول مقابل المكتمل",
    },
    "locations_overview.branch.profile": {
        "en": "Branch profile",
        "fr": "Profil de la branche",
        "ar": "ملف الفرع",
    },
    "locations_overview.branch.open_maps": {
        "en": "Open in Maps",
        "fr": "Ouvrir dans Maps",
        "ar": "فتح في الخرائط",
    },
    "locations_overview.branch.shifts_today": {
        "en": "Today's shifts",
        "fr": "Shifts du jour",
        "ar": "ورديات اليوم",
    },
    "locations_overview.branch.clock_today": {
        "en": "Today's clock activity",
        "fr": "Pointages du jour",
        "ar": "نشاط الحضور اليوم",
    },
    "locations_overview.branch.cash_sessions": {
        "en": "Cash sessions",
        "fr": "Sessions de caisse",
        "ar": "جلسات النقد",
    },
    "locations_overview.branch.related_pages": {
        "en": "Open related pages",
        "fr": "Ouvrir les pages liées",
        "ar": "فتح الصفحات ذات الصلة",
    },
    "locations_overview.branch.related_pages_sub": {
        "en": "Filtered to this branch where supported",
        "fr": "Filtré sur cette branche quand c'est possible",
        "ar": "مفلتر لهذا الفرع حيثما أمكن",
    },
    "locations_overview.branch.select_all": {
        "en": "Select all",
        "fr": "Tout sélectionner",
        "ar": "تحديد الكل",
    },
    "locations_overview.branch.deselect_all": {
        "en": "Deselect all",
        "fr": "Tout désélectionner",
        "ar": "إلغاء تحديد الكل",
    },
    "locations_overview.branch.guest_access": {
        "en": "Guest access",
        "fr": "Accès invité",
        "ar": "وصول ضيف",
    },
    "locations_overview.branch.in_now": {"en": "In now", "fr": "Présent", "ar": "متواجد الآن"},
    "locations_overview.branch.wrong_branch": {
        "en": "Wrong branch",
        "fr": "Mauvaise branche",
        "ar": "فرع خاطئ",
    },
    "locations_overview.branch.next_days": {
        "en": "Next {{days}} days",
        "fr": "{{days}} prochains jours",
        "ar": "الـ {{days}} أيام القادمة",
    },
    "locations_overview.branch.no_upcoming": {
        "en": "Nothing scheduled yet for the coming week.",
        "fr": "Rien de planifié pour la semaine à venir.",
        "ar": "لا شيء مجدولاً للأسبوع القادم بعد.",
    },
    "locations_overview.branch.branch_team": {
        "en": "Branch team",
        "fr": "Équipe de la branche",
        "ar": "فريق الفرع",
    },
    # --- Compliance Miya uploads ---
    "settings.compliance.miya_uploads_title": {
        "en": "Miya uploads",
        "fr": "Fichiers Miya",
        "ar": "رفع ميا",
    },
    "settings.compliance.miya_uploads_desc": {
        "en": "Documents attached in the Miya widget or WhatsApp appear here.",
        "fr": "Les documents joints dans Miya ou WhatsApp apparaissent ici.",
        "ar": "المستندات المرفقة من واجهة ميا أو واتساب تظهر هنا.",
    },
    "settings.compliance.miya_uploads_empty": {
        "en": "No Miya uploads yet. Attach a PDF or image in the Miya widget or WhatsApp.",
        "fr": "Aucun fichier Miya pour l'instant. Joignez un PDF ou une image dans Miya ou WhatsApp.",
        "ar": "لا مرفقات من ميا بعد. أرفق PDF أو صورة من واجهة ميا أو واتساب.",
    },
    "settings.tabs.permissions": {
        "en": "Role permissions",
        "fr": "Permissions des rôles",
        "ar": "صلاحيات الأدوار",
    },
}


def merge_locale(lang: str) -> tuple[int, int]:
    path = ROOT / f"{lang}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    added = updated = 0
    for key, translations in KEYS.items():
        value = translations[lang]
        if key not in data:
            data[key] = value
            added += 1
        elif data[key] != value:
            # Controlled OS keys: keep locale files aligned with this script.
            data[key] = value
            updated += 1
    existing_keys = list(data.keys())
    new_keys = sorted(k for k in KEYS if k not in existing_keys)
    ordered = {k: data[k] for k in existing_keys}
    for k in new_keys:
        ordered[k] = data[k]
    path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added, updated


def main() -> None:
    for lang in ("en", "fr", "ar"):
        added, updated = merge_locale(lang)
        print(f"{lang}: +{added} filled={updated}")


if __name__ == "__main__":
    main()
