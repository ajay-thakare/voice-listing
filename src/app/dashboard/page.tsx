"use client";

import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ListingGenerationResult } from "@/types/listing";
import { useState, useEffect, useRef } from "react";

type AppPhase =
  | { status: "idle" }
  | { status: "recording" }
  | { status: "transcribing" }
  | { status: "generating"; transcript: string }
  | { status: "preview"; transcript: string; listing: ListingGenerationResult }
  | { status: "saved"; listing: ListingGenerationResult }
  | { status: "error"; message: string };

const LANGS = [
  { label: "Auto", code: "" },
  { label: "हिंदी", code: "hi" },
  { label: "English", code: "en" },
];

function LoadingDots() {
  return (
    <div className="flex gap-2.5 justify-center mb-7">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-yellow-400"
          style={{ animation: `bounce 1.4s ease ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

function MetaCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-1.5">
        {label}
      </div>
      <div
        className={`font-bold text-[17px] font-mono ${accent ? "text-yellow-400" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [phase, setPhase] = useState<AppPhase>({ status: "idle" });
  const [selectedLang, setSelectedLang] = useState("");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { start, stop } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    onError(error) {
      console.error(error);
      setPhase({ status: "idle" });
    },
  });

  useEffect(() => {
    if (phase.status === "recording") {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase.status]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  async function handleRecordingComplete(blob: Blob) {
    try {
      setPhase({ status: "transcribing" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      if (selectedLang) formData.append("language", selectedLang);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transcription failed");
      await handleGenerate(data.transcript);
    } catch (error) {
      setPhase({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to transcribe.",
      });
    }
  }

  async function handleGenerate(transcript: string) {
    try {
      setPhase({ status: "generating", transcript });
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const { data: listing } = await res.json();
      if (!res.ok) throw new Error("Generation failed");
      setPhase({ status: "preview", transcript, listing });
    } catch (error) {
      setPhase({ status: "error", message: "Failed to generate listing." });
    }
  }

  async function handleSave(
    transcript: string,
    listing: ListingGenerationResult,
  ) {
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ rawInput: transcript, listing }),
      });
      if (!res.ok) throw new Error("Save failed");
      setPhase({ status: "saved", listing });
    } catch (error) {
      setPhase({ status: "error", message: "Failed to save listing." });
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-7 py-4 border-b border-neutral-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-content:center">
            <svg
              className="w-4 h-4 mx-auto"
              fill="none"
              stroke="black"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="9" y="2" width="6" height="13" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
          <span className="font-mono font-bold text-[15px] tracking-tight">
            VoiceListing
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-xs text-neutral-600 font-medium">
            Groq · Whisper
          </span>
        </div>
      </header>

      <main className="max-width-[660px] w-full mx-auto max-w-2xl px-5 py-10">
        {/* IDLE */}
        {phase.status === "idle" && (
          <div className="text-center py-14 animate-[fadeUp_0.35s_ease_both]">
            <div className="inline-block bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-[2px] uppercase text-neutral-600 mb-8">
              Voice to Listing
            </div>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-[-2px] text-white mb-4">
              Speak once.
              <br />
              <span className="text-yellow-400">Sell everywhere.</span>
            </h1>
            <p className="text-neutral-500 text-[15px] mb-14 leading-relaxed">
              "Black kurti, size M, ₹699, for festive season" →<br />
              full listing in 3 seconds.
            </p>

            <button
              onClick={() => {
                setPhase({ status: "recording" });
                start();
              }}
              className="w-28 h-28 rounded-full bg-yellow-400 border-none cursor-pointer flex items-center justify-center mx-auto mb-5 hover:scale-105 transition-transform duration-200"
              style={{ animation: "rippleYellow 1.8s ease infinite" }}
            >
              <svg
                width="42"
                height="42"
                fill="none"
                stroke="black"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect x="9" y="2" width="6" height="13" rx="3" />
                <path d="M5 10a7 7 0 0014 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </button>
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-10">
              Tap to Record
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer
                    ${
                      selectedLang === l.code
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300"
                    }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-700 mt-3">
              Select language or leave on Auto
            </p>
          </div>
        )}

        {/* RECORDING */}
        {phase.status === "recording" && (
          <div className="text-center py-14">
            <button
              onClick={() => stop()}
              className="w-28 h-28 rounded-full bg-red-500 border-none cursor-pointer flex items-center justify-center mx-auto mb-7 hover:bg-red-400 transition-colors"
              style={{ animation: "rippleRed 1.5s ease infinite" }}
            >
              <svg width="38" height="38" fill="white" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
            </button>
            <div className="text-2xl font-bold text-white mb-2">
              Listening...
            </div>
            <div className="text-sm text-neutral-500 mb-7">
              Speak your product details clearly
            </div>
            <div className="font-mono text-[52px] font-bold text-white tracking-[-2px] mb-7">
              {fmt(seconds)}
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span
                className="w-2 h-2 bg-red-500 rounded-full"
                style={{ animation: "blink 1s ease infinite" }}
              />
              <span className="text-sm text-neutral-500">
                recording · tap to stop
              </span>
            </div>
          </div>
        )}

        {/* TRANSCRIBING */}
        {phase.status === "transcribing" && (
          <div className="text-center py-20">
            <LoadingDots />
            <div className="text-xl font-bold text-white mb-2">
              Transcribing voice...
            </div>
            <div className="text-sm text-neutral-500">
              Whisper is converting your speech
            </div>
          </div>
        )}

        {/* GENERATING */}
        {phase.status === "generating" && (
          <div className="text-center py-20">
            <LoadingDots />
            <div className="text-xl font-bold text-white mb-2">
              Crafting listing...
            </div>
            <div className="text-sm text-neutral-500 mb-6">
              AI is writing your title, description & hashtags
            </div>
            <div className="inline-block bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3.5 text-sm text-neutral-500 italic max-w-md leading-relaxed">
              "{phase.transcript}"
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {phase.status === "preview" && (
          <div>
            <div className="flex items-start justify-between mb-7 gap-3">
              <div>
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-yellow-400 mb-2.5">
                  Generated Listing
                </div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">
                  {phase.listing.title}
                </h2>
              </div>
              <span className="font-mono bg-yellow-400 text-black rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap mt-1">
                {phase.listing.language.toUpperCase()}
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
              {/* Description */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-2.5">
                  Description
                </div>
                <p className="text-[14px] text-neutral-400 leading-relaxed font-light">
                  {phase.listing.description}
                </p>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {phase.listing.price.amount && (
                  <MetaCard
                    label="Price"
                    value={`${phase.listing.price.currency ?? ""} ${phase.listing.price.amount}`}
                    accent
                  />
                )}
                {phase.listing.productType && (
                  <MetaCard label="Type" value={phase.listing.productType} />
                )}
                {phase.listing.occasion && (
                  <MetaCard label="Occasion" value={phase.listing.occasion} />
                )}
              </div>

              {/* Variant + Hashtags */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                  <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-2.5">
                    Variant
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {phase.listing.variant.color && (
                      <span className="bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1 text-xs font-medium text-neutral-300">
                        {phase.listing.variant.color}
                      </span>
                    )}
                    {phase.listing.variant.size && (
                      <span className="bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1 text-xs font-medium text-neutral-300">
                        Size {phase.listing.variant.size}
                      </span>
                    )}
                    {!phase.listing.variant.color &&
                      !phase.listing.variant.size && (
                        <span className="text-xs text-neutral-600">
                          Not specified
                        </span>
                      )}
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                  <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-2.5">
                    Hashtags
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {phase.listing.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-yellow-950 border border-yellow-900 rounded-md px-2 py-1 text-[11px] font-medium text-yellow-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image Prompts */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-neutral-600 mb-4">
                  Image Prompts
                </div>
                <div className="space-y-0">
                  {phase.listing.imagePrompts.map((prompt, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 py-3.5 ${i < phase.listing.imagePrompts.length - 1 ? "border-b border-neutral-800" : ""}`}
                    >
                      <div className="font-mono w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <p className="text-[13px] text-neutral-500 leading-relaxed font-light m-0">
                        {prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => handleSave(phase.transcript, phase.listing)}
                className="flex-1 bg-yellow-400 text-black border-none rounded-xl py-4 text-[15px] font-bold cursor-pointer hover:bg-yellow-300 active:scale-[0.98] transition-all"
              >
                Save Listing
              </button>
              <button
                onClick={() => setPhase({ status: "idle" })}
                className="bg-neutral-900 text-neutral-500 border border-neutral-800 rounded-xl py-4 px-5 text-sm font-medium cursor-pointer hover:bg-neutral-800 hover:text-neutral-300 transition-all"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* SAVED */}
        {phase.status === "saved" && (
          <div className="text-center py-16">
            <div className="w-18 h-18 rounded-full bg-green-950 border border-green-900 flex items-center justify-center mx-auto mb-6">
              <svg
                width="32"
                height="32"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">
              Listing saved!
            </h2>
            <p className="text-neutral-500 text-[15px] mb-8 leading-relaxed">
              Ready to post on Meesho, Instagram,
              <br />
              or WhatsApp.
            </p>
            <button
              onClick={() => setPhase({ status: "idle" })}
              className="bg-yellow-400 text-black border-none rounded-xl px-8 py-3.5 text-[15px] font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
            >
              + New Listing
            </button>
          </div>
        )}

        {/* ERROR */}
        {phase.status === "error" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-950 border border-red-900 flex items-center justify-center mx-auto mb-5">
              <svg
                width="28"
                height="28"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                viewBox="0 0 24 24"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className="text-neutral-400 text-[15px] mb-6 leading-relaxed">
              {phase.message}
            </p>
            <button
              onClick={() => setPhase({ status: "idle" })}
              className="bg-yellow-400 text-black border-none rounded-xl px-8 py-3.5 text-[15px] font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes rippleYellow { 0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,0.35)} 50%{box-shadow:0 0 0 22px rgba(250,204,21,0)} }
        @keyframes rippleRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 50%{box-shadow:0 0 0 20px rgba(239,68,68,0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .overflow-y-auto::-webkit-scrollbar { width: 3px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>
    </div>
  );
}
