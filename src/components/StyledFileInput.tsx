import { useState, useRef } from "react";

interface StyledFileInputProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const StyledFileInput: React.FC<StyledFileInputProps> = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(event);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4 rounded-lg bg-gray-100 p-4 shadow-md">
      <div className="text-2xl font-bold">
        {fileName ? "File Selected" : "Select Audio File"}
      </div>
      <div className="text-xl">{fileName || "No file chosen"}</div>
      <div className="flex space-x-4">
        <button
          onClick={handleClick}
          className="flex items-center space-x-2 rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>Choose File</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default StyledFileInput;
