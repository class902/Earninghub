# Data model

Schema of the SQLite database behind EarningHub. The source of truth is [`apps/worker/src/db/schema.ts`](../apps/worker/src/db/schema.ts); every table also has `id`, `created_at` and `updated_at` columns.

| Table | Fields | Purpose |
|---|---:|---|
| [Offers](#offers) | 33 | Cashback offers shown on the site (payout, steps, form config, slots, referral cuts). |
| [Leads](#leads) | 15 | User-submitted leads for an offer, with status, remarks and action config. |
| [Posters](#posters) | 5 | Promotional poster images shown on the home page. |
| [Cashback Forms](#cashback-forms) | 12 | Standalone cashback form definitions (public slug, partner link, embed flag). |
| [Cashback Submissions](#cashback-submissions) | 4 | Submissions received through cashback forms. |
| [Referrals](#referrals) | 5 | Legacy UPI-to-UPI referral records. |
| [App Backups](#app-backups) | 5 | Admin backups and system records (OTP / credential records). |
| [Referral Links](#referral-links) | 30 | Generated referral links with lifecycle state and counters. |
| [Referral Leads](#referral-leads) | 28 | Leads attributed to a referral link, with lead / cashback / reward / payment tracks. |
| [Referral Audit Log](#referral-audit-log) | 10 | Immutable event history for referral state changes. |

## Offers

| Field | Type | Notes |
|---|---|---|
| Name | `single_line_text` |  |
| Emoji | `single_line_text` |  |
| Description | `single_line_text` |  |
| Steps | `long_text` |  |
| Payout | `number` |  |
| Category | `single_select` | Options: Saving Account, Demat Account, Flash Deals, Cashback Offers, App Installs, Shopping Offers, Investment, Savings Account |
| Tags | `single_line_text` |  |
| Redirect Link | `url` |  |
| Status | `single_select` | Options: Active, Inactive |
| Fields Config | `long_text` |  |
| Form Enabled | `checkbox` |  |
| Form Config | `long_text` |  |
| Logo URL | `url` |  |
| Banner URL | `url` |  |
| Warning Popup Image | `url` |  |
| Warning Popup Active | `checkbox` |  |
| Lead Config Enabled | `checkbox` |  |
| Terms And Conditions | `long_text` |  |
| Sort Rank | `number` |  |
| Expires At | `datetime` |  |
| Total Slots | `number` |  |
| Filled Slots | `number` |  |
| Sample Screenshot URL | `url` |  |
| Is Private | `checkbox` |  |
| Private Slug | `single_line_text` |  |
| Referrer Form Config | `long_text` |  |
| Referral Enabled | `checkbox` |  |
| Referral Admin Cut | `number` |  |
| Referral Default Referrer Cut | `number` |  |
| Referral Default User Estimate | `number` |  |
| Payout Display | `single_line_text` |  |
| User Payout | `number` |  |
| Admin Payout | `number` |  |

## Leads

| Field | Type | Notes |
|---|---|---|
| Summary | `single_line_text` |  |
| Offer Name | `single_line_text` |  |
| Offer Payout | `number` |  |
| Lead Data | `long_text` |  |
| Status | `single_select` | Options: Pending, Approved, Rejected, Paid, Under Review, Cashback Sent, Missing, In Review |
| Created At | `created_at` |  |
| Lead ID | `single_line_text` |  |
| Public Remark | `long_text` |  |
| Internal Note | `long_text` |  |
| Action Config | `long_text` |  |
| Referral Code | `single_line_text` |  |
| Is Referral Lead | `checkbox` |  |
| Referral Link ID | `single_line_text` |  |
| Updated At | `updated_at` |  |
| Created By Type | `single_select` | Options: User, Admin |

## Posters

| Field | Type | Notes |
|---|---|---|
| Title | `single_line_text` |  |
| Image URL | `single_line_text` |  |
| Is Active | `checkbox` |  |
| Display Order | `number` |  |
| Created At | `created_at` |  |

## Cashback Forms

| Field | Type | Notes |
|---|---|---|
| Form Title | `single_line_text` |  |
| Description | `long_text` |  |
| Is Active | `checkbox` |  |
| Fields Config | `long_text` |  |
| Created At | `created_at` |  |
| Logo URL | `url` |  |
| Banner URL | `url` |  |
| Sample Screenshot URL | `url` |  |
| Slug | `single_line_text` |  |
| Is Public | `checkbox` |  |
| Partner Link | `url` |  |
| Is Embed | `checkbox` |  |

## Cashback Submissions

| Field | Type | Notes |
|---|---|---|
| Reference ID | `single_line_text` |  |
| Form Title | `single_line_text` |  |
| Submission Data | `long_text` |  |
| Submitted At | `created_at` |  |

## Referrals

| Field | Type | Notes |
|---|---|---|
| Referrer UPI | `single_line_text` |  |
| Referred UPI | `single_line_text` |  |
| Offer Name | `single_line_text` |  |
| Bonus Paid | `checkbox` |  |
| Created At | `created_at` |  |

## App Backups

| Field | Type | Notes |
|---|---|---|
| Label | `single_line_text` |  |
| Data | `long_text` |  |
| Source | `single_select` | Options: Manual, Auto, Local Restore |
| Summary | `single_line_text` |  |
| Created At | `created_at` |  |

## Referral Links

| Field | Type | Notes |
|---|---|---|
| Referrer Name | `single_line_text` |  |
| Offer Name | `single_line_text` |  |
| Offer Slug | `single_line_text` |  |
| Referral Code | `single_line_text` |  |
| Custom Referrer Data | `long_text` |  |
| Link Status | `single_select` | Options: Draft, Active, Paused, Expired, Terminated, Revoked, Disabled |
| Click Count | `number` |  |
| Referrer Split | `single_line_text` |  |
| Created At | `created_at` |  |
| Referrer UPI | `single_line_text` |  |
| Lead Count | `number` |  |
| Offer ID | `single_line_text` |  |
| Referrer Cut | `number` |  |
| User Cut | `number` |  |
| Created By Type | `single_select` | Options: Admin, User |
| Expiry Date | `datetime` |  |
| Referral Limit | `number` |  |
| Unique Click Count | `number` |  |
| Paused At | `datetime` |  |
| Paused By | `single_line_text` |  |
| Pause Reason | `single_line_text` |  |
| Terminated At | `datetime` |  |
| Terminated By | `single_line_text` |  |
| Terminate Reason | `single_line_text` |  |
| Revoked At | `datetime` |  |
| Revoked By | `single_line_text` |  |
| Revoke Reason | `single_line_text` |  |
| Internal Note | `long_text` |  |
| Last Activity At | `datetime` |  |
| Resumed At | `datetime` |  |

## Referral Leads

| Field | Type | Notes |
|---|---|---|
| Referral ID | `autonumber` |  |
| Referred User Name | `single_line_text` |  |
| Referred User Identifier | `single_line_text` |  |
| Referrer Name | `single_line_text` |  |
| Referrer UPI | `single_line_text` |  |
| Offer Name | `single_line_text` |  |
| Offer ID | `single_line_text` |  |
| Lead ID | `single_line_text` |  |
| Referral Link ID | `single_line_text` |  |
| Referral Code | `single_line_text` |  |
| Lead Status | `single_select` | Options: Clicked, Offer Opened, Registered, Submitted, Under Review, Action Required, Qualified, Not Qualified, Rejected, Cancelled, Completed |
| Cashback Status | `single_select` | Options: Pending, Processing, Approved, Paid, Failed, Reversed |
| Cashback Amount | `currency` |  |
| Reward Status | `single_select` | Options: Pending, Eligible, Approved, Processing, Paid, Failed, Reversed, Ineligible |
| Reward Amount | `currency` |  |
| Payment Status | `single_select` | Options: Pending, Processing, Paid, Failed |
| Public Remark | `long_text` |  |
| Internal Note | `long_text` |  |
| Qualified At | `datetime` |  |
| Cashback Paid At | `datetime` |  |
| Reward Paid At | `datetime` |  |
| Rejection Reason | `single_line_text` |  |
| Source | `single_line_text` |  |
| Created By Type | `single_select` | Options: Admin, User, System |
| Flagged For Review | `checkbox` |  |
| Flag Reason | `single_line_text` |  |
| Created At | `created_at` |  |
| Updated At | `updated_at` |  |

## Referral Audit Log

| Field | Type | Notes |
|---|---|---|
| Event ID | `autonumber` |  |
| Entity Type | `single_select` | Options: Link, Referral, Reward, Payment, Lead |
| Entity ID | `single_line_text` |  |
| Action | `single_line_text` |  |
| Actor | `single_line_text` |  |
| Previous Value | `single_line_text` |  |
| New Value | `single_line_text` |  |
| Reason | `long_text` |  |
| Note | `long_text` |  |
| Created At | `created_at` |  |
