"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Recording Status */}
        <div className="text-center space-y-2">
          {isRecording && (
            <div className="flex items-center justify-center gap-2">
              <div className={`h-3 w-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-sm font-medium">
                {isPaused ? "Paused" : "Recording..."}
              </span>
            </div>
          )}

          {/* Timer */}
          <div className="text-4xl font-mono font-bold text-neutral-900 dark:text-neutral-50">
            {formatTime(recordingTime)}
          </div>

          {recordingTime < 60 && recordingTime > 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Minimum: {formatTime(60 - recordingTime)} remaining
            </div>
          )}

          {recordingTime >= 60 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              ✓ Minimum duration reached
            </div>
          )}
        </div>

        {/* Playback */}
        {hasRecording && audioUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview Recording</label>
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2">
          {!isRecording && !hasRecording && (
            <Button onClick={startRecording} className="w-full">
              🎤 Start Recording
            </Button>
          )}

          {isRecording && (
            <div className="grid grid-cols-2 gap-2">
              {!isPaused ? (
                <Button onClick={pauseRecording} variant="outline">
                  ⏸ Pause
                </Button>
              ) : (
                <Button onClick={resumeRecording} variant="outline">
                  ▶️ Resume
                </Button>
              )}
              <Button onClick={stopRecording} variant="default">
                ⏹ Stop
              </Button>
            </div>
          )}

          {isRecording && (
            <Button onClick={cancelRecording} variant="ghost" className="w-full">
              Cancel Recording
            </Button>
          )}

          {hasRecording && !isRecording && recordingTime >= 60 && (
            <Button onClick={cancelRecording} variant="outline" className="w-full">
              Record Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
