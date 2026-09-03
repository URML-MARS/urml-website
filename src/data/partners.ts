// Partners directory — shared source of truth for the partners page grid
// and the homepage preview. Content reconciled with docs/compatible-runtimes.md
// in the core URML repo: self-reported, URML does NOT certify/audit/endorse,
// third-party registry is EMPTY. The reference runtimes are first-party and
// real (built in the core repo); they pass the conformance suite hermetically.

export type Profile = "home" | "drone" | "industrial";

export interface ReferenceRuntime {
  org: string;
  sub: string;
  profiles: Profile[];
  note: string;
}

export interface CompliantPart {
  vendor: string;
  country: string;
  kind: string;
  manifest: string;
  rfc?: string;
}

export const reference: ReferenceRuntime[] = [
  { org: "urml-ros2-runtime", sub: "ROS 2 · Nav2 / MoveIt 2 / vision_msgs", profiles: ["home", "industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-px4-runtime", sub: "PX4 / MAVLink via pymavlink · no ROS dependency", profiles: ["drone"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-ardupilot-runtime", sub: "ArduPilot (ArduCopter / ArduSub) via MAVLink · no ROS dependency · SITL + Pixhawk bench-verified", profiles: ["drone"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-industrial-arm-runtime", sub: "ROS-Industrial / MoveIt 2 · ABB · FANUC · KUKA · YASKAWA · UR · Franka · Kawasaki · Stäubli · Comau · Mitsubishi Electric · Denso · Hyundai · Nachi · Epson · Omron · Hanwha (16 brands)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-cobot-runtime", sub: "Native zero-ROS cobot SDKs · UR RTDE · Franka FCI · Doosan DRFL · Techman TMflow · Kinova Kortex · Mecademic · Neura · Kassow (8 brands)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-legged-runtime", sub: "Boston Dynamics Spot (bosdyn) · ANYbotics ANYmal (ROS 2)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-humanoid-runtime", sub: "Agility Digit (ROS 2 · locomotion subset)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-mobile-runtime", sub: "Clearpath Husky / Jackal · ROS 2 + Nav2", profiles: ["home", "industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-marine-runtime", sub: "BlueROV2 / ArduSub via MAVLink · no ROS dependency", profiles: ["drone"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-opcua-runtime", sub: "OPC UA Robotics companion spec via asyncua · zero ROS · RFC-0015/0016 spec-gaps filed", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-mujoco-runtime", sub: "MuJoCo physics simulator · zero ROS · pure Protocol proof", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-chrono-runtime", sub: "Project Chrono multibody physics / terramechanics · zero ROS · high-fidelity validation", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-isaac-runtime", sub: "NVIDIA Isaac Sim/Lab · zero ROS · local RTX/Omniverse (not cloud)", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-embedded-runtime", sub: "micro:bit/Arduino over pyserial · zero ROS · RFC-0011 educational", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-edu-runtime", sub: "VEX V5 · LEGO SPIKE (Pybricks BLE) · Thymio (Aseba TDM) · Robotical Marty (martypy) · Microduck (JSON-RPC) · zero ROS · RFC-0011 educational (5 platforms)", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-autosar-runtime", sub: "AUTOSAR Adaptive ara::com scaffold · zero ROS · RFC-0019 Draft binding", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance · scaffold only" },
];

// First-party compliant-part reference manifests. URML ships a YAML manifest
// fixture + a positive conformance fixture for each vendor below; all pass
// the bundled US-federal default compliance policy (RFC-0004). Vendors marked
// with a Move #1 RFC are also subjects of a vendor-directed mapping RFC
// (RFCs 0023-0038) requesting maintainer feedback.
export const parts: CompliantPart[] = [
  { vendor: "SCHUNK", country: "DE", kind: "Pneumatic gripper (MPG / MPP)", manifest: "schunk_mpg_cell.yaml", rfc: "0031" },
  { vendor: "Ouster", country: "US", kind: "3D lidar (OS-1 / OS-2 / REV7)", manifest: "ouster_3d_lidar_cell.yaml", rfc: "0032" },
  { vendor: "SICK", country: "DE", kind: "Safety lidar (microScan3 / nanoScan3)", manifest: "sick_safety_lidar_cell.yaml", rfc: "0033" },
  { vendor: "Festo", country: "DE", kind: "Servo-electric gripper (DHEP / DHPS)", manifest: "festo_dhep_cell.yaml", rfc: "0034" },
  { vendor: "Zivid", country: "NO", kind: "3D industrial camera (Zivid Two / 2+)", manifest: "zivid_two_cell.yaml", rfc: "0035" },
  { vendor: "Hokuyo", country: "JP", kind: "2D lidar (URG / UST / UTM)", manifest: "hokuyo_lidar_cell.yaml", rfc: "0036" },
  { vendor: "Robotiq", country: "CA", kind: "Servo-electric gripper (2F-85)", manifest: "robotiq_2f85_cell.yaml" },
  { vendor: "Piab", country: "SE", kind: "Vacuum gripper", manifest: "piab_vacuum_cell.yaml" },
  { vendor: "OnRobot", country: "DK", kind: "Magnetic gripper", manifest: "onrobot_magnetic_cell.yaml" },
  { vendor: "Soft Robotics", country: "US", kind: "Compliant gripper", manifest: "soft_robotics_compliant_cell.yaml" },
  { vendor: "ATI Industrial Automation", country: "US", kind: "Force-torque (Axia80)", manifest: "ati_ft_cell.yaml" },
  { vendor: "Cognex", country: "US", kind: "Industrial vision (In-Sight 2800)", manifest: "cognex_vision_cell.yaml" },
  { vendor: "Schmalz", country: "DE", kind: "Vacuum gripper", manifest: "schmalz_vacuum_cell.yaml" },
  { vendor: "Bota Systems", country: "CH", kind: "6-axis force-torque", manifest: "bota_ft_cell.yaml" },
  { vendor: "Photoneo", country: "SK", kind: "3D structured-light vision (MotionCam-3D)", manifest: "photoneo_motioncam_cell.yaml" },
];

export const profiles: ReadonlyArray<"all" | Profile> = ["all", "home", "drone", "industrial"];

export const manufacturersCount = 0;

// Engaged outreach that turned into shipped code. These are the threads where
// a maintainer answered URML's mapping-RFC questions AND URML shipped a
// reference adapter (or spec binding) in response. Described by category, not
// by brand: the org is identifiable only via the linked public thread, and a
// listing reflects a public exchange, not an endorsement. Limited to threads
// where URML shipped a reference adapter or a spec binding in response (the
// highest-confidence subset of the wider `engaged` ledger in the core repo).
export interface EngagedStory {
  category: string; // headline, e.g. "Tier-1 industrial-arm OEM"
  outcome: string; // one sentence: what the maintainer did (no org name)
  shipped: string; // what URML shipped in response
  rfc: string; // RFC number, e.g. "0073"
  rfcSlug: string; // RFC filename slug in docs/rfcs/, e.g. "robotical-marty-outreach"
  thread: string; // full public GitHub URL of the engaged thread
}

export const engaged: EngagedStory[] = [
  {
    category: "Robot-simulation platform",
    outcome:
      "A platform engineer gave an expert review and closed the thread positively; their question about where a manifest claim comes from became a per-capability evidence tag the validator records.",
    shipped: "RFC-0631 capability-evidence traceability · examples/isaac USD-derived manifest",
    rfc: "0631",
    rfcSlug: "capability-evidence-traceability",
    thread: "https://github.com/isaac-sim/IsaacSim/issues/649",
  },
  {
    category: "On-device ML runtime",
    outcome:
      "A core maintainer answered all three mapping-RFC questions; the result was the first example to run a learned policy behind URML's runtime safety shield.",
    shipped: "examples/executorch-policy · RFC-0667 shield + RFC-0383 amendment",
    rfc: "0516",
    rfcSlug: "executorch-outreach",
    thread: "https://github.com/pytorch/executorch/issues/20268",
  },
  {
    category: "Quadruped mobility platform (community ROS 2 driver)",
    outcome:
      "The open-source ROS 2 driver maintainer (explicitly the community driver, not the manufacturer) validated URML's substrate cut for the platform, then for its arm.",
    shipped: "Reference adapter + arm grasp/release · legged-runtime",
    rfc: "0043",
    rfcSlug: "boston-dynamics-spot-integration",
    thread: "https://github.com/rai-opensource/spot_ros2/discussions/805",
  },
  {
    category: "Cognitive-robotics research lab",
    outcome:
      "A maintainer took a live video call, URML's first, to walk the mapping through against the lab's cognitive architecture; the thread closed positively.",
    shipped: "examples/cram · worked mapping",
    rfc: "0635",
    rfcSlug: "cram-outreach",
    thread: "https://github.com/cram2/cognitive_robot_abstract_machine/issues/391",
  },
  {
    category: "Manipulation simulation benchmark",
    outcome:
      "A benchmark contributor engaged once URML was reframed as an eval lens; the result flags out-of-distribution instructions per subtask before a rollout runs.",
    shipped: "examples/robocasa · per-subtask eval lens",
    rfc: "0452",
    rfcSlug: "robocasa-outreach",
    thread: "https://github.com/robocasa/robocasa/issues/200",
  },
  {
    category: "Power-electronics research lab",
    outcome:
      "The lab engaged on gating a high-power actuator; URML's minimal-node declaration bounds the motor's torque and velocity before a command is sent.",
    shipped: "examples/epically-powerful · minimal_node motor gating",
    rfc: "0620",
    rfcSlug: "epically-powerful-outreach",
    thread: "https://github.com/gatech-epic-power/epically-powerful/issues/32",
  },
  {
    category: "Tier-1 industrial-arm OEM",
    outcome:
      "An OEM org member answered all four mapping-RFC questions and endorsed the AS-language program-call binding.",
    shipped: "RFC-0015 call_program AS-language binding · industrial-arm-runtime",
    rfc: "0029",
    rfcSlug: "kawasaki-integration",
    thread: "https://github.com/Kawasaki-Robotics/khi_ros2/issues/9",
  },
  {
    category: "Educational bipedal robot",
    outcome:
      "A driver-library contributor engaged over five rounds, then ran URML's validation script on real hardware over WiFi and returned a live execution trace.",
    shipped: "Reference adapter · edu-runtime",
    rfc: "0073",
    rfcSlug: "robotical-marty-outreach",
    thread: "https://github.com/robotical/martypy/issues/52",
  },
  {
    category: "Desktop quadruped",
    outcome:
      "The platform's founder answered all seven mapping-RFC questions with parametric command examples and volunteered an ESP32 retarget.",
    shipped: "Reference adapter · edu-runtime",
    rfc: "0062",
    rfcSlug: "petoi-bittle-outreach",
    thread: "https://github.com/PetoiCamp/OpenCat-Quadruped-Robot/issues/113",
  },
  {
    category: "Open multilingual translation model",
    outcome:
      "A maintainer of an open multilingual-translation research project answered all four mapping-RFC questions, confirmed the non-commercial license modeling, and pointed the commercial path toward permissive open LLMs.",
    shipped: "RFC-0304 permissive-translation-alternative · spec binding",
    rfc: "0304",
    rfcSlug: "permissive-translation-alternative",
    thread: "https://github.com/facebookresearch/seamless_communication/issues/578",
  },
  {
    category: "Zero-copy IPC middleware",
    outcome:
      "A middleware maintainer engaged on the IPC mapping RFC and invited URML to the project's developer meetup; the active line is the Rust successor, so the binding was retargeted to it.",
    shipped: "RFC-0305 iceoryx2 · IPC substrate binding",
    rfc: "0305",
    rfcSlug: "iceoryx2-outreach",
    thread: "https://github.com/eclipse-iceoryx/iceoryx/issues/2530",
  },
  {
    category: "3D lidar SDK",
    outcome:
      "An engineer at the sensor vendor answered all five mapping-RFC questions within hours; their guidance on beam count, point-cloud units, and time-sync methods became a sensor-schema iteration.",
    shipped: "RFC-0039 sensor-schema v0.2 · Layer-1 binding",
    rfc: "0039",
    rfcSlug: "sensor-schema-v0-2-iteration",
    thread: "https://github.com/ouster-lidar/ouster-sdk/issues/711",
  },
];
