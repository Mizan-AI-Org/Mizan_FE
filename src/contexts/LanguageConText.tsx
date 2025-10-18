import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Dashboard
        'dashboard.title': 'Mizan Restaurant OS',
        'dashboard.operations': 'Restaurant Operations',
        'dashboard.select': 'Select an application to get started',
        'dashboard.no_apps': 'No Applications Available',
        'dashboard.contact_owner': 'Please contact your restaurant owner to assign you roles and permissions.',

        // Apps
        'app.analytics': 'Dashboards',
        'app.analytics.desc': 'View analytics and insights',
        'app.pos_integration': 'POS Integration',
        'app.pos_integration.desc': 'Connect to existing POS systems',
        'app.kitchen': 'Kitchen Display',
        'app.kitchen.desc': 'Manage kitchen orders',
        'app.inventory': 'Inventory',
        'app.inventory.desc': 'Track stock levels',
        'app.menu': 'Menu',
        'app.menu.desc': 'Update menu items',
        'app.tables': 'Tables',
        'app.tables.desc': 'Manage floor layouts',
        'app.staff_schedule': 'Staff Scheduling',
        'app.staff_schedule.desc': 'Schedule and manage staff',
        'app.staff_management': 'Staff Management',
        'app.staff_management.desc': 'Create accounts and assign roles',
        'app.ai_assistant': 'AI Assistant',
        'app.ai_assistant.desc': 'Get intelligent assistance',
        'app.settings': 'Settings',
        'app.settings.desc': 'Configure your system',

        // Common
        'common.sign_out': 'Sign Out',
        'common.profile': 'Profile Settings',
        'common.welcome': 'Welcome back',
    },
    fr: {
        // Dashboard
        'dashboard.title': 'Mizan OS Restaurant',
        'dashboard.operations': 'Opérations du Restaurant',
        'dashboard.select': 'Sélectionnez une application pour commencer',
        'dashboard.no_apps': 'Aucune Application Disponible',
        'dashboard.contact_owner': 'Veuillez contacter le propriétaire du restaurant pour vous attribuer des rôles et des permissions.',

        // Apps
        'app.analytics': 'Tableaux de Bord',
        'app.analytics.desc': 'Voir les analyses et les insights',
        'app.pos_integration': 'Intégration POS',
        'app.pos_integration.desc': 'Connecter aux systèmes POS existants',
        'app.kitchen': 'Affichage Cuisine',
        'app.kitchen.desc': 'Gérer les commandes de cuisine',
        'app.inventory': 'Inventaire',
        'app.inventory.desc': 'Suivre les niveaux de stock',
        'app.menu': 'Menu',
        'app.menu.desc': 'Mettre à jour les éléments du menu',
        'app.tables': 'Tables',
        'app.tables.desc': 'Gérer les plans de salle',
        'app.staff_schedule': 'Planification du Personnel',
        'app.staff_schedule.desc': 'Planifier et gérer le personnel',
        'app.staff_management': 'Gestion du Personnel',
        'app.staff_management.desc': 'Créer des comptes et attribuer des rôles',
        'app.ai_assistant': 'Assistant IA',
        'app.ai_assistant.desc': 'Obtenir une assistance intelligente',
        'app.settings': 'Paramètres',
        'app.settings.desc': 'Configurer votre système',

        // Common
        'common.sign_out': 'Déconnexion',
        'common.profile': 'Paramètres du Profil',
        'common.welcome': 'Bienvenue',
    },
    ar: {
        // Dashboard
        'dashboard.title': 'ميزان نظام المطاعم',
        'dashboard.operations': 'عمليات المطعم',
        'dashboard.select': 'اختر تطبيقًا للبدء',
        'dashboard.no_apps': 'لا توجد تطبيقات متاحة',
        'dashboard.contact_owner': 'يرجى الاتصال بمالك المطعم لتعيين الأدوار والصلاحيات لك.',

        // Apps
        'app.analytics': 'لوحات المعلومات',
        'app.analytics.desc': 'عرض التحليلات والرؤى',
        'app.pos_integration': 'تكامل نقاط البيع',
        'app.pos_integration.desc': 'الاتصال بأنظمة نقاط البيع الحالية',
        'app.kitchen': 'شاشة المطبخ',
        'app.kitchen.desc': 'إدارة طلبات المطبخ',
        'app.inventory': 'المخزون',
        'app.inventory.desc': 'تتبع مستويات المخزون',
        'app.menu': 'القائمة',
        'app.menu.desc': 'تحديث عناصر القائمة',
        'app.tables': 'الطاولات',
        'app.tables.desc': 'إدارة تخطيطات الطوابق',
        'app.staff_schedule': 'جدولة الموظفين',
        'app.staff_schedule.desc': 'جدولة وإدارة الموظفين',
        'app.staff_management': 'إدارة الموظفين',
        'app.staff_management.desc': 'إنشاء الحسابات وتعيين الأدوار',
        'app.ai_assistant': 'المساعد الذكي',
        'app.ai_assistant.desc': 'احصل على مساعدة ذكية',
        'app.settings': 'الإعدادات',
        'app.settings.desc': 'تكوين النظام الخاص بك',

        // Common
        'common.sign_out': 'تسجيل الخروج',
        'common.profile': 'إعدادات الملف الشخصي',
        'common.welcome': 'مرحبًا بك',
    },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('language');
        return (saved as Language) || 'en';
    });

    const isRTL = language === 'ar';

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language, isRTL]);

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
