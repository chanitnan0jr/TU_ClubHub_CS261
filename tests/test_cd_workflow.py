"""Static checks for CI isolation and publication of verified Docker images.

These assert workflow wiring; GitHub Actions runs remain the integration test.
"""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / '.github/workflows/cd-deploy.yml').read_text()
RELEASE_GUARD = "github.event_name != 'pull_request' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))"


def job(name):
    match = re.search(rf'^  {re.escape(name)}:\n(.*?)(?=^  [a-z][a-z0-9-]*:\n|\Z)', WORKFLOW, re.M | re.S)
    if not match:
        raise AssertionError(f'missing job: {name}')
    return match.group(1)


def step(block, name):
    match = re.search(rf'^      - name: {re.escape(name)}\n(.*?)(?=^      - |\Z)', block, re.M | re.S)
    if not match:
        raise AssertionError(f'missing step: {name}')
    return match.group(1)


class CdWorkflowTests(unittest.TestCase):
    def test_triggers_include_pr_main_and_release_tags(self):
        self.assertRegex(WORKFLOW, r'(?m)^  pull_request:$')
        self.assertRegex(WORKFLOW, r'(?m)^    branches: \[main\]$')
        self.assertRegex(WORKFLOW, r"(?m)^    tags: \['v\*'\]$")

    def test_verification_requires_both_ci_workflows(self):
        self.assertIn('uses: ./.github/workflows/ci.yml', job('ci'))
        self.assertIn('uses: ./.github/workflows/ci-integration.yml', job('integration'))
        self.assertRegex(job('build-and-verify'), r'(?m)^    needs: \[ci, integration\]$')
        self.assertRegex(job('publish'), r'(?m)^    needs: build-and-verify$')
        for filename in ('ci.yml', 'ci-integration.yml'):
            workflow = (ROOT / '.github/workflows' / filename).read_text()
            self.assertRegex(workflow, r'(?m)^  workflow_call:')
            self.assertNotIn('secrets: inherit', workflow)

    def test_pr_build_cannot_publish_or_access_staging(self):
        build = job('build-and-verify')
        publish = job('publish')
        for name in ('Save verified images for release', 'Upload verified images for release'):
            self.assertIn(f'if: {RELEASE_GUARD}', step(build, name))
        self.assertRegex(publish, rf'(?m)^    if: {re.escape(RELEASE_GUARD)}$')
        self.assertRegex(build, r'(?m)^    permissions:\n      contents: read$')
        self.assertNotIn('packages: write', build)
        self.assertNotIn('secrets.GITHUB_TOKEN', build)
        self.assertIn('packages: write', publish)
        self.assertNotIn('STAGING_', WORKFLOW)
        self.assertNotIn('ssh ', WORKFLOW)
        self.assertNotIn('environment: staging', WORKFLOW)

    def test_isolated_stack_is_verified_and_removed(self):
        build = job('build-and-verify')
        verify = step(build, 'Verify isolated Compose stack')
        self.assertIn('docker compose up -d --no-build --wait', verify)
        self.assertIn('./scripts/seed-dev-data.sh', verify)
        self.assertIn('./scripts/smoke-test.sh', verify)
        cleanup = step(build, 'Remove isolated verification stack')
        self.assertIn('if: always()', cleanup)
        self.assertIn('docker compose down -v', cleanup)
        self.assertIn('temporary GitHub Actions runner', step(build, 'Summarize isolated verification'))
        self.assertIn('No persistent staging server', build)

    def test_published_images_are_verified_artifact_with_immutable_digest(self):
        build = job('build-and-verify')
        publish = job('publish')
        self.assertIn('docker save tu-clubhub-database:verify tu-clubhub-backend-frontend:verify', build)
        self.assertIn('actions/upload-artifact@v4', build)
        self.assertIn('actions/download-artifact@v4', publish)
        self.assertIn('docker load', publish)
        self.assertNotIn('docker build', publish)
        publish_step = step(publish, 'Publish verified images')
        self.assertIn('digest:', publish_step)
        self.assertNotIn(':staging', publish_step)
        self.assertIn('steps.publish.outputs.database_image', publish)
        self.assertIn('steps.publish.outputs.app_image', publish)

    def test_untrusted_ref_not_interpolated_into_shell(self):
        lines = WORKFLOW.splitlines()
        shell = []
        inside = False
        for line in lines:
            if re.match(r'^        run: \|', line):
                inside = True
                continue
            if inside and line.strip() and not line.startswith('          '):
                inside = False
            if inside:
                shell.append(line)
        self.assertNotRegex('\n'.join(shell), r'\$\{\{\s*github\.(?:ref|ref_name|head_ref|event\.)')


if __name__ == '__main__':
    unittest.main()
