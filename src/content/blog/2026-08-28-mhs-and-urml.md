---
title: "MHS and URML: the driver and the language"
date: 2026-08-28
summary: "Anthropic's Model Hardware Standard standardizes how an agent finds and drives a device. URML checks the whole program before the first call. Where the two sit, and the safety-eval harness we built."
category: Ecosystem
tags: ["mhs", "anthropic", "standards", "safety", "validation", "physical-ai"]
sources:
  - { title: "Previewing the Model Hardware Standard (Anthropic)", url: "https://www.anthropic.com/news/model-hardware-standard-research-preview", accessed: 2026-08-28 }
  - { title: "Anthropic tests new way for Claude to work with robots and scientific lab tools (Bloomberg via The Star)", url: "https://www.thestar.com.my/tech/tech-news/2026/08/28/anthropic-tests-new-way-for-claude-to-work-with-robots-and-scientific-lab-tools", accessed: 2026-08-28 }
  - { title: "Anthropic pushes into physical world with new standard to help AI agents operate machines (CNBC)", url: "https://www.cnbc.com/2026/08/27/anthropic-pushes-into-physical-world-with-new-standard-to-help-ai-agents-operate-machines.html", accessed: 2026-08-28 }
  - { title: "URML and the Model Hardware Standard (positioning)", url: "https://github.com/URML-MARS/URML/blob/main/docs/integrations/model-hardware-standard.md", accessed: 2026-08-28 }
  - { title: "Physical-AI safety evaluation harness (example)", url: "https://github.com/URML-MARS/URML/tree/main/examples/physical-ai-safety-eval", accessed: 2026-08-28 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

Anthropic opened a research preview of the Model Hardware Standard this week. In their words, it is a standardized driver, "a simple set of primitives, commands like read or write, that any hardware device can understand", plus discovery over the network and a device reference file describing "what it can measure, what can be adjusted, and what safety limits will be enforced". It is model-agnostic, reachable through MCP, a command line, or code, and it will be open-sourced after Anthropic and its partners build "safety evaluations and best practices for AI systems that operate physical equipment". Universal Robots and Doosan are among the launch partners, next to lab-automation vendors and several of the best labs in the world.

This is the most important thing that has happened to URML's corner of the world since we started, so it deserves a plain answer to the obvious question: what is URML for, if MHS exists?

## Two different questions

MHS answers: how does an agent find this device, what can it do, and what will it refuse when asked? Those are per-device, per-call questions, and putting the answers in a file the vendor writes is exactly right.

URML answers a different question: is this whole program admissible on this hardware, in this deployment, before the first call goes out? A URML program is checked in five passes against the robot's capability manifest and a deployment envelope. A per-call limit at the device catches the fifth action of a bad plan. A program check refuses the plan.

There is a second difference that matters more in practice than it sounds. A device's own limits are not a deployment's limits. A vendor says the arm may move at 1 m/s; a lab says that in this room, next to these people, it moves at 0.3. MHS puts the device's limits in the device file, which is where they belong. URML keeps the deployment's limits in a separate envelope, and the validator applies the stricter of the two. One artifact cannot express that a site owner is more conservative than a vendor; two can.

## Where URML sits

Our manifesto has said since the first commit that URML's hardware layer "extends existing standards (URDF, SDF); we do not reinvent robot description". MHS is another such standard, and we treat it the way we treat URDF: a source the capability manifest derives from, and a substrate the validated program dispatches to. URML already ships adapters for two of the MHS partners and an OPC UA runtime whose intent-to-node mapping is the closest existing cousin of intent-to-read/write.

So the layering is not a contest. MHS is the driver. URML is the language above it, with the check in between.

## The gate Anthropic named, and what we built for it

Anthropic said the standard opens after safety evaluations exist. Safety evaluation for AI operating physical equipment is what URML has been building for months: static validation, envelope enforcement at runtime, a rehearsal gate that rolls a program out in simulation before real execution, a conformance suite, and evidence tags on every capability claim.

We packaged that into a hermetic evaluation harness this week. It takes a corpus of agent intents against a lab-cell manifest shaped like the assay in Anthropic's own post (a liquid handler, a robotic arm, a plate reader) and a deployment envelope, and it reports which intents are refused and why, in machine-readable codes: a grasp above the gripper's force, a move to a location the cell never declared, a measurement on an instrument that is not there, a flight command on an arm. For every accepted program it reports the envelope-monitor verdict over the rehearsed trace, and for every refusal it reports the evidence class of the capability the refusal relied on. It measures whether an agent's intent is admissible on declared hardware under a declared envelope. It does not measure physics, and it says so in the first paragraph of its README.

It runs offline, with no model and no device, in a few seconds. The code is Apache 2.0 like everything else here.

## What we are not claiming

We have not seen the MHS specification. Nothing in URML claims compatibility with it, and nothing in the manifest schema has been bent toward a format we have not read. When the standard is open, two pieces follow: an importer that reads a reference file into a manifest, the same shape as our URDF importer, and an adapter that dispatches URML programs through MHS read/write, making every MHS device a URML substrate through one adapter. Until then there is a scaffold with a placeholder transport, labeled as such.

We applied to the research preview. If you are one of the partners, or you run a lab that is about to hand an agent a pipetting robot, the harness is the thing to try first.
