"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AudioRecorder } from "@/components/audio-recorder";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    downloadUrl: string;
    fileName: string;
    fileSize: string;
    duration: number;
  };
  error?: string;
}

export function AudioUpload() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Validate audio duration
  const validateAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        const duration = audio.duration;

        if (duration < 60) {
          reject(new Error("Audio duration must be at least 1 minute (60 seconds)"));
        } else {
          resolve(duration);
        }
      };

      audio.onerror = () => {
        reject(new Error("Failed to load audio file"));
      };

      audio.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("error");
      setMessage("File size must not exceed 10MB");
      return;
    }

    try {
      // Validate duration
      const duration = await validateAudioDuration(file);
      setSelectedFile(file);
      setAudioDuration(duration);
      setUploadStatus("idle");
      setMessage("");
    } catch (error) {
      setUploadStatus("error");
      setMessage(error instanceof Error ? error.message : "Invalid audio file");
      setSelectedFile(null);
      setAudioDuration(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/mp4": [".m4a", ".mp4"],
      "audio/ogg": [".ogg"],
      "audio/webm": [".webm"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!name.trim()) {
      setUploadStatus("error");
      setMessage("Please enter your name");
      return;
    }

    if (!email.trim()) {
      setUploadStatus("error");
      setMessage("Please enter your email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setUploadStatus("error");
      setMessage("Please enter a valid email address");
      return;
    }

    if (!selectedFile || audioDuration === null) {
      setUploadStatus("error");
      setMessage("Please select an audio file");
      return;
    }

    if (!acceptedTerms) {
      setUploadStatus("error");
      setMessage("Please accept the terms and conditions");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);
    setMessage("");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("file", selectedFile);
    formData.append("duration", audioDuration.toString());

    // Use AI enhancement endpoint
    const apiEndpoint = "/api/enhance";

    try {
      // Simulate progress (slower for AI enhancement)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data: UploadResponse = await response.json();

      if (response.ok && data.success) {
        setUploadStatus("success");
        setMessage("Voice enhanced with AI! Both raw and enhanced audio sent to Slack.");

        // Reset form after 3 seconds
        setTimeout(() => {
          setName("");
          setEmail("");
          setSelectedFile(null);
          setAudioDuration(null);
          setUploadStatus("idle");
          setUploadProgress(0);
          setMessage("");
          setAcceptedTerms(false);
        }, 3000);
      } else {
        setUploadStatus("error");
        setMessage(data.error || "Upload failed. Please try again.");
      }
    } catch (error) {
      setUploadStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Upload failed. Please try again."
      );
    }
  };

  const handleRecordingComplete = useCallback((audioBlob: Blob, duration: number) => {
    // Convert blob to file with proper extension based on MIME type
    const baseMimeType = audioBlob.type.split(";")[0];
    let extension = "webm";

    if (baseMimeType === "audio/mp4" || baseMimeType === "audio/m4a") {
      extension = "m4a";
    } else if (baseMimeType === "audio/webm") {
      extension = "webm";
    } else if (baseMimeType === "audio/ogg") {
      extension = "ogg";
    }

    const file = new File([audioBlob], `recording-${Date.now()}.${extension}`, {
      type: audioBlob.type,
    });

    setSelectedFile(file);
    setAudioDuration(duration);
    setUploadStatus("idle");
    setMessage("");
  }, []);

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">🎤 Audio Upload - CES Demo</CardTitle>
        <CardDescription>
          Upload your audio recording (minimum 1 minute)
        </CardDescription>
        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            💡 <strong>Tip:</strong> For best results, record in a quiet environment with clear audio. Avoid background noise, echo, or wind. Speak naturally at a normal pace.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Input */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Your Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploadStatus === "uploading"}
          />
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Your Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={uploadStatus === "uploading"}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            We'll use this email to notify you when your voice model is ready for demo at Mirage booth at CES 2026.
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Audio File</label>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-neutral-900 bg-neutral-50 dark:border-neutral-50 dark:bg-neutral-900"
                  : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
              }
              ${uploadStatus === "uploading" ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input {...getInputProps()} disabled={uploadStatus === "uploading"} />
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  ✓ {selectedFile.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatFileSize(selectedFile.size)} • {formatDuration(audioDuration || 0)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Click or drag to replace
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {isDragActive
                    ? "Drop your audio file here"
                    : "Drag & drop your audio file here"}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  or click to browse
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Supports: MP3, WAV, MP4, M4A, OGG, WebM • Max: 10MB • Min: 1 minute
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        {!selectedFile && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-neutral-950 px-2 text-neutral-500 dark:text-neutral-400">
                Or
              </span>
            </div>
          </div>
        )}

        {/* Recording */}
        {!selectedFile && (
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        )}

        {/* AI Enhancement Info */}
        {!selectedFile && (
          <Alert>
            <AlertDescription>
              🎨 AI Enhancement will clone your voice, enhance it for clarity and energy, and generate a professional audio with the sample transcript. Both raw and enhanced versions will be saved.
            </AlertDescription>
          </Alert>
        )}

        {/* File/Recording Ready Indicator */}
        {selectedFile && audioDuration && (
          <Alert>
            <AlertDescription>
              ✓ Audio ready ({formatDuration(audioDuration)}) - Click "🎨 Enhance with AI" below
            </AlertDescription>
          </Alert>
        )}

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked: boolean) => setAcceptedTerms(checked === true)}
            disabled={uploadStatus === "uploading"}
          />
          <div className="flex-1">
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I agree to the terms and conditions
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              By uploading your voice, you consent to voice cloning and AI processing for demo purposes at CES 2026.
              Your audio will be stored securely and used only for demonstration. We will not share your data with third parties.
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadStatus === "uploading" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">
                Enhancing with AI...
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              This may take 30-60 seconds for voice cloning and enhancement
            </p>
          </div>
        )}

        {/* Status Messages */}
        {message && uploadStatus !== "idle" && (
          <Alert variant={uploadStatus === "error" ? "destructive" : "default"}>
            <AlertDescription>
              {uploadStatus === "success" && "✓ "}
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!name.trim() || !email.trim() || !selectedFile || !acceptedTerms || uploadStatus === "uploading"}
          className="w-full"
        >
          {uploadStatus === "uploading" ? "Enhancing..." : "🎨 Enhance with AI"}
        </Button>
      </CardContent>
    </Card>
  );
}
