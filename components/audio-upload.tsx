"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Validate audio duration
  const validateAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        const duration = audio.duration;
        resolve(duration);
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
      "audio/mp4": [".m4a"],
      "audio/ogg": [".ogg"],
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

    if (!selectedFile || audioDuration === null) {
      setUploadStatus("error");
      setMessage("Please select an audio file");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);
    setMessage("");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("file", selectedFile);
    formData.append("duration", audioDuration.toString());

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data: UploadResponse = await response.json();

      if (response.ok && data.success) {
        setUploadStatus("success");
        setMessage("Audio uploaded successfully! Notification sent to Slack.");

        // Reset form after 3 seconds
        setTimeout(() => {
          setName("");
          setSelectedFile(null);
          setAudioDuration(null);
          setUploadStatus("idle");
          setUploadProgress(0);
          setMessage("");
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
          Upload your audio recording and we'll send it to Slack
        </CardDescription>
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

        {/* File Upload Area */}
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
                  Supports: MP3, WAV, M4A, OGG • Max: 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {uploadStatus === "uploading" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">Uploading...</span>
              <span className="text-neutral-500 dark:text-neutral-400">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
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
          disabled={!name.trim() || !selectedFile || uploadStatus === "uploading"}
          className="w-full"
        >
          {uploadStatus === "uploading" ? "Uploading..." : "Upload Audio"}
        </Button>
      </CardContent>
    </Card>
  );
}
