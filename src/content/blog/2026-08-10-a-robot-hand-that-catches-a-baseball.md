---
title: "A robot hand that catches a baseball, and what a language should say about it"
date: 2026-08-10
summary: "Foundation Robotics showed a tendon-driven hand catching a baseball in mid-flight. A catch is a millisecond skill, not a plan. Here is where an intent language sits when the motion is too fast to script."
category: Vendor
tags: ["manipulation", "dexterous-hands", "humanoid-robots", "grasping", "manifests"]
sources:
  - { title: "Foundation Robotics tendon-driven hand video (via Interesting Engineering on X)", url: "https://x.com/i/status/2086497997974606087", accessed: 2026-08-10 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

San Francisco-based Foundation Robotics released footage of its new robotic hand catching a baseball in mid-flight. The design choice doing the work is old-fashioned and elegant: the motors sit in the forearm, not the fingers, and tendons pull each joint open and closed. Fingers that carry no motors are slim and light, and light fingers are fast fingers. The hand is built for Foundation's Phantom humanoids, which are aimed at industrial work.

A catch is a useful stress test for how we describe robot behavior, because it breaks the comfortable picture of a robot executing a plan. There is no step list for catching a baseball. Perception, prediction, and finger closure happen inside a window of a few hundred milliseconds, far below the level where a human, or a language, scripts individual motions. Whatever catches the ball is a trained reactive skill, not a sequence of commands.

So where does a robot intent language sit when the motion is too fast to script? Exactly at the boundary that does not move: before the skill runs.

The question a validator can answer is not "is this trajectory correct" but "is this robot allowed to attempt this, here, now". For a catch, that question has real content. Does the declared hand have the joints, the closing speed, and the reaction latency the skill needs? A tendon-driven hand with forearm motors has a very different declaration from a parallel-jaw gripper, and a language with a multi-DoF hand model can tell them apart on paper. Is a ballistic object arriving at speed acceptable in this workspace at all? That is a safety-envelope question, and it is answerable before anything moves: a catch attempt next to an open walkway is refusable in exactly the way a 250 N grasp on a 100 N gripper is refusable.

In URML terms, the intent stays one sentence ("catch the ball"), the skill stays inside the runtime where it belongs, and the manifest carries the honesty. A hand that can intercept a moving object should say so, with numbers: degrees of freedom, closing time, the latency budget of its perception-to-actuation loop. A hand that cannot should fail the check, on paper, before the ball is ever thrown.

URML's current grasp model assumes the target is sitting still, or close to it. A target on a ballistic arc is a genuine gap between what this hardware can do and what the language can say about it. That is what the spec-gap process is for: when a substrate can do something the vocabulary cannot express, the gap gets written down and argued about in the open, as an RFC, rather than silently bolted on. Hands like this one are exactly the kind of hardware that forces the conversation.

The broader read on Foundation's demo is the same one this blog keeps arriving at. Hardware capability is compounding fast, and the skills running on that hardware are increasingly learned rather than programmed. The scarce artifact is not the motion. It is the layer that states, in advance and in a form a machine can check, what the robot is for, what it is allowed to attempt, and what it must refuse.
