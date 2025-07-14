// src/hooks/useFitText.js
import { useLayoutEffect, useRef } from 'react';

/**
 * Custom hook to dynamically adjust the font size of a text element
 * to fit within its container.
 * @param {Array<any>} dependencies - An array of dependencies that trigger the text fit calculation.
 * @returns {{containerRef: React.RefObject<any>, valueRef: React.RefObject<any>}} - Refs to be attached to the container and text elements.
 */
export const useFitText = (dependencies = []) => {
  const containerRef = useRef(null);
  const valueRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const value = valueRef.current;

    if (!container || !value) {
      return;
    }

    const fitText = () => {
      value.style.fontSize = ''; // Reset to default for accurate measurement

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const textWidth = value.scrollWidth;
      const textHeight = value.scrollHeight;

      // Calculate scale based on both width and height, choose the smaller one
      const widthScale = containerWidth / textWidth;
      const heightScale = containerHeight / textHeight;
      const scale = Math.min(widthScale, heightScale, 1); // Do not scale up

      // Apply the new font size
      const baseFontSize = parseFloat(window.getComputedStyle(value).fontSize);
      value.style.fontSize = `${baseFontSize * scale * 0.95}px`; // 0.95 for a little padding
    };

    const resizeObserver = new ResizeObserver(fitText);
    resizeObserver.observe(container);

    fitText(); // Initial fit

    return () => resizeObserver.disconnect();
  }, dependencies); // Re-run when dependencies change

  return { containerRef, valueRef };
};
