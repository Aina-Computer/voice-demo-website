import { NextRequest, NextResponse } from "next/server";
import {
  cloneVoice,
  generateEnhancedAudio,
  deleteVoice,
} from "@/lib/voice-enhancement";
import {
  uploadToS3,
  generateS3Key,
  generatePresignedUrl,
  getFileSizeInMB,
} from "@/lib/s3";
import { sendSlackNotification } from "@/lib/slack";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "video/mp4", // MP4 files are often identified as video/mp4
];

export async function POST(request: NextRequest) {
  let clonedVoiceId: string | null = null;

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const file = formData.get("file") as File;
    const duration = parseFloat(formData.get("duration") as string);

    // Validate inputs
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || email.trim().length === 0) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const baseMimeType = file.type.split(";")[0].trim();
    if (!ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Please upload .mp3, .wav, .mp4, .m4a, .ogg, or .webm files",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate duration is at least 1 minute (60 seconds)
    if (!duration || duration < 60) {
      return NextResponse.json(
        { error: "Audio duration must be at least 1 minute (60 seconds)" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check if AI voice enhancement API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "AI voice enhancement not configured. Please add API key to environment variables." },
        { status: 500 }
      );
    }

    // Step 1: Clone voice with AI
    const voiceName = `ces-demo-${name.replace(/\s+/g, "-")}-${Date.now()}`;
    console.log("Cloning voice:", voiceName);
    console.log("API Key present:", !!process.env.ELEVENLABS_API_KEY);
    clonedVoiceId = await cloneVoice(buffer, voiceName);
    console.log("Voice cloned successfully. ID:", clonedVoiceId);

    // Step 2: Upload raw audio to S3 first
    const rawFileName = `raw-${voiceName}.${file.name.split('.').pop()}`;
    const rawS3Key = generateS3Key(rawFileName, name);

    await uploadToS3(
      buffer,
      rawS3Key,
      baseMimeType,
      rawFileName
    );
    console.log("Raw audio uploaded to S3");

    const rawDownloadUrl = await generatePresignedUrl(rawS3Key, rawFileName);
    const rawFileSizeInMB = getFileSizeInMB(file.size);

    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Variables for enhanced audio (may remain null if enhancement fails)
    let enhancedDownloadUrl: string | undefined;
    let enhancedFileName: string | undefined;
    let enhancedFileSizeInMB: string | undefined;
    let enhancedDuration: number | undefined;

    // Step 3: Try to generate enhanced audio with voice remix
    try {
      console.log("Generating enhanced audio with voice remix...");
      const enhancedResult = await generateEnhancedAudio(clonedVoiceId);
      enhancedDuration = enhancedResult.duration;
      console.log("Enhanced audio generated successfully. Duration:", enhancedDuration, "seconds");

      // Step 4: Upload enhanced audio to S3
      enhancedFileName = `enhanced-${voiceName}.mp3`;
      const enhancedS3Key = generateS3Key(enhancedFileName, name);

      await uploadToS3(
        enhancedResult.buffer,
        enhancedS3Key,
        "audio/mpeg",
        enhancedFileName
      );
      console.log("Enhanced audio uploaded to S3");

      // Step 5: Generate presigned URL for enhanced audio
      enhancedDownloadUrl = await generatePresignedUrl(enhancedS3Key, enhancedFileName);
      enhancedFileSizeInMB = getFileSizeInMB(enhancedResult.buffer.length);

      console.log("AI enhancement completed successfully");
    } catch (enhanceError) {
      console.error("AI enhancement failed, but raw audio is available:", enhanceError);
      // Continue to send notification with raw audio only
    }

    // Step 6: Send Slack notification (always send, even if enhancement failed)
    await sendSlackNotification({
      userName: name,
      userEmail: email,
      duration: enhancedDuration || duration, // Use enhanced duration if available, otherwise raw
      timestamp,
      rawDownloadUrl: rawDownloadUrl,
      rawFileSize: rawFileSizeInMB,
      rawDuration: duration, // Original audio duration
      enhancedDownloadUrl: enhancedDownloadUrl,
      enhancedFileSize: enhancedFileSizeInMB,
      enhancedDuration: enhancedDuration, // AI-enhanced audio duration (may be undefined)
    });

    if (enhancedDownloadUrl) {
      console.log("Slack notification sent with both raw and enhanced audio");
    } else {
      console.log("Slack notification sent with raw audio only (enhancement failed)");
    }

    // Step 7: Cleanup - delete cloned voice
    if (clonedVoiceId) {
      await deleteVoice(clonedVoiceId);
      console.log("Cloned voice deleted successfully");
    }

    return NextResponse.json({
      success: true,
      message: enhancedDownloadUrl
        ? "Voice enhanced successfully with AI! Both raw and enhanced versions saved."
        : "Raw audio saved successfully. AI enhancement failed, but your audio is safe.",
      data: {
        rawDownloadUrl: rawDownloadUrl,
        rawFileName: rawFileName,
        rawFileSize: rawFileSizeInMB,
        enhancedDownloadUrl: enhancedDownloadUrl,
        enhancedFileName: enhancedFileName,
        enhancedFileSize: enhancedFileSizeInMB,
        duration: enhancedDuration || duration,
        voiceId: clonedVoiceId,
      },
    });
  } catch (error) {
    console.error("Voice enhancement error:", error);

    // Cleanup on error
    if (clonedVoiceId) {
      try {
        await deleteVoice(clonedVoiceId);
        console.log("Cleaned up cloned voice on error");
      } catch (cleanupError) {
        console.error("Failed to cleanup voice:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to enhance voice with AI. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
