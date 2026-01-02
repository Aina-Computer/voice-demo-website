import { IncomingWebhook } from "@slack/webhook";

/**
 * Send audio upload notification to Slack
 */
export async function sendSlackNotification(data: {
  userName: string;
  downloadUrl: string;
  fileSize: string;
  duration: number;
  timestamp: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL is not configured");
    throw new Error("Slack webhook URL is not configured");
  }

  const webhook = new IncomingWebhook(webhookUrl);

  const message = {
    text: "🎤 New Audio Upload - CES Demo",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎤 New Audio Upload - CES Demo",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*👤 Name:*\n${data.userName}`,
          },
          {
            type: "mrkdwn",
            text: `*📅 Uploaded:*\n${data.timestamp}`,
          },
          {
            type: "mrkdwn",
            text: `*📊 File Size:*\n${data.fileSize} MB`,
          },
          {
            type: "mrkdwn",
            text: `*⏱️ Duration:*\n${data.duration.toFixed(1)}s`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🔗 Download:*\n<${data.downloadUrl}|Click here to download>`,
        },
      },
      {
        type: "divider",
      },
    ],
  };

  await webhook.send(message);
}
