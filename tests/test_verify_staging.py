"""Test external revision verification without reaching a network."""

import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error


SPEC = importlib.util.spec_from_file_location('verify_staging', Path(__file__).resolve().parents[1] / 'scripts' / 'verify-staging.py')
verify_staging = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify_staging)
SHA = 'a' * 40
DIGEST = 'sha256:' + 'c' * 64


class Response(io.BytesIO):
    def __init__(self, value, status=200):
        data = json.dumps(value).encode() if isinstance(value, dict) else value
        super().__init__(data)
        self.status = status


class VerifyStagingTests(unittest.TestCase):
    def test_success_checks_health_commit_and_home(self):
        responses = [Response({'status': 'UP'}), Response({'commit': SHA, 'imageDigest': DIGEST}), Response(b'<html>ok</html>')]
        with patch.object(verify_staging.urllib.request, 'urlopen', side_effect=responses) as open_url:
            verify_staging.verify_once('https://example.test/', SHA, DIGEST, timeout=3)
        self.assertEqual([call.args[0].full_url for call in open_url.call_args_list], [
            'https://example.test/actuator/health', 'https://example.test/actuator/info', 'https://example.test/',
        ])
        self.assertTrue(all(call.kwargs['timeout'] == 3 for call in open_url.call_args_list))

    def test_old_commit_fails_even_if_health_is_up(self):
        with patch.object(verify_staging.urllib.request, 'urlopen', side_effect=[Response({'status': 'UP'}), Response({'commit': 'b' * 40, 'imageDigest': DIGEST})]):
            with self.assertRaisesRegex(verify_staging.VerificationError, 'commit does not match'):
                verify_staging.verify_once('https://example.test', SHA, DIGEST)

    def test_same_commit_with_old_or_missing_digest_is_rejected(self):
        for digest in ('sha256:' + 'd' * 64, None):
            with self.subTest(digest=digest):
                with patch.object(verify_staging.urllib.request, 'urlopen', side_effect=[Response({'status': 'UP'}), Response({'commit': SHA, 'imageDigest': digest})]):
                    with self.assertRaisesRegex(verify_staging.VerificationError, 'image digest does not match'):
                        verify_staging.verify_once('https://example.test', SHA, DIGEST)

    def test_health_and_home_failures_are_rejected(self):
        cases = [
            [Response({'status': 'DOWN'})],
            [Response({'status': 'UP'}), Response({'commit': SHA, 'imageDigest': DIGEST}), Response(b'error', 500)],
            [Response({'status': 'UP'}), Response(b'not json')],
            [Response({'status': 'UP'}), Response({'other': SHA})],
        ]
        for responses in cases:
            with self.subTest(responses=responses):
                with patch.object(verify_staging.urllib.request, 'urlopen', side_effect=responses):
                    with self.assertRaises(verify_staging.VerificationError):
                        verify_staging.verify_once('https://example.test', SHA, DIGEST)

    def test_timeout_or_connection_error_fails(self):
        for error in (TimeoutError('timeout'), urllib.error.URLError('unavailable')):
            with self.subTest(error=error):
                with patch.object(verify_staging.urllib.request, 'urlopen', side_effect=error):
                    with self.assertRaisesRegex(verify_staging.VerificationError, 'request failed'):
                        verify_staging.verify_once('https://example.test', SHA, DIGEST)

    def test_retries_are_bounded_and_later_success_passes(self):
        with patch.object(verify_staging, 'verify_once', side_effect=[verify_staging.VerificationError('old'), None]) as check:
            with patch.object(verify_staging.time, 'sleep') as sleep:
                self.assertEqual(verify_staging.wait_for_staging('https://example.test', SHA, DIGEST, attempts=4, delay=2, timeout=3), (True, ''))
        self.assertEqual(check.call_count, 2)
        sleep.assert_called_once_with(2)
        with patch.object(verify_staging, 'verify_once', side_effect=verify_staging.VerificationError('old')) as check:
            with patch.object(verify_staging.time, 'sleep') as sleep:
                self.assertEqual(verify_staging.wait_for_staging('https://example.test', SHA, DIGEST, attempts=3, delay=2), (False, 'old'))
        self.assertEqual(check.call_count, 3)
        self.assertEqual(sleep.call_count, 2)


if __name__ == '__main__':
    unittest.main()
