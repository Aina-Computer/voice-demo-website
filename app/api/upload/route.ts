import { NextRequest, NextResponse } from "next/server";
import {
  uploadToS3,
  generateS3Key,
  generatePresignedUrl,
  getFileSizeInMB,
} from "@/lib/s3";
import { sendSlackNotification } from "@/lib/slack";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = [
  "audio/mpeg", // .mp3
  "audio/wav", // .wav
  "audio/x-wav", // .wav (alternative)
  "audio/mp4", // .m4a
  "audio/x-m4a", // .m4a (alternative)
  "audio/ogg", // .ogg
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const file = formData.get("file") as File;
    const duration = parseFloat(formData.get("duration") as string);

    // Validate inputs
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
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
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Please upload .mp3, .wav, .m4a, or .ogg files",
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

    // Generate S3 key
    const s3Key = generateS3Key(file.name, name);

    // Upload to S3 with Content-Disposition header
    await uploadToS3(buffer, s3Key, file.type, file.name);

    // Generate presigned URL with forced download
    const downloadUrl = await generatePresignedUrl(s3Key, file.name);

    // Get file size in MB
    const fileSizeInMB = getFileSizeInMB(file.size);

    // Send Slack notification
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    await sendSlackNotification({
      userName: name,
      downloadUrl,
      fileSize: fileSizeInMB,
      duration,
      timestamp,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        downloadUrl,
        fileName: file.name,
        fileSize: fileSizeInMB,
        duration,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
