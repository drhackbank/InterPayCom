# InterPayCom

> A secure global payment gateway for businesses accepting international payments in 50+ currencies via PayPal and Braintree.

---

## Overview

InterPayCom is a professional payment acceptance platform built for businesses that receive payments from clients worldwide. It provides a clean, secure checkout experience supporting custom payment amounts across 190+ countries and 50+ currencies with live exchange rates.

---

## What this project does

- Clients visit the payment page and select their local currency from 50+ options
- Live exchange rates are applied automatically so the INR equivalent is shown in real time
- Payment is completed via **PayPal** or **Card** (Visa, Mastercard, Amex, Google Pay, Apple Pay)
- The entire checkout completes in under 60 seconds
- All transactions are processed securely through PayPal and Braintree — no card data touches this codebase

---

## How it works

This repository is the **static frontend** deployed on GitHub Pages. It communicates with a separate **serverless API backend** deployed on Vercel which handles all payment processing securely.

```
Client Browser (GitHub Pages)
        │
        ├── POST /paypal/order    → Create PayPal order
        ├── POST /paypal/capture  → Capture approved payment
        ├── GET  /braintree/token → Get Braintree client token
        ├── POST /braintree/pay   → Process card payment
        └── GET  /rates           → Fetch live exchange rates
                │
        Vercel API Backend
        (PayPal + Braintree SDKs run here — credentials never exposed)
```

---

## Tech stack

- Pure HTML, CSS and JavaScript — no framework, no build step
- PayPal JS SDK for PayPal checkout
- Braintree Drop-in UI for card, Google Pay and Apple Pay
- Live exchange rates from open.er-api.com
- SHA-256 hash authentication with brute-force lockout
- Deployed on GitHub Pages (frontend) + Vercel (backend)

---

## Security

- Login authentication uses SHA-256 hash comparison — no plain text credentials stored anywhere in the codebase
- Three consecutive failed login attempts trigger a 30-second lockout
- All payment API credentials are stored exclusively in Vercel environment variables
- No card numbers, CVVs or sensitive payment data ever pass through this repository
- PCI DSS compliant via PayPal and Braintree infrastructure

---

## Supported payment methods

| Method | Provider |
|---|---|
| PayPal Wallet | PayPal |
| Credit Card (Visa, Mastercard, Amex) | Braintree |
| Debit Card | Braintree |
| Google Pay | Braintree |
| Apple Pay | Braintree |

---

## Supported currencies

50+ currencies including USD, EUR, GBP, INR, AED, SGD, AUD, CAD, JPY, CHF, SAR, KWD, QAR and more — with live exchange rates updated daily.

---

*InterPayCom — Private and confidential. Unauthorised access is prohibited.*
