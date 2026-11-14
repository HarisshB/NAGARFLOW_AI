import hashlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from fetch_roads import fetch  # noqa: E402


@pytest.fixture
def source(tmp_path: Path) -> tuple[str, str]:
    data = b"not really a geopackage"
    path = tmp_path / "source.gpkg"
    path.write_bytes(data)
    return path.as_uri(), hashlib.md5(data).hexdigest()


def test_downloads_and_checks_the_file(tmp_path: Path, source: tuple[str, str]) -> None:
    url, md5 = source
    target = tmp_path / "data" / "roads.gpkg"
    assert fetch(url, target, md5) is True
    assert target.read_bytes() == b"not really a geopackage"


def test_an_existing_file_is_left_alone(tmp_path: Path, source: tuple[str, str]) -> None:
    target = tmp_path / "roads.gpkg"
    target.write_bytes(b"mounted")
    assert fetch(source[0], target, source[1]) is False
    assert target.read_bytes() == b"mounted"


def test_no_url_does_nothing(tmp_path: Path) -> None:
    assert fetch("", tmp_path / "roads.gpkg") is False


def test_a_wrong_checksum_leaves_no_file(tmp_path: Path, source: tuple[str, str]) -> None:
    target = tmp_path / "roads.gpkg"
    with pytest.raises(RuntimeError, match="MD5"):
        fetch(source[0], target, "0" * 32)
    assert not target.exists()
    assert not target.with_name("roads.gpkg.part").exists()
