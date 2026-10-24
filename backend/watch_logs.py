"""Follow the Kairos workflow log in real time, colored by level and stage.

    uv run python backend/watch_logs.py                 # everything, starting with the last 20 lines
    uv run python backend/watch_logs.py --errors        # warnings and errors only
    uv run python backend/watch_logs.py ingest draft    # only lines containing any of these words
    uv run python backend/watch_logs.py --rid 3f2a1c    # one request end to end

Reads KAIROS_LOG_FILE (default backend/data/logs/kairos.log) and survives log rotation.
"""

import argparse
import os
import re
import time
from pathlib import Path

COLORS = {"ERROR": "\033[31;1m", "WARNI": "\033[33m", "INFO ": "\033[0m", "DEBUG": "\033[2m"}
STAGES = {
    "http": "\033[2m",
    "conference": "\033[36m",
    "ingest": "\033[34m",
    "extract": "\033[35m",
    "draft": "\033[32m",
    "voice": "\033[96m",
    "memory": "\033[95m",
    "note": "\033[92m",
    "triage": "\033[92m",
    "graph": "\033[31m",
}
RESET = "\033[0m"


LINE = re.compile(r"^(\S+) (\w+)\s+(\S+)(.*)$")


def paint(line):
    match = LINE.match(line)
    if not match:
        return line
    stamp, level, name, rest = match.groups()
    level_color = COLORS.get(level[:5].ljust(5), "")
    stage_color = STAGES.get(name.split(".", 1)[0], "")
    return f"\033[2m{stamp[11:]}{RESET} {level_color}{level:<5}{RESET} {stage_color}{name}{RESET}{rest}"


def wanted(line, args):
    if args.errors and " INFO " in line[:30]:
        return False
    if args.rid and f"rid={args.rid}" not in line:
        return False
    return not args.words or any(w.lower() in line.lower() for w in args.words)


def follow(path, args):
    while not path.exists():
        print(f"Waiting for {path} (start the backend)…", flush=True)
        time.sleep(1)
    lines = path.read_text(errors="replace").splitlines()[-args.last :]
    for line in lines:
        if wanted(line, args):
            print(paint(line), flush=True)
    handle = path.open(errors="replace")
    handle.seek(0, os.SEEK_END)
    inode = path.stat().st_ino
    while True:
        line = handle.readline()
        if line:
            if not line.startswith(" ") and wanted(line.rstrip("\n"), args):
                print(paint(line.rstrip("\n")), flush=True)
            elif line.startswith((" ", "Traceback")):  # exception tracebacks belong to the line above
                print("\033[31m" + line.rstrip("\n") + RESET, flush=True)
            continue
        time.sleep(0.2)
        try:
            if path.stat().st_ino != inode:  # rotated: reopen the new file
                handle = path.open(errors="replace")
                inode = path.stat().st_ino
        except FileNotFoundError:
            pass


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("words", nargs="*", help="only show lines containing any of these words")
    parser.add_argument("--errors", action="store_true", help="warnings and errors only")
    parser.add_argument("--rid", help="only lines from one request id")
    parser.add_argument("--last", type=int, default=20, help="lines of history to show first")
    args = parser.parse_args()
    path = Path(os.getenv("KAIROS_LOG_FILE", "backend/data/logs/kairos.log"))
    try:
        follow(path, args)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
