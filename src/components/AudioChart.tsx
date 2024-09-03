import React, { useRef, useEffect } from "react";

const AudioChart: React.FC<{ data: number[] }> = React.memo(({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawChart = () => {
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
      ctx.fillStyle = "#000000";
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
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawChart);
    });

    resizeObserver.observe(canvas);
    drawChart();

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  return (
    <canvas
      className="h-[30svh] w-full rounded-lg"
      ref={canvasRef}
    />
  );
});

export default AudioChart;
