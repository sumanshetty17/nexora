# Nexora

Train an AI assistant on your company website. Embed it as a chat widget. Read the questions customers keep asking — and let the same brain draft email replies, escalating anything serious.

**Live source:** [github.com/sumanshetty17/nexora](https://github.com/sumanshetty17/nexora)

## What it does

- **Knowledge** — crawl a public URL, paste FAQs/policies, or upload text. Content is chunked and indexed with Postgres full-text search (RAG).
- **Website widget** — one script tag. The assistant answers from your sources only; it will not invent policy.
- **Insights** — every question is tagged. See which topics dominate, which sound frustrated, which still need a human.
- **Email assistant** — paste incoming mail. Routine messages get a sendable draft. Chargebacks, legal, and sharp tone are held for you.
- **Accounts** — Google, X, or email/password. Each workspace owns its assistants.

Pricing shape (conversations / sites / knowledge size, email as an add-on) is in the product. Billing is off during launch — every workspace is unlocked.

## Stack

TanStack Start, React 19, Tailwind v4, Postgres (Neon in production, PGLite in preview), Better Auth, xAI `grok-4.5`.

## Demo

Open `/demo` for Harbor & Oak, a furniture studio whose assistant is already trained. Try “white-glove to Seattle” or “return a custom table”.

## Install the widget

```html
<script src="https://YOUR_HOST/widget.js" data-nexora="YOUR_PUBLIC_ID"></script>
```

## Environment (production)

Set these on the host (never commit them):

- `DATABASE_URL` — Neon Postgres
- `XAI_API_KEY` — xAI Grok (server only)

Without the key, the assistant still answers from indexed knowledge using extractive retrieval.
