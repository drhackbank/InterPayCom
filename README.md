# InterPayCom

> Professional global payment gateway — accept payments from 190+ countries in 50+ currencies via PayPal.

---

## Overview

InterPayCom is a secure, professional payment acceptance platform for businesses receiving international payments. Clients choose their currency, enter a custom amount, and pay via PayPal's trusted checkout — including credit cards, Google Pay and Apple Pay.

---

## How it works

This repository is the static frontend deployed on GitHub Pages. It communicates with a serverless API backend on Vercel that handles all payment processing securely.

```
Client Browser (GitHub Pages)
    │
    ├── Fetch Client ID  → /paypal/order (_ping)
    ├── Create Order     → /paypal/order
    ├── Capture Payment  → /paypal/capture
    └── Exchange Rates   → /rates
              │
         Vercel API Backend
    (PayPal credentials — never exposed to browser)
```

---

## Features

- 50+ currencies with live exchange rates
- PayPal checkout — cards, Google Pay, Apple Pay, PayPal wallet
- INR equivalent shown in real time
- Animated particle background with dynamic UI
- SHA-256 hash authentication with brute-force lockout
- Responsive — works on all devices

---

## Security

- Login uses SHA-256 hash comparison — no plain text credentials in code
- 3 failed login attempts trigger 30-second lockout
- All PayPal credentials stored in Vercel environment variables only
- No card data, CVVs or sensitive payment data pass through this codebase
- PCI DSS compliant via PayPal infrastructure

---

*InterPayCom — Private and confidential.*
