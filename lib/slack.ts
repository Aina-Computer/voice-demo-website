import { IncomingWebhook } from "@slack/webhook";

/**
 * Send audio upload notification to Slack
 */
export async function sendSlackNotification(data: {
  userName: string;
  downloadUrl?: string; // For backward compatibility
  fileSize?: string; // For backward compatibility
  duration: number;
  timestamp: string;
  audioType?: "raw" | "enhanced"; // Optional: defaults to "raw"
  // New fields for dual audio
  rawDownloadUrl?: string;
  rawFileSize?: string;
  rawDuration?: number;
  enhancedDownloadUrl?: string;
  enhancedFileSize?: string;
  enhancedDuration?: number;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL is not configured");
    throw new Error("Slack webhook URL is not configured");
  }

  const webhook = new IncomingWebhook(webhookUrl);

  // Check if we have both raw and enhanced audio
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
      ],
    },
  ];

  if (hasBothVersions) {
    // Show both raw and enhanced audio with individual durations
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
    // Single audio (backward compatibility)
    const audioTypeText = data.audioType === "enhanced" ? "🎨 AI Enhanced Audio" : "🎵 Raw Audio";
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*🎧 Audio Type:*\n${audioTypeText}`,
    });
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*📊 File Size:*\n${data.fileSize} MB`,
    });
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*⏱️ Duration:*\n${data.duration.toFixed(1)}s`,
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔗 Download:*\n<${data.downloadUrl}|Click here to download>`,
      },
    });
  }

  blocks.push({
    type: "divider",
  });

  const message = {
    text: "🎤 New Audio Upload - CES Demo",
    blocks,
  };

  await webhook.send(message);
}
