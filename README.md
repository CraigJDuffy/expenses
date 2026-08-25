# Expenses

A simple expense-claim form. Members enter their details, add expense line
items with receipt attachments, and submit — the request is emailed as a
summary by a Cloudflare Worker backend.

## Structure

- `docs/` — static frontend (served via GitHub Pages), a single-page form.
- `backend/` — Cloudflare Worker that receives the submitted form, builds an
  email (via [Resend](https://resend.com)), and sends it.

## Backend setup

The Worker needs a Resend API key set as a secret:

```bash
cd backend
npx wrangler secret put RESEND_API_KEY
```

Deploy with:

```bash
npx wrangler deploy
```
