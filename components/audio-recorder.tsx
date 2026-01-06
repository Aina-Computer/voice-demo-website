"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState("");
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError("");
      setHasRecording(false);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer MP4 (M4A) for better compatibility with Mac/iOS
      let mimeType = "audio/webm"; // fallback
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Calculate final duration from timestamps
        const finalDuration = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Check if recording meets minimum duration
        if (finalDuration < 60) {
          setError("Recording must be at least 1 minute long");
        } else {
          // Pass the recording to parent component
          setError(""); // Clear any previous errors
          onRecordingComplete(blob, finalDuration);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to access microphone. Please allow microphone permissions."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      const pauseDuration = Date.now() - startTimeRef.current - pausedTimeRef.current - recordingTime * 1000;
      pausedTimeRef.current += pauseDuration;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      mediaRecorderRef.current.stop();
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setHasRecording(false);
    setError("");
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Start Recording Button */}
      {!isRecording && !hasRecording && (
        <div className="flex flex-col items-center space-y-3">
          <Button
            onClick={startRecording}
            variant="default"
            className="!bg-black hover:!bg-neutral-800 !text-white rounded-full px-12 py-8 text-lg font-normal flex items-center gap-3"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            Start Recording
          </Button>
          <p className="text-sm text-neutral-600">
            Recording must be at least 1 minute long
          </p>
        </div>
      )}

      {/* Recording In Progress */}
      {isRecording && (
        <div className="flex flex-col items-center space-y-8">
          {/* Large Timer */}
          <div className="text-8xl md:text-9xl font-light text-black tracking-tight font-mono">
            {formatTime(recordingTime)}
          </div>

          {/* Pause and Stop Buttons */}
          <div className="flex gap-4">
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                className="rounded-full px-8 py-6 text-base bg-white border-2 border-black text-black hover:bg-neutral-50"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                className="rounded-full px-8 py-6 text-base bg-white border-2 border-black text-black hover:bg-neutral-50"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              className="rounded-full px-8 py-6 text-base border-2 border-black !bg-black hover:!bg-neutral-800 !text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-sm text-neutral-600">
            Recording must be at least 1 minute long
          </p>
        </div>
      )}

      {/* Recording Complete */}
      {hasRecording && !isRecording && (
        <div className="space-y-4">
          {audioUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Preview Recording</label>
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={cancelRecording} className="w-full rounded-full px-8 py-6 text-base bg-white border-2 border-black text-black hover:bg-neutral-50">
            Retake
          </Button>
        </div>
      )}
    </div>
  );
}
