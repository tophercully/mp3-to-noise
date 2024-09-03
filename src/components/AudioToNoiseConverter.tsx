import React, { useState, useRef, useCallback } from "react";
import Slider from "./Slider";
import SoundRecorder from "./SoundRecorder";

import AudioChart from "./AudioChart";
import StyledFileInput from "./StyledFileInput";
import BalanceIndicator from "./BalanceIndicator";
import TooltipWrapper from "./TooltipWrapper";

const AudioToNoiseConverter: React.FC = () => {
  const [audioData, setAudioData] = useState<number[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);

  const [interval, setInterval] = useState<number>(100);
  const [lowerThreshold, setLowerThreshold] = useState<number>(0.00001);
  const [upperThreshold, setUpperThreshold] = useState<number>(1);
  const [curveStrength, setCurveStrength] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const audioContext = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);

  const processAudio = useCallback(() => {
    if (!audioBufferRef.current) return;

    const audioBuffer = audioBufferRef.current;
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const samplesCount = Math.floor((duration * 1000) / interval);
    const noiseData: number[] = [];

    setIsLoading(true);
    setProgress(0);

    // Find the maximum amplitude in the entire audio
    let maxAmplitudeOverall = 0;
    for (let i = 0; i < channelData.length; i++) {
      maxAmplitudeOverall = Math.max(
        maxAmplitudeOverall,
        Math.abs(channelData[i]),
      );
    }

    let valuesAbove = 0;

    for (let i = 0; i < samplesCount; i++) {
      const startSample = Math.floor((i * interval * sampleRate) / 1000);
      const endSample = Math.min(
        Math.floor(((i + 1) * interval * sampleRate) / 1000),
        channelData.length,
      );

      let maxAmplitude = 0;
      for (let j = startSample; j < endSample; j++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
      }

      // Normalize the amplitude relative to the overall maximum
      const normalizedAmplitude = maxAmplitude / maxAmplitudeOverall;

      // Apply thresholds
      let value;
      if (normalizedAmplitude <= lowerThreshold) {
        value = 0;
      } else if (normalizedAmplitude >= upperThreshold) {
        value = 1;
      } else {
        // Linear interpolation between thresholds
        value =
          (normalizedAmplitude - lowerThreshold) /
          (upperThreshold - lowerThreshold);
      }

      // Apply curve transformation
      const transformedValue = Math.pow(value, 1 / curveStrength);

      noiseData.push(transformedValue);

      if (transformedValue > 0.5) {
        valuesAbove++;
      }

      setProgress(Math.floor(((i + 1) / samplesCount) * 100));
    }

    setAudioData(noiseData);
    const percentageAbove = (valuesAbove / samplesCount) * 100;
    const balanceValue = percentageAbove - 50; // How far above or below 50%
    setBalance(balanceValue);
    setIsLoading(false);
  }, [interval, lowerThreshold, upperThreshold, curveStrength]);

  const debouncedProcessAudio = useCallback(() => {
    if (processingTimeoutRef.current !== null) {
      window.clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = window.setTimeout(() => {
      processAudio();
    }, 100);
  }, [processAudio]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext.current = new AudioContext();
      const audioBuffer =
        await audioContext.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      processAudio();
    } catch (error) {
      console.error("Error processing audio:", error);
      setIsLoading(false);
    }
  };

  const handleRecordedAudio = async (audioBlob: Blob) => {
    setRecordedAudioBlob(audioBlob); // Store the recorded audio blob
    setIsLoading(true);
    setProgress(0);

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      audioContext.current = new AudioContext();
      const audioBuffer =
        await audioContext.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      processAudio();
    } catch (error) {
      console.error("Error processing recorded audio:", error);
      setIsLoading(false);
    }
  };

  const handleDownloadAudio = () => {
    if (recordedAudioBlob) {
      const url = URL.createObjectURL(recordedAudioBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "recorded_audio.wav"; // You can change the file extension based on the actual format

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = Number(e.target.value);
    setInterval(newInterval);
    if (audioBufferRef.current) {
      debouncedProcessAudio();
    }
  };

  const handleLowerThresholdChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseFloat(e.target.value);
    const newThreshold = Math.pow(10, value * 5 - 5); // Logarithmic scale from 10^-5 to 1
    setLowerThreshold(newThreshold);
    if (audioBufferRef.current) {
      debouncedProcessAudio();
    }
  };

  const handleUpperThresholdChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newThreshold = Number(e.target.value);
    setUpperThreshold(newThreshold);
    if (audioBufferRef.current) {
      debouncedProcessAudio();
    }
  };

  const handleCurveStrengthChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newCurveStrength = Number(e.target.value);
    setCurveStrength(newCurveStrength);
    if (audioBufferRef.current) {
      debouncedProcessAudio();
    }
  };

  const handleDownload = () => {
    const jsonString = JSON.stringify(audioData);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio_noise_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(audioData)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="font-neuehaas flex w-full flex-col items-center gap-4 rounded-xl p-4 tracking-wide">
      <h1 className="font-pillowlava text-3xl font-bold italic lg:text-5xl">
        NoiseToNoise
      </h1>
      {audioData.length <= 0 && (
        <div className="flex flex-col items-center gap-12 rounded-lg p-8 shadow-lg">
          <div className="flex flex-col gap-4 text-lg lg:w-[60ch]">
            <p>
              NoiseToNoise is an audio to noise value converter and audio-data
              manipulator.{" "}
            </p>
            <p>
              Record or upload some audio, and NoiseToNoise will chart the
              amplitude of the audio file at the sample rate you specify. Adjust
              the upper and lower thresholds (floor and ceiling) and the
              exponential curve to weight values around the midpoint.
            </p>
          </div>
          <div className="flex flex-col items-center gap-8 lg:flex-row">
            <SoundRecorder onRecordingComplete={handleRecordedAudio} />
            <p>OR</p>
            <StyledFileInput onFileSelect={handleFileUpload} />
          </div>
        </div>
      )}
      {audioData.length > 0 && (
        <div className="w-full rounded-xl border border-black p-4 shadow-lg">
          {/* <p className="text-center">
            Balance: {balance.toFixed(2)}% {balance > 0 ? "above" : "below"} 50%
            </p> */}
          <BalanceIndicator balance={balance} />
          <AudioChart data={audioData} />
        </div>
      )}

      {audioData.length > 0 && (
        <div className="w-full rounded-xl p-4 shadow-lg">
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
            <div className="flex flex-col rounded-lg px-4 py-2 shadow-md">
              <TooltipWrapper tooltip="Gap between samples, lower is more detailed">
                <h3 className="w-fit select-none font-medium">
                  Sample Rate (ms):
                </h3>
              </TooltipWrapper>

              <Slider
                min={1}
                max={1000}
                step={1}
                value={interval}
                onChange={handleIntervalChange}
                className="w-full"
              />
            </div>

            <div className="flex flex-col rounded-lg px-4 py-2 shadow-md">
              <TooltipWrapper tooltip="Brings down the upper threshold">
                <h3 className="w-fit select-none font-medium">Ceiling:</h3>
              </TooltipWrapper>

              <Slider
                min={0}
                max={1}
                step={0.01}
                value={upperThreshold}
                onChange={handleUpperThresholdChange}
                className="w-full"
              />
            </div>
            <div className="flex flex-col rounded-lg px-4 py-2 shadow-md">
              <TooltipWrapper tooltip="Use this to fine-tune balance.">
                <h3 className="w-fit select-none font-medium">
                  Curve Strength:
                </h3>
              </TooltipWrapper>

              <Slider
                min={0.1}
                max={10}
                step={0.1}
                value={curveStrength}
                onChange={handleCurveStrengthChange}
                className="w-full"
              />
            </div>

            <div className="flex flex-col rounded-lg px-4 py-2 shadow-md">
              <TooltipWrapper tooltip="Brings up the lower threshold">
                <h3 className="w-fit select-none font-medium">Floor:</h3>
              </TooltipWrapper>

              <Slider
                min={0}
                max={1}
                step={0.01}
                value={(Math.log10(lowerThreshold) + 5) / 5}
                onChange={handleLowerThresholdChange}
                className="w-full"
              />
            </div>

            <div></div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleDownloadAudio}
                className="w-full flex-[0.5] rounded-lg bg-white px-2 py-4 text-black shadow-md hover:bg-base-150"
              >
                Download Audio
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex-[0.5] rounded-lg bg-white px-2 py-4 text-black shadow-md hover:bg-base-150"
              >
                Download JSON
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="w-full flex-1 rounded-lg bg-black px-2 py-4 text-white shadow-md hover:bg-base-700"
              >
                {copySuccess ? "Copied to Clipboard!" : "Copy to Clipboard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-blue-600"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center">{progress}% processed</p>
        </div>
      )}
    </div>
  );
};

export default AudioToNoiseConverter;
