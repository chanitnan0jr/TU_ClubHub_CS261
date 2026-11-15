package com.tu.clubhub.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.info.Info;

class DeploymentInfoContributorTest {

    private static final String COMMIT = "0123456789abcdef0123456789abcdef01234567";
    private static final String DIGEST = "sha256:" + "a".repeat(64);

    @Test
    void acceptsOnlyFullLowercaseCommitHashes() {
        assertEquals(Map.of("commit", COMMIT, "imageDigest", DIGEST), info(COMMIT, DIGEST));
        for (String invalid : new String[] {"", "short", "secret-value", "0123456789ABCDEF0123456789ABCDEF01234567"}) {
            assertEquals(Map.of("commit", "unknown", "imageDigest", DIGEST), info(invalid, DIGEST));
        }
    }

    @Test
    void acceptsOnlySha256DigestInLowercase() {
        for (String invalid : new String[] {"", "sha256:abcd", "secret-value", "sha256:" + "A".repeat(64)}) {
            assertEquals(Map.of("commit", COMMIT, "imageDigest", "unknown"), info(COMMIT, invalid));
        }
    }

    private Map<String, Object> info(String commit, String digest) {
        var builder = new Info.Builder();
        new DeploymentInfoContributor(commit, digest).contribute(builder);
        return builder.build().getDetails();
    }
}
