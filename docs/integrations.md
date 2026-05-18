# Integrations

URML is an intent layer. It does not move motors itself; a URML-compatible runtime translates a verified program into whatever robot stack lives below. This page lists the substrates URML's reference runtimes target today, and the exact path a new substrate, OS, or vendor stack takes to get there.

!!! note "What this list is, and is not"
    These are open-source substrates that URML's reference runtimes compile to. The names and logos belong to their respective projects. Listing here is **not** a partnership, endorsement, certification, or a claim of production readiness. URML is in Phase 0; the `URML-Certified` conformance mark is reserved for a future Phase 4 program ([trademark policy](trademark.md)).

## Substrates URML targets

<div class="urml-integration-grid">
  <div class="urml-integration-card">
    <div class="urml-mark"><span class="urml-wordmark">ROS&nbsp;2</span></div>
    <p class="urml-card-desc">The first reference runtime. URML compiles intent into ROS 2 actions, services, and topics via Nav2 (navigation) and MoveIt 2 (manipulation). A hermetic mock adapter runs end to end today; a real <code>rclpy</code> adapter is in progress.</p>
    <a class="urml-card-link" href="https://www.ros.org">ros.org &rarr;</a>
  </div>
  <div class="urml-integration-card">
    <div class="urml-mark"><span class="urml-wordmark">PX4&nbsp;/&nbsp;MAVLink</span></div>
    <p class="urml-card-desc">The v0.1 reference runtime for the drone profile. Translates URML primitives into PX4 / MAVLink commands with no ROS dependency, which is what proves URML is substrate-neutral rather than a ROS wrapper.</p>
    <a class="urml-card-link" href="https://px4.io">px4.io &rarr;</a>
  </div>
</div>

<div class="urml-planned">
  <strong>Targeted next &mdash; not yet implemented.</strong>
  AUTOSAR Adaptive, Autoware, and OPC UA Robotics are in scope as future substrates. There is no runtime for them yet, and nothing on this site should be read as one existing.
</div>

A runtime built by anyone else, for any substrate, can be listed once it passes the public conformance suite. The registry is at [Compatible Runtimes](compatible-runtimes.md); the process is below.

## How a new integration is added

Adding a substrate, OS, or vendor stack is not a private arrangement. It follows the same public, verifiable path for everyone.

<div class="urml-flow" role="list">
  <div class="urml-flow-step" role="listitem">
    <span class="urml-flow-n">1</span>
    <strong>Propose</strong>
    <small>Open an <a href="https://github.com/URML-MARS/URML/blob/main/docs/rfcs/0001-rfc-process.md">RFC</a> or a primitive-proposal issue. Spec changes are RFCs, not PRs.</small>
  </div>
  <div class="urml-flow-step" role="listitem">
    <span class="urml-flow-n">2</span>
    <strong>Implement the bar</strong>
    <small>Spec section, JSON Schema, reference implementation in &ge;1 runtime, conformance tests, and a runnable example. All five, or it does not land.</small>
  </div>
  <div class="urml-flow-step" role="listitem">
    <span class="urml-flow-n">3</span>
    <strong>Run the conformance suite</strong>
    <small>Pass the public <a href="https://github.com/URML-MARS/URML/tree/main/conformance/">conformance suite</a> against the spec versions you declare.</small>
  </div>
  <div class="urml-flow-step" role="listitem">
    <span class="urml-flow-n">4</span>
    <strong>Self-report to the registry</strong>
    <small>Submit via <a href="submit.md">the registry process</a>. Listing is self-reported and re-verifiable by anyone &mdash; not an endorsement.</small>
  </div>
  <div class="urml-flow-step urml-flow-future" role="listitem">
    <span class="urml-flow-n">5</span>
    <strong>URML-Certified <em>(future)</em></strong>
    <small>A paid conformance mark arrives in Phase 4. It is not in use today; no party may claim it now (<a href="trademark.md">policy</a>).</small>
  </div>
</div>

Two things make this honest rather than ceremonial. The conformance suite is public and free forever, so any claim of compatibility can be independently re-run and checked. And the registry is explicitly self-reported: URML does not audit, certify, or endorse the runtimes it lists. The optional, paid `URML-Certified` mark is a separate, future Phase 4 program; the tests it would be based on stay open regardless.
