"""Contract tests for the staging host deployment script; no Docker daemon required."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "deploy-staging.sh"
DB = "ghcr.io/example/db@sha256:" + "a" * 64
APP = "ghcr.io/example/app@sha256:" + "b" * 64
COMMIT = "c" * 40

# A deterministic Docker substitute; records every command but never contacts Docker.
FAKE_DOCKER = r'''#!/usr/bin/env python3
import json
import os
import sys

args = sys.argv[1:]
with open(os.environ["DOCKER_CALL_LOG"], "a", encoding="utf-8") as log:
    log.write(json.dumps(args) + "\n")
fault = os.environ.get("DOCKER_FAULT", "")
if args[:1] == ["compose"]:
    if "pull" in args and fault == "pull":
        sys.exit(1)
    if "up" in args and fault == "up":
        sys.exit(1)
    if "ps" in args:
        service = args[-1]
        if fault != "missing":
            print("db-container" if service == "database" else "app-container")
elif args[:2] == ["image", "inspect"]:
    print("db-image-id" if args[-1] == os.environ["DATABASE_IMAGE"] else "app-image-id")
elif args[:1] == ["inspect"]:
    if args[2] == "{{.Image}}":
        if fault == "mismatch":
            print("unexpected-image-id")
        else:
            print("db-image-id" if args[-1] == "db-container" else "app-image-id")
    else:
        print("unhealthy" if fault == "unhealthy" else "healthy")
else:
    sys.exit(2)
'''


class DeployStagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="staging-deploy-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = self.root / "stage"
        self.stage.mkdir()
        (self.stage / ".env").write_text("POSTGRES_PASSWORD=disposable\n")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        docker = self.bin / "docker"
        docker.write_text(FAKE_DOCKER)
        docker.chmod(0o755)
        self.log = self.root / "docker.jsonl"
        self.env = os.environ.copy()
        self.env.update({
            "STAGING_DIR": str(self.stage),
            "DOCKER_CALL_LOG": str(self.log),
            "PATH": str(self.bin) + os.pathsep + self.env.get("PATH", ""),
        })

    def run_deploy(self, *args, fault=None):
        env = self.env.copy()
        if fault:
            env["DOCKER_FAULT"] = fault
        return subprocess.run(
            ["bash", str(SCRIPT), *args], env=env, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10,
        )

    def calls(self):
        if not self.log.exists():
            return []
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_deploy_checks_exact_image_ids_and_health_before_recording(self):
        previous = "old-commit\nold-db\nold-app\n"
        (self.stage / "applied-images.txt").write_text(previous)
        result = self.run_deploy(DB, APP, COMMIT)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.stage / "previous-images.txt").read_text(), previous)
        self.assertEqual((self.stage / "applied-images.txt").read_text(), f"{COMMIT}\n{DB}\n{APP}\n")
        calls = self.calls()
        self.assertTrue(any(call[-3:] == ["pull", "database", "backend-frontend"] for call in calls))
        self.assertTrue(any(call[:2] == ["image", "inspect"] and call[-1] == DB for call in calls))
        self.assertTrue(any(call[:2] == ["image", "inspect"] and call[-1] == APP for call in calls))
        self.assertEqual(sum("{{.Image}}" in call for call in calls), 2)
        self.assertEqual(sum(".State.Health" in " ".join(call) for call in calls), 2)
        self.assertFalse(any("down" in call or "-v" in call for call in calls))

    def test_failures_do_not_record_new_revision(self):
        for fault in ("pull", "up", "missing", "mismatch", "unhealthy"):
            with self.subTest(fault=fault):
                old = "previously-deployed\n"
                (self.stage / "applied-images.txt").write_text(old)
                result = self.run_deploy(DB, APP, COMMIT, fault=fault)
                self.assertNotEqual(result.returncode, 0, fault)
                self.assertEqual((self.stage / "applied-images.txt").read_text(), old)

    def test_invalid_arguments_are_rejected_before_running_docker(self):
        marker = self.root / "executed"
        bad_ref = f"ghcr.io/example/app@sha256:$(touch {marker})"
        for args in ((DB, APP), (DB, bad_ref, COMMIT), (DB, APP, "BAD")):
            with self.subTest(args=args):
                result = self.run_deploy(*args)
                self.assertNotEqual(result.returncode, 0)
        self.assertFalse(marker.exists())
        self.assertEqual(self.calls(), [])

    def test_missing_env_fails_before_running_docker(self):
        (self.stage / ".env").unlink()
        result = self.run_deploy(DB, APP, COMMIT)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing staging .env", result.stderr)
        self.assertEqual(self.calls(), [])


if __name__ == "__main__":
    unittest.main()
