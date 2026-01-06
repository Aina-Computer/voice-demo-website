"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type Step = "recording" | "captured" | "details" | "success";

export function AudioUpload() {
  const [step, setStep] = useState<Step>("recording");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value.trim() && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

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
      setMessage("Please record your voice first");
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
        setMessage("Recording submitted successfully!");
        setStep("success"); // Move to success step
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
    setStep("captured"); // Move to captured step
  }, []);

  const handleRetake = useCallback(() => {
    setSelectedFile(null);
    setAudioDuration(null);
    setStep("recording");
  }, []);

  const handleNext = useCallback(() => {
    setStep("details");
  }, []);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Transcript content component
  const TranscriptContent = () => (
    <div className="space-y-6 font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif]">
      <div className="bg-neutral-100 rounded-lg p-2 md:p-4">
        <h2 className="text-lg md:text-xl font-normal text-black">
        Please press "Start Recording" and read the text below.
        </h2>
      </div>

      <div className="space-y-4 text-sm md:text-base text-black leading-relaxed">
        <p>
          When you listen closely to this voice, you hear more than sound — you hear intention.
        </p>

        <p>
          There's a calm confidence here, the kind that doesn't rush to prove itself. The words arrive clearly,
          shaped with care, each syllable landing just long enough to be understood, but never lingering too long.
        </p>

        <p>
          You can sense curiosity underneath — a mind that's always moving, always exploring, even in the quiet
          moments between sentences. There's a gentle rhythm in the way this person speaks… a natural pause before
          important ideas, a subtle lift when something matters.
        </p>

        <p>
          This is a voice that's comfortable thinking out loud. Thoughtful, grounded, and quietly expressive. When
          excitement appears, it doesn't shout — it glows. And when there's uncertainty, it shows honesty, not hesitation.
        </p>

        <p>
          What stands out most is the balance: clarity without stiffness, warmth without noise. This voice doesn't just
          communicate — it connects. And in that connection, you hear someone who knows where they are, and is curious
          about where they're going.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-16 pt-6 md:pt-12 pb-8 md:pb-12">
        <img
          src="/mirage-logo.png"
          alt="Mirage"
          className="h-10 md:h-20 w-auto object-contain"
        />
        <div className="text-right">
          <p className="text-sm md:text-lg font-normal text-black leading-tight">Voice Modulation</p>
          <p className="text-sm md:text-lg font-normal text-black leading-tight">Demo CES 2026</p>
        </div>
      </div>

      {/* Success Step */}
      {step === "success" && (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-8 md:px-16">
          <div className="flex flex-col lg:flex-row lg:items-center gap-16 lg:gap-32 max-w-6xl w-full">
            {/* Mobile & Tablet - Centered Content */}
            <div className="flex flex-col items-center text-center lg:hidden space-y-12 w-full">
              <div className="space-y-6">
                <h2 className="text-4xl font-normal text-black">
                  Thanks {name}!
                </h2>
                <p className="text-lg text-black leading-relaxed">
                  We will email you once we are ready with your AI voice model.
                </p>
              </div>

              <div className="space-y-6">
                <p className="text-base text-black">
                  You can follow more of our work here
                </p>
                <div className="flex gap-12 justify-center items-center">
                  <a href="https://x.com/ProjectMirageHQ" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/company/project-mirage-v1" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a href="https://www.projectmirage.ai/" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Desktop - Side by Side */}
            <div className="hidden lg:flex lg:flex-row lg:items-center gap-32 w-full">
              {/* Left Side - Social Icons */}
              <div className="flex flex-row gap-20 justify-center items-start">
                <a href="https://x.com/ProjectMirageHQ" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/project-mirage-v1" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="https://www.projectmirage.ai/" target="_blank" rel="noopener noreferrer" className="text-black hover:text-neutral-600 transition-colors">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </a>
              </div>

              {/* Right Side - Thank You Message */}
              <div className="space-y-6 text-left">
                <h2 className="text-5xl font-normal text-black">
                  Thanks {name}!
                </h2>
                <p className="text-2xl text-black leading-relaxed">
                  We will email you once we are ready with your AI voice model.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recording, Captured, and Details Steps */}
      {step !== "success" && (
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 px-8 md:px-16 pb-16 max-w-7xl mx-auto">
          {/* Left Column - Transcript */}
          <div className="flex items-start">
            <TranscriptContent />
          </div>

          {/* Right Column - Dynamic Content */}
          <div className="flex items-center justify-center lg:justify-end">
            {/* Recording Step */}
            {step === "recording" && (
              <div className="w-full max-w-md space-y-8">
                {/* <h2 className="text-2xl md:text-3xl font-normal text-black text-center">
                  Record Your Voice
                </h2> */}
                <div className="flex flex-col items-center space-y-4">
                  <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                </div>
              </div>
            )}

            {/* Captured Step */}
            {step === "captured" && selectedFile && audioDuration && (
              <div className="w-full max-w-md flex flex-col items-center space-y-8">
                {/* Audio Captured Title */}
                <p className="text-base text-black">
                  Audio Captured ({formatDuration(audioDuration)})
                </p>

                {/* Waveform Visualization */}
                <div className="flex items-center justify-center gap-1.5 h-24">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-black rounded-full"
                      style={{
                        height: `${Math.random() * 70 + 30}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 w-full">
                  <Button
                    onClick={handleRetake}
                    className="flex-1 rounded-full px-8 py-6 text-base bg-white border-2 border-black text-black hover:bg-neutral-50"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 rounded-full px-8 py-6 text-base border-2 border-black !bg-black hover:!bg-neutral-800 !text-white"
                  >
                    Next
                  </Button>
                </div>

                {/* Terms Text */}
                <p className="text-xs text-left text-neutral-600 leading-relaxed">
                  By continuing, you consent to your voice being uploaded, cloned, and processed by AI for demo purposes at CES 2026, where your voice will be used for demonstration, duration, and not shared with third parties.
                </p>
              </div>
            )}

            {/* Details Step */}
            {step === "details" && (
              <div className="w-full max-w-md space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label htmlFor="name" className="text-base font-normal text-black">
                      Your Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="First Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={uploadStatus === "uploading"}
                      className="rounded-full h-14 px-6 text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="email" className="text-base font-normal text-black">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={handleEmailChange}
                      disabled={uploadStatus === "uploading"}
                      className={`rounded-full h-14 px-6 text-base ${emailError ? 'border-red-500' : ''}`}
                    />
                    {emailError ? (
                      <p className="text-xs text-red-500">{emailError}</p>
                    ) : (
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        We'll use this email to notify you when your voice model is ready for demo at Mirage booth at CES 2026.
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadStatus === "uploading" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">
                        Processing your recording...
                      </span>
                      <span className="text-neutral-600">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-neutral-600 text-left">
                      Please wait! Uploading your voice sample.
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

                {/* Submit Button */}
                <Button
                  onClick={handleUpload}
                  disabled={!name.trim() || !email.trim() || !!emailError || uploadStatus === "uploading"}
                  className="w-full rounded-full !bg-black hover:!bg-neutral-800 !text-white h-14 text-base font-normal disabled:!bg-neutral-200 disabled:!text-neutral-500"
                >
                  {uploadStatus === "uploading" ? "Processing..." : "Submit"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
