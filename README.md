# RentNinja AI

RentNinja AI is a production-oriented tenant screening SaaS built as a single Next.js App Router codebase. It includes Auth.js authentication, MongoDB Atlas-ready persistence with Mongoose, multi-tenant organization support, applicant CRUD, scoring automation, red flag detection, lease tracking, notes, and Stripe-ready billing routes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MongoDB Atlas
- Mongoose
- Auth.js with MongoDB adapter
- Stripe billing scaffolding

## Core Product Features

- Tenant screening dashboard
- Applicant CRUD
- Automatic 100-point scoring
- Decision labels: `Strong`, `Review`, `Risk`
- Red flag detection
- Affordability calculator
- Application and lease status tracking
- Notes on each applicant
- Filtering and sorting
- Summary cards
- Route protection
- Multi-tenant organization architecture

## SaaS Data Model

- `Organization`: account workspace, plan metadata, Stripe IDs
- `User`: account operator linked to one organization
- `Applicant`: applicant records scoped by `organizationId` and `ownerId`

The current access pattern is intentionally strict: users only see applicants they created inside their organization.

## Environment Setup

Copy `.env.example` to `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/rentninja-ai?retryWrites=true&w=majority
MONGODB_DB=rentninja-ai
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
```

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Seed Demo Data

```bash
npm run seed
```

Demo credentials after seeding:

- Email: `demo@rentninja.ai`
- Password: `demo12345`

Additional admin test accounts:

- `akeso80@gmail.com` / `password`
- `jtekninja@gmail.com` / `password`

Create or refresh those test admins with:

```bash
npm run seed:test-admins
```

## OpenAI Features

To enable AI applicant review, applicant comparison, and application-file extraction, add:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

Current AI-assisted workflows:

- Generate an AI review for an applicant
- Compare the current applicant pool and rank the best fit
- Upload a PDF or image application from common sources and prefill applicant fields with AI extraction
- Paste application text or email summaries from common sources and prefill applicant fields with AI extraction

## Deploy On Render

This repo now includes a Render Blueprint at `render.yaml`.

Deploy flow:

1. Push this repo to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint or Web Service from that repository.
3. Provide the required environment variables during setup:
   - `MONGODB_URI`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
4. Optional billing variables can be added later:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRO_PRICE_ID`

Notes:

- Render's current Blueprint docs support `render.yaml` files in the repo root for Git-based deploys.
- `AUTH_SECRET` is generated automatically by the Blueprint.
- Use your live Render service URL for both `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`.
- MongoDB Atlas is the recommended production database for this app.

## Billing Architecture

The app includes Stripe-ready routes:

- `POST /api/billing/checkout`
- `POST /api/billing/portal`

These routes return helpful messages until valid Stripe keys and price IDs are supplied.

## Important Routes

- `/` marketing landing page
- `/login` credentials sign-in
- `/register` workspace creation
- `/dashboard` protected screening dashboard
- `/api/register` account provisioning
- `/api/applicants` applicant list/create
- `/api/applicants/:id` applicant update/delete
- `/api/auth/[...nextauth]` Auth.js handler

## Notes

- MongoDB Atlas is recommended for production.
- Auth.js uses the MongoDB adapter for session/account persistence and credentials login for operators.
- Mongoose powers the application domain models and query layer.
- Stripe webhooks are not implemented in this scaffold yet, but the account/billing schema is ready for them.
