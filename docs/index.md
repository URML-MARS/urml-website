# URML

An open draft specification for natural-language robot control across ROS 2, PX4, and other substrates.

URML sits above existing robot operating systems. A URML program describes *what* a robot should do; a URML-compatible runtime translates that into whatever lives below (ROS 2 nodes, MAVLink commands, vendor SDK calls). Every program is statically verified against the robot's declared capabilities, the active safety envelope, and a compliance policy before a single actuator moves.

!!! warning "Phase 0, pre-stable"
    URML is in Phase 0. The artifact under review is the specification itself and the v0.1 reference implementation. There are no production runtimes yet. No part of this site should be read as a production-readiness claim, and the URML-Certified mark is reserved for a future Phase 4 program ([details](trademark.md)).

## What works today

- The five-pass validator (argument typing, capability check, safety envelope, variable bindings, compliance policy).
- The conformance suite: 24 declarative fixtures across home, drone, and industrial profiles.
- A provider-agnostic LLM bridge with revision loops driven by validator feedback.
- A hermetic mock reference runtime for end-to-end execution without hardware.
- The `urml` CLI: validate, schema, translate, emit-prompt, init, conformance run.

## What's planned

- A real `rclpy` ROS 2 adapter to replace the mock.
- The PX4 reference runtime.
- A formal certification program with the URML-Certified mark (Phase 4).

## Where to start

- **Read the spec.** [github.com/URML-MARS/URML](https://github.com/URML-MARS/URML) is the canonical source. The [Manifesto](manifesto.md) explains why URML exists.
- **Run a runtime.** Clone the repo, follow the quickstart in the README, run the conformance suite.
- **Submit a runtime.** Built a URML-compatible runtime? Run the public suite and [submit it to the registry](submit.md). The [registry](compatible-runtimes.md) lists projects that have done this.

## License

The specification, validator, conformance suite, LLM bridge, and reference runtimes are Apache 2.0 forever, per a written [Core Commitment](https://github.com/URML-MARS/URML/blob/main/CORE_COMMITMENT.md). The standard is the moat; commercial value lives in the surround.
