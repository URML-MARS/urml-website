---
title: "Field notes: the first robot runs a validated URML program (and drives off)"
date: 2026-06-25
summary: "A community member's GoPiGo3 became the first robot outside the project to run a validated URML program. It drove off when he typed -h, exposing an actuation footgun in our own demo, which we fixed the same day."
category: Engineering
tags: ["gopigo3", "robot", "safety", "validate-before-actuate", "field-notes", "community"]
sources:
  - { title: "Discussion #542: First GoPiGo3 robot runs a validated URML program", url: "https://github.com/URML-MARS/URML/discussions/542", accessed: 2026-06-25 }
  - { title: "examples/gopigo3: the GoPiGo3 example runtime", url: "https://github.com/URML-MARS/URML/tree/main/examples/gopigo3", accessed: 2026-06-25 }
  - { title: "PR #543: dry-run by default, --execute to actuate", url: "https://github.com/URML-MARS/URML/pull/543", accessed: 2026-06-25 }
  - { title: "@slowrunner's account on Mastodon", url: "https://fosstodon.org/@cyclical_obsessive/116811057601974296", accessed: 2026-06-25 }
  - { title: "Lyrical-Dave (the robot in this post)", url: "https://github.com/slowrunner/LyricalDave", accessed: 2026-06-25 }
urml_angle: explicit
author: "Ido Yahalomi"
draft: false
---

This week a community member who goes by [@slowrunner](https://github.com/slowrunner) closed the loop the whole project is built around. An English sentence, validated into a robot program, executed on real hardware. His GoPiGo3, Lyrical-Dave, drove across the room. Then it drove under a chair.

![Lyrical-Dave, a GoPiGo3 ROS 2 robot](/blog/lyrical-dave.jpg)

*Lyrical-Dave, @slowrunner's GoPiGo3 ROS 2 robot. Photo: @slowrunner.*

## The headline

This is the first time the full URML loop has run end to end outside a maintainer's machine: English, to a validated program, to a robot that moves, on an educational two-wheel buggy and a Raspberry Pi, with no cloud. The loop closed on someone else's robot, in their own home. That is the milestone.

## How it actually happened, which is the better story

We had just shipped an update to the GoPiGo3 example so it would notice a real robot and use it. @slowrunner pulled the update onto Dave, copied the example into his test folder, and ran it with `-h`, out of habit, expecting a help message. Instead he heard motors in the next room. He raced in to find Dave spinning ninety degrees and heading under a chair, his heart, in his words, racing as fast as Dave's.

He told it himself, with good humor: be careful what you type, your robot may be listening.

## The part we are not proud of, and fixed

URML's entire pitch is validate before actuate. Nothing moves until it is checked. And our own example moved a robot when someone typed `-h`. That is precisely the failure the project exists to prevent, and we had built it into the demo.

So we fixed it the same day. The example is now a dry run by default. Run it, or run it with `-h`, and it validates the program and prints the wheel and speech commands it would issue, and moves nothing. To actually drive the robot you pass `--execute`, which warns you first. Actuation is opt-in, the way it should have been from the start.

The lesson is the project's own, turned back on itself: a validated-safe program is only safe if running the tool cannot surprise you into executing it. The gate has to sit in front of the motor, including in the demo.

## What the robot was actually told

The "validated safe" program Dave ran was a short patrol: announce, drive a meter, turn, drive, return home. Every step had been checked against Dave's declared capabilities, a frameless two-wheel buggy with wheel encoders, before a single wheel turned. The validator did its job. The demo's invocation did not. Now both do.

One footnote: Dave moved but stayed silent. The example's default speech path is espeak, and on Dave it produced no sound and, worse, no error. That was a gap too, so the adapter now says on its log when it cannot speak, and a robot with its own voice, like Dave's ROS say node, can be wired straight in.

## Why we are writing this down

The validator-first design held: the robot did only what was declared possible and checked safe. What failed was operational glue around the demo, and a user caught it on his own hardware in the most memorable way possible. That is what early adoption looks like, and it is worth more than a clean launch.

The full thread, including Dave's own account, is on the discussion board. Lyrical-Dave's code is at [github.com/slowrunner/LyricalDave](https://github.com/slowrunner/LyricalDave).
