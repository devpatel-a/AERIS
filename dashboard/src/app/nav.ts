/** Main navigation, in Stitch order (Settings has no Stitch screen, so it is not routed). */
export const NAV = [
  { to: "/live-ops", label: "Live Ops", icon: "radar" },
  { to: "/digital-twin", label: "Digital Twin", icon: "view_in_ar" },
  { to: "/diagnostics", label: "Diagnostics", icon: "build_circle" },
  { to: "/trends-fleet", label: "Trends & Fleet", icon: "analytics" },
  { to: "/mission-planner", label: "Mission Planner", icon: "flight_takeoff" },
  { to: "/mission-replay", label: "Mission Replay", icon: "history" },
  { to: "/reports", label: "Reports", icon: "description" },
  { to: "/simulation-control", label: "Simulation Control", icon: "model_training" },
] as const;
