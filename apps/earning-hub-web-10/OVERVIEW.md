# Earning Hub — Referral Operations Platform

## What It Is
A production-grade referral & earn system that manages the complete referral lifecycle: link generation → attribution → lead tracking → qualification → cashback → reward → payment → audit.

## Who It's For
- **Admin**: Full referral operations control — generate links, manage lifecycle (pause/resume/terminate/revoke), track referral leads through multi-track statuses, approve cashback/rewards, and view complete audit trails
- **Users/Referrers**: Generate referral links, share with friends, track referral status and earnings
- **Referred Users**: Discover offers, submit leads, and earn cashback through referral links

## Key Capabilities

### Referral Network Command Center
Complete referral management dashboard with metrics cards, visual funnel, financial summary, needs-attention alerts, advanced multi-filter search, and full referral detail drawers with status management and audit timeline.

### Generated Links Dashboard
Full link lifecycle management — create, pause, resume, terminate, revoke, extend expiry. Context-aware actions per link state. Referrer and offer performance reports.

### Data Architecture
- **Referral Links**: Full lifecycle (Draft/Active/Paused/Expired/Terminated/Revoked/Disabled) with click/lead counters, expiry, referral limits, pause/terminate/revoke tracking
- **Referral Leads**: Multi-track statuses (Lead, Cashback, Reward, Payment) with financial fields and qualification timestamps
- **Referral Audit Log**: Immutable event history for every state change with actor, reason, and previous/new values

### State Machine Validation
All status transitions are validated server-side. Invalid transitions are blocked with clear error messages. Every change creates an immutable audit event.
