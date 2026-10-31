# FalconStats implementation roadmap

This roadmap records the work and dependencies for review. It does not authorize starting Phase 2.

## Phase 0 — repository and deployment stability

**Audit completed:** Next.js App Router project and existing NestJS backend inspected; npm/package-lock setup recorded; every tracked file passed strict UTF-8 validation and no BOM was found; `npm ci` succeeded from both package roots; frontend lint, type check, and production build passed locally.

**Deployment not resolved:** Vercel’s supplied `1128df6` build log reports an invalid UTF-8 source stream in four UI components despite the local strict-byte audit. The later deployment at `c7cdaa1` has ERROR metadata, but the connected Vercel build-log endpoint is unavailable here. Do not declare the deployment fixed until the detailed latest log is reviewed and a new production deployment reaches READY.

**Next action:** provide the detailed Vercel build log for the latest failed deployment so the first meaningful error can be compared to the local source tree. Keep TypeScript and build validation enabled. Do not change bundlers or rewrite source files again without evidence.

## Phase 1 — core design freeze

**Design documented:** light-first brand, shell, navigation, shared component patterns, responsive behavior, and each current route’s layout, charts/tables, controls, data states, and limitations are recorded in [core-design-specification.md](core-design-specification.md).

**Functionality documented:** working controls, browser-local data, unsupported features, and API-backed views are recorded in [frontend-audit.md](frontend-audit.md).

**Review gate:** review and approve the core design and functionality audit. No provider work or backend expansion is included in this phase.

## Later phases — recommendations only

After Phase 1 review and approval:

1. Close the Vercel build blocker and confirm a production deployment succeeds from the same Git commit.
2. Decide which Phase 2 feature slice should be implemented first; avoid implementing all unsupported modules at once.
3. Define required user-visible states and API/data contracts for the approved slice before implementation.
4. Provision and verify the required hosted services and environment configuration before claiming production behavior.
5. Add focused automated checks and an end-to-end acceptance path for the selected slice.

No Phase 2 code or multi-provider integration is started by this document.
