import React, { useState, useRef, useCallback, useEffect } from "react";

const AudioChart: React.FC<{ data: number[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to 2x for higher resolution
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * scale;
    canvas.height = canvas.offsetHeight * scale;
    ctx.scale(scale, scale);

    const width = canvas.width / scale;
    const height = canvas.height / scale;
    const maxValue = Math.max(...data);

    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw data
    ctx.beginPath();
    ctx.moveTo(0, height);

    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width, height);
    ctx.fillStyle = "rgba(51, 51, 51, 0.6)";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = "#000000";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 10; i++) {
      const y = height - (i / 10) * height;
      ctx.fillText((i / 10).toFixed(1), 25, y);
    }

    // Draw time labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.fillText(`${i * 10}%`, x, height + 5);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "300px" }}
      className="w-full"
    />
  );
};

const AudioToNoiseConverter: React.FC = () => {
  const [audioData, setAudioData] = useState<number[]>([]);
  const [interval, setInterval] = useState<number>(100);
  const [lowerThreshold, setLowerThreshold] = useState<number>(0.0);
  const [upperThreshold, setUpperThreshold] = useState<number>(1.0);
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
    <div className="flex w-full flex-col gap-4 p-4">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="w-full rounded border border-gray-300 p-2"
      />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label
            htmlFor="interval"
            className="font-medium"
          >
            Sampling Interval (ms):
          </label>
          <input
            type="range"
            id="interval"
            min="1"
            max="1000"
            step="1"
            value={interval}
            onChange={handleIntervalChange}
            className="w-full"
          />
          <span>{interval}ms</span>
        </div>

        <div className="flex items-center space-x-2">
          <label
            htmlFor="lowerThreshold"
            className="font-medium"
          >
            Lower Threshold:
          </label>
          <input
            type="range"
            id="lowerThreshold"
            min="0"
            max="1"
            step="0.001"
            value={(Math.log10(lowerThreshold) + 5) / 5}
            onChange={handleLowerThresholdChange}
            className="w-full"
          />
          <span>{lowerThreshold.toExponential(2)}</span>
        </div>

        <div className="flex items-center space-x-2">
          <label
            htmlFor="upperThreshold"
            className="font-medium"
          >
            Upper Threshold:
          </label>
          <input
            type="range"
            id="upperThreshold"
            min="0"
            max="1"
            step="0.01"
            value={upperThreshold}
            onChange={handleUpperThresholdChange}
            className="w-full"
          />
          <span>{upperThreshold.toFixed(2)}</span>
        </div>

        <div className="flex items-center space-x-2">
          <label
            htmlFor="curveStrength"
            className="font-medium"
          >
            Curve Strength:
          </label>
          <input
            type="range"
            id="curveStrength"
            min="0.1"
            max="10"
            step="0.1"
            value={curveStrength}
            onChange={handleCurveStrengthChange}
            className="w-full"
          />
          <span>{curveStrength.toFixed(1)}</span>
        </div>
      </div>

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

      {audioData.length > 0 && (
        <div className="space-y-4">
          <AudioChart data={audioData} />
          <div className="space-y-2">
            <p className="text-center">
              Balance: {balance.toFixed(2)}% {balance > 0 ? "above" : "below"}{" "}
              50%
            </p>
            <button
              onClick={handleDownload}
              className="w-full rounded-sm bg-special p-2 text-white hover:brightness-90"
            >
              Download JSON
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="w-full rounded-sm bg-success p-2 text-white hover:brightness-90"
            >
              Copy to Clipboard
            </button>
            {copySuccess && (
              <p className="text-center text-success">Copied to clipboard!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioToNoiseConverter;
