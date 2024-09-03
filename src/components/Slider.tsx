import { useState, useEffect, useRef, ChangeEvent } from "react";

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  valueBoxWidth?: number;
  notchDistance?: number;
}

const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 1,
  step = 0.01,
  value,
  onChange,
  className = "",
  valueBoxWidth = 60,
  notchDistance = 7,
}) => {
  const [localValue, setLocalValue] = useState<number>(value);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handleResize = () => {
      if (sliderRef.current) {
        setSliderWidth(sliderRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleMouseUp = (): void => setIsDragging(false);
    const handleMouseMove = (e: globalThis.MouseEvent): void => {
      if (isDragging) {
        handleMove(e);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDragging]);

  const getPosition = (val: number): number => {
    return ((val - min) / (max - min)) * 100;
  };

  const getValue = (position: number): number => {
    if (!sliderRef.current) return min;
    const percent = position / sliderRef.current.offsetWidth;
    const rawValue = min + percent * (max - min);
    return Math.min(max, Math.max(min, Math.round(rawValue / step) * step));
  };

  const handleMove = (e: React.MouseEvent | globalThis.MouseEvent): void => {
    if (!sliderRef.current || !inputRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const newValue = getValue(position);
    setLocalValue(newValue);
    inputRef.current.value = newValue.toString();
    onChange({ target: inputRef.current } as ChangeEvent<HTMLInputElement>);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    handleMove(e);
  };

  const getActiveLineIndex = (lineCount: number): number => {
    return Math.round(((localValue - min) / (max - min)) * (lineCount - 1));
  };

  const getLineHeight = (index: number, activeLineIndex: number): number => {
    const distance = Math.abs(index - activeLineIndex);
    if (distance === 0) return 40;
    if (distance <= 4) {
      return 10 + 30 * Math.exp(-distance / 2);
    }
    return 10;
  };

  const renderLines = (): JSX.Element[] => {
    const lineCount = Math.floor(sliderWidth / notchDistance) + 1;
    const activeLineIndex = getActiveLineIndex(lineCount);

    return Array.from({ length: lineCount }, (_, index) => {
      const linePosition = index / (lineCount - 1);
      const height = getLineHeight(index, activeLineIndex);
      const isActive = index === activeLineIndex;
      const isFirst = index === 0;
      const isLast = index === lineCount - 1;

      return (
        <div
          key={index}
          className={`absolute top-1/2 -translate-y-1/2 transform rounded-full transition-all duration-150 ${
            isActive ? "bg-red-500" : "bg-black"
          }`}
          style={{
            left:
              isFirst ? 0
              : isLast ? "100%"
              : `${linePosition * 100}%`,
            height: `${height}px`,
            width: isActive ? "3px" : "1px",
            marginLeft:
              isFirst ? 0
              : isLast ? "-1px"
              : isActive ? "-1.5px"
              : "-0.5px",
          }}
        />
      );
    });
  };

  const formatValue = (val: number): string => {
    const decimalPlaces = Math.max(0, -Math.floor(Math.log10(step)));
    return val.toFixed(decimalPlaces);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative h-16 flex-grow">
        <div
          className="absolute inset-0 cursor-pointer"
          ref={sliderRef}
          onMouseDown={handleMouseDown}
        >
          <input
            type="range"
            ref={inputRef}
            min={min}
            max={max}
            step={step}
            value={localValue}
            onChange={onChange}
            className="sr-only"
          />
          {renderLines()}
        </div>
        {isDragging && (
          <div
            className="absolute top-0 -translate-x-1/2 -translate-y-full transform rounded bg-blue-500 px-2 py-1 text-sm text-white"
            style={{ left: `${getPosition(localValue)}%` }}
          >
            {formatValue(localValue)}
          </div>
        )}
      </div>
      <div
        className="ml-2 flex items-center justify-end rounded px-2 py-1 text-sm font-medium text-black"
        style={{
          width: `${valueBoxWidth}px`,
          minWidth: `${valueBoxWidth}px`,
        }}
      >
        <span className="w-full text-right">{formatValue(localValue)}</span>
      </div>
    </div>
  );
};

export default Slider;
