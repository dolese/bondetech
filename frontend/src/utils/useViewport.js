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

  const isXs = width < 480;
  const isMobile = width < 720;
  const isTablet = width >= 720 && width < 1024;
  const isDesktop = width >= 1024;
  const isLarge = width >= 1280;

  return {
    width,
    isXs,
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
  };
};
