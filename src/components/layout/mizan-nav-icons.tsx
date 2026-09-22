import React from "react";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  title?: string;
};

const base = "shrink-0";

/** Custom Mizan OS nav icons - slightly bolder, distinctive silhouettes. */

export function IconCommand({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.85" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M12 4.2v2.4M12 17.4v2.4M4.2 12h2.4M17.4 12h2.4"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAttention({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <path
        d="M12 3.8 21 19.2H3L12 3.8Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path d="M12 9.2v4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function IconWork({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <rect
        x="3.5"
        y="8"
        width="17"
        height="11.5"
        rx="2.2"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <path
        d="M8.2 8V6.6A2.1 2.1 0 0 1 10.3 4.5h3.4A2.1 2.1 0 0 1 15.8 6.6V8"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path d="M3.5 12.5h17" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

export function IconPeople({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="9" cy="8.2" r="2.6" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.85" />
      <circle cx="16.2" cy="9" r="2.1" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.8 18.6c.7-2.8 2.9-4.2 5.2-4.2s4.5 1.4 5.2 4.2"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M14.2 14.8c1.5-.5 3.2-.2 4.4 1.5.5.7.8 1.5.9 2.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBusiness({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <path
        d="M5 19.5V8.2L12 4.5l7 3.7v11.3"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path d="M9.2 19.5v-5.2h5.6v5.2" stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
      <path d="M9.5 10.2h.1M12 10.2h.1M14.5 10.2h.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconSocial({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="18" cy="5" r="2.75" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="6" cy="12" r="2.75" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="19" r="2.75" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAutomation({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="6.2" cy="7" r="2.3" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.8" cy="7" r="2.3" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="17.2" r="2.5" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.2 8.4 10.6 15M15.8 8.4 13.4 15M8.5 7h7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="12" cy="12" r="3.1" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.85" />
      <path
        d="M12 3.6v2M12 18.4v2M3.6 12h2M18.4 12h2M6.1 6.1l1.4 1.4M16.5 16.5l1.4 1.4M17.9 6.1l-1.4 1.4M7.5 16.5l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconProducts({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <path
        d="M4.5 8.2 12 4.5l7.5 3.7v8.6L12 20.5 4.5 16.8V8.2Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path d="M12 4.5v16M4.5 8.2 12 12.2l7.5-4" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

export function IconCustomers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <circle cx="12" cy="8" r="2.6" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.85" />
      <path d="M6.2 19c.8-3.1 2.8-4.8 5.8-4.8s5 1.7 5.8 4.8" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <path d="M16.8 8.8c1.6-.2 2.8 1 3.2 2.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconSuppliers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <path
        d="M3.5 16.5V8.8h10.2v7.7"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path d="M13.7 11.2h4.2L20.5 14v2.5h-2.2" stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
      <circle cx="7.2" cy="16.8" r="1.7" stroke="currentColor" strokeWidth="1.85" />
      <circle cx="16.6" cy="16.8" r="1.7" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

export function IconFinancials({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <rect x="3.6" y="4.8" width="16.8" height="14.4" rx="2.2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.85" />
      <path d="M7.2 14.8 10.4 11l2.4 2.3 4-4.6" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconIntelligence({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      <path
        d="M12 3.5 13.8 8.2l5 .7-3.6 3.5.85 5L12 15.8l-4.05 2.1.85-5L5.2 8.9l5-.7L12 3.5Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 19.5h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}
