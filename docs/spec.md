# Specification

The URML specification lives in [github.com/URML-MARS/URML/tree/main/spec](https://github.com/URML-MARS/URML/tree/main/spec), where every layer is versioned independently and tracked in git.

This page is a short index. The canonical text is the markdown in the repository.

## Layers

- **Layer 1, Hardware Abstraction.** What a robot declares it can do (capability manifest) and the safety envelope under which it operates. [Source](https://github.com/URML-MARS/URML/tree/main/spec/layer-1-hal).
- **Layer 2, Intent Primitives.** The core vocabulary: move_to, dock, hover, wait, wait_for, grasp, release, detect, scan, measure, capture, report. [Source](https://github.com/URML-MARS/URML/tree/main/spec/layer-2-primitives).
- **Layer 3, Behavior Composition.** sequence, branch, parallel, retry, on_error. [Source](https://github.com/URML-MARS/URML/tree/main/spec/layer-3-behavior).
- **Layer 4, Natural-Language Interface.** The prompt contract for LLMs emitting URML, plus revision semantics. [Source](https://github.com/URML-MARS/URML/tree/main/spec/layer-4-nl-grammar).

## Profiles

- **Home.** Indoor service robots. Adds `speak`, `listen`. [Source](https://github.com/URML-MARS/URML/tree/main/spec/profiles/home).
- **Drone.** UAV operations. Adds `take_off`, `land`, `return_to_home`. [Source](https://github.com/URML-MARS/URML/tree/main/spec/profiles/drone).
- **Industrial.** Cell-based manipulation. Constrains the core primitives with industrial safety semantics. [Source](https://github.com/URML-MARS/URML/tree/main/spec/profiles/industrial).

## Decision history

Spec changes go through RFCs. The decision history is at [github.com/URML-MARS/URML/tree/main/docs/rfcs](https://github.com/URML-MARS/URML/tree/main/docs/rfcs). Read RFC-0001 for the process, RFC-0002 for the initial primitive vocabulary, RFC-0003 for the US-federal alignment decision, RFC-0004 for compliance policy enforcement.

## Layer-0 substrates

Layer 0 is the substrate URML compiles down to. It is explicitly **not** part of URML. ROS 2 is the first reference runtime because its community is largest. PX4 is next. AUTOSAR Adaptive, OPC UA Robotics, and vendor SDKs are first-class targets, not afterthoughts. The substrate-neutrality acid test in [CLAUDE.md](https://github.com/URML-MARS/URML/blob/main/CLAUDE.md) governs every primitive: can it be cleanly implemented on a runtime with zero ROS dependencies?
