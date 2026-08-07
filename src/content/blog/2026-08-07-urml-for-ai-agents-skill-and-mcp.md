---
title: "URML for AI agents: an Agent Skill and an MCP server"
date: 2026-08-07
summary: "URML now ships as an Agent Skill and an MCP server: any AI agent can turn a plain-language goal into a validated robot program before an actuator moves. Plus a live agent on Moltbook and a wider 0.2.0."
category: Ecosystem
tags: ["agents", "mcp", "skill", "0.2.0", "distribution"]
sources:
  - { title: "URML Agent Skill (SKILL.md)", url: "https://github.com/URML-MARS/URML/blob/main/.github/skills/urml-robot-intent/SKILL.md", accessed: 2026-08-07 }
  - { title: "URML MCP server", url: "https://github.com/URML-MARS/URML/tree/main/reference/mcp-server", accessed: 2026-08-07 }
  - { title: "RFC-0640: Moltbook agent integration", url: "https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0640-moltbook.md", accessed: 2026-08-07 }
  - { title: "Agent Skills open standard", url: "https://agentskills.io", accessed: 2026-08-07 }
  - { title: "Model Context Protocol", url: "https://modelcontextprotocol.io", accessed: 2026-08-07 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

The recent releases made URML the language. This one makes it something an AI agent can pick up and use. URML now ships two agent-facing artifacts: an Agent Skill and an MCP server. They do the same job from two directions: let an agent turn a plain-language goal into a robot program that is checked against the robot's real capabilities and safety limits before any actuator moves.

## The one idea, unchanged

URML does not parse your English. It hands the model a precise target and checks the answer. Verification is a precondition for action, not a test you run afterward. An action that needs a capability the robot never declared is rejected, and it cannot revise its way out of a hardware-provenance failure. Nothing reaches an actuator until the validator accepts it.

## An Agent Skill

Agent Skills are an open standard (a `SKILL.md` file with instructions an agent loads on demand) supported across Claude Code, Codex, Cursor, Gemini CLI, VS Code, and many more. URML ships one:

```
npx skills add urml-robot-intent
```

It teaches an agent the loop: take a goal, emit a URML program against the published Layer-4 contract, validate it against a capability manifest and safety envelope, then execute. It leads with the hermetic offline path (the bundled echo provider and mock adapter), so an agent can prove the whole loop with no API key and no robot. It is provider-agnostic: any model works, none is privileged.

## An MCP server

The `urml-mcp-server` package exposes the same loop as Model Context Protocol tools any MCP client can call:

```
pip install urml-mcp-server
urml-mcp        # stdio; registered as io.github.urml-mars/urml
```

One design choice is load-bearing: the server never calls an LLM. The calling agent is already the model. It emits the URML; the server validates and runs it. That keeps URML's provider-neutrality intact by construction and keeps the validator as the safety boundary, so there is no `translate` tool to embed a model. `urml_execute` defaults to a hermetic mock adapter; real hardware sits behind an explicit opt-in.

## A URML agent, in public

URML also runs a verified agent on Moltbook, the social network for AI agents, where it posts the sentence-to-motion demo and joins the conversation (RFC-0640). Two honest notes. Most agents on a social network are not wired to a physical robot, so this is reach and demonstration, not a robotics channel. And the vote counters there are not adoption; we do not read them as such.

## The release under it

The 0.2.0 line is now twenty Apache-2.0 packages: the validator, the LLM bridge, the reference runtimes across ROS 2, PX4, industrial arms, cobots, legged and humanoid platforms, physics sims, OPC UA and AUTOSAR, the conformance suite, and the MCP server. The numbers are measured, not estimated: 24 intent primitives, 182 conformance fixtures, and 663 RFCs on file. A validated program runs fully offline once it is accepted.

```
pip install urml-validator urml-llm-bridge urml-mcp-server
```

That is the whole point of the two artifacts. URML was already the language for describing robot intent. Now an agent can adopt it as a capability, check its own plan before it acts, and know the result is admissible before a single motor turns.
