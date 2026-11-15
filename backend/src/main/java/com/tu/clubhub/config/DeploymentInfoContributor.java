package com.tu.clubhub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.stereotype.Component;

/** Exposes only validated deployment identifiers, never arbitrary configuration. */
@Component
class DeploymentInfoContributor implements InfoContributor {

    private final String commit;
    private final String imageDigest;

    DeploymentInfoContributor(@Value("${DEPLOY_COMMIT:}") String commit,
            @Value("${DEPLOY_IMAGE_DIGEST:}") String imageDigest) {
        this.commit = commit.matches("[0-9a-f]{40}") ? commit : "unknown";
        this.imageDigest = imageDigest.matches("sha256:[0-9a-f]{64}") ? imageDigest : "unknown";
    }

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("commit", commit);
        builder.withDetail("imageDigest", imageDigest);
    }
}
