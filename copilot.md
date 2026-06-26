# Copilot Multi-Agent Orchestration

## Mission
Ship a clear, demo-ready AI PropTech submission that judges can understand without guidance.

## Agent Topology

- Director agent: agents/director.md
- Code worker: agents/worker.code.md
- Documentation worker: agents/worker.docs.md
- Deployment worker: agents/worker.deploy.md

## Operating Model

1. Director decomposes objective into parallel workstreams.
2. Code worker implements feature slices with modular boundaries.
3. Docs worker updates judge-facing artifacts after each feature slice.
4. Deploy worker validates hosting path and fallback path.
5. Director runs final compliance check against Hub71 requirements.

## Definition Of Done

- App is understandable on first open
- API and UI run locally
- Deployment path is documented and testable
- Issue form is complete and submission-ready
- Demo script is executable in under 3 minutes

## Quality Gates

- Gate 1: API health and endpoint contract pass
- Gate 2: UI can call API and display insights
- Gate 3: Docs map directly to judging criteria
- Gate 4: Submission form contains all mandatory links
- Gate 5: Deadline check complete before 16:30
