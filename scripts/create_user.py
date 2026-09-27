"""Create a ground-station operator account, or (re)seed the demo roster.

    python -m scripts.create_user --seed
    python -m scripts.create_user MIL-1234-BRAVO "Lt. Bravo" --roles uav_operator,maint_tech
"""

from __future__ import annotations

import argparse
import getpass

from aerotwin.auth.service import ROLES, create_operator, seed_operators
from aerotwin.storage.db import get_connection


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("operator_id", nargs="?")
    parser.add_argument("display_name", nargs="?")
    parser.add_argument("--roles", default="uav_operator", help=f"comma-separated, from {sorted(ROLES)}")
    parser.add_argument("--title", default="")
    parser.add_argument("--seed", action="store_true", help="(re)seed configs/users/operators.yaml")
    args = parser.parse_args()

    conn = get_connection()
    if args.seed:
        print(f"Seeded {seed_operators(conn, force=True)} operators.")
        return
    if not args.operator_id or not args.display_name:
        parser.error("operator_id and display_name are required unless --seed is given")
    pin = getpass.getpass("CAC PIN (6-8 digits): ")
    op = create_operator(conn, args.operator_id.upper(), args.display_name, pin, args.roles.split(","), title=args.title)
    print(f"Created {op.operator_id} ({', '.join(op.roles)}).")


if __name__ == "__main__":
    main()
