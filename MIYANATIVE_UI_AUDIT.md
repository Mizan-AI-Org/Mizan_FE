# MiyaNative UI Audit

**Status:** READ-ONLY - NO CODE CHANGED  
**Date:** 2026-08-10  
**Role:** Lead Product Designer + Senior Frontend Architect  
**Product:** Mizan AI - AI-native Operating System for businesses  
**Constraint:** Preserve Mizan brand (forest green, calm enterprise, Sora/Fraunces, rounded surfaces, restrained color). Improve hierarchy, density, IA, Miya as OS layer - not a chatbot island.

**Awaiting approval before implementation.**

---

## 1. Current state (summary)

The frontend already has a **credible AI-native shell foundation**:

| Layer | What exists today |
|-------|-------------------|
| Brand | Forest primary, Sora + Fraunces, subtle body wash, shadcn primitives |
| Shell | `DashboardLayout` + `IntentRail` + `MobileIntentDock` + global `MiyaCommandBar` (⌘K) |
| Miya home | `CommandCenter` on `/dashboard` (briefing, attention, live ops, activity, signals) |
| Module AI | `AiNativeWorkspace` on key routes (staff, tasks, ops live, scheduling, reports, analytics, automations, settings, staff-requests) |
| Confirm UX | `ActionPreview` (confirm / clarify / done) inside command bar |
| Docked chat | `MiyaWidget` right panel (FAB demoted to edge tab) |
| Context | `miyaPageContext` + `askMiya` / `focusEntityForMiya` |

This is a **good foundation**, not a finished OS. Visually it still often reads as **“dashboard + AI panels”** rather than **“the operating system of the business.”**

---

## 2. Problems (product & UX)

### 2.1 Hierarchy & three questions

Command should instantly answer:

1. What is happening?  
2. What needs my attention?  
3. What can Miya handle?

**Today:** Briefing + attention + metrics exist, but:

- Proactive insights often appear **before** Attention (wrong priority).  
- Parallel attention signals (`dashboard-summary` counts vs Command Center list).  
- No clear “Miya handled X today” value narrative on Automation.  
- Live ops tiles are inert (no next action).  
- Missing unified Work Queue on Command.  
- Page still feels section-stacked rather than decision-ordered.

### 2.2 Miya is still partly isolated

| Issue | Detail |
|-------|--------|
| Dual chat | Command bar has its own result UI; `MiyaWidget` is a separate conversation history |
| Generic Ask | Many “Ask Miya” buttons use the same prompt (“What needs my attention?”) instead of object-specific intents |
| Uneven coverage | Inventory, attendance, announcements, operational-issues, invoice detail, etc. lack `AiNativeWorkspace` / row actions |
| Chrome inconsistency | Emerald CTA vs outline `AskMiyaButton` vs ghost “Ask” vs rail primary |
| Staff shell | Still app-grid oriented; OS IA is manager-dashboard only |

### 2.3 Navigation is intent-labeled, module-backed

Rail groups say Command / Attention / Work / People / Business, but children deep-link classic modules:

- Incidents → `analytics?tab=incidents`  
- Checklists → same analytics app under Business  
- Knowledge → Settings twice  
- Approvals → staff-requests finance lane  
- No first-class `/attention` or `/work` routes  

Mobile dock drops Attention, Automation, Knowledge.

### 2.4 Screens still feel like admin CRUD

Staff, incidents, requests, scheduling largely retain table/directory mental models. Operational context (load, risk, Miya recommendation, next action) is not first-class on rows.

### 2.5 Information density & cards

- Card-in-card / glass panels still common in Miya surfaces.  
- Optional legacy widget grid on Command home undercuts OS clarity.  
- Arbitrary sizes (`text-[11px]`, `tracking-[0.14em]`) without a type ramp.  
- Empty/loading states often generic (“No data”, spinners) rather than operational + Miya-led.

### 2.6 Dark mode & brand continuity

Dark mode flips primary toward near-white; amber accent collapses; Miya uses parallel `slate`/`emerald`/`rose` instead of semantic tokens. Not a true dual-token dark system.

---

## 3. Design system inconsistencies

