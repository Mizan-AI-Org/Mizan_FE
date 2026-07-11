#!/usr/bin/env python3
"""Merge new i18n keys into en/fr/ar locale files with proper translations."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "locales"

# key -> {en, fr, ar}
KEYS: dict[str, dict[str, str]] = {
    # --- Staff requests inbox (redesign) ---
    "staff.requests.eyebrow": {
        "en": "Staff inbox",
        "fr": "Boîte de réception staff",
        "ar": "صندوق وارد الموظفين",
    },
    "staff.requests.default_subtitle": {
        "en": "Triage WhatsApp and portal requests — assign, reply, escalate, or close.",
        "fr": "Triez les demandes WhatsApp et portail — assignez, répondez, escaladez ou clôturez.",
        "ar": "فرز طلبات واتساب والبوابة — عيّن، ردّ، صعّد أو أغلق.",
    },
    "staff.requests.assigned_to_me": {
        "en": "Assigned to me",
        "fr": "Assignées à moi",
        "ar": "المُسندة إليّ",
    },
    "staff.requests.assigned_to_me_title": {
        "en": "Show only requests assigned to you",
        "fr": "Afficher uniquement les demandes qui vous sont assignées",
        "ar": "عرض الطلبات المُسندة إليك فقط",
    },
    "staff.requests.status_pending": {
        "en": "Pending",
        "fr": "En attente",
        "ar": "قيد الانتظار",
    },
    "staff.requests.status_in_progress": {
        "en": "In progress",
        "fr": "En cours",
        "ar": "قيد التنفيذ",
    },
    "staff.requests.status_waiting_on": {
        "en": "Waiting on",
        "fr": "En attente de",
        "ar": "بانتظار",
    },
    "staff.requests.status_rejected": {
        "en": "Rejected",
        "fr": "Refusées",
        "ar": "مرفوضة",
    },
    "staff.requests.status_escalated": {
        "en": "Escalated",
        "fr": "Escaladées",
        "ar": "مُصعَّدة",
    },
    "staff.requests.status_closed": {
        "en": "Closed",
        "fr": "Clôturées",
        "ar": "مغلقة",
    },
    "staff.requests.search_placeholder": {
        "en": "Search subject, staff, message…",
        "fr": "Rechercher objet, staff, message…",
        "ar": "ابحث في الموضوع أو الموظف أو الرسالة…",
    },
    "staff.requests.clear": {
        "en": "Clear",
        "fr": "Effacer",
        "ar": "مسح",
    },
    "staff.requests.all_lanes": {
        "en": "All lanes",
        "fr": "Tous les onglets",
        "ar": "كل المسارات",
    },
    "staff.requests.filter_lanes_aria": {
        "en": "Filter inbox by command centre lane",
        "fr": "Filtrer la boîte par onglet du centre de commande",
        "ar": "تصفية الصندوق حسب مسار مركز القيادة",
    },
    "staff.requests.priority_filter": {
        "en": "Priority: {{priority}}",
        "fr": "Priorité : {{priority}}",
        "ar": "الأولوية: {{priority}}",
    },
    "staff.requests.clear_priority": {
        "en": "Clear priority filter",
        "fr": "Effacer le filtre de priorité",
        "ar": "مسح فلتر الأولوية",
    },
    "staff.requests.inbox": {
        "en": "Inbox",
        "fr": "Boîte de réception",
        "ar": "الوارد",
    },
    "staff.requests.empty_title": {
        "en": "No requests here",
        "fr": "Aucune demande ici",
        "ar": "لا توجد طلبات هنا",
    },
    "staff.requests.empty_lane": {
        "en": "Nothing in {{lane}} for {{status}}.",
        "fr": "Rien dans {{lane}} pour {{status}}.",
        "ar": "لا شيء في {{lane}} لحالة {{status}}.",
    },
    "staff.requests.empty_status": {
        "en": "Nothing marked {{status}} right now.",
        "fr": "Rien de marqué {{status}} pour le moment.",
        "ar": "لا يوجد شيء بحالة {{status}} الآن.",
    },
    "staff.requests.load_failed": {
        "en": "Failed to load requests.",
        "fr": "Échec du chargement des demandes.",
        "ar": "تعذّر تحميل الطلبات.",
    },
    "staff.requests.detail_load_failed": {
        "en": "Failed to load request.",
        "fr": "Échec du chargement de la demande.",
        "ar": "تعذّر تحميل الطلب.",
    },
    "staff.requests.task_load_failed": {
        "en": "Failed to load task.",
        "fr": "Échec du chargement de la tâche.",
        "ar": "تعذّر تحميل المهمة.",
    },
    "staff.requests.select_title": {
        "en": "Select a request",
        "fr": "Sélectionnez une demande",
        "ar": "اختر طلباً",
    },
    "staff.requests.select_hint": {
        "en": "Pick an item from the inbox to see the full message, assignment, activity, and actions.",
        "fr": "Choisissez un élément de la boîte pour voir le message, l'assignation, l'activité et les actions.",
        "ar": "اختر عنصراً من الوارد لعرض الرسالة الكاملة والتعيين والنشاط والإجراءات.",
    },
    "staff.requests.unknown_sender": {
        "en": "Unknown sender",
        "fr": "Expéditeur inconnu",
        "ar": "مرسل غير معروف",
    },
    "staff.requests.from": {
        "en": "From",
        "fr": "De",
        "ar": "من",
    },
    "staff.requests.no_phone": {
        "en": "No phone on file",
        "fr": "Aucun téléphone enregistré",
        "ar": "لا يوجد رقم هاتف",
    },
    "staff.requests.unassigned": {
        "en": "Unassigned",
        "fr": "Non assigné",
        "ar": "غير مُسند",
    },
    "staff.requests.unassigned_hint": {
        "en": "Unassigned — reassign or set a category owner in Settings.",
        "fr": "Non assigné — réassignez ou définissez un responsable de catégorie dans Paramètres.",
        "ar": "غير مُسند — أعد التعيين أو حدّد مالكاً للفئة في الإعدادات.",
    },
    "staff.requests.assigned_to": {
        "en": "Assigned to",
        "fr": "Assigné à",
        "ar": "مُسند إلى",
    },
    "staff.requests.reassign": {
        "en": "Reassign",
        "fr": "Réassigner",
        "ar": "إعادة تعيين",
    },
    "staff.requests.message_from": {
        "en": "Message from {{name}}",
        "fr": "Message de {{name}}",
        "ar": "رسالة من {{name}}",
    },
    "staff.requests.voice_note": {
        "en": "Original voice note",
        "fr": "Note vocale originale",
        "ar": "الملاحظة الصوتية الأصلية",
    },
    "staff.requests.transcript": {
        "en": "Transcript",
        "fr": "Transcription",
        "ar": "النص المكتوب",
    },
    "staff.requests.meta_source": {
        "en": "Source",
        "fr": "Source",
        "ar": "المصدر",
    },
    "staff.requests.meta_received": {
        "en": "Received",
        "fr": "Reçu",
        "ar": "تاريخ الاستلام",
    },
    "staff.requests.meta_updated": {
        "en": "Updated",
        "fr": "Mis à jour",
        "ar": "آخر تحديث",
    },
    "staff.requests.meta_reference": {
        "en": "Reference",
        "fr": "Référence",
        "ar": "المرجع",
    },
    "staff.requests.activity": {
        "en": "Activity",
        "fr": "Activité",
        "ar": "النشاط",
    },
    "staff.requests.activity_empty": {
        "en": "No activity yet — replies and status changes appear here.",
        "fr": "Aucune activité pour l'instant — les réponses et changements de statut apparaissent ici.",
        "ar": "لا نشاط بعد — تظهر الردود وتغييرات الحالة هنا.",
    },
    "staff.requests.author_miya": {
        "en": "Miya AI",
        "fr": "Miya AI",
        "ar": "ميا الذكية",
    },
    "staff.requests.author_manager": {
        "en": "Manager",
        "fr": "Manager",
        "ar": "المدير",
    },
    "staff.requests.start_working": {
        "en": "Start working",
        "fr": "Commencer",
        "ar": "بدء العمل",
    },
    "staff.requests.waiting_on_action": {
        "en": "Waiting on…",
        "fr": "En attente de…",
        "ar": "بانتظار…",
    },
    "staff.requests.resume": {
        "en": "Resume",
        "fr": "Reprendre",
        "ar": "استئناف",
    },
    "staff.requests.escalate": {
        "en": "Escalate",
        "fr": "Escalader",
        "ar": "تصعيد",
    },
    "staff.requests.close": {
        "en": "Close",
        "fr": "Clôturer",
        "ar": "إغلاق",
    },
    "staff.requests.reply_placeholder": {
        "en": "Reply to staff or leave an internal note…",
        "fr": "Répondre au staff ou laisser une note interne…",
        "ar": "رد على الموظف أو اترك ملاحظة داخلية…",
    },
    "staff.requests.send": {
        "en": "Send",
        "fr": "Envoyer",
        "ar": "إرسال",
    },
    "staff.requests.send_hint": {
        "en": "⌘/Ctrl + Enter to send · Replies notify staff on WhatsApp when linked",
        "fr": "⌘/Ctrl + Entrée pour envoyer · Les réponses notifient le staff sur WhatsApp si lié",
        "ar": "⌘/Ctrl + Enter للإرسال · الردود تُبلّغ الموظف على واتساب عند الربط",
    },
    "staff.requests.waiting_reason_default": {
        "en": "Waiting on external dependency",
        "fr": "En attente d'une dépendance externe",
        "ar": "بانتظار اعتماد خارجي",
    },
    "staff.requests.new_badge": {
        "en": "NEW",
        "fr": "NOUVEAU",
        "ar": "جديد",
    },
    "staff.requests.voice_badge": {
        "en": "VOICE",
        "fr": "VOIX",
        "ar": "صوت",
    },
    "staff.requests.voice_title": {
        "en": "Originally a WhatsApp voice note",
        "fr": "Note vocale WhatsApp à l'origine",
        "ar": "كانت في الأصل ملاحظة صوتية على واتساب",
    },
    "staff.requests.loading": {
        "en": "Loading…",
        "fr": "Chargement…",
        "ar": "جاري التحميل…",
    },
    "staff.requests.no_description": {
        "en": "No description provided.",
        "fr": "Aucune description fournie.",
        "ar": "لم يُقدَّم وصف.",
    },
    "staff.requests.dashboard_task": {
        "en": "Dashboard task",
        "fr": "Tâche du tableau de bord",
        "ar": "مهمة لوحة التحكم",
    },
    "staff.requests.tasks_demands_title": {
        "en": "Tasks & Demands",
        "fr": "Tâches et demandes",
        "ar": "المهام والطلبات",
    },
    "staff.requests.tasks_demands_subtitle": {
        "en": "Miya-created and ingested tasks — review, reassign, and close from here.",
        "fr": "Tâches créées ou ingérées par Miya — revue, réassignation et clôture ici.",
        "ar": "مهام أنشأتها أو استقبلتها ميا — راجع وأعد التعيين وأغلق من هنا.",
    },
    "staff.requests.mark_paid": {
        "en": "Mark as paid",
        "fr": "Marquer comme payée",
        "ar": "تعليم كمدفوعة",
    },
    "staff.requests.updating": {
        "en": "Updating…",
        "fr": "Mise à jour…",
        "ar": "جاري التحديث…",
    },
    "staff.requests.invoice_paid_toast": {
        "en": "Invoice marked as paid.",
        "fr": "Facture marquée comme payée.",
        "ar": "تم تعليم الفاتورة كمدفوعة.",
    },
    "staff.requests.invoice_paid_error": {
        "en": "Could not mark invoice as paid.",
        "fr": "Impossible de marquer la facture comme payée.",
        "ar": "تعذّر تعليم الفاتورة كمدفوعة.",
    },
    "staff.requests.all_requests": {
        "en": "All Requests",
        "fr": "Toutes les demandes",
        "ar": "كل الطلبات",
    },
    "staff.requests.default_subject": {
        "en": "Staff request",
        "fr": "Demande staff",
        "ar": "طلب موظف",
    },
    "staff.requests.search_tasks": {
        "en": "Search tasks...",
        "fr": "Rechercher des tâches…",
        "ar": "ابحث في المهام…",
    },
    "staff.requests.inbox_tasks_demands": {
        "en": "Inbox · Tasks & Demands",
        "fr": "Boîte · Tâches et demandes",
        "ar": "الوارد · المهام والطلبات",
    },
    "staff.requests.task_details": {
        "en": "Task details",
        "fr": "Détails de la tâche",
        "ar": "تفاصيل المهمة",
    },
    "staff.requests.select_task": {
        "en": "Select a task on the left.",
        "fr": "Sélectionnez une tâche à gauche.",
        "ar": "اختر مهمة من اليسار.",
    },
    "staff.requests.no_tasks": {
        "en": "No tasks found.",
        "fr": "Aucune tâche trouvée.",
        "ar": "لم تُعثر على مهام.",
    },
    "staff.requests.load_tasks_failed": {
        "en": "Failed to load tasks.",
        "fr": "Échec du chargement des tâches.",
        "ar": "تعذّر تحميل المهام.",
    },
    "staff.requests.invoice_load_failed": {
        "en": "Failed to load invoice.",
        "fr": "Échec du chargement de la facture.",
        "ar": "تعذّر تحميل الفاتورة.",
    },
    "staff.requests.invoice_eyebrow": {
        "en": "Finance · Invoice",
        "fr": "Finance · Facture",
        "ar": "المالية · فاتورة",
    },
    "staff.requests.invoice_amount": {
        "en": "Amount",
        "fr": "Montant",
        "ar": "المبلغ",
    },
    "staff.requests.invoice_due_date": {
        "en": "Due date",
        "fr": "Échéance",
        "ar": "تاريخ الاستحقاق",
    },
    "staff.requests.invoice_notes": {
        "en": "Notes",
        "fr": "Notes",
        "ar": "ملاحظات",
    },
    "staff.requests.invoice_document": {
        "en": "Invoice document",
        "fr": "Document de facture",
        "ar": "مستند الفاتورة",
    },
    "staff.requests.invoice_no_document": {
        "en": "No document was attached to this invoice. Ask the sender to resend the photo or PDF on WhatsApp.",
        "fr": "Aucun document joint à cette facture. Demandez à l'expéditeur de renvoyer la photo ou le PDF sur WhatsApp.",
        "ar": "لم يُرفق مستند بهذه الفاتورة. اطلب من المرسل إعادة إرسال الصورة أو PDF عبر واتساب.",
    },
    "staff.requests.invoice_status_paid": {
        "en": "Paid",
        "fr": "Payée",
        "ar": "مدفوعة",
    },
    "staff.requests.invoice_status_voided": {
        "en": "Voided",
        "fr": "Annulée",
        "ar": "ملغاة",
    },
    "staff.requests.invoice_status_draft": {
        "en": "Draft",
        "fr": "Brouillon",
        "ar": "مسودة",
    },
    "staff.requests.invoice_status_open": {
        "en": "Open",
        "fr": "Ouverte",
        "ar": "مفتوحة",
    },
    "staff.requests.status_completed": {
        "en": "Completed",
        "fr": "Terminées",
        "ar": "مكتملة",
    },
    "staff.requests.status_cancelled": {
        "en": "Cancelled",
        "fr": "Annulées",
        "ar": "ملغاة",
    },
    "staff.requests.task_fallback": {
        "en": "Task",
        "fr": "Tâche",
        "ar": "مهمة",
    },
    "staff.requests.escalated_default": {
        "en": "Escalated",
        "fr": "Escaladée",
        "ar": "مُصعَّد",
    },
    "staff.requests.rel_just_now": {
        "en": "just now",
        "fr": "à l'instant",
        "ar": "الآن",
    },
    "staff.requests.rel_minutes": {
        "en": "{{count}}m ago",
        "fr": "il y a {{count}} min",
        "ar": "منذ {{count}} د",
    },
    "staff.requests.rel_hours": {
        "en": "{{count}}h ago",
        "fr": "il y a {{count}} h",
        "ar": "منذ {{count}} س",
    },
    "staff.requests.rel_days": {
        "en": "{{count}}d ago",
        "fr": "il y a {{count}} j",
        "ar": "منذ {{count}} ي",
    },
    "staff.requests.rel_weeks": {
        "en": "{{count}}w ago",
        "fr": "il y a {{count}} sem.",
        "ar": "منذ {{count}} أ",
    },
    "dashboard.ops_search.section_staff_requests": {
        "en": "Staff requests",
        "fr": "Demandes staff",
        "ar": "طلبات الموظفين",
    },
    # --- Ops search ---
    "dashboard.ops_search.placeholder": {
        "en": "Search staff, tasks, requests…",
        "fr": "Rechercher staff, tâches, demandes…",
        "ar": "ابحث عن موظفين أو مهام أو طلبات…",
    },
    "dashboard.ops_search.aria": {
        "en": "Search operations",
        "fr": "Rechercher dans les opérations",
        "ar": "البحث في العمليات",
    },
    "dashboard.ops_search.searching": {
        "en": "Searching…",
        "fr": "Recherche…",
        "ar": "جاري البحث…",
    },
    "dashboard.ops_search.failed": {
        "en": "Search failed. Try again.",
        "fr": "Échec de la recherche. Réessayez.",
        "ar": "فشل البحث. حاول مرة أخرى.",
    },
    "dashboard.ops_search.empty": {
        "en": "No matches.",
        "fr": "Aucun résultat.",
        "ar": "لا توجد نتائج.",
    },
    "dashboard.ops_search.section_staff": {
        "en": "Staff",
        "fr": "Personnel",
        "ar": "الموظفون",
    },
    "dashboard.ops_search.section_tasks": {
        "en": "Tasks",
        "fr": "Tâches",
        "ar": "المهام",
    },
    "dashboard.ops_search.section_requests": {
        "en": "Requests",
        "fr": "Demandes",
        "ar": "الطلبات",
    },
    "dashboard.ops_search.absent": {
        "en": "Absent",
        "fr": "Absent",
        "ar": "غائب",
    },
    "dashboard.ops_search.open_tasks": {
        "en": "{{count}} open",
        "fr": "{{count}} ouvertes",
        "ar": "{{count}} مفتوحة",
    },
    # --- Staff daily progress widget ---
    "dashboard.staff_daily_progress.title": {
        "en": "Staff progress",
        "fr": "Progression du staff",
        "ar": "تقدّم الموظفين",
    },
    "dashboard.staff_daily_progress.loading": {
        "en": "Loading progress…",
        "fr": "Chargement de la progression…",
        "ar": "جاري تحميل التقدّم…",
    },
    "dashboard.staff_daily_progress.error": {
        "en": "Couldn't load staff progress.",
        "fr": "Impossible de charger la progression du staff.",
        "ar": "تعذّر تحميل تقدّم الموظفين.",
    },
    "dashboard.staff_daily_progress.empty": {
        "en": "No staff progress for today.",
        "fr": "Aucune progression staff pour aujourd'hui.",
        "ar": "لا يوجد تقدّم للموظفين اليوم.",
    },
    "dashboard.staff_daily_progress.retry": {
        "en": "Retry",
        "fr": "Réessayer",
        "ar": "إعادة المحاولة",
    },
    "dashboard.staff_daily_progress.absent": {
        "en": "Absent",
        "fr": "Absent",
        "ar": "غائب",
    },
    "dashboard.staff_daily_progress.fallback_name": {
        "en": "Staff",
        "fr": "Staff",
        "ar": "موظف",
    },
    "dashboard.widget_add.staff_daily_progress": {
        "en": "Per-staff task progress today — done/total with absent badges.",
        "fr": "Progression des tâches par personne aujourd'hui — fait/total avec badges d'absence.",
        "ar": "تقدّم مهام كل موظف اليوم — منجز/الإجمالي مع شارات الغياب.",
    },
    # --- Validation / proof / absent on category rows ---
    "dashboard.category_tasks.not_validated": {
        "en": "not validated by manager",
        "fr": "non validé par le manager",
        "ar": "غير مُعتمد من المدير",
    },
    "dashboard.category_tasks.validated": {
        "en": "validated",
        "fr": "validé",
        "ar": "مُعتمد",
    },
    "dashboard.category_tasks.photo_proof_needed": {
        "en": "photo proof needed",
        "fr": "preuve photo requise",
        "ar": "يلزم إثبات بالصورة",
    },
    "dashboard.category_tasks.photo_proof_ok": {
        "en": "proof ✓",
        "fr": "preuve ✓",
        "ar": "إثبات ✓",
    },
    "dashboard.category_tasks.absent": {
        "en": "Absent",
        "fr": "Absent",
        "ar": "غائب",
    },
    "dashboard.category_tasks.absent_title": {
        "en": "Assignee is on approved leave today",
        "fr": "L'assigné est en congé approuvé aujourd'hui",
        "ar": "المُسند في إجازة معتمدة اليوم",
    },
    "dashboard.category_tasks.validate": {
        "en": "Validate",
        "fr": "Valider",
        "ar": "اعتماد",
    },
    "dashboard.category_tasks.validate_title": {
        "en": "Mark validated by manager",
        "fr": "Marquer comme validé par le manager",
        "ar": "تعليم كمعتمد من المدير",
    },
    "dashboard.category_tasks.validate_success": {
        "en": "Marked as validated",
        "fr": "Marqué comme validé",
        "ar": "تم الاعتماد",
    },
    "dashboard.category_tasks.validate_error": {
        "en": "Could not validate",
        "fr": "Impossible de valider",
        "ar": "تعذّر الاعتماد",
    },
    # --- Take orders station / validation ---
    "take_orders.station.bar": {
        "en": "Bar",
        "fr": "Bar",
        "ar": "البار",
    },
    "take_orders.station.floor": {
        "en": "Floor",
        "fr": "Salle",
        "ar": "الصالة",
    },
    "take_orders.station.kitchen": {
        "en": "Kitchen",
        "fr": "Cuisine",
        "ar": "المطبخ",
    },
    "take_orders.station.other": {
        "en": "Other",
        "fr": "Autre",
        "ar": "أخرى",
    },
    "take_orders.station.all": {
        "en": "All stations",
        "fr": "Tous les postes",
        "ar": "كل المحطات",
    },
    "take_orders.station.label": {
        "en": "Station",
        "fr": "Poste",
        "ar": "المحطة",
    },
    "take_orders.validation.not_validated": {
        "en": "not validated by manager",
        "fr": "non validé par le manager",
        "ar": "غير مُعتمد من المدير",
    },
    "take_orders.validation.validated": {
        "en": "validated",
        "fr": "validé",
        "ar": "مُعتمد",
    },
    "take_orders.validation.validate": {
        "en": "Validate",
        "fr": "Valider",
        "ar": "اعتماد",
    },
    "take_orders.validation.success": {
        "en": "Order validated",
        "fr": "Commande validée",
        "ar": "تم اعتماد الطلب",
    },
    "take_orders.validation.error": {
        "en": "Could not validate order",
        "fr": "Impossible de valider la commande",
        "ar": "تعذّر اعتماد الطلب",
    },
    # --- Custom widget keywords ---
    "dashboard.manage.routing_keywords_placeholder": {
        "en": "New Year's event, NYE",
        "fr": "Événement du Nouvel An, NYE",
        "ar": "حفل رأس السنة، NYE",
    },
    "dashboard.manage.routing_keywords_hint": {
        "en": "Tasks mentioning these keywords route to this widget.",
        "fr": "Les tâches mentionnant ces mots-clés sont routées vers ce widget.",
        "ar": "المهام التي تذكر هذه الكلمات تُوجَّه إلى هذه الأداة.",
    },
    "dashboard.manage.routing_keywords_label": {
        "en": "Routing keywords",
        "fr": "Mots-clés de routage",
        "ar": "كلمات التوجيه",
    },
}


def merge(path: Path, lang: str) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    added = 0
    for key, tril in KEYS.items():
        val = tril[lang]
        if key not in data or data[key] != val:
            if key not in data:
                added += 1
            data[key] = val
    # Keep deterministic key order by sorting? Prefer preserve existing order then append new.
    # Rebuild: existing keys in order, then any new keys sorted.
    existing_keys = list(data.keys())
    # Re-read to preserve order properly
    original = json.loads(path.read_text(encoding="utf-8"))
    for key, tril in KEYS.items():
        original[key] = tril[lang]
    path.write_text(json.dumps(original, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def main() -> None:
    for lang in ("en", "fr", "ar"):
        path = ROOT / f"{lang}.json"
        n = merge(path, lang)
        print(f"{lang}: wrote {len(KEYS)} keys ({n} newly added)")


if __name__ == "__main__":
    main()
