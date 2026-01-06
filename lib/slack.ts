import { IncomingWebhook } from "@slack/webhook";

/**
 * Send audio upload notification to Slack
 */
export async function sendSlackNotification(data: {
  userName: string;
  userEmail?: string;
  downloadUrl?: string;
  fileSize?: string;
  duration: number;
  timestamp: string;
  audioType?: "raw" | "enhanced";
  rawDownloadUrl?: string;
  rawFileSize?: string;
  rawDuration?: number;
  enhancedDownloadUrl?: string;
  enhancedFileSize?: string;
  enhancedDuration?: number;
  error?: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL is not configured");
    throw new Error("Slack webhook URL is not configured");
  }

  const webhook = new IncomingWebhook(webhookUrl);

  const hasBothVersions = data.rawDownloadUrl && data.enhancedDownloadUrl;

  const blocks: any[] = [
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
        ...(data.userEmail ? [{
          type: "mrkdwn",
          text: `*📧 Email:*\n${data.userEmail}`,
        }] : []),
      ],
    },
  ];

  if (hasBothVersions) {
    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎵 Raw Audio:*\n📊 ${data.rawFileSize} MB • ⏱️ ${data.rawDuration?.toFixed(1)}s\n<${data.rawDownloadUrl}|Download Raw Audio>`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎨 AI Enhanced Audio:*\n📊 ${data.enhancedFileSize} MB • ⏱️ ${data.enhancedDuration?.toFixed(1)}s\n<${data.enhancedDownloadUrl}|Download Enhanced Audio>`,
        },
      }
    );
  } else {
    const audioTypeText = data.audioType === "enhanced" ? "🎨 AI Enhanced Audio" : "🎵 Raw Audio";
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*🎧 Audio Type:*\n${audioTypeText}`,
    });
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*📊 File Size:*\n${data.fileSize || data.rawFileSize} MB`,
    });
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*⏱️ Duration:*\n${(data.duration || data.rawDuration || 0).toFixed(1)}s`,
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔗 Download:*\n<${data.downloadUrl || data.rawDownloadUrl}|Click here to download>`,
      },
    });
  }

  if (data.error) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚠️ AI Enhancement Failed:*\n\`\`\`${data.error}\`\`\`\n_Raw audio was successfully saved and is available above._`,
      },
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `<https://api.aina.co/api/v1/pilot/send-voice-email?email=${encodeURIComponent(data.userEmail || '')}|✅ Send Email>`,
    },
  });

  blocks.push({
    type: "divider",
  });

  const message = {
    text: "🎤 New Audio Upload - CES Demo",
    blocks,
  };

  await webhook.send(message);
}