| Area | Current | Problem |
|------|---------|---------|
| Colors | CSS vars (`--primary` forest) **and** `slate-*`/`emerald-*` **and** hex `#00E676` | Three greens; brand fights slate habit |
| Typography | `font-sans` (Sora), `font-display` (Fraunces) only | No Display / Title / Section / Body / Meta scale |
| Spacing | Page shells + local `space-y-*` | Magic `pb-28`/`pb-32`; header padding ≠ content shell |
| Severity | Local helpers in CommandCenter, ProactiveInsights, AiNativeWorkspace, ActionPreview | Different vocabularies (CRITICAL vs URGENT_ACTION) |
| AI states | Ad hoc | No tokens for thinking / confirm / verified / failed / blocked |
| Badge/Button | shadcn default set | No success / warning / info / severity variants |
| Shadows | `--shadow-soft` underused | Miya uses `shadow-sm` + glass |
| RTL fonts | Tajawal referenced | Not loaded in `index.html` |
| Theme | Custom `ThemeToggle` + class | Sonner wired to unused `next-themes`; FOUC on dark |
| Platform admin | `opsStyles.ts` hex green recipe | Parallel DS |

---

## 4. Component inventory

### 4.1 Shell & navigation

| Component | Path |
|-----------|------|
| DashboardLayout | `src/components/layout/DashboardLayout.tsx` |
| IntentRail + MobileIntentDock | `src/components/layout/IntentRail.tsx` |
| UserAvatarMenu | `src/components/layout/UserAvatarMenu.tsx` |
| ThemeToggle | `src/components/ThemeToggle.tsx` |
| BrandLogo | `src/components/BrandLogo.tsx` |
| page-shell helpers | `src/lib/page-shell.ts` |

### 4.2 Miya / AI-native UI

| Component | Path | Role |
|-----------|------|------|
| MiyaCommandBar | `components/miya/MiyaCommandBar.tsx` | Global ⌘K command |
| ActionPreview | `components/miya/ActionPreview.tsx` | Confirm / clarify / done |
| AskMiyaButton | `components/miya/AskMiyaButton.tsx` | Inline open panel |
| CommandCenter | `components/miya/CommandCenter.tsx` | Home OS surface |
| ProactiveInsights | `components/miya/ProactiveInsights.tsx` | Proactive feed |
| MiyaActivityTimeline | `components/miya/MiyaActivityTimeline.tsx` | What Miya did |
| AiNativeWorkspace | `components/miya/AiNativeWorkspace.tsx` | Module intelligence layer |
| MiyaWidget | `components/MiyaWidget.tsx` | Docked chat panel |
| miyaPageContext | `lib/miyaPageContext.ts` | Context + events |
| OpsSearchBar | `components/OpsSearchBar.tsx` | Dead re-export |

### 4.3 Spec components missing as first-class UI

`AttentionCard` · `ApprovalCard` · `WorkQueue` · `WorkLane` · `EntityOpsCard` · `PeopleOpsRow` · `MiyaStructuredReply` · `MiyaVerifiedResult` · `SeverityBadge` · `EmptyOpsState` · `MiyaLoadingState` · `CommandSuggestionList` (dynamic from business state) · shared `SectionHeader`

### 4.4 shadcn primitives (`components/ui/`)

~49 components available (button, card, dialog, sheet, table, skeleton, command, badge, etc.). Gaps: semantic badge/button variants; no product-level composition kit for OS patterns.

### 4.5 Module coverage of AiNativeWorkspace

**Present:** Ops Live, Tasks, Staff, Scheduling, Reports, Analytics, Automations, Settings, Staff Requests (list).  
**Absent / weak:** Inventory, Attendance, Announcements, Operational Issues, Invoice detail early-return, Reservations, Menu/Kitchen, Cleaning, most overflow routes, Staff shell.

---

## 5. Proposed information architecture

```
ASK MIYA          ← global command (header) + contextual object actions
COMMAND           ← /dashboard  (home OS)
ATTENTION         ← /dashboard/attention  (first-class; not only hash)
WORK              ← /dashboard/work  (lanes) + deep links
  Live operations
  Tasks
  Incidents
  Requests
PEOPLE            ← operational workforce, not directory
  Staff
  Scheduling
BUSINESS          ← insights-first, not chart warehouse
  Analytics
  Locations
  Finance (approvals + invoices surface)
AUTOMATION        ← what Miya automates + last-7-days value
KNOWLEDGE         ← policies / SOPs / docs / Miya memory (not Settings stub)
SETTINGS          ← configuration & permissions only
```

**Hierarchy signal:** Miya → business state → execution → configuration.

**Overflow modules** (inventory, menu, kitchen…) remain reachable but visually demoted (Command “Tools” or Settings advanced).

---

## 6. Proposed design tokens

Preserve brand; stop inventing per-page color.

### 6.1 Color (semantic)

