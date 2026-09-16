"""CLI: run a mission through the digital twin and write a Parquet log.

Usage:
    python -m scripts.run_mission --engine rotax914_like --mission isr_18h_endurance --speed 200
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from aerotwin.simulation.mission import MissionRegistry, MissionRunner
from aerotwin.twin.config import EngineRegistry

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "missions"


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run an AeroTwin mission and log it to Parquet.")
    parser.add_argument("--engine", default="rotax914_like", help="engine_id from configs/engines/")
    parser.add_argument("--mission", required=True, help="mission_id from configs/missions/")
    parser.add_argument(
        "--speed",
        type=float,
        default=0.0,
        help="Playback speed multiplier for real-time pacing (0 = run as fast as possible)",
    )
    parser.add_argument("--log-interval-s", type=float, default=1.0, help="Parquet log tick interval")
    parser.add_argument("--out", default=None, help="Output Parquet path (default: data/missions/<id>.parquet)")
    return parser.parse_args()


def main() -> None:
    """Run the requested mission and save its log."""
    args = parse_args()
    engine_cfg = EngineRegistry().get(args.engine)
    mission_cfg = MissionRegistry().get(args.mission)
    runner = MissionRunner(engine_cfg, mission_cfg)

    start = time.perf_counter()
    df = runner.run(log_interval_s=args.log_interval_s)
    wall_s = time.perf_counter() - start
    sim_s = mission_cfg.total_duration_s
    print(
        f"Ran mission '{args.mission}' ({sim_s / 3600:.2f} sim-hours) "
        f"in {wall_s:.1f}s wall time ({sim_s / max(wall_s, 1e-6):.0f}x real time)."
    )

    out_path = Path(args.out) if args.out else DATA_DIR / f"{args.mission}.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
