#!/usr/bin/env python3
"""Verify that the public staging endpoint serves a healthy expected revision."""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request


class VerificationError(Exception):
    """The externally visible service failed a staging check."""


def verify_once(base_url, commit_sha, image_digest, timeout=10):
    """Check health, public revision, and home page once; raise on failure."""
    base_url = base_url.rstrip('/')

    def get(path, expect_json=False):
        try:
            request = urllib.request.Request(base_url + path, headers={'Accept': 'application/json' if expect_json else 'text/html'})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if response.status != 200:
                    raise VerificationError(f'{path} returned HTTP {response.status}')
                if expect_json:
                    data = response.read(65537)
                    if len(data) > 65536:
                        raise VerificationError(f'{path} response is too large')
                    try:
                        decoded = json.loads(data)
                    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                        raise VerificationError(f'{path} returned invalid JSON') from exc
                    if not isinstance(decoded, dict):
                        raise VerificationError(f'{path} returned invalid JSON object')
                    return decoded
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise VerificationError(f'{path} request failed: {type(exc).__name__}') from exc
        return None

    if get('/actuator/health', True).get('status') != 'UP':
        raise VerificationError('Staging health is not UP')
    info = get('/actuator/info', True)
    if info.get('commit') != commit_sha:
        raise VerificationError('Staging commit does not match expected revision')
    if info.get('imageDigest') != image_digest:
        raise VerificationError('Staging image digest does not match expected image')
    get('/')


def wait_for_staging(base_url, commit_sha, image_digest, attempts=24, delay=10, timeout=10):
    """Retry a complete check and return (success, last_error)."""
    last_error = 'No verification attempts'
    for attempt in range(attempts):
        try:
            verify_once(base_url, commit_sha, image_digest, timeout)
            return True, ''
        except VerificationError as exc:
            last_error = str(exc)
        if attempt + 1 < attempts:
            time.sleep(delay)
    return False, last_error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base_url', help='staging URL, e.g. https://staging.example.com')
    parser.add_argument('commit_sha', help='expected 40-character commit SHA')
    parser.add_argument('image_digest', help='expected application image sha256 digest')
    parser.add_argument('--attempts', type=int, default=24)
    parser.add_argument('--delay', type=float, default=10)
    parser.add_argument('--timeout', type=float, default=10)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}', args.commit_sha):
        parser.error('commit_sha must be a lowercase 40-character hexadecimal SHA')
    if not re.fullmatch(r'sha256:[a-f0-9]{64}', args.image_digest):
        parser.error('image_digest must be sha256 followed by 64 lowercase hexadecimal characters')
    if args.attempts < 1 or args.delay < 0 or args.timeout <= 0:
        parser.error('attempts and timeout must be positive; delay must be non-negative')
    success, message = wait_for_staging(args.base_url, args.commit_sha, args.image_digest, args.attempts, args.delay, args.timeout)
    if not success:
        print(f'Staging verification failed: {message}', file=sys.stderr)
        return 1
    print(f'Staging is healthy and serving commit {args.commit_sha} with image {args.image_digest}.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