| Token | Light role | Dark role |
|-------|------------|-----------|
| `--primary` | Forest green (actions, Miya, healthy) | Keep **green brand**, not invert to white |
| `--foreground` / `--muted-foreground` | Text hierarchy | High-contrast slate-green neutrals |
| `--critical` | Rose/red | Same hue, adjusted luminance |
| `--high` | Amber | Same |
| `--watch` | Sky/blue-gray | Same |
| `--success` | Fresh green (distinct from primary CTA) | Defined |
| `--info` | Cool blue | Defined |
| `--surface` / `--surface-raised` / `--surface-sunken` | Replace glass white/70 recipes | True dark surfaces |
| `--ai-glow` | Subtle primary wash for Miya surfaces | Subtle, not neon |

**Rule:** Green = primary action / Miya / healthy. **Never** green for critical.

### 6.2 Typography scale

| Token | Use | Approx |
|-------|-----|--------|
| `display` | Greeting / hero status | Fraunces ~28–32 |
| `page-title` | Screen title | Fraunces/Sora ~22–24 |
| `section-title` | Attention, Today, Activity | Sora 600 ~15–16 |
| `card-title` | Entity name | Sora 600 ~14–15 |
| `body` | Explanations | Sora 400 ~14 |
| `secondary` | Why / impact | Sora 400 ~13 muted |
| `meta` | Timestamps, owners | Sora 500 ~12 muted |
| `caption` | Eyebrows / severity labels | Sora 600 ~11 uppercase tracked |

### 6.3 Spacing & radius

| Token | Value |
|-------|-------|
| `--space-section` | 32 / 40 |
| `--space-block` | 20 / 24 |
| `--space-inline` | 12 / 16 |
| `--radius-control` | 8–10 |
| `--radius-panel` | 12–16 |
| `--radius-pill` | reserved for severity chips only |

Reduce nested `rounded-2xl` cards.

### 6.4 AI / ops states

| State | UI treatment |
|-------|----------------|
| `miya-thinking` | Contextual copy + skeleton |
| `miya-confirm` | ActionPreview elevated |
| `miya-verified` | Check + verification line |
| `miya-failed` | Error + retry / Ask Miya |
| `miya-blocked` | Permission / policy message |
| Severity CRITICAL/HIGH/WATCH/APPROVAL | Shared `SeverityBadge` |

### 6.5 Motion

Calm only: 150–250ms ease for panel/drawer; reduced-motion respected; no bounce on OS chrome.

---

## 7. Screen-by-screen improvements

### 7.1 Command (home)

**Target structure:**

1. **Greeting + status** - “Good evening, Hamza.” / “3 things need your attention.”  
2. **Attention stack** - Critical → High → Medium/Watch → Approvals (WHAT / WHY / IMPACT / Miya recommends / actions).  
3. **Today at a glance** - people, active work, incidents, approvals, health (clickable → Work/Attention).  
4. **What Miya handled** - short value lines + View activity.  
5. **Optional:** business signals (compact).  
6. **Remove or bury** legacy module widget grid from default view.

**Components:** rebuild `CommandCenter` composition; stop dual attention sources; ProactiveInsights merge into Attention levels or sit under Watch.

### 7.2 Ask Miya (command bar)

- Visually primary in header (larger, calmer, OS-command weight).  
- ⌘K remains global.  
- **Dynamic suggestions** from Command Center / business state (not only recent localStorage).  
- Structured replies in dropdown (`MiyaStructuredReply`) + ActionPreview.  
- **Unify history** with docked panel OR demote panel to “expanded workspace” of the same session.  
- Loading: “Checking tomorrow’s schedule…” not spinner-only.

### 7.3 Attention (first-class)

- Route `/dashboard/attention` (rail leaf + keep `#attention` redirect).  
- Groups: CRITICAL · HIGH · WATCH · APPROVALS.  
- Cards with WHAT / WHY / IMPACT / RECOMMENDATION / [Review] [Ask Miya] [Apply when safe].  
- Not a table.

### 7.4 Work

- Hub `/dashboard/work` with lanes: Active · Blocked · Overdue · Upcoming · Completed.  
- Progressive disclosure; row = task/incident/request hybrid with owner, deadline, risk, next action, Ask Miya.  
- Deep links retain Live ops / Tasks / Incidents / Requests as focused views.

### 7.5 Incidents

- Operational cards: title, severity, age, assignee, impact, Miya recommendation, [Assign] [Create task] [Ask Miya].  
- Tables optional for bulk compare, not default story.

### 7.6 People

