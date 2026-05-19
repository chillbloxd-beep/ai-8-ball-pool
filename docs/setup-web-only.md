# Web-Only Setup Plan for Browser 8-Ball Pool (Planning Only)

This document defines a **web-first, no-local-download required** setup path for building and operating a browser-based 8-ball pool game with AI and future multiplayer.

---

## 1) Architecture Diagram (Text)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                              Player Browser                         │
│  - Loads static frontend from GitHub Pages                          │
│  - Runs game UI/rendering/client prediction                         │
│  - Calls APIs over HTTPS/WebSocket                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │
                 Static Hosting│                       Real-time + APIs
                               │
                     ┌─────────▼─────────┐         ┌───────────────────────┐
                     │   GitHub Pages    │         │ Cloudflare Workers    │
                     │  (Frontend only)  │         │ + Durable Objects     │
                     │ HTML/CSS/JS assets│         │ authoritative game sim │
                     └─────────┬─────────┘         │ matchmaking/lobbies    │
                               │                   │ replay write pipeline  │
                               │                   └──────────┬─────────────┘
                               │                              │
                               │                              │ SQL/HTTP
                               │                              │
                       ┌───────▼──────────────────────────────▼─────────────┐
                       │                    Supabase                          │
                       │  Postgres + Auth + Storage (optional)               │
                       │  - users, games, shots, replays, AI evaluation data │
                       └───────────────────┬──────────────────────────────────┘
                                           │
                                           │ offline/batch training data export
                                           │
             ┌─────────────────────────────▼───────────────────────────────┐
             │              Google Colab / Kaggle Notebooks               │
             │  Browser-based training, self-play, tuning, model export   │
             └─────────────────────────────┬───────────────────────────────┘
                                           │
                                           │ model weights / distilled policy
                                           │
                               ┌───────────▼───────────┐
                               │ Hugging Face Spaces   │
                               │ optional demo/API for │
                               │ policy inference      │
                               └───────────────────────┘
