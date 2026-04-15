import { useEffect, useState } from "react";

export const useViewport = () => {
  const [width, setWidth] = useState(
    typeof window === "undefined" ? 1024 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    isMobile: width < 720,
    isTablet: width < 1024,
  };
};
