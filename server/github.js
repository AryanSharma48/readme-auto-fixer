// server/github.js

import { App } from "@octokit/app";

export async function getOctokit(installationId) {
    const app = new App({
        appId: process.env.APP_ID,
        privateKey: process.env.PRIVATE_KEY,
    });

    return await app.getInstallationOctokit(installationId);
}