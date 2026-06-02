---
title: "Fleets, classrooms, and the hardware seam"
date: 2026-06-02
summary: "A week of URML: a multi-robot fleet slice with static cross-robot safety, a four-platform classroom runtime, outreach down to the ros2_control hardware seam, and two threads that became spec bindings."
category: URML
tags: ["fleet", "multi-robot", "education", "ros2-control", "outreach", "spec"]
sources:
  - { title: "RFC-0286: multi-robot fleet addressing and synchronized execution", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0286-multi-robot-fleet-addressing.md", accessed: 2026-06-02 }
  - { title: "RFC-0290: frame-transform graph", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0290-frame-transform-graph.md", accessed: 2026-06-02 }
  - { title: "RFC-0291: UTM-style strategic deconfliction", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0291-utm-strategic-deconfliction.md", accessed: 2026-06-02 }
  - { title: "RFC-0304: permissive translation alternative", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0304-permissive-translation-alternative.md", accessed: 2026-06-02 }
  - { title: "RFC-0305: Eclipse iceoryx2 retarget", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0305-iceoryx2-outreach.md", accessed: 2026-06-02 }
  - { title: "RFC-0319: ros2_control mapping", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0319-ros2-control-outreach.md", accessed: 2026-06-02 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

The last week of work pushed URML in two directions at once: up, to coordinating more than one robot at a time, and down, to the layer where intent finally reaches an actuator. Here is what landed.

## One program, many robots

A robot language that only ever addresses one robot is half a language. [RFC-0286](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0286-multi-robot-fleet-addressing.md) adds the other half: a roster that binds several capability manifests under English-callable handles, two additive Layer-3 nodes (`on:` to scope a command to a member, `barrier:` to synchronize members), and a `validate_fleet` check that runs before anything moves. A reference `FleetRuntime` executes it, and the demo choreographs a courier base and a stationary arm through a handoff.

The load-bearing idea is not the syntax. It is the validation. URML can reject two robots sent into the same place at the same instant, statically, because the validator sees both manifests at once. No single vendor SDK can catch that, because no single SDK sees both robots.

Two follow-on RFCs make the collision check geometric instead of name-based. [RFC-0291](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0291-utm-strategic-deconfliction.md) borrows the UTM model from aviation: each member declares an operational volume, and separation is checked laterally, vertically, by medium, or in time. [RFC-0290](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0290-frame-transform-graph.md) adds an SE(3) frame-transform graph so a drone's altitude and a rover's site frame resolve into one world before the geometry is compared.

The honest boundary: this is strategic deconfliction, not a live collision-avoidance loop, and it is not a building-scale traffic manager. Continuous fleet routing across a facility is Open-RMF's job, and URML composes above it rather than replacing it.

## A runtime for the classroom

The educational runtime grew to four real platforms: VEX V5, LEGO SPIKE via Pybricks, Thymio over Aseba TDM, and Robotical Marty over `martypy`. The Marty adapter graduated to production after a driver-library contributor ran URML's validation on real hardware over WiFi and returned a live execution trace. A child writing "make the robot walk forward then wave" should not need to know which of four boards is plugged in. That is the same substrate-fungibility promise the fleet work makes, aimed at a different room.

## Down to the hardware seam

Outreach this week reached the layer where Layer-1 Hardware Abstraction actually lands on motors. [RFC-0319](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0319-ros2-control-outreach.md) maps URML onto `ros2_control`, the ROS 2 hardware-interface and motion-control framework, with the EtherCAT and CANopen fieldbus drivers as separate threads. URML sits one layer up from the runtime arbitration: intent becomes a validated primitive, which becomes a controller command, which becomes a command interface, which reaches hardware. The differentiator is the same one as everywhere else, a static check against the capability manifest and the safety envelope before any interface is claimed.

Alongside it, a warehouse and intralogistics wave opened above the VDA5050 master-control interface and the openTCS fleet-control stack, where URML's cross-robot validation is the piece a per-vehicle interface cannot express.

## Two conversations that became bindings

Two outreach threads turned into specification work this week.

A maintainer of an open multilingual-translation research project answered URML's questions about license modeling, confirmed that the model weights are non-commercial only, and pointed the commercial path toward permissive open LLMs. That became [RFC-0304](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0304-permissive-translation-alternative.md), which lets a manifest declare a commercial-eligible permissive translation substrate alongside a license-gated primary, turning a hard failure into a fork.

A zero-copy IPC middleware maintainer engaged on the mapping RFC and invited URML to the project's developer meetup, then noted the team's focus has shifted to the Rust successor. [RFC-0305](https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0305-iceoryx2-outreach.md) retargets the IPC-substrate mapping to iceoryx2's brokerless architecture, where a config path and a messaging pattern replace the old central daemon.

Both followed the same rule the project has held to since the start: the conversation is public, the reply is human, and the specification moves only when a real exchange justifies it.
