import React from "react";

interface BalanceIndicatorProps {
  balance: number;
}

const BalanceIndicator: React.FC<BalanceIndicatorProps> = ({ balance }) => {
  const normalizedBalance = Math.min(Math.max(balance, -100), 100);
  const width = Math.abs(normalizedBalance) / 2; // Half of the absolute balance for subtler movement

  let style: React.CSSProperties = {
    width: `${width}%`,
    [normalizedBalance >= 0 ? "left" : "right"]: "50%",
  };

  let colorIndicator = "bg-green-500";
  if (Math.abs(normalizedBalance) > 45) {
    colorIndicator = "bg-red-500";
  } else if (Math.abs(normalizedBalance) > 30) {
    colorIndicator = "bg-yellow-500";
  } else if (Math.abs(normalizedBalance) > 15) {
    colorIndicator = "bg-blue-500";
  }

  return (
    <div className="mt-4 flex w-full flex-col items-center gap-2">
      <h3 className="font-medium">Balance</h3>
      <div className="relative h-fit w-full max-w-md rounded-full border border-base-150">
        <div className="absolute left-1/2 top-0 h-1 w-0.5" />{" "}
        {/* Center line */}
        {/* <div className="h-10 w-10 bg-red-500"></div> */}
        <div
          className={`absolute top-1/2 h-2 -translate-y-1/2 transform rounded-full ${colorIndicator} transition-all duration-300 ease-in-out`}
          style={style}
        />
      </div>
      <p className="text-md mt-2">
        {Math.abs(normalizedBalance).toFixed(1)}% of datapoints are{" "}
        {normalizedBalance > 0 ? "above" : "below"} 0.5
      </p>
    </div>
  );
};

export default BalanceIndicator;
