# Product experience redesign

Baseline: feature branch feat/kaamproof-product, clean at 4c7dd77. Reviewed README,
architecture, models, dashboard/jobs/payment endpoints, shared components, worker
and customer surfaces, Next.js guidance and existing test suites.

1. Replace the green identity with navy/slate, electric blue and amber design tokens.
2. Extend the owned dashboard read model with Decimal-safe currency totals,
   time-bucketed recorded payments, current work, customer context and attention.
   Preserve existing responses and all authentication/domain mutation controls.
3. Build a command centre: personalized header, six linked KPIs, stage pipeline,
   actionable attention, financial chart/transactions, searchable recent work,
   attributed activity, customer insights and useful first-use onboarding.
4. Connect global search, filtered URLs, payment navigation and agreement/customer
   quick actions. Carry the new system through every existing surface.
5. Execute database/component/browser suites, axe, 1440/1024/768/390px checks,
   lint/type/build, Docker and hosted CI. Capture empty and populated dashboards.

Financial semantics: payments remain self-reported; approved contract values and
payment balances use Decimal server-side. Currencies never sum together. Period
filters affect payment analytics; lifetime KPIs are explicitly labeled. There is
no job due-date field, so no invented overdue-job claims or fabricated trends.
No schema change is expected; last activity is derived from actual events.
