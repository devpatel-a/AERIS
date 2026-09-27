/* Dev-only: renders the raw converted Stitch markup inside the app shell, for visual baselining. */
import { useParams } from "react-router-dom";
import LiveOpsRaw from "./1_liveops";
import DigitalTwinRaw from "./2_twin";
import DiagnosticsRaw from "./3_diagnostics";
import TrendsRaw from "./4_trends";
import PlannerRaw from "./5_planner";
import ReplayRaw from "./6_replay";
import ReportsRaw from "./7_reports";
import SimControlRaw from "./8_simcontrol";

const SCREENS: Record<string, () => JSX.Element> = {
  "1": LiveOpsRaw, "2": DigitalTwinRaw, "3": DiagnosticsRaw, "4": TrendsRaw,
  "5": PlannerRaw, "6": ReplayRaw, "7": ReportsRaw, "8": SimControlRaw,
};

export default function RawPreview() {
  const { screen = "1" } = useParams();
  const Screen = SCREENS[screen] ?? LiveOpsRaw;
  return <Screen />;
}
