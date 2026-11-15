"""Static safety-contract tests for the CD workflow, without GitHub credentials.

These check the workflow's declared guards and wiring, not GitHub's event engine.
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
    def test_release_paths_depend_on_both_ci_workflows(self):
        ci = job('ci')
        integration = job('integration')
        build = job('build-and-verify')
        deploy = job('deploy-staging')
        self.assertIn('uses: ./.github/workflows/ci.yml', ci)
        self.assertIn('uses: ./.github/workflows/ci-integration.yml', integration)
        self.assertRegex(build, r'(?m)^    needs: \[ci, integration\]$')
        self.assertRegex(deploy, r'(?m)^    needs: build-and-verify$')
        for filename in ('ci.yml', 'ci-integration.yml'):
            workflow = (ROOT / '.github/workflows' / filename).read_text()
            self.assertRegex(workflow, r'(?m)^  workflow_call:')
            self.assertRegex(workflow, r'(?m)^  contents: read$')
            self.assertNotIn('secrets: inherit', workflow)

    def test_pr_cannot_publish_or_invoke_staging(self):
        build = job('build-and-verify')
        deploy = job('deploy-staging')
        for name in ('Log in to GHCR', 'Publish verified images'):
            self.assertIn(f'if: {RELEASE_GUARD}', step(build, name))
        self.assertRegex(deploy, rf'(?m)^    if: {re.escape(RELEASE_GUARD)}$')
        self.assertRegex(deploy, r'(?m)^    environment: staging$')
        self.assertNotIn('secrets.STAGING_', build)
        self.assertNotRegex(job('ci') + job('integration'), r'(?m)^    secrets:')

    def test_single_staging_group_and_immutable_images(self):
        deploy = job('deploy-staging')
        self.assertRegex(deploy, r'(?m)^      group: tu-clubhub-staging-deployment$')
        self.assertRegex(deploy, r'(?m)^      cancel-in-progress: false$')
        transfer = step(deploy, 'Transfer configuration and deploy immutable images')
        self.assertIn('${{ needs.build-and-verify.outputs.database_image }}', transfer)
        self.assertIn('${{ needs.build-and-verify.outputs.app_image }}', transfer)
        self.assertIn('${{ github.sha }}', transfer)
        self.assertIn('image_pattern=', transfer)
        self.assertIn('StrictHostKeyChecking=yes', transfer)
        publish = step(job('build-and-verify'), 'Publish verified images')
        self.assertIn('digest:', publish)
        self.assertNotIn(':staging', publish)

    def test_stale_main_is_rejected_after_the_deployment_lock(self):
        deploy = job('deploy-staging')
        guard = step(deploy, 'Reject an outdated main deployment')
        self.assertIn("github.ref == 'refs/heads/main'", guard)
        self.assertIn('gh api "repos/$GITHUB_REPOSITORY/commits/main"', guard)
        self.assertIn('"$current_main" == "$COMMIT_SHA"', guard)
        self.assertIn('exit 1', guard)

    def test_staging_requires_configuration_and_external_health(self):
        deploy = job('deploy-staging')
        configure = step(deploy, 'Configure verified SSH host')
        for name in ('SSH_KEY', 'KNOWN_HOSTS', 'HOST', 'USER', 'BASE_URL'):
            self.assertIn(f'-n "${name}"', configure)
        external = step(deploy, 'Check external staging health and home page')
        self.assertIn('python3 scripts/verify-staging.py "$BASE_URL" "$COMMIT_SHA" "$IMAGE_DIGEST"', external)
        self.assertIn('${{ github.sha }}', external)
        self.assertIn('${{ needs.build-and-verify.outputs.app_image }}', external)
        self.assertIn('IMAGE_DIGEST=${APP_IMAGE##*@}', external)
        self.assertNotRegex(external, r'(?m)^        if:')

    def test_untrusted_ref_is_not_interpolated_into_shell(self):
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
        code = '\n'.join(shell)
        self.assertNotRegex(code, r'\$\{\{\s*github\.(?:ref|ref_name|head_ref|event\.)')


if __name__ == '__main__':
    unittest.main()
