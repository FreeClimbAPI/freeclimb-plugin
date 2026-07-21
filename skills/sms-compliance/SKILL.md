---
name: sms-compliance
description: Guide SMS sending toward US messaging compliance - 10DLC registration, opt-out handling (STOP/HELP), quiet hours, consent, and trial-account limits.
---

# SMS Compliance

Use this skill before wiring, reviewing, or approving any FreeClimb SMS workflow that sends outbound messages, whether one-off or automated (reminders, alerts, marketing, OTPs).

The hard guardrails live in `rules/sms-compliance.mdc`; this skill explains the reasoning and gives an implementation pattern. When the two disagree, the rule wins.

## 10DLC in Brief

10DLC (10-digit long code) is the US carrier framework for application-to-person SMS sent from standard local-format numbers. Carriers require the sending brand and campaign to be registered; unregistered traffic is filtered, delayed, or blocked, especially at volume.

Registration matters once a workflow is:

- Sending to consumers at any real volume (not a one-off test text).
- Automated or recurring (reminders, alerts, marketing blasts).
- Going to production rather than a demo/trial account.

For a demo or a single test message on a trial account, registration is not the blocker — verified destination numbers are (see below). Tell the user 10DLC registration is a production requirement to raise with FreeClimb support/dashboard before scaling past a demo.

## Throughput and Registration Limits

Before brand/campaign registration completes, throughput is capped at 50 messages/hour and 100 messages/day; unregistered traffic is likely carrier-filtered. Numbers not linked to a registered 10DLC campaign count as unregistered.

After linking a number to a registered 10DLC campaign, MPS throughput follows brand TCR Trust Score and campaign type:

| TCR Trust Score | Total MPS | AT&T / Verizon / T-Mobile |
|-----------------|-----------|---------------------------|
| 75–100 | 225 | 75 each |
| 50–74 | 120 | 40 each |
| 1–49 | 12 | 4 each |
| Low Volume Mixed campaign | 3.75 | 1.25 each (regardless of trust score) |

Toll-free A2P verification typically takes 6–8 weeks; status shows Pending until FreeClimb support confirms Registered.

Regardless of registration status, each phone number is limited to 200 outbound SMS/day. Contact support to raise the cap.

Trial accounts: FreeClimb sends automatic platform responses to inbound STOP and HELP for compliance. Full accounts must implement keyword handling in `smsUrl` (see Mandatory Opt-Out Keywords below).

## Mandatory Opt-Out Keywords

Every SMS-enabled `smsUrl` webhook must recognize these keywords case-insensitively, regardless of what the workflow otherwise does:

| Keyword | Behavior |
|---------|----------|
| `STOP`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` | Stop messaging that number immediately. Send exactly one confirmation reply, then never message again unless the recipient re-opts in. |
| `HELP`, `INFO` | Always reply with what the service is and how to opt out, regardless of prior opt-out state. |

Implement this as the first check in the `smsUrl` handler, before any business logic:

```json
[{ "Sms": { "to": "+15551234567", "from": "+15559876543", "text": "You have been unsubscribed and will not receive further messages. Reply START to resubscribe." } }]
```

```json
[{ "Sms": { "to": "+15551234567", "from": "+15559876543", "text": "Acme Alerts: order and delivery notifications. Msg&data rates may apply. Reply STOP to unsubscribe." } }]
```

Persist opt-out state (a database flag keyed by phone number) and check it before every subsequent send — the keyword check must survive server restarts and apply across all campaigns from that sender.

## Consent Tiers

| Tier | Example | Consent needed |
|------|---------|-----------------|
| Transactional | OTP codes, order/delivery updates, appointment reminders the recipient triggered | Implied by the transaction (recipient gave their number for this purpose) |
| Promotional | Marketing, discounts, newsletters, unsolicited outreach | Explicit prior opt-in (web form, keyword join, checkbox) — never assume consent |

Never send promotional content to a number that only ever gave transactional consent.

## Quiet Hours

For promotional sends, do not send outside roughly 8am-9pm in the recipient's local time zone. Transactional messages the recipient is actively expecting (e.g. an OTP they just requested) are exempt, but recurring transactional campaigns (reminders) should still respect quiet hours as a courtesy.

Quiet-hour windows and enforcement specifics can vary by jurisdiction and carrier; treat 8am-9pm recipient-local as a safe US default, not a universal rule.

## Message Frequency & Content

- Do not send unsolicited or repeated messages. Only message numbers that initiated contact or explicitly opted in.
- Identify the sending brand in promotional messages ("Acme Alerts:") since recipients often don't recognize a bare number.
- Keep messages short and single-purpose; avoid shortened links from untrusted domains, which trigger carrier filtering.
- Avoid sending the same message body repeatedly in a short window — carriers flag this as spam-like behavior.

## Trial-Account Limits

Trial accounts can only send SMS to numbers verified in the FreeClimb dashboard. Before wiring any outbound SMS workflow, confirm the destination is verified, or route the demo through a pre-verified number (see `debug-freeclimb-apps`).

## Compliance Checklist

Walk this before wiring or approving any outbound SMS workflow:

1. Is the destination verified (trial accounts only)?
2. Does the `smsUrl` handler check STOP-family and HELP keywords before any other logic?
3. Is opt-out state persisted and checked on every send?
4. Is this transactional or promotional? Does the consent basis match?
5. For promotional sends: is a quiet-hours check in place?
6. Does the message identify the sender and avoid unsolicited/repeated content?
7. For production/volume workflows: has 10DLC registration been raised with the user?

If any answer is "no" for a live (non-test) send, stop and raise it with the user before sending.
