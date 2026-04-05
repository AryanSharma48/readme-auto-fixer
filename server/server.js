import express from "express";
import dotenv from "dotenv";
import { runBot } from "./bot.js";
import { trackInstall, trackUninstall, trackEvent, getStats } from "./analytics.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/stats", async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (err) {
        console.error("Stats error:", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

app.post("/webhook", async (req, res) => {
    const event = req.headers["x-github-event"];

    try {
        if (event === "installation") {
            const { action, installation } = req.body;

            if (action === "created") {
                await trackInstall(
                    installation.id,
                    installation.account.login,
                    installation.account.type
                );
                await trackEvent("installation", { action, installationId: installation.id });
            } else if (action === "deleted") {
                await trackUninstall(installation.id);
                await trackEvent("installation", { action, installationId: installation.id });
            }
        }

        if (event === "push") {
            console.log("Push event received");

            const { repository, installation } = req.body;
            await trackEvent("push", {
                repo: repository.full_name,
                installationId: installation.id
            });

            await runBot(req.body);
        }
    } catch (err) {
        console.error("Webhook error:", err.message);
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});