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
  { org: "urml-industrial-arm-runtime", sub: "ROS-Industrial / MoveIt 2 · ABB · FANUC · KUKA · YASKAWA · UR · Franka · Kawasaki · Stäubli · Comau · Mitsubishi Electric · Denso · Hyundai · Nachi · Epson · Omron · Hanwha (16 brands)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-cobot-runtime", sub: "Native zero-ROS cobot SDKs · UR RTDE · Franka FCI · Doosan DRFL · Techman TMflow · Kinova Kortex · Mecademic · Neura · Kassow (8 brands)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-legged-runtime", sub: "Boston Dynamics Spot (bosdyn) · ANYbotics ANYmal (ROS 2)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-humanoid-runtime", sub: "Agility Digit (ROS 2 · locomotion subset)", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-mobile-runtime", sub: "Clearpath Husky / Jackal · ROS 2 + Nav2", profiles: ["home", "industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-marine-runtime", sub: "BlueROV2 / ArduSub via MAVLink · no ROS dependency", profiles: ["drone"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-opcua-runtime", sub: "OPC UA Robotics companion spec via asyncua · zero ROS · RFC-0015/0016 spec-gaps filed", profiles: ["industrial"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-mujoco-runtime", sub: "MuJoCo physics simulator · zero ROS · pure Protocol proof", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-isaac-runtime", sub: "NVIDIA Isaac Sim/Lab · zero ROS · local RTX/Omniverse (not cloud)", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-embedded-runtime", sub: "micro:bit/Arduino over pyserial · zero ROS · RFC-0011 educational", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
  { org: "urml-edu-runtime", sub: "VEX V5 · LEGO SPIKE (Pybricks BLE) · Thymio (Aseba TDM) · zero ROS · RFC-0011 educational (3 platforms)", profiles: ["home"], note: "First-party reference adapter · hermetic conformance" },
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
