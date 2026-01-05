import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Validate API key
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.warn("ELEVENLABS_API_KEY is not set in environment variables");
}

// Initialize AI voice client
const elevenlabs = new ElevenLabsClient({
  apiKey: apiKey || "",
});

// Enhancement prompt for voice processing
const ENHANCEMENT_PROMPT = `Enhance this voice to sound fresh, alert, and energized while preserving the speaker's identity and timbre. Add natural brightness, lifted energy, and clear presence, as if well-rested and engaged. Crucially: maintain steady, consistent pacing throughout - no rushing, no change in tempo. Use stable pitch, smooth rhythm, natural pauses, and clean articulation. The voice should feel like the same person on their most energetic day, but with the same tempo and flow as the original voice.`;

// Full transcript for voice remix (under 1000 characters - approximately 1 minute of audio at 150 words/min)
const VOICE_TRANSCRIPT = `When you listen closely to this voice, you hear more than sound. You hear intention. There's a calm confidence here, the kind that doesn't rush to prove itself. The words arrive clearly, shaped with care, each syllable landing just long enough to be understood. You can sense curiosity underneath, a mind that's always moving, always exploring, even in the quiet moments between sentences. There's a gentle rhythm in the way this person speaks, a natural pause before important ideas, a subtle lift when something matters. This is a voice that's comfortable thinking out loud. Thoughtful, grounded, and quietly expressive. When excitement appears, it doesn't shout, it glows. And when there's uncertainty, it shows honesty, not hesitation. What stands out most is the balance. Clarity without stiffness. Warmth without noise. This voice doesn't just communicate, it connects. And in that connection, you hear someone who knows where they are, and is curious about where they're going.`;

/**
 * Clone a voice using AI voice cloning
 */
export async function cloneVoice(
  audioBuffer: Buffer,
  voiceName: string
): Promise<string> {
  try {
    console.log("Attempting to clone voice:", voiceName);
    console.log("Audio buffer size:", audioBuffer.length);

    // Convert buffer to File using Uint8Array
    const uint8Array = new Uint8Array(audioBuffer);
    const audioBlob = new Blob([uint8Array], { type: "audio/mpeg" });
    const audioFile = new File([audioBlob], "voice-sample.mp3", {
      type: "audio/mpeg",
    });

    console.log("File created, size:", audioFile.size);

    // Clone voice with enhancement description
    const response = await elevenlabs.voices.ivc.create({
      name: voiceName,
      files: [audioFile],
      description: ENHANCEMENT_PROMPT,
      removeBackgroundNoise: false,
    });

    console.log("Full response from AI:", JSON.stringify(response, null, 2));
    console.log("Response keys:", Object.keys(response));

    // Try both snake_case and camelCase
    const voiceId = response.voiceId || (response as any).voice_id;
    console.log("Voice ID extracted:", voiceId);

    if (!voiceId) {
      throw new Error("Voice ID not returned from API. Response: " + JSON.stringify(response));
    }

    return voiceId;
  } catch (error) {
    console.error("Voice cloning error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw new Error(
      `Failed to clone voice: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate enhanced audio using voice remix
 * Simplified: Remix with full transcript → Get audio directly
 */
export async function generateEnhancedAudio(
  voiceId: string
): Promise<{ buffer: Buffer; duration: number }> {
  try {
    console.log("Remixing voice with enhancement prompt and full transcript...");

    const remixResponse = await elevenlabs.textToVoice.remix(voiceId, {
      voiceDescription: ENHANCEMENT_PROMPT,
      text: VOICE_TRANSCRIPT,
      autoGenerateText: false,
      loudness: 0.5,
      guidanceScale: 3, // Higher guidance for consistent adherence to prompt
      streamPreviews: false,
      promptStrength: 0.7, // Balance between prompt and original voice
    });

    console.log("Remix complete. Previews:", remixResponse.previews?.length);

    if (!remixResponse.previews || remixResponse.previews.length === 0) {
      throw new Error("No audio previews returned from voice remix");
    }

    // Get the first preview (best result)
    const preview = remixResponse.previews[0];
    console.log("Preview duration:", preview.durationSecs);
    console.log("Preview media type:", preview.mediaType);

    if (!preview.audioBase64) {
      throw new Error("No audio data in remix preview");
    }

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(preview.audioBase64, "base64");
    console.log("Enhanced audio buffer size:", audioBuffer.length);

    // Return both the audio buffer and the actual duration
    return {
      buffer: audioBuffer,
      duration: preview.durationSecs || 0,
    };
  } catch (error) {
    console.error("Voice remix error:", error);
    if (error instanceof Error) {
      console.error("Remix error message:", error.message);
    }
    throw new Error(
      `Failed to generate enhanced audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Delete cloned voice after processing (cleanup)
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  try {
    await elevenlabs.voices.delete(voiceId);
    console.log("Voice deleted successfully:", voiceId);
  } catch (error) {
    console.error("Voice deletion error:", error);
    // Don't throw - this is cleanup, not critical
  }
}

/**
 * Get estimated audio duration from text
 */
export function estimateAudioDuration(text: string): number {
  // Average speaking rate: ~150 words per minute
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedMinutes = wordCount / 150;
  return Math.round(estimatedMinutes * 60); // Convert to seconds
}
