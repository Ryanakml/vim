# Chatify

Chatify helps businesses add an AI chat experience to any website in minutes.

![Chatify Widget Demo](./apps/web/public/mock.png)

## What customers get

- A branded chat widget visitors can use without logging in
- A simple admin dashboard to set the bot's tone, knowledge base, and appearance
- Conversation monitoring and basic analytics
- Easy website embedding with a single script tag

## How it works

1. Admin configures the bot in the dashboard (prompt, knowledge, style).
2. Customer installs the embed snippet on their website.
3. Visitors chat in a floating widget; conversations are stored for review.

## Quick start (local)

Requirements: Node.js 20+, pnpm

1. Install dependencies

```bash
pnpm install
```

2. Run the web app

```bash
pnpm -F web dev
```

3. Run the widget app (in a new terminal)

```bash
pnpm -F widget dev
```

## Notes

- This repo is frontend-focused; backend integrations and production setup require additional configuration.
- If you want a deeper technical view, start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