- Ops roster: working now, load (#tasks, overdue, incidents), Miya insight, Ask Miya.  
- Directory details secondary.

### 7.7 Business

- Insight strips: operations / finance / staffing / compliance / risk.  
- Charts behind progressive disclosure.

### 7.8 Automation

- “What Miya automates” toggles + last-7-days handled counts.  
- Makes AI value visible without opening builder first.

### 7.9 Knowledge

- Real surface: Policies · SOPs · Documents · Business knowledge · Miya memory.  
- Copy that this improves Miya decisions. Stop aliasing to Settings.

### 7.10 Settings

- Configuration & permissions only. Cleaner, denser forms, consistent tokens.

### 7.11 Empty / loading / verified

- Empty: “No open incidents.” + Miya line + next check CTA.  
- Loading: contextual Miya copy + skeletons.  
- Done: WHAT / WHO / RESULT / VERIFIED (extend ActionPreview + activity detail).

---

## 8. Responsive behavior (target)

| Breakpoint | Behavior |
|------------|----------|
| ≥1440 | Rail expanded + content + optional Miya panel |
| 1280–1439 | Rail collapsible; Command density tightens |
| Tablet | Rail → icon rail or sheet; Attention cards full width |
| Mobile | Bottom intent dock includes Command + Attention + Ask Miya; tables → card lists; command bar always reachable |

Do not merely shrink desktop. Keep Ask Miya globally available.

---

## 9. Accessibility (must-ship)

- Keyboard: ⌘K, Escape closes panels, focus return.  
- Visible focus rings on all actions.  
- Severity not color-only (icon + label).  
- ARIA for Attention regions, command dialog, Miya panel.  
- Contrast on green CTAs and dark surfaces.  
- `prefers-reduced-motion`.  
- Semantic headings on Command (h1 greeting/status, h2 sections).

---

## 10. Implementation order (after approval)

Do **not** start with cosmetic restyles of every module.

### Phase U0 - Design system foundation
1. Extend `index.css` + Tailwind: severity, AI states, type utilities, dark brand primary.  
2. Shared: `SeverityBadge`, `SectionHeader`, `EmptyOpsState`, `MiyaLoadingState`.  
3. Fix ThemeToggle FOUC + Sonner theme wiring.  
4. Deprecate parallel hex/emerald in Miya components in favor of tokens.

### Phase U1 - Command OS home
1. Rebuild Command hierarchy (greeting → attention → glance → Miya value).  
2. Merge attention sources; bury legacy widgets.  
3. Clickable glance + structured empty/loading.

### Phase U2 - Command bar + Miya session
1. Dynamic business-state suggestions.  
2. Structured reply components.  
3. Unify command bar ↔ panel session (or single surface).  
4. Stronger verified ActionPreview (“what / who / result / verified”).

### Phase U3 - Attention + Work hubs
1. `/attention` and `/work` routes + rail.  
2. AttentionCard / WorkLane components.  
3. Mobile dock includes Attention.

### Phase U4 - Contextual Miya everywhere
1. Object-specific Ask Miya copy on incidents, tasks, staff, schedule, invoices, compliance.  
2. Extend AiNativeWorkspace + row actions to missing modules.  
3. Kill generic-only CTAs.

### Phase U5 - Domain OS screens
1. Incidents operational cards.  
2. People ops roster.  
3. Business insights-first.  
4. Automation value dashboard.  
5. Knowledge real surface.

### Phase U6 - Polish
1. Responsive pass 1280→mobile.  
2. Dark mode QA.  
3. Microinteractions + a11y audit.  
4. Remove dead `OpsSearchBar` alias; trim card nesting.

**Hard rules during implementation:**

- Preserve Mizan brand identity.  
- No second AI brain; UI never authorizes mutations.  
- Keep Phase 14 intelligence baseline green (backend unchanged by this UI work unless API contracts already exist).  
- Every visual element must help a **decision** or **action**.

---

## 11. Out of scope for first implementation PR

- Rewriting Staff shell to full IntentRail (follow-on).  
- Building new backend domains (checklists/scheduling tools) - UI can surface recommendations that already exist.  
- Platform-admin redesign (separate `opsStyles` track).  
- Marketing landing pages.

---

## 12. Success criteria (UX)

| Criterion | Pass when |
|-----------|-----------|
| Three questions | Answerable above the fold on Command |
| Miya as layer | Contextual Ask on major objects; not FAB-primary |
| Attention | First-class, grouped, explainable without navigation |
| Command bar | Feels like OS command; dynamic suggestions; structured results |
| Trust | Actions show what/who/result/verified |
| Consistency | Shared type/severity/spacing; no triple green systems |
| Calm | Fewer nested cards; progressive disclosure |
| Responsive | Usable OS on laptop and phone |

---

## STOP

Audit complete. **No code was changed.**

Awaiting explicit approval to begin Phase U0 (design system foundation) and U1 (Command OS home).
