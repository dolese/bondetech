import React from "react";

export function HeroSlider({ slides = [], currentIndex = 0, onSelect }) {
  const safeSlides = Array.isArray(slides) ? slides : [];

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(12, 36, 97, 0.84) 0%, rgba(26, 58, 143, 0.68) 45%, rgba(30, 82, 184, 0.82) 100%)",
          zIndex: 1,
        }}
      />

      {safeSlides.map((slide, index) => (
        <div
          key={slide.id || `slide-${index}`}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${slide.imageSrc})`,
            backgroundSize: "cover",
            backgroundPosition: slide.backgroundPosition || "center",
            opacity: index === currentIndex ? 1 : 0,
            transform: index === currentIndex ? "scale(1.045)" : "scale(1)",
            transitionProperty: "opacity, transform",
            transitionDuration: "1.2s, 6s",
            transitionTimingFunction: "ease-in-out, linear",
            zIndex: 0,
          }}
        />
      ))}

      {safeSlides.length > 1 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 18,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            zIndex: 2,
          }}
        >
          {safeSlides.map((slide, index) => (
            <button
              key={`${slide.id || `slide-${index}`}-dot`}
              type="button"
              aria-label={`Slide ${index + 1}`}
              onClick={() => onSelect?.(index)}
              style={{
                width: index === currentIndex ? 28 : 10,
                height: 10,
                borderRadius: 999,
                border: "none",
                background: index === currentIndex ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.42)",
                boxShadow: index === currentIndex ? "0 0 0 1px rgba(255,255,255,0.22)" : "none",
                cursor: "pointer",
                transition: "all 0.22s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
