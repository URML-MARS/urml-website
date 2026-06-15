---
title: "URML v0.2.0: fleets, and a much wider manifest"
date: 2026-06-15
summary: "URML v0.2.0: multi-robot fleets across Layers 1/3/4, plus a wider capability manifest (whole-body, AV trajectories, real-time timing, zero-copy IPC, legged drive-types). Additive, backward-compatible."
category: URML
tags: ["release", "v0.2.0", "fleet", "manifest", "spec"]
sources:
  - { title: "RFC-0286: multi-robot fleet addressing", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0286-multi-robot-fleet-addressing.md", accessed: 2026-06-15 }
  - { title: "Layer 1 (HAL) v0.2.0", url: "https://github.com/URML-MARS/URML/blob/main/spec/layer-1-hal/v0.2.0.md", accessed: 2026-06-15 }
  - { title: "Layer 3 (behavior) v0.2.0", url: "https://github.com/URML-MARS/URML/blob/main/spec/layer-3-behavior/v0.2.0.md", accessed: 2026-06-15 }
  - { title: "Layer 4 (NL grammar) v0.2.0", url: "https://github.com/URML-MARS/URML/blob/main/spec/layer-4-nl-grammar/v0.2.0.md", accessed: 2026-06-15 }
  - { title: "CHANGELOG", url: "https://github.com/URML-MARS/URML/blob/main/CHANGELOG.md", accessed: 2026-06-15 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

URML v0.2.0 is the first spec-bumping release since v0.1.0. It folds a run of accepted RFCs into the normative layer documents, so the specification stops trailing its own decisions. Everything in it is additive: a v0.1.0 manifest and a single-robot program validate unchanged, and `manifest_version` stays `"0.1"`.

## One program, many robots

The headline is multi-robot fleets. A roster binds several per-robot capability manifests under short, English-callable handles. Two new Layer-3 nodes address them: `on` scopes a subtree to one member, `barrier` holds execution until every named member arrives. A `validate_fleet` pass runs every single-robot check per member and then four cross-robot checks before anything moves, and the LLM bridge learned to assemble a fleet program from a roster.

The load-bearing idea is the validation, not the syntax. URML can reject two robots sent into the same place at the same instant, statically, because it sees both manifests at once. No single vendor SDK can catch that, because no single SDK sees both robots. This is strategic deconfliction, decided before execution. It is not a live collision-avoidance loop, and it is not a building-scale traffic manager. Continuous facility-wide routing stays Open-RMF's job, and URML composes above it.

## A wider manifest

The capability manifest grew a set of optional blocks, each declaring something a robot can do so the validator can check intent against it before dispatch:

- **whole_body** — kinematic chains and static-stability limits (center of mass within the support polygon, carry-while-moving gates) for legged and humanoid platforms.
- **av** — an autonomous-vehicle profile with HD-map, operational-design-domain, and minimal-risk-maneuver declarations, plus two new primitives, `plan_path` and `follow_trajectory`.
- **realtime** — a cyclic-timing contract (period, watchdog, guarantee), with an `acyclic` sub-block for the SDO/mailbox regime.
- **substrate** — the layers beneath the language: zero-copy IPC (iceoryx), the clock-synchronization regime, and ordered bring-up and recovery.
- **learned_policy** — the training envelope of a learned controller, so the validator refuses intent outside what the policy was trained for.
- New `drive_type` values for quadruped and biped locomotion, a `bimanual` primitive, dexterous multi-fingered hands, and `set_output` for driving a declared output line.

Layer 2 is unchanged at v0.1.0. The shipped primitive set is now 24.

## Shaped by the people building robots

Several of these blocks did not come from a whiteboard. They came from maintainers who answered URML's questions in public and pointed at the real gap. A lidar SDK engineer's notes on beam count and time-sync became the sensor-schema iteration. An NLLB researcher's guidance on non-commercial weights became the permissive-translation alternative. An iceoryx maintainer's note that the project had moved to a Rust successor became the IPC sub-substrate. An EtherCAT-driver maintainer flagging that bus clocks and ordered bring-up cannot be hidden became three new substrate blocks. The outreach is not a broadcast; when a maintainer engages, the spec moves.

## On honest footing

The numbers are measured, not estimated: 24 primitives, 175 conformance fixtures, and 1601 passing tests across 17 packages, all re-run for this release. The validator, the conformance suite, and every reference runtime are Apache 2.0 and stay that way. The spec is still pre-stable (v0.x); the v1.0 freeze is the point where breaking changes need a working-group vote. `pip install urml-validator` gets you the five-pass validator and the hermetic mock today.
