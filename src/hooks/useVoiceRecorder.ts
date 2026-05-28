import { useRef, useState } from "react";

type UseVoiceRecorderProps = {
  onRecordingComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
};

export function useVoiceRecorder({
  onRecordingComplete,
  onError,
}: UseVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const chunksRef = useRef<BlobPart[]>([]);

  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    try {
      // microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      // create recorder
      const recorder = new MediaRecorder(stream);

      // reset old chunks
      chunksRef.current = [];

      // collect chunks
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // when recording stops
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        // send completed recording back
        onRecordingComplete?.(blob);

        // stop microphone tracks
        streamRef.current?.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;

      recorder.start();

      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);

      onError?.(
        error instanceof Error ? error : new Error("Unknown recording error"),
      );
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();

    setIsRecording(false);
  }

  return {
    start,
    stop,
    isRecording,
  };
}
