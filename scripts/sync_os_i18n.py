#!/usr/bin/env python3
"""Sync OS / Agent / nav i18n keys into en/fr/ar and fill en-only gaps."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "locales"

KEYS: dict[str, dict[str, str]] = {
    # --- Missing from all locales (used in code) ---
    "ai.chat_error": {
        "en": "I couldn't complete that just now. Try again in a moment.",
        "fr": "Je n'ai pas pu terminer. Réessayez dans un instant.",
        "ar": "لم أتمكن من إكمال ذلك الآن. أعد المحاولة بعد لحظات.",
    },
    "agent.error": {
        "en": "I couldn't complete that just now. Try again in a moment.",
        "fr": "Je n'ai pas pu terminer. Réessayez dans un instant.",
        "ar": "لم أتمكن من إكمال ذلك الآن. أعد المحاولة بعد لحظات.",
    },
    "staff.roles.supervisor": {
        "en": "Supervisor",
        "fr": "Superviseur",
        "ar": "مشرف",
    },
    "ai.chat_online": {"en": "Online", "fr": "En ligne", "ar": "متصل"},
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
    "common.dialog": {
        "en": "Dialog",
        "fr": "Boîte de dialogue",
        "ar": "نافذة حوار",
    },
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
    "nav.ask_agent": {"en": "Ask Agent", "fr": "Demander à Agent", "ar": "اسأل الوكيل"},
    "nav.command": {"en": "Command", "fr": "Commande", "ar": "القيادة"},
    "nav.attention": {"en": "Attention", "fr": "Attention", "ar": "الانتباه"},
    "nav.work": {"en": "Work", "fr": "Travail", "ar": "العمل"},
    "nav.people": {"en": "People", "fr": "Équipe", "ar": "الأشخاص"},
    "nav.business": {"en": "Business", "fr": "Business", "ar": "الأعمال"},
    "nav.automation": {"en": "Automation", "fr": "Automatisation", "ar": "الأتمتة"},
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
    # --- Ask Agent prompts ---
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
        "en": "Show me what Agent has done today.",
        "fr": "Montre-moi ce que Agent a fait aujourd'hui.",
        "ar": "أرني ما فعلته الوكيل اليوم.",
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
        "en": "Signals Agent detected that are not yet decisions.",
        "fr": "Signaux détectés par Agent qui ne sont pas encore des décisions.",
        "ar": "إشارات رصدها الوكيل وليست قرارات بعد.",
    },
    "command.handled": {
        "en": "Handled by Agent",
        "fr": "Traité par Agent",
        "ar": "عالجها الوكيل",
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
        "en": "Agent couldn't prepare the operational briefing.",
        "fr": "Agent n'a pas pu préparer le briefing opérationnel.",
        "ar": "لم يتمكن الوكيل من إعداد الإحاطة التشغيلية.",
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
        "en": "Agent recommends:",
        "fr": "Agent recommande :",
        "ar": "يوصي الوكيل:",
    },
    "os.attention.owner": {"en": "Owner:", "fr": "Responsable :", "ar": "المالك:"},
    "os.attention.review": {"en": "Review", "fr": "Examiner", "ar": "مراجعة"},
    "os.insights.title": {
        "en": "Proactive insights",
        "fr": "Insights proactifs",
        "ar": "رؤى استباقية",
    },
    "os.insights.desc": {
        "en": "Situations Agent detected before you asked.",
        "fr": "Situations détectées par Agent avant que vous demandiez.",
        "ar": "مواقف رصدها الوكيل قبل أن تسأل.",
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
    "ai.workspace.do_with_agent": {
        "en": "Do with Agent",
        "fr": "Faire avec Agent",
        "ar": "نفّذ مع الوكيل",
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
        "en": "Draft with Agent",
        "fr": "Rédiger avec Agent",
        "ar": "مسودة مع الوكيل",
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
        "en": "Couldn't load Agent workspace for this area.",
        "fr": "Impossible de charger l'espace Agent pour cette zone.",
        "ar": "تعذر تحميل مساحة الوكيل لهذه المنطقة.",
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
    # --- Compliance Agent uploads ---
    "settings.compliance.miya_uploads_title": {
        "en": "Agent uploads",
        "fr": "Fichiers Agent",
        "ar": "مرفقات الوكيل",
    },
    "settings.compliance.miya_uploads_desc": {
        "en": "Documents attached in the Agent widget or WhatsApp appear here.",
        "fr": "Les documents joints dans Agent ou WhatsApp apparaissent ici.",
        "ar": "المستندات المرفقة من واجهة الوكيل أو واتساب تظهر هنا.",
    },
    "settings.compliance.miya_uploads_empty": {
        "en": "No Agent uploads yet. Attach a PDF or image in the Agent widget or WhatsApp.",
        "fr": "Aucun fichier Agent pour l'instant. Joignez un PDF ou une image dans Agent ou WhatsApp.",
        "ar": "لا مرفقات من الوكيل بعد. أرفق PDF أو صورة من واجهة الوكيل أو واتساب.",
    },
    # --- Agent identity + command centre (parity with en.json) ---
    "ai.agent_name": {"en": "Agent", "fr": "Agent", "ar": "الوكيل"},
    "ai.chat_today": {"en": "Today", "fr": "Aujourd'hui", "ar": "اليوم"},
    "ai.chat_yesterday": {"en": "Yesterday", "fr": "Hier", "ar": "أمس"},
    "command.subtitle": {
        "en": "{{count}} signals · Agent runs ops with you — only what needs you rises to the top",
        "fr": "{{count}} signaux · Agent pilote l'ops avec vous — seul l'essentiel remonte",
        "ar": "{{count}} إشارات · الوكيل يدير العمليات معك — ما يحتاجك فقط يظهر في الأعلى",
    },
    "command.agent_strip_aria": {
        "en": "Agent co-pilot status",
        "fr": "Statut du copilote Agent",
        "ar": "حالة مساعد الوكيل",
    },
    "command.agent_strip_title": {
        "en": "Agent is running ops with you",
        "fr": "Agent pilote l'ops avec vous",
        "ar": "الوكيل يدير العمليات معك",
    },
    "command.agent_strip_desc": {
        "en": "Live attendance, incidents, tasks, and compliance — Agent handles routine work and surfaces decisions before they become fires.",
        "fr": "Présences, incidents, tâches et conformité en direct — Agent gère le routinier et remonte les décisions avant qu'elles n'explosent.",
        "ar": "الحضور المباشر والحوادث والمهام والامتثال — الوكيل يتولى العمل الروتيني ويُبرز القرارات قبل أن تشتعل.",
    },
    "command.agent_watching_count": {
        "en": "Watching {{count}}",
        "fr": "Surveillance {{count}}",
        "ar": "مراقبة {{count}}",
    },
    "command.agent_handling_count": {
        "en": "{{count}} in progress",
        "fr": "{{count}} en cours",
        "ar": "{{count}} قيد المعالجة",
    },
    "command.agent_decide_count": {
        "en": "{{count}} need you",
        "fr": "{{count}} vous concernent",
        "ar": "{{count}} تحتاجك",
    },
    "command.agent_suggests": {
        "en": "Agent suggests:",
        "fr": "Agent suggère :",
        "ar": "اقتراح الوكيل:",
    },
    "command.decide_clear": {
        "en": "You're clear for now. Agent is handling the rest and will ping you if something needs you.",
        "fr": "Vous êtes libre pour l'instant. Agent gère le reste et vous préviendra si besoin.",
        "ar": "أنت متفرغ الآن. الوكيل يتولى الباقي وسينبهك إذا احتاجك شيء.",
    },
    "command.watching_scan_title": {
        "en": "Scanning your operation",
        "fr": "Analyse de votre opération",
        "ar": "مسح عملياتك",
    },
    "command.watching_scan_desc": {
        "en": "Agent watches coverage, compliance, and workload so you don't have to. Suggestions appear here before you need to decide.",
        "fr": "Agent surveille couverture, conformité et charge pour vous. Les suggestions apparaissent ici avant qu'il faille décider.",
        "ar": "الوكيل يراقب التغطية والامتثال والعبء عنك. تظهر الاقتراحات هنا قبل أن تحتاج للقرار.",
    },
    "command.palette.recent": {"en": "Recent", "fr": "Récent", "ar": "الأخيرة"},
    "command.palette.suggested": {"en": "Suggested", "fr": "Suggestions", "ar": "مقترحة"},
    "command.palette.quick_actions": {
        "en": "Quick actions",
        "fr": "Actions rapides",
        "ar": "إجراءات سريعة",
    },
    "command.palette.assign": {"en": "Assign", "fr": "Assigner", "ar": "تعيين"},
    "command.palette.notify": {"en": "Notify", "fr": "Notifier", "ar": "إشعار"},
    "command.palette.schedule": {"en": "Schedule", "fr": "Planifier", "ar": "جدولة"},
    "command.palette.create_task": {
        "en": "Create task",
        "fr": "Créer une tâche",
        "ar": "إنشاء مهمة",
    },
    "command.palette.assign_prompt": {
        "en": "Help me assign a task to the right person.",
        "fr": "Aide-moi à assigner une tâche à la bonne personne.",
        "ar": "ساعدني في تعيين مهمة للشخص المناسب.",
    },
    "command.palette.notify_prompt": {
        "en": "Send a notification to staff who need an update.",
        "fr": "Envoie une notification au staff qui a besoin d'une mise à jour.",
        "ar": "أرسل إشعاراً للموظفين الذين يحتاجون تحديثاً.",
    },
    "command.palette.schedule_prompt": {
        "en": "Help me schedule or adjust a shift.",
        "fr": "Aide-moi à planifier ou ajuster un shift.",
        "ar": "ساعدني في جدولة أو تعديل وردية.",
    },
    "command.palette.create_task_prompt": {
        "en": "Create a new operational task for the team.",
        "fr": "Crée une nouvelle tâche opérationnelle pour l'équipe.",
        "ar": "أنشئ مهمة تشغيلية جديدة للفريق.",
    },
    "command.palette.suggest_incidents": {
        "en": "Show unresolved incidents",
        "fr": "Afficher les incidents non résolus",
        "ar": "عرض الحوادث غير المحلولة",
    },
    "command.palette.suggest_briefing": {
        "en": "Prepare today's briefing",
        "fr": "Préparer le briefing du jour",
        "ar": "تحضير ملخص اليوم",
    },
    "command.ask_prompt.category": {
        "en": "Category: {{category}}.",
        "fr": "Catégorie : {{category}}.",
        "ar": "الفئة: {{category}}.",
    },
    "command.ask_prompt.context": {
        "en": "Context: {{detail}}.",
        "fr": "Contexte : {{detail}}.",
        "ar": "السياق: {{detail}}.",
    },
    "command.ask_prompt.recommendation": {
        "en": "Mizan recommendation: {{recommendation}}.",
        "fr": "Recommandation Mizan : {{recommendation}}.",
        "ar": "توصية Mizan: {{recommendation}}.",
    },
    "command.ask_prompt.why": {
        "en": "Why it matters: {{why}}.",
        "fr": "Pourquoi c'est important : {{why}}.",
        "ar": "لماذا يهم: {{why}}.",
    },
    "command.ask_prompt.watching_tail": {
        "en": "This is an Agent watching signal. Verify live Mizan data, explain what it means, then recommend one action you can take for me.",
        "fr": "Signal de surveillance Agent. Vérifie les données Mizan en direct, explique ce que cela signifie, puis recommande une action que tu peux faire pour moi.",
        "ar": "إشارة مراقبة من الوكيل. تحقق من بيانات Mizan المباشرة، اشرح المعنى، ثم اقترح إجراءاً واحداً يمكنك تنفيذه لي.",
    },
    "command.ask_prompt.action_tail": {
        "en": "Use Mizan tools to verify live data first, then give one specific next action you can take for me.",
        "fr": "Utilise d'abord les outils Mizan pour vérifier les données en direct, puis donne une prochaine action précise que tu peux faire pour moi.",
        "ar": "استخدم أدوات Mizan للتحقق من البيانات المباشرة أولاً، ثم قدم إجراءً محدداً واحداً يمكنك تنفيذه لي.",
    },
    "attention.needs_decision": {
        "en": "Needs your decision",
        "fr": "Nécessite votre décision",
        "ar": "يحتاج قرارك",
    },
    "attention.review_attendance": {
        "en": "Review attendance",
        "fr": "Vérifier les présences",
        "ar": "مراجعة الحضور",
    },
    "attention.review_overdue": {
        "en": "Review overdue work",
        "fr": "Vérifier le travail en retard",
        "ar": "مراجعة العمل المتأخر",
    },
    "attention.plan_inspection": {
        "en": "Plan inspection",
        "fr": "Planifier une inspection",
        "ar": "تخطيط تفتيش",
    },
    "attention.create_reminder": {
        "en": "Create reminder",
        "fr": "Créer un rappel",
        "ar": "إنشاء تذكير",
    },
    "attention.cluster.review_named": {
        "en": "Review {{title}}",
        "fr": "Examiner {{title}}",
        "ar": "مراجعة {{title}}",
    },
    "attention.no_decision_yet": {
        "en": "No decision required yet",
        "fr": "Aucune décision requise pour l'instant",
        "ar": "لا قرار مطلوب بعد",
    },
    "settings.tabs.permissions": {
        "en": "Role permissions",
        "fr": "Permissions des rôles",
        "ar": "صلاحيات الأدوار",
    },
    # --- Error boundary ---
    "error.boundary.title": {
        "en": "Something went wrong.",
        "fr": "Une erreur s'est produite.",
        "ar": "حدث خطأ ما.",
    },
    "error.boundary.description": {
        "en": "We're sorry for the inconvenience. Please try again later.",
        "fr": "Désolé pour la gêne occasionnée. Veuillez réessayer plus tard.",
        "ar": "نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى لاحقاً.",
    },
    "error.boundary.reload": {
        "en": "Reload page",
        "fr": "Recharger la page",
        "ar": "إعادة تحميل الصفحة",
    },
    "error.boundary.reference": {
        "en": "Reference: {{id}}",
        "fr": "Référence : {{id}}",
        "ar": "المرجع: {{id}}",
    },
    "error.boundary.dev_error": {
        "en": "Error (dev only):",
        "fr": "Erreur (dev uniquement) :",
        "ar": "خطأ (للتطوير فقط):",
    },
    "error.boundary.component_stack": {
        "en": "Component stack (dev only)",
        "fr": "Pile des composants (dev uniquement)",
        "ar": "مكدس المكونات (للتطوير فقط)",
    },
    "error.section.display_glitch": {
        "en": "{{label}} hit a display glitch.",
        "fr": "{{label}} a rencontré un problème d'affichage.",
        "ar": "واجه {{label}} مشكلة في العرض.",
    },
    "error.section.this_section": {
        "en": "This section",
        "fr": "Cette section",
        "ar": "هذا القسم",
    },
    # --- Staff PIN login ---
    "auth.pin.title": {
        "en": "Staff PIN login",
        "fr": "Connexion PIN personnel",
        "ar": "تسجيل دخول PIN للموظف",
    },
    "auth.pin.description": {
        "en": "Enter your 4-digit PIN and capture your photo.",
        "fr": "Entrez votre PIN à 4 chiffres et prenez votre photo.",
        "ar": "أدخل رمز PIN المكوّن من 4 أرقام والتقط صورتك.",
    },
    "auth.pin.code_label": {
        "en": "PIN code",
        "fr": "Code PIN",
        "ar": "رمز PIN",
    },
    "auth.pin.facial_verification": {
        "en": "Facial verification",
        "fr": "Vérification faciale",
        "ar": "التحقق بالوجه",
    },
    "auth.pin.login_button": {
        "en": "Log in",
        "fr": "Se connecter",
        "ar": "تسجيل الدخول",
    },
    "auth.pin.captured_alt": {
        "en": "Captured photo",
        "fr": "Photo capturée",
        "ar": "الصورة الملتقطة",
    },
    "auth.pin.login_failed": {
        "en": "PIN login failed.",
        "fr": "Échec de la connexion PIN.",
        "ar": "فشل تسجيل الدخول برمز PIN.",
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
