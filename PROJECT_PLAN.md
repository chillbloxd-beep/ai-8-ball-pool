# Browser-Based 8-Ball Pool AI Game — Initial Project Plan

## 1) Project Vision
Build a web-based 8-ball pool game where players can compete against an AI opponent in a realistic, responsive, and accessible browser experience.

## 2) Goals and Success Criteria
- Deliver a playable 8-ball experience with standard rules and turn-based flow.
- Implement believable AI opponents with at least 3 skill levels.
- Achieve stable 60 FPS on modern desktop browsers.
- Provide clear UX for aiming, shot power, spin, fouls, and win/loss states.
- Launch an MVP with analytics and a feedback loop for iterative tuning.

## 3) Scope
### In-Scope (MVP)
- 2D top-down table rendering in the browser.
- Physics-based cue, ball collisions, rails, and pockets.
- Core 8-ball rules engine (solids/stripes assignment, fouls, 8-ball win/loss logic).
- Single-player mode vs AI.
- Basic UI: menu, game HUD, turn/foul indicators, restart.
- Difficulty presets: Easy / Medium / Hard.

### Out of Scope (Phase 2+)
- Online multiplayer.
- Career mode / progression economy.
- Full 3D graphics.
- Mobile native apps.

## 4) High-Level Architecture
- **Frontend App**: React + TypeScript (or similar SPA stack).
- **Rendering Layer**: Canvas/WebGL abstraction for table + balls.
- **Physics Engine**: deterministic step simulation loop.
- **Rules Engine**: validates legal shots, fouls, turn transitions.
- **AI Module**: shot generation, simulation scoring, difficulty constraints.
- **State Management**: game state snapshot + replay/debug hooks.
- **Telemetry Layer**: anonymous metrics for AI difficulty tuning.

## 5) Workstreams
1. **Game Design & Rules Definition**
   - Formalize rule interpretation edge cases.
   - Define difficulty behaviors and UX expectations.
2. **Physics & Rendering**
   - Ball motion, friction, collision response, pockets.
   - Stable time-step loop and performance budget.
3. **Gameplay Loop**
   - Shot setup, aiming guides, power control, spin controls.
   - Turn and foul handling.
4. **AI Development**
   - Candidate shot generation.
   - Forward simulation scoring.
   - Difficulty scaling via noise/constraints/lookahead limits.
5. **Testing & Tooling**
   - Unit tests for rules and math-heavy systems.
   - Deterministic scenario tests for regressions.
6. **Polish & Release**
   - Accessibility, onboarding hints, bug triage.

## 6) Milestones and Timeline (Initial)
### Milestone 1 — Foundations (Week 1-2)
- Project scaffold, architecture baseline, coding standards.
- Table rendering + basic input handling.
- Prototype ball physics loop.

### Milestone 2 — Core Gameplay (Week 3-4)
- Complete collision and pocket logic.
- Implement turns, legal shot checks, foul states.
- Add win/loss detection and match reset.

### Milestone 3 — AI MVP (Week 5-6)
- Generate direct shots and simple banks.
- Score shot outcomes with lightweight simulation.
- Ship 3 tunable difficulty levels.

### Milestone 4 — UX, QA, and MVP Release (Week 7-8)
- HUD refinement, tutorial prompts, feedback polish.
- Performance pass and cross-browser testing.
- MVP release + telemetry review.

## 7) Technical Risks and Mitigations
- **Physics instability**: use fixed timestep and capped substeps; build deterministic tests.
- **AI feels unfair/robotic**: inject human-like variance and imperfect execution.
- **Performance bottlenecks**: profile early; avoid per-frame allocations.
- **Rule disputes**: lock down rule spec with documented edge-case decisions.

## 8) Testing Strategy
- Unit tests for vector math, collision resolution, and rules logic.
- Scenario-based integration tests for common game states.
- Smoke tests for full match flow (break -> assignments -> 8-ball endgame).
- Browser matrix: latest Chrome, Firefox, Safari, Edge.

## 9) Suggested Initial Backlog
- [ ] Create architecture decision record (ADR-001).
- [ ] Build render loop + table scene.
- [ ] Implement ball entity + physics integrator.
- [ ] Add ball-ball and ball-rail collisions.
- [ ] Add pockets + sunk-ball detection.
- [ ] Implement 8-ball rules state machine.
- [ ] Create shot input UI (aim/power/spin).
- [ ] Implement AI shot candidate generator.
- [ ] Add deterministic simulation harness for AI evaluation.
- [ ] Add difficulty presets and tuning config.
- [ ] Create minimal HUD and game menu.
- [ ] Set up CI checks (lint/test/build).

## 10) Team Roles (Lean Setup)
- **Gameplay/Physics Engineer**: simulation and shot mechanics.
- **Frontend Engineer**: rendering, UI, state flows.
- **AI Engineer**: shot planning and difficulty tuning.
- **QA/Producer (part-time)**: testing matrix, milestone tracking.

## 11) Definition of Done (MVP)
- Complete playable 8-ball match vs AI with stable controls.
- Rules and foul handling validated by test suite.
- Difficulty levels show measurable win-rate differences.
- No major gameplay blockers in supported browsers.
