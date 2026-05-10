import { useEffect, useState } from "react";

export const useViewport = () => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () =>
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { width, height } = viewport;
  const isXs = width < 480;
  const isMobile = width < 720;
  const isTablet = width >= 720 && width < 1024;
  const isDesktop = width >= 1024;
  const isLarge = width >= 1280;
  const isShort = height < 560;

  return {
    width,
    height,
    isXs,
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    isShort,
  };
};
