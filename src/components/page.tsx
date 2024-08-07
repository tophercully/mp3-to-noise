import React, { ReactNode } from "react";

type PageProps = {
  children: ReactNode;
};

const Page: React.FC<PageProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen flex-col items-center overflow-y-auto p-4 pt-0 md:p-10">
      {children}
    </div>
  );
};

export default Page;
