"""Download the roads GeoPackage before the API starts, on hosts with no mount.

The container runs this first. It does nothing when ROAD_NETWORK_URL is unset
or the file at ROAD_NETWORK_PATH already exists, as with the compose file's
read-only mount. Otherwise it downloads the file, checks it against
ROAD_NETWORK_MD5 when that is set, and only then moves it into place, so a
broken download never looks like a roads file.
"""

import hashlib
import os
import sys
import urllib.request
from pathlib import Path

CHUNK = 1 << 20


def fetch(url: str, target: Path, expected_md5: str = "") -> bool:
    """Return True when a file was downloaded, False when there was nothing to do."""
    if not url or target.is_file():
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_name(target.name + ".part")
    digest = hashlib.md5()
    with urllib.request.urlopen(url, timeout=60) as response, partial.open("wb") as out:
        while chunk := response.read(CHUNK):
            digest.update(chunk)
            out.write(chunk)
    if expected_md5 and digest.hexdigest() != expected_md5.lower():
        partial.unlink()
        raise RuntimeError(
            f"The roads file from {url} has MD5 {digest.hexdigest()}, not {expected_md5}."
        )
    partial.replace(target)
    return True


def main() -> int:
    url = os.environ.get("ROAD_NETWORK_URL", "")
    path = os.environ.get("ROAD_NETWORK_PATH", "")
    if not url:
        return 0
    if not path:
        print("ROAD_NETWORK_URL is set but ROAD_NETWORK_PATH is not.", file=sys.stderr)
        return 1
    if fetch(url, Path(path), os.environ.get("ROAD_NETWORK_MD5", "")):
        print(f"Downloaded the roads file to {path}.")
    else:
        print(f"The roads file is already at {path}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
