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
    "nav.widget": {"en": "Widget", "fr": "Widget", "ar": "ودجت"},
    "nav.attention": {"en": "Widget", "fr": "Widget", "ar": "ودجت"},
    "widgets.page.title": {
        "en": "Widget",
        "fr": "Widget",
        "ar": "ودجت",
    },
    "widgets.page.desc": {
        "en": "Your operational dashboards and everyday business views.",
        "fr": "Vos tableaux de bord opérationnels et vues métier quotidiennes.",
        "ar": "لوحاتك التشغيلية وعروض عملك اليومية.",
    },
    "category.incidents": {"en": "Incidents", "fr": "Incidents", "ar": "الحوادث"},
    "category.compliance": {"en": "Compliance", "fr": "Conformité", "ar": "الامتثال"},
    "category.finance": {"en": "Finance", "fr": "Finance", "ar": "المالية"},
    "category.tasks": {"en": "Tasks", "fr": "Tâches", "ar": "المهام"},
    "category.workload": {"en": "Workload", "fr": "Charge de travail", "ar": "عبء العمل"},
    "category.attendance": {"en": "Attendance", "fr": "Présence", "ar": "الحضور"},
    "dashboard.category_tasks.empty_open": {
        "en": "Nothing pressing here — new items will appear as they come in.",
        "fr": "Rien d'urgent ici — les nouveaux éléments apparaîtront au fur et à mesure.",
        "ar": "لا شيء عاجل هنا — ستظهر العناصر الجديدة فور ورودها.",
    },
    "dashboard.category_tasks.bucket_move_invoice_hint": {
        "en": "Invoices stay in Finance. Use Mark paid or Mark voided instead.",
        "fr": "Les factures restent dans Finance. Utilisez Marquer payée ou Marquer annulée.",
        "ar": "تبقى الفواتير في المالية. استخدم «تحديد كمدفوع» أو «تحديد كملغاة» بدلاً من ذلك.",
    },
    "dashboard.category_tasks.bucket_move_scheduling_hint": {
        "en": "Scheduled tasks can't be moved from the dashboard.",
        "fr": "Les tâches planifiées ne peuvent pas être déplacées depuis le tableau de bord.",
        "ar": "لا يمكن نقل المهام المجدولة من لوحة التحكم.",
    },
    "dashboard.category_tasks.bucket_move_staff_to_custom_hint": {
        "en": "Staff requests move between category widgets only — not custom tiles.",
        "fr": "Les demandes du personnel se déplacent entre widgets de catégorie uniquement — pas les tuiles personnalisées.",
        "ar": "تنتقل طلبات الموظفين بين ودجات الفئات فقط — وليس البلاطات المخصصة.",
    },
    "common.active": {"en": "Active", "fr": "Actif", "ar": "نشط"},
    "common.inactive": {"en": "Inactive", "fr": "Inactif", "ar": "غير نشط"},
    "common.refresh": {"en": "Refresh", "fr": "Actualiser", "ar": "تحديث"},
    "common.grid_view": {"en": "Grid view", "fr": "Vue grille", "ar": "عرض شبكي"},
    "common.list_view": {"en": "List view", "fr": "Vue liste", "ar": "عرض قائمة"},
    "common.view_profile": {"en": "View profile", "fr": "Voir le profil", "ar": "عرض الملف"},
    "common.edit_profile": {"en": "Edit profile", "fr": "Modifier le profil", "ar": "تعديل الملف"},
    "common.not_provided": {"en": "Not provided", "fr": "Non renseigné", "ar": "غير متوفر"},
    "common.previous_page": {"en": "Previous page", "fr": "Page précédente", "ar": "الصفحة السابقة"},
    "common.next_page": {"en": "Next page", "fr": "Page suivante", "ar": "الصفحة التالية"},
    "common.copy": {"en": "Copy", "fr": "Copier", "ar": "نسخ"},
    "common.share": {"en": "Share", "fr": "Partager", "ar": "مشاركة"},
    "generic.briefing": {"en": "Briefing", "fr": "Briefing", "ar": "ملخص"},
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
    # --- Keys used in code with defaultValue / second-arg fallback (i18n:keys audit) ---
    "common.previous": {"en": "Previous", "fr": "Précédent", "ar": "السابق"},
    "dashboard.task_detail.category": {"en": "Category", "fr": "Catégorie", "ar": "الفئة"},
    "dashboard.task_detail.created": {"en": "Created", "fr": "Créé", "ar": "تاريخ الإنشاء"},
    "dashboard.task_detail.invoice_title": {"en": "Invoice", "fr": "Facture", "ar": "فاتورة"},
    "dashboard.task_detail.reported": {"en": "Opened", "fr": "Ouvert", "ar": "تاريخ الفتح"},
    "dashboard.task_detail.source": {"en": "Source", "fr": "Source", "ar": "المصدر"},
    "dashboard.task_detail.updated_at": {"en": "Updated", "fr": "Mis à jour", "ar": "آخر تحديث"},
    "domain.today.showing": {
        "en": "Showing {{shown}} of {{total}}",
        "fr": "{{shown}} sur {{total}} affichés",
        "ar": "عرض {{shown}} من {{total}}",
    },
    "operations_live.action.view_attachment": {
        "en": "View attachment",
        "fr": "Voir la pièce jointe",
        "ar": "عرض المرفق",
    },
    "operations_live.date_all": {"en": "All dates", "fr": "Toutes les dates", "ar": "كل التواريخ"},
    "operations_live.priority.normal": {"en": "Normal", "fr": "Normal", "ar": "عادي"},
    "ops.review.date_all": {"en": "All", "fr": "Tout", "ar": "الكل"},
    "ops.review.date_range_all": {"en": "All", "fr": "Tout", "ar": "الكل"},
    "staff.avatar.change": {"en": "Change photo", "fr": "Changer la photo", "ar": "تغيير الصورة"},
    "staff.avatar.hint": {
        "en": "Add a clear face photo so managers recognize them on cards and in ops.",
        "fr": "Ajoutez une photo nette du visage pour que les managers les reconnaissent sur les fiches et dans les ops.",
        "ar": "أضف صورة واضحة للوجه ليتعرف عليهم المديرون في البطاقات والعمليات.",
    },
    "staff.avatar.invalid_type": {
        "en": "Please choose an image file.",
        "fr": "Choisissez un fichier image.",
        "ar": "يرجى اختيار ملف صورة.",
    },
    "staff.avatar.updated": {
        "en": "Profile photo updated.",
        "fr": "Photo de profil mise à jour.",
        "ar": "تم تحديث صورة الملف الشخصي.",
    },
    "staff.requests.action_complete": {"en": "Complete", "fr": "Terminer", "ar": "إكمال"},
    "staff.requests.action_start": {"en": "Start", "fr": "Démarrer", "ar": "بدء"},
    "status.ACKNOWLEDGED": {"en": "Acknowledged", "fr": "Pris en compte", "ar": "تم الإقرار"},
    # --- Process assignee multi-select (admin) ---
    "process.assignee.search_placeholder": {
        "en": "Search name, role, or team…",
        "fr": "Rechercher nom, rôle ou équipe…",
        "ar": "بحث بالاسم أو الدور أو الفريق…",
    },
    "process.assignee.no_roster": {
        "en": "No staff on this roster yet.",
        "fr": "Aucun personnel sur cette liste pour l'instant.",
        "ar": "لا يوجد موظفون في هذه القائمة بعد.",
    },
    "process.assignee.no_match": {
        "en": "No one matches \"{{query}}\". Try another name or role.",
        "fr": "Aucune correspondance pour « {{query}} ». Essayez un autre nom ou rôle.",
        "ar": "لا أحد يطابق « {{query}} ». جرّب اسماً أو دوراً آخر.",
    },
    "process.assignee.searching": {"en": "Searching…", "fr": "Recherche…", "ar": "جاري البحث…"},
    "process.assignee.match_count": {
        "en": "{{count}} match",
        "fr": "{{count}} correspondance",
        "ar": "{{count}} نتيجة",
    },
    "process.assignee.match_count_plural": {
        "en": "{{count}} matches",
        "fr": "{{count}} correspondances",
        "ar": "{{count}} نتائج",
    },
    "process.assignee.people_count": {
        "en": "{{count}} people",
        "fr": "{{count}} personnes",
        "ar": "{{count}} أشخاص",
    },
    "process.assignee.selected_count": {
        "en": "{{count}} selected",
        "fr": "{{count}} sélectionné(s)",
        "ar": "{{count}} محدد",
    },
    "process.assignee.clear_all": {"en": "Clear all", "fr": "Tout effacer", "ar": "مسح الكل"},
    "process.assignee.select_matches": {"en": "Select matches", "fr": "Sélectionner les correspondances", "ar": "تحديد النتائج"},
    "process.assignee.select_all_dept": {"en": "All", "fr": "Tous", "ar": "الكل"},
    # --- Global errors / empty states ---
    "errors.not_found.title": {"en": "404", "fr": "404", "ar": "404"},
    "errors.not_found.message": {
        "en": "Oops! Page not found",
        "fr": "Oups ! Page introuvable",
        "ar": "عذراً! الصفحة غير موجودة",
    },
    "errors.not_found.home": {
        "en": "Return to Home",
        "fr": "Retour à l'accueil",
        "ar": "العودة إلى الرئيسية",
    },
    "errors.unauthorized.title": {
        "en": "Access denied",
        "fr": "Accès refusé",
        "ar": "تم رفض الوصول",
    },
    "errors.unauthorized.message": {
        "en": "You don't have permission to view this page.",
        "fr": "Vous n'avez pas la permission de voir cette page.",
        "ar": "ليس لديك إذن لعرض هذه الصفحة.",
    },
    "errors.unauthorized.wrong_door": {
        "en": "Wrong door",
        "fr": "Mauvaise porte",
        "ar": "مسار خاطئ",
    },
    "errors.unauthorized.denied": {
        "en": "Access Denied",
        "fr": "Accès refusé",
        "ar": "تم رفض الوصول",
    },
    "errors.unauthorized.restaurant_redirect": {
        "en": "You're signed in to your business account. This screen usually means you opened a platform-only area by mistake — we're sending you to your dashboard…",
        "fr": "Vous êtes connecté à votre compte établissement. Cet écran signifie en général que vous avez ouvert une zone réservée à la plateforme par erreur — redirection vers votre tableau de bord…",
        "ar": "أنت مسجّل الدخول إلى حساب المنشأة. تعني هذه الشاشة عادة أنك فتحت منطقة مخصصة للمنصة بالخطأ — جاري إرسالك إلى لوحة التحكم…",
    },
    "errors.unauthorized.platform_hint": {
        "en": "You don't have access to this page. If you manage a restaurant, sign in at /auth. Platform Admin (/admin) is only for dedicated Mizan operators.",
        "fr": "Vous n'avez pas accès à cette page. Si vous gérez un restaurant, connectez-vous sur /auth. Admin plateforme (/admin) est réservé aux opérateurs Mizan.",
        "ar": "ليس لديك حق الوصول إلى هذه الصفحة. إذا كنت تدير مطعماً، سجّل الدخول من /auth. إدارة المنصة (/admin) للمشغّلين المعتمدين فقط.",
    },
    "errors.unauthorized.go_business": {
        "en": "Go to my business",
        "fr": "Aller à mon établissement",
        "ar": "الذهاب إلى منشأتي",
    },
    "errors.unauthorized.go_dashboard": {
        "en": "Go to Dashboard",
        "fr": "Aller au tableau de bord",
        "ar": "الذهاب إلى لوحة التحكم",
    },
    "errors.unauthorized.sign_in": {
        "en": "Sign In",
        "fr": "Se connecter",
        "ar": "تسجيل الدخول",
    },
    "process.assignee.empty_trigger": {
        "en": "Assign staff",
        "fr": "Assigner du personnel",
        "ar": "تعيين موظفين",
    },
    "process.assignee.selected_trigger": {
        "en": "{{count}} assigned",
        "fr": "{{count}} assigné(s)",
        "ar": "{{count}} معيّن",
    },
    "process.assignee.popover_hint": {
        "en": "Search by name, role, or team. Tap a row to add or remove.",
        "fr": "Recherchez par nom, rôle ou équipe. Touchez une ligne pour ajouter ou retirer.",
        "ar": "ابحث بالاسم أو الدور أو الفريق. اضغط على صف للإضافة أو الإزالة.",
    },
    "process.assignee.team_member": {
        "en": "Team member",
        "fr": "Membre de l'équipe",
        "ar": "عضو الفريق",
    },
    "process.assignee.add_team": {"en": "Add team", "fr": "Ajouter l'équipe", "ar": "إضافة الفريق"},
    "process.assignee.remove_team": {"en": "Remove team", "fr": "Retirer l'équipe", "ar": "إزالة الفريق"},
    "process.assignee.staff_fallback": {"en": "Staff", "fr": "Personnel", "ar": "موظف"},
    "process.assignee.remove_person": {
        "en": "Remove {{name}}",
        "fr": "Retirer {{name}}",
        "ar": "إزالة {{name}}",
    },
    "process.assignee.branch_empty": {
        "en": "Assign to people",
        "fr": "Assigner à des personnes",
        "ar": "تعيين لأشخاص",
    },
    "process.assignee.branch_selected": {
        "en": "Assigned to {{count}}",
        "fr": "Assigné à {{count}}",
        "ar": "معيّن لـ {{count}}",
    },
    "process.assignee.branch_hint": {
        "en": "Notify specific people (leave empty to alert managers)",
        "fr": "Notifier des personnes (laisser vide pour alerter les managers)",
        "ar": "إشعار أشخاص محددين (اتركه فارغاً لتنبيه المديرين)",
    },
    # --- French / Arabic gaps (critical nav & AI; were identical to English) ---
    "ai.chat_new_conversation": {
        "en": "New conversation",
        "fr": "Nouvelle conversation",
        "ar": "محادثة جديدة",
    },
    "ai.chat_new_conversation_hint": {
        "en": "Start a fresh thread. Pending confirmations from the previous chat won't carry over.",
        "fr": "Nouveau fil. Les confirmations en attente du chat précédent ne sont pas reprises.",
        "ar": "محادثة جديدة. لن تُنقل تأكيدات المحادثة السابقة المعلّقة.",
    },
    "ai.chat_title": {"en": "Agent", "fr": "Assistant", "ar": "المساعد"},
    "ai.agent_name": {"en": "Agent", "fr": "Agent", "ar": "الوكيل"},
    "ai.workspace.attention": {
        "en": "Attention",
        "fr": "Priorités",
        "ar": "يتطلب انتباهاً",
    },
    "attention.eyebrow": {"en": "Attention", "fr": "Priorités", "ar": "يتطلب انتباهاً"},
    "command.unassigned_shift": {"en": "Shift", "fr": "Poste", "ar": "وردية"},
    "dashboard.category_tasks.absent": {"en": "Absent", "fr": "Absent", "ar": "غائب"},
    "dashboard.category_tasks.pill_urgent": {"en": "Urgent", "fr": "Urgent", "ar": "عاجل"},
    "dashboard.category_tasks.priority_urgent_short": {"en": "Urgent", "fr": "Urgent", "ar": "عاجل"},
    "nav.attention": {"en": "Attention", "fr": "Priorités", "ar": "يتطلب انتباهاً"},
    "nav.automation.workflows": {"en": "Workflows", "fr": "Workflows", "ar": "سير العمل"},
    "nav.employees.performance": {"en": "Performance", "fr": "Performance", "ar": "الأداء"},
    "nav.social.autopilot": {"en": "Autopilot", "fr": "Pilote auto", "ar": "تشغيل تلقائي"},
    "nav.widget": {"en": "Widget", "fr": "Widget", "ar": "ودجت"},
    "category.finance": {"en": "Finance", "fr": "Finance", "ar": "المالية"},
    "category.incidents": {"en": "Incidents", "fr": "Incidents", "ar": "الحوادث"},
    # --- Timesheets page ---
    "timesheets.page_title": {
        "en": "Timesheets",
        "fr": "Feuilles de temps",
        "ar": "سجلات الدوام",
    },
    "timesheets.page_subtitle": {
        "en": "Manage and approve staff timesheets",
        "fr": "Gérer et approuver les feuilles de temps",
        "ar": "إدارة واعتماد سجلات دوام الموظفين",
    },
    "timesheets.weekly_title": {"en": "Timesheet", "fr": "Feuille de temps", "ar": "سجل الدوام"},
    "timesheets.no_shifts_week": {
        "en": "No shifts in selected week",
        "fr": "Aucun poste cette semaine",
        "ar": "لا ورديات في الأسبوع المحدد",
    },
    "timesheets.staff_shifts_title": {"en": "Staff Shifts", "fr": "Postes du personnel", "ar": "ورديات الموظفين"},
    "timesheets.staff_shifts_desc": {
        "en": "Comprehensive view of assigned shifts",
        "fr": "Vue complète des postes assignés",
        "ar": "عرض شامل للورديات المعيّنة",
    },
    "timesheets.export_shifts_csv": {"en": "Export Shifts CSV", "fr": "Exporter postes (CSV)", "ar": "تصدير الورديات CSV"},
    "timesheets.export_payroll_csv": {"en": "Export Payroll CSV", "fr": "Exporter paie (CSV)", "ar": "تصدير كشف الرواتب CSV"},
    "timesheets.print_pdf": {"en": "Print / PDF", "fr": "Imprimer / PDF", "ar": "طباعة / PDF"},
    "timesheets.placeholder_from": {"en": "From", "fr": "Du", "ar": "من"},
    "timesheets.placeholder_to": {"en": "To", "fr": "Au", "ar": "إلى"},
    "timesheets.search_staff": {"en": "Search staff...", "fr": "Rechercher un employé...", "ar": "بحث عن موظف..."},
    "timesheets.all_status": {"en": "All Status", "fr": "Tous les statuts", "ar": "كل الحالات"},
    "timesheets.all_departments": {"en": "All Departments", "fr": "Tous les départements", "ar": "كل الأقسام"},
    "timesheets.sort_by_name": {"en": "Name", "fr": "Nom", "ar": "الاسم"},
    "timesheets.sort_by_time": {"en": "Time", "fr": "Heure", "ar": "الوقت"},
    "timesheets.sort_by_label": {
        "en": "Sort by {{field}}",
        "fr": "Trier par {{field}}",
        "ar": "ترتيب حسب {{field}}",
    },
    "timesheets.confirm_selected": {"en": "Confirm Selected", "fr": "Confirmer la sélection", "ar": "تأكيد المحدد"},
    "timesheets.mark_completed": {"en": "Mark Completed", "fr": "Marquer terminé", "ar": "تعليم كمكتمل"},
    "timesheets.loading_shifts": {"en": "Loading shifts...", "fr": "Chargement des postes...", "ar": "جاري تحميل الورديات..."},
    "timesheets.failed_load_shifts": {
        "en": "Failed to load shifts",
        "fr": "Échec du chargement des postes",
        "ar": "تعذر تحميل الورديات",
    },
    "timesheets.no_shifts_found": {"en": "No shifts found", "fr": "Aucun poste trouvé", "ar": "لم يُعثر على ورديات"},
    "timesheets.complete_action": {"en": "Complete", "fr": "Terminer", "ar": "إكمال"},
    "timesheets.details_title": {"en": "Timesheet Details", "fr": "Détails de la feuille", "ar": "تفاصيل سجل الدوام"},
    "timesheets.period": {"en": "Period", "fr": "Période", "ar": "الفترة"},
    "timesheets.total_hours": {"en": "Total Hours", "fr": "Heures totales", "ar": "إجمالي الساعات"},
    "timesheets.hours_value": {"en": "{{hours}} hours", "fr": "{{hours}} h", "ar": "{{hours}} ساعة"},
    "timesheets.hourly_rate": {"en": "Hourly Rate", "fr": "Taux horaire", "ar": "الأجر بالساعة"},
    "timesheets.total_earnings": {"en": "Total Earnings", "fr": "Gains totaux", "ar": "إجمالي الأرباح"},
    "timesheets.approved_by": {"en": "Approved By", "fr": "Approuvé par", "ar": "اعتمد بواسطة"},
    "timesheets.entries": {"en": "Entries", "fr": "Entrées", "ar": "الإدخالات"},
    "timesheets.approve_timesheet": {"en": "Approve Timesheet", "fr": "Approuver la feuille", "ar": "اعتماد سجل الدوام"},
    "timesheets.mark_as_paid": {"en": "Mark as Paid", "fr": "Marquer comme payé", "ar": "تعليم كمدفوع"},
    "timesheets.processing": {"en": "Processing...", "fr": "Traitement...", "ar": "جاري المعالجة..."},
    "timesheets.approve_dialog_title": {"en": "Approve Timesheet?", "fr": "Approuver la feuille ?", "ar": "اعتماد سجل الدوام؟"},
    "timesheets.approve_dialog_body": {
        "en": "Are you sure you want to approve the timesheet for {{name}}?",
        "fr": "Approuver la feuille de temps de {{name}} ?",
        "ar": "هل تريد اعتماد سجل دوام {{name}}؟",
    },
    "timesheets.approve_dialog_summary": {
        "en": "Total Hours: {{hours}}h | Total Earnings: {{earnings}}",
        "fr": "Heures : {{hours}} h | Gains : {{earnings}}",
        "ar": "الساعات: {{hours}} | الأرباح: {{earnings}}",
    },
    "timesheets.approving": {"en": "Approving...", "fr": "Approbation...", "ar": "جاري الاعتماد..."},
    "timesheets.toast.approved": {
        "en": "Timesheet approved successfully",
        "fr": "Feuille approuvée",
        "ar": "تم اعتماد سجل الدوام",
    },
    "timesheets.toast.approve_failed": {
        "en": "Failed to approve timesheet",
        "fr": "Échec de l'approbation",
        "ar": "تعذر اعتماد سجل الدوام",
    },
    "timesheets.toast.paid": {"en": "Timesheet marked as paid", "fr": "Feuille marquée payée", "ar": "تم تعليم السجل كمدفوع"},
    "timesheets.toast.paid_failed": {"en": "Failed to mark as paid", "fr": "Échec du marquage payé", "ar": "تعذر التعليم كمدفوع"},
    "timesheets.toast.shift_confirmed": {"en": "Shift confirmed", "fr": "Poste confirmé", "ar": "تم تأكيد الوردية"},
    "timesheets.toast.shift_completed": {"en": "Shift marked completed", "fr": "Poste marqué terminé", "ar": "تم تعليم الوردية كمكتملة"},
    "timesheets.toast.shift_deleted": {"en": "Shift deleted", "fr": "Poste supprimé", "ar": "تم حذف الوردية"},
    "timesheets.toast.select_date_range": {
        "en": "Select a date range first",
        "fr": "Sélectionnez d'abord une période",
        "ar": "اختر نطاق التاريخ أولاً",
    },
    "timesheets.toast.export_failed": {"en": "Export failed", "fr": "Échec de l'export", "ar": "فشل التصدير"},
    "timesheets.toast.payroll_downloaded": {
        "en": "Payroll CSV downloaded",
        "fr": "CSV paie téléchargé",
        "ar": "تم تنزيل CSV الرواتب",
    },
    "timesheets.select_all": {"en": "Select all", "fr": "Tout sélectionner", "ar": "تحديد الكل"},
    "status.SCHEDULED": {"en": "Scheduled", "fr": "Planifié", "ar": "مجدول"},
    "status.CONFIRMED": {"en": "Confirmed", "fr": "Confirmé", "ar": "مؤكد"},
    "status.SUBMITTED": {"en": "Submitted", "fr": "Soumis", "ar": "مُرسَل"},
    # --- Camera capture (time clock) ---
    "camera.dialog_label": {
        "en": "Clock photo capture",
        "fr": "Photo de pointage",
        "ar": "التقاط صورة الدوام",
    },
    "camera.preview_label": {"en": "Camera preview", "fr": "Aperçu caméra", "ar": "معاينة الكاميرا"},
    "camera.capture": {"en": "Capture", "fr": "Capturer", "ar": "التقاط"},
    "camera.use_photo": {"en": "Use Photo", "fr": "Utiliser la photo", "ar": "استخدام الصورة"},
    "camera.retake": {"en": "Retake", "fr": "Reprendre", "ar": "إعادة الالتقاط"},
    "camera.captured_preview": {"en": "Captured preview", "fr": "Aperçu capturé", "ar": "معاينة الصورة"},
    "camera.face_hint": {
        "en": "Center your face; a 3-2-1 countdown will auto-capture.",
        "fr": "Centrez votre visage ; compte à rebours 3-2-1 puis capture.",
        "ar": "ضع وجهك في الوسط؛ سيبدأ عد تنازلي 3-2-1 للالتقاط تلقائياً.",
    },
    "camera.access_denied": {
        "en": "Camera access denied or unavailable.",
        "fr": "Accès caméra refusé ou indisponible.",
        "ar": "تم رفض الكاميرا أو أنها غير متاحة.",
    },
    # --- Checklist executor ---
    "checklist.executor.subtitle": {
        "en": "Quick, mobile-first checklist executor",
        "fr": "Exécution de checklist, mobile d'abord",
        "ar": "تنفيذ قائمة تحقق سريع للجوال",
    },
    "checklist.executor.overall_progress": {"en": "Overall Progress", "fr": "Progression globale", "ar": "التقدم الإجمالي"},
    "checklist.executor.step_of": {
        "en": "Step {{current}} of {{total}}",
        "fr": "Étape {{current}} sur {{total}}",
        "ar": "الخطوة {{current}} من {{total}}",
    },
    "checklist.executor.add_note": {"en": "Add Note", "fr": "Ajouter une note", "ar": "إضافة ملاحظة"},
    "checklist.executor.note_placeholder": {
        "en": "Details, observations, or context",
        "fr": "Détails, observations ou contexte",
        "ar": "تفاصيل أو ملاحظات أو سياق",
    },
    "checklist.executor.attach_photo": {"en": "Attach Photo", "fr": "Joindre une photo", "ar": "إرفاق صورة"},
    "checklist.executor.photo_required": {"en": "Photo required", "fr": "Photo obligatoire", "ar": "الصورة مطلوبة"},
    "checklist.executor.attach_video": {"en": "Attach Video", "fr": "Joindre une vidéo", "ar": "إرفاق فيديو"},
    "checklist.executor.attach_document": {"en": "Attach Document", "fr": "Joindre un document", "ar": "إرفاق مستند"},
    "checklist.executor.digital_signature": {"en": "Digital Signature", "fr": "Signature numérique", "ar": "توقيع رقمي"},
    "checklist.executor.signature_required": {"en": "Signature required", "fr": "Signature obligatoire", "ar": "التوقيع مطلوب"},
    "checklist.executor.signed": {"en": "Signed", "fr": "Signé", "ar": "موقّع"},
    "checklist.executor.evidence": {"en": "Evidence", "fr": "Preuves", "ar": "الأدلة"},
    "checklist.executor.follow_up_title": {"en": "Create Follow-up Action", "fr": "Créer une action de suivi", "ar": "إنشاء إجراء متابعة"},
    "checklist.executor.field_title": {"en": "Title", "fr": "Titre", "ar": "العنوان"},
    "checklist.executor.field_description": {"en": "Description", "fr": "Description", "ar": "الوصف"},
    "checklist.executor.field_priority": {"en": "Priority", "fr": "Priorité", "ar": "الأولوية"},
    "checklist.executor.field_due_date": {"en": "Due Date", "fr": "Échéance", "ar": "تاريخ الاستحقاق"},
    "checklist.executor.field_assignee": {"en": "Assignee", "fr": "Assigné à", "ar": "المكلف"},
    "checklist.executor.assignee_placeholder": {
        "en": "Staff ID or picklist",
        "fr": "ID employé ou liste",
        "ar": "معرف الموظف أو قائمة",
    },
    "checklist.executor.field_location": {"en": "Location/Site", "fr": "Lieu / site", "ar": "الموقع"},
    "checklist.executor.site_placeholder": {"en": "Site ID", "fr": "ID du site", "ar": "معرف الموقع"},
    "checklist.executor.labels_tags": {"en": "Labels/Tags (comma separated)", "fr": "Étiquettes (séparées par des virgules)", "ar": "وسوم (مفصولة بفواصل)"},
    "checklist.executor.visibility": {"en": "Visibility", "fr": "Visibilité", "ar": "الظهور"},
    "checklist.executor.visibility_private": {"en": "Private", "fr": "Privé", "ar": "خاص"},
    "checklist.executor.visibility_team": {"en": "Team", "fr": "Équipe", "ar": "الفريق"},
    "checklist.executor.visibility_org": {"en": "Organization", "fr": "Organisation", "ar": "المؤسسة"},
    "checklist.executor.comment_placeholder": {"en": "Add a comment", "fr": "Ajouter un commentaire", "ar": "أضف تعليقاً"},
    "checklist.executor.photo_required_banner": {
        "en": "Photo evidence is required to complete this task",
        "fr": "Une photo est requise pour terminer cette tâche",
        "ar": "يلزم إرفاق صورة لإكمال هذه المهمة",
    },
    "checklist.executor.tab_evidence": {"en": "Evidence", "fr": "Preuves", "ar": "الأدلة"},
    "checklist.executor.tab_actions": {"en": "Actions", "fr": "Actions", "ar": "الإجراءات"},
    "checklist.executor.previous": {"en": "Previous", "fr": "Précédent", "ar": "السابق"},
    "checklist.executor.next": {"en": "Next", "fr": "Suivant", "ar": "التالي"},
    "checklist.executor.auto_saved": {"en": "Auto-saved", "fr": "Enregistré auto.", "ar": "حُفظ تلقائياً"},
    "checklist.executor.clear_signature": {"en": "Clear", "fr": "Effacer", "ar": "مسح"},
    "severity.CRITICAL": {"en": "Critical", "fr": "Critique", "ar": "حرج"},
    "generic.time": {"en": "Time", "fr": "Heure", "ar": "الوقت"},
    "generic.role": {"en": "Role", "fr": "Rôle", "ar": "الدور"},
    "generic.approve": {"en": "Approve", "fr": "Approuver", "ar": "اعتماد"},
    "generic.department": {"en": "Department", "fr": "Département", "ar": "القسم"},
    "live_board.confirmed": {"en": "Confirmed", "fr": "Confirmé", "ar": "مؤكد"},
    "checklist.executor.save_signature": {"en": "Save Signature", "fr": "Enregistrer la signature", "ar": "حفظ التوقيع"},
    "checklist.executor.add_signature": {"en": "Add Signature", "fr": "Ajouter une signature", "ar": "إضافة توقيع"},
    "checklist.executor.hide": {"en": "Hide", "fr": "Masquer", "ar": "إخفاء"},
    "checklist.executor.create_action": {"en": "Create Action", "fr": "Créer l'action", "ar": "إنشاء الإجراء"},
    "checklist.executor.add_comment": {"en": "Add Comment", "fr": "Ajouter un commentaire", "ar": "إضافة تعليق"},
    "checklist.executor.save_comment": {"en": "Save Comment", "fr": "Enregistrer le commentaire", "ar": "حفظ التعليق"},
    "checklist.executor.tasks_completed": {
        "en": "{{done}} of {{total}} tasks completed",
        "fr": "{{done}} sur {{total}} tâches terminées",
        "ar": "{{done}} من {{total}} مهام مكتملة",
    },
    "checklist.executor.submit": {"en": "Submit", "fr": "Soumettre", "ar": "إرسال"},
    "checklist.executor.offline": {"en": "Offline", "fr": "Hors ligne", "ar": "غير متصل"},
    "generic.online": {"en": "Online", "fr": "En ligne", "ar": "متصل"},
    # --- Approvals page (was hardcoded English) ---
    "approvals.page_title": {"en": "Approvals", "fr": "Approbations", "ar": "الموافقات"},
    "approvals.page_desc": {
        "en": "Pending waits for the person on the amount ladder. After they decide, the requester gets one WhatsApp and one web notification.",
        "fr": "En attente : la personne prévue sur l'échelle de montants décide. Ensuite, le demandeur reçoit une notification WhatsApp et une sur le web.",
        "ar": "المعلّق ينتظر صاحب الصلاحية حسب سلم المبالغ. بعد القرار، يتلقى مقدم الطلب إشعار واتساب وإشعار ويب.",
    },
    "approvals.settings_link": {"en": "Approval Settings", "fr": "Paramètres d'approbation", "ar": "إعدادات الموافقة"},
    "approvals.new_request": {"en": "New request", "fr": "Nouvelle demande", "ar": "طلب جديد"},
    "approvals.placeholder_title": {"en": "What needs approval", "fr": "Objet de la demande", "ar": "ما الذي يحتاج موافقة"},
    "approvals.placeholder_amount": {"en": "Amount", "fr": "Montant", "ar": "المبلغ"},
    "approvals.submit": {"en": "Submit", "fr": "Envoyer", "ar": "إرسال"},
    "approvals.pending_title": {"en": "Pending ({{count}})", "fr": "En attente ({{count}})", "ar": "معلّق ({{count}})"},
    "approvals.approved_title": {"en": "Approved ({{count}})", "fr": "Approuvé ({{count}})", "ar": "موافق عليه ({{count}})"},
    "approvals.rejected_title": {"en": "Rejected ({{count}})", "fr": "Rejeté ({{count}})", "ar": "مرفوض ({{count}})"},
    "approvals.load_error": {"en": "Could not load approvals.", "fr": "Impossible de charger les approbations.", "ar": "تعذر تحميل الموافقات."},
    "approvals.pending_empty": {
        "en": "Nothing waiting. New requests land here for the assigned approver.",
        "fr": "Rien en attente. Les nouvelles demandes arrivent ici pour l'approbateur assigné.",
        "ar": "لا شيء في الانتظار. الطلبات الجديدة تظهر هنا للمعتمد المكلّف.",
    },
    "approvals.approved_empty": {"en": "No approved requests yet.", "fr": "Aucune demande approuvée pour l'instant.", "ar": "لا طلبات موافق عليها بعد."},
    "approvals.no_amount": {"en": "No amount", "fr": "Sans montant", "ar": "بدون مبلغ"},
    "approvals.from_person": {"en": "from {{name}}", "fr": "de {{name}}", "ar": "من {{name}}"},
    "approvals.awaiting_person": {"en": "awaiting {{name}}", "fr": "en attente de {{name}}", "ar": "بانتظار {{name}}"},
    "approvals.decided_by": {"en": "by {{name}}", "fr": "par {{name}}", "ar": "بواسطة {{name}}"},
    "approvals.status_pending": {"en": "pending", "fr": "en attente", "ar": "معلّق"},
    "approvals.status_approved": {"en": "approved", "fr": "approuvé", "ar": "موافق عليه"},
    "approvals.status_rejected": {"en": "rejected", "fr": "rejeté", "ar": "مرفوض"},
    "approvals.reject": {"en": "Reject", "fr": "Rejeter", "ar": "رفض"},
    # --- FR/AR gaps: procurement & live ops progress (keys existed but were English in fr) ---
    "procurement.subtitle": {
        "en": "Needs, orders, receiving, and pay in one workflow.",
        "fr": "Besoins, commandes, réception et paiement dans un seul flux.",
        "ar": "الاحتياجات والطلبات والاستلام والدفع في سير عمل واحد.",
    },
    "procurement.tab.needs": {"en": "Needs", "fr": "Besoins", "ar": "الاحتياجات"},
    "procurement.tab.orders": {"en": "Orders", "fr": "Commandes", "ar": "الطلبات"},
    "procurement.tab.receiving": {"en": "Receiving", "fr": "Réception", "ar": "الاستلام"},
    "procurement.tab.invoices": {"en": "Invoices & pay", "fr": "Factures et paiement", "ar": "الفواتير والدفع"},
    "procurement.staff_requests": {"en": "Staff purchase requests", "fr": "Demandes d'achat du personnel", "ar": "طلبات شراء الموظفين"},
    "procurement.no_staff_requests": {
        "en": "No open purchase requests.",
        "fr": "Aucune demande d'achat ouverte.",
        "ar": "لا طلبات شراء مفتوحة.",
    },
    "operations_progress.subtitle": {
        "en": "Staff completion, timings, and work by Live Ops category.",
        "fr": "Achèvement, délais et travail par catégorie des opérations live.",
        "ar": "إنجاز الموظفين والمواعيد والعمل حسب فئة العمليات المباشرة.",
    },
    "operations_progress.today": {"en": "Today", "fr": "Aujourd'hui", "ar": "اليوم"},
    "operations_progress.last_7_days": {"en": "Last 7 days", "fr": "7 derniers jours", "ar": "آخر 7 أيام"},
    "operations_progress.kpi_tasks": {"en": "Tasks done", "fr": "Tâches terminées", "ar": "مهام منجزة"},
    "operations_progress.kpi_checklists": {"en": "Checklists", "fr": "Checklists", "ar": "قوائم التحقق"},
    "operations_progress.kpi_overdue": {"en": "Overdue", "fr": "En retard", "ar": "متأخر"},
    "operations_progress.tab.staff": {"en": "Staff", "fr": "Personnel", "ar": "الموظفون"},
    "operations_progress.tab.categories": {"en": "By category", "fr": "Par catégorie", "ar": "حسب الفئة"},
    "operations_progress.col.name": {"en": "Staff", "fr": "Personnel", "ar": "الموظف"},
    "operations_progress.col.tasks_pct": {"en": "Tasks %", "fr": "Tâches %", "ar": "المهام %"},
    "operations_progress.col.checklists_pct": {"en": "Checklists %", "fr": "Checklists %", "ar": "قوائم التحقق %"},
    "operations_progress.col.avg_min": {"en": "Avg min", "fr": "Moy. min", "ar": "متوسط الدقائق"},
    "operations_progress.col.overdue": {"en": "Overdue", "fr": "En retard", "ar": "متأخر"},
    # --- Incidents table ---
    "ops.review.incidents.anonymous_reporter": {
        "en": "Anonymous reporter",
        "fr": "Signalement anonyme",
        "ar": "بلاغ مجهول",
    },
    "ops.review.incidents.reported_by": {"en": "by {{name}}", "fr": "par {{name}}", "ar": "بواسطة {{name}}"},
    # --- Dashboard widget polish ---
    "dashboard.custom_widget.task_count": {
        "en": "{{count}} task(s)",
        "fr": "{{count}} tâche(s)",
        "ar": "{{count}} مهمة",
    },
    "dashboard.category_tasks.ai_part_of_project": {
        "en": "Part of project:",
        "fr": "Projet :",
        "ar": "ضمن المشروع:",
    },
    "dashboard.staff_messages.template.check_in": {
        "en": "Quick check-in",
        "fr": "Point rapide",
        "ar": "تسجيل سريع",
    },
    "dashboard.staff_messages.template.update_now": {
        "en": "Need update",
        "fr": "Besoin d'un point",
        "ar": "مطلوب تحديث",
    },
    "dashboard.staff_messages.via_whatsapp": {
        "en": "via WhatsApp",
        "fr": "Par WhatsApp",
        "ar": "عبر واتساب",
    },
    # --- Roles (sidebar / RBAC) ---
    "staff.roles.super_admin": {
        "en": "Super Admin",
        "fr": "Super administrateur",
        "ar": "مدير عام",
    },
    "staff.roles.manager": {"en": "Manager", "fr": "Manager", "ar": "مدير"},
    "staff.roles.admin": {"en": "Admin", "fr": "Administrateur", "ar": "مسؤول"},
    "staff.roles.owner": {"en": "Owner", "fr": "Propriétaire", "ar": "المالك"},
    # --- RBAC feature labels (French loanwords cleaned up) ---
    "rbac.feature.checklists": {
        "en": "Checklists & incidents",
        "fr": "Checklists et incidents",
        "ar": "قوائم التحقق والحوادث",
    },
    "rbac.feature.scheduling": {"en": "Scheduling", "fr": "Plannings", "ar": "الجدولة"},
    "rbac.feature.staff_requests": {
        "en": "Staff inbox / requests",
        "fr": "Boîte personnel / demandes",
        "ar": "صندوق الموظفين / الطلبات",
    },
    "rbac.feature.operations_live": {
        "en": "Live Operations (daily demands & tasks)",
        "fr": "Opérations live (demandes et tâches)",
        "ar": "العمليات المباشرة (المطالب والمهام)",
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
