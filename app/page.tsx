import { AudioUpload } from "@/components/audio-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
            Voice Demo - CES 2025
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Experience the power of voice analysis and audio sharing
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload Section */}
          <div>
            <AudioUpload />
          </div>

          {/* Transcript Section */}
          <div className="flex flex-col gap-8">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-xl">Sample Voice Analysis</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-neutral dark:prose-invert prose-sm">
                <p className="leading-relaxed">
                  When you listen closely to this voice, you hear more than sound — you hear{" "}
                  <span className="font-medium">intention</span>.
                </p>
                <p className="leading-relaxed">
                  There's a calm confidence here, the kind that doesn't rush to prove itself.
                  The words arrive clearly, shaped with care, each syllable landing just long
                  enough to be understood, but never lingering too long.
                </p>
                <p className="leading-relaxed">
                  You can sense curiosity underneath — a mind that's always moving, always
                  exploring, even in the quiet moments between sentences. There's a gentle
                  rhythm in the way this person speaks… a natural pause before important
                  ideas, a subtle lift when something matters.
                </p>
                <p className="leading-relaxed">
                  This is a voice that's comfortable thinking out loud. Thoughtful, grounded,
                  and quietly expressive. When excitement appears, it doesn't shout — it glows.
                  And when there's uncertainty, it shows honesty, not hesitation.
                </p>
                <p className="leading-relaxed">
                  What stands out most is the balance: clarity without stiffness, warmth
                  without noise. This voice doesn't just communicate — it{" "}
                  <span className="font-medium">connects</span>. And in that connection,
                  you hear someone who knows where they are, and is curious about where
                  they're going.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