```

---

## 2) What Each Service Does

### GitHub Pages
- Hosts the frontend bundle (HTML/CSS/JS, static assets).
- Serves game client, HUD, and non-sensitive logic.
- Publishes directly from GitHub repo via Actions.

### Cloudflare Workers + Durable Objects
- Workers expose API endpoints for matchmaking, game state sync, and score/replay ingestion.
- Durable Objects keep authoritative per-room/per-match state for live multiplayer.
- Handles anti-cheat checks (server-authoritative validation) and event sequencing.

### Supabase Postgres
- Stores durable data:
  - player profiles
  - matches
  - per-shot telemetry
  - replay metadata + references
  - AI training/evaluation datasets
- Optional Supabase Auth for identity/session linkage.
- Row-Level Security for multi-tenant safety.

### Google Colab / Kaggle Notebooks
- Runs self-play and policy evaluation entirely from browser notebooks.
- Pulls historical replay/shot data for supervised or hybrid training.
- Produces model artifacts and benchmark reports.

### Hugging Face Spaces (Optional)
- Hosts lightweight model demo and/or inference API.
- Useful when you want rapid model iteration demos without deploying full backend changes.
- Can also act as a sandbox endpoint for comparing AI versions.

---

## 3) What GitHub Pages Can and Cannot Do

### GitHub Pages Can Do
- Serve static frontend assets globally over HTTPS.
- Host SPA builds for the game UI.
- Integrate with GitHub Actions for automated deploy.
- Support custom domains and basic caching behavior.

### GitHub Pages Cannot Do
- Run server-side game logic or secure secret-based operations.
- Maintain real-time authoritative multiplayer state.
- Provide private API key protection for backend services.
- Execute long-running compute for AI simulation/training.

### Practical Implication
- Keep **all authoritative gameplay logic, validation, multiplayer sync, and secret handling** in Cloudflare Workers/Durable Objects (not in GitHub Pages).

---

## 4) Correct Build Order (Recommended Path)

1. **Define data model in Supabase first**
   - tables for users, games, shots, replays, ai_runs, ai_models.
   - define indexes and retention policy up front.

2. **Implement backend contracts in Cloudflare Workers**
   - REST/WebSocket contracts for create match, submit shot, sync state, save replay.
   - connect Worker to Supabase with restricted service role patterns.

3. **Add Durable Objects for live match authority**
   - one object per match/room.
   - deterministic event ordering and reconciliation endpoints.

4. **Build frontend for GitHub Pages against mock + real APIs**
   - first wire to mock endpoints for UX flow.
   - then switch to Worker endpoints with environment-specific config.

5. **Set up CI/CD pipelines**
   - GitHub Actions for Pages deploy.
   - Worker deploy pipeline with staging/prod environments.
   - schema migration pipeline for Supabase.

6. **Instrument telemetry and replay capture**
   - ensure event formats are stable before large data collection.
   - capture AI-relevant shot features.

7. **Start browser-based training in Colab/Kaggle**
   - export replay datasets from Supabase.
   - train/evaluate and version models.

8. **Optionally publish AI demo/API on Hugging Face Spaces**
   - compare model versions quickly.
   - share demo endpoint for QA and stakeholders.

9. **Run staged multiplayer and AI validation before public launch**
   - load test Durable Objects.
   - validate anti-cheat and rollback behaviors.

---

## 5) Risks and How to Avoid Them

### Risk: Frontend becomes source of truth (cheat-prone)
- **Avoid by:** making Durable Objects authoritative for match state and shot validation.

### Risk: Data schema churn breaks analytics/training
- **Avoid by:** freezing replay/shot schema versioning early and adding explicit migration strategy.

### Risk: Latency hurts real-time play
- **Avoid by:** regional routing, minimal payloads, delta sync, and client-side prediction with server reconciliation.

### Risk: Secrets leak through static frontend
- **Avoid by:** never embedding privileged keys in GitHub Pages; keep secrets in Worker environment.

### Risk: AI training pipeline not reproducible
- **Avoid by:** versioning datasets, notebook configs, random seeds, and model artifacts.

### Risk: Pages deployment pathing issues (SPA routing)
- **Avoid by:** choosing hash routing or validated SPA fallback strategy compatible with static hosting.

### Risk: Cost growth from telemetry/storage
- **Avoid by:** retention windows, compressed replay storage, and tiered archival strategy.

---

## 6) Clear Milestone Checklist

## Milestone 0 — Planning & Contracts
- [ ] Finalize gameplay scope for MVP (single-player first, multiplayer staged).
- [ ] Freeze API contract v1 (match lifecycle, shot submit, replay upload, state sync).
- [ ] Freeze replay/shot event schema v1.

## Milestone 1 — Platform Foundations
- [ ] Create Supabase project and baseline schema.
- [ ] Implement Cloudflare Worker API skeleton.
- [ ] Implement Durable Object room/match skeleton.
- [ ] Add auth/session flow design (Supabase Auth or equivalent).

## Milestone 2 — Frontend Deployment Path
- [ ] Create frontend app configured for GitHub Pages base path.
- [ ] Deploy initial shell to GitHub Pages through GitHub Actions.
- [ ] Integrate frontend with staged Worker endpoints.

## Milestone 3 — Gameplay Data & Replays
- [ ] Persist matches and shots to Supabase.
- [ ] Implement replay capture format and storage path.
- [ ] Add telemetry dashboard queries for balancing.

## Milestone 4 — Multiplayer Readiness
- [ ] Durable Object authoritative turn/state management.
- [ ] Matchmaking + lobby lifecycle implemented.
- [ ] Reconnect and conflict reconciliation flows validated.

## Milestone 5 — AI Pipeline (Web-Only)
- [ ] Export training datasets to Colab/Kaggle.
- [ ] Run baseline self-play training experiments.
- [ ] Evaluate model performance against heuristic baseline.
- [ ] Version and register approved model artifacts.

## Milestone 6 — Optional AI Serving Layer
- [ ] Publish demo inference endpoint on Hugging Face Spaces.
- [ ] Add A/B switch to compare AI versions safely.

## Milestone 7 — Pre-Launch Hardening
- [ ] Load test API + Durable Objects.
- [ ] Security review (RLS policies, auth/session, secret management).
- [ ] Cost review (storage, egress, request volume) and guardrails.
- [ ] Go/No-Go checklist for MVP launch.

---

## Notes
- This is a planning document only; no gameplay/source-code implementation is included in this step.
