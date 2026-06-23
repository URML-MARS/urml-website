---
title: "Field notes: running URML on a Raspberry Pi with a local LLM"
date: 2026-06-23
summary: "A community member ran URML's English-to-intent translation on a Raspberry Pi with a sub-1GB local model. What it taught us about small-model limits, and the fixes the exchange shipped."
category: Engineering
tags: ["edge", "llm", "ollama", "raspberry-pi", "validator", "field-notes"]
sources:
  - { title: "Discussion #497: URML App Support for Ollama LLMs", url: "https://github.com/URML-MARS/URML/discussions/497", accessed: 2026-06-23 }
  - { title: "RFC-0630: relative-motion primitives (drive, turn)", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0630-relative-motion-primitive.md", accessed: 2026-06-23 }
  - { title: "PR #519: urml translate --save-rejected", url: "https://github.com/URML-MARS/URML/pull/519", accessed: 2026-06-23 }
  - { title: "PR #524: conservative JSON-repair for small-model emissions", url: "https://github.com/URML-MARS/URML/pull/524", accessed: 2026-06-23 }
  - { title: "Lyrical-Dave (the robot in this post)", url: "https://github.com/slowrunner/LyricalDave", accessed: 2026-06-23 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

A community member who goes by [@slowrunner](https://github.com/slowrunner) spent a few days running URML on a Raspberry Pi 5, translating plain English into validated robot programs with a local model through Ollama. No cloud, no subscription, everything on the robot. The whole exchange happened in the open on our discussion board, and it taught us more than a month of planning would have.

![Lyrical-Dave, a GoPiGo3 ROS 2 robot](/blog/lyrical-dave.jpg)

*Lyrical-Dave, @slowrunner's GoPiGo3 ROS 2 robot. Photo: @slowrunner.*

## The headline

A 986 MB model (qwen2.5:1.5b) running locally on the Pi, at a 32k context, translated "drive around the four corners of the room and come back home" into a valid URML program. Accepted on the first try, no revisions, entirely on a 4 GB single-board computer.

That is the "under 2 GB on the edge" case people keep asking about, and it works. With one large caveat.

## The honest part

Small models are not reliable at this. The same prompt, same machine, same model gave a clean program on some runs and a malformed one on others. At 1.5 billion parameters it is closer to a coin flip than a tool, and the failures split two ways: structural, where the model invents fields or nests them wrong, and formatting, where the intent is right but the JSON is broken.

This is exactly why URML splits translation from execution. The flaky, model-shaped step happens once, at authoring time, behind a validator that refuses anything malformed before it reaches the robot. You translate once, get a validated program, and that file is yours: deterministic, offline, reusable with no model in the loop. You are the author with a gate, not the tester of an oracle.

## What the exchange shipped

Real use surfaced real gaps, and four of them closed in a few days:

- **`urml translate --save-rejected`** writes the model's final rejected output to a file, marked do-not-execute, so you can see exactly what a small model produced when it failed.
- **`drive` and `turn`** (RFC-0630): relative-motion primitives for frameless robots, the "drive forward a foot, spin ninety degrees" vocabulary a wheel-encoder buggy actually speaks.
- **Educational few-shots** so the bridge can teach a small model to emit those new verbs.
- **A conservative JSON-repair pass** that recovers an otherwise-valid program wrapped in a Markdown fence, surrounded by prose, or carrying a trailing comma. The validator still gates the result, so repair can only recover a good program, never admit a bad one.

## Why we are writing this down

This is what early adoption looks like, and it is not a number on a dashboard. It is one person using the thing for real, on cheap hardware, and pulling features out of it by hitting honest limits. The validator-first design is the part that held up: a small model can be as creative or as wrong as it likes, and the robot still only does what was declared possible and checked safe.

These are robots someone actually lives with. Lyrical-Dave has logged over ten thousand hours since 2021 and more than two thousand dockings, and during this very exchange it rode out a 1:30 AM docking failure on its own: it retried, recovered, and never woke its owner. That is what the discipline is for, a robot that does only what was declared possible and checked safe, even at 1:30 in the morning.

The full thread, including the working Ollama setup, is on the [discussion board](https://github.com/URML-MARS/URML/discussions/497). Lyrical-Dave's own code is [here](https://github.com/slowrunner/LyricalDave).
