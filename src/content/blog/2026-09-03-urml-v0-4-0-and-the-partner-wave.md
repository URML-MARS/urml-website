---
title: "Where URML is now: the gate got deeper, and maintainers arrived"
date: 2026-09-03
summary: "Since v0.2.0, URML added runtime envelope enforcement, a rehearsal gate, a speech front-end, and an agent surface. And real project maintainers engaged on public threads, with runnable examples shipped in response."
category: URML
tags: ["release", "v0.4.0", "envelope-enforcement", "rehearsal", "outreach", "achievements"]
sources:
  - { title: "CHANGELOG (0.3.0 and 0.4.0)", url: "https://github.com/URML-MARS/URML/blob/main/CHANGELOG.md", accessed: 2026-09-03 }
  - { title: "RFC-0667: envelope enforcement", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0667-envelope-enforcement.md", accessed: 2026-09-03 }
  - { title: "RFC-0668: rehearsal gate and urml run", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0668-rehearsal-gate.md", accessed: 2026-09-03 }
  - { title: "RFC-0670: speech front-end", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0670-speech-front-end.md", accessed: 2026-09-03 }
  - { title: "examples/", url: "https://github.com/URML-MARS/URML/tree/main/examples", accessed: 2026-09-03 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

The last release post here was v0.2.0, the multi-robot fleet slice. Since then two releases landed in the repo, 0.3.0 and 0.4.0, plus a run of work on `main` that has not been cut into a numbered release yet. The short version: the validation gate now reaches past the static check into rehearsal and runtime, and a set of real project maintainers engaged in the open, with runnable examples shipped in response.

## The gate got deeper (0.3.0)

URML started as a static check: validate a program against a robot's declared capabilities and safety envelope before any actuator moves. Two additions extend that same gate forward in time.

**Envelope enforcement** ([RFC-0667](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0667-envelope-enforcement.md)) gives the safety envelope a small temporal-logic core and a runtime shield. The shield wraps any driver, a learned VLA policy included, and holds it to the declared envelope while it runs, not just before it starts.

**A rehearsal gate** ([RFC-0668](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0668-rehearsal-gate.md)) adds a new verb, `urml run`, that rolls a validated program out on a simulator, records the signal trace, and blocks real execution on any critical violation. A passed rehearsal is evidence under a named motion model, never a guarantee, and the tool says so.

Also in 0.3.0: a URML-native model pipeline that mines the validator's own accept/reject decisions into training data, per-capability evidence traceability (how a manifest claim was established), and an agent surface, an MCP server and an Agent Skill, so an assistant can reach the validator without ever bypassing it. And the first external code contribution merged, a GoPiGo3 frame-convention fix from a power user running URML on real hardware.

## Speaking to robots (0.4.0)

**A speech front-end** ([RFC-0670](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0670-speech-front-end.md)): `urml run --audio` transcribes a spoken request on-device and feeds the same validator. The safety boundary is untouched; speech is just another way in. Alongside it, the CLI gained first-class on-prem LLM providers, so the whole translate-validate-execute loop can run against a local model with no cloud call.

## Maintainers arrived

The part that is hard to manufacture: people who build serious robotics software engaged on public threads, and code shipped in response. A sample, each a public issue you can read:

- A **robot-simulation platform** engineer reviewed the mapping and asked where a manifest claim comes from. That became per-capability evidence traceability, and a USD-derived manifest validated through the real adapter.
- A core maintainer of an **on-device ML runtime** answered the mapping questions, and the result was the first example to run a learned policy behind the runtime safety shield.
- A **cognitive-robotics research lab** took a live video call, URML's first, to walk the mapping through against their architecture.
- A **manipulation simulation benchmark** engaged once URML was framed as an eval lens that flags out-of-distribution instructions per subtask, before a rollout runs.
- A community **Spot** driver validated URML's cut for the quadruped, then for its arm.

These are engagements and shipped examples, not endorsements or partnerships, and the examples are labeled software validation, not hardware proof. The reference-runtime set also grew a 16th member, an ArduPilot adapter bench-verified on a Pixhawk, and the educational runtime picked up a fifth platform.

## Honest footing

The specification itself is still at v0.2.0 (each layer versions on its own). The 0.3.0 and 0.4.0 work is recorded in the [CHANGELOG](https://github.com/URML-MARS/URML/blob/main/CHANGELOG.md); the code is on `main` under Apache 2.0 and builds from source today, with the packaged PyPI upload of the newer releases still pending. Everything above maps to a shipped file and a passing test. The [releases page](/releases) tracks the version history, and [what a robot declares](/capabilities) tracks the growing manifest surface.
