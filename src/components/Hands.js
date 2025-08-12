// Hands.js: Hand detection and jewelry overlay for bangles and rings
// Uses MediaPipe Hands via CDN (non-React, modular style)

// 1. Load MediaPipe Hands
import { Hands } from 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
import { drawConnectors, drawLandmarks } from 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';

// 2. Utility: Map normalized landmark to video display coordinates
function getDisplayedPosition(landmark, video) {
  const rect = video.getBoundingClientRect();
  return {
    x: landmark.x * rect.width,
    y: landmark.y * rect.height
  };
}

// 3. Overlay helpers
function createOverlayImg(id, src, className) {
  let img = document.getElementById(id);
  if (!img) {
    img = document.createElement('img');
    img.id = id;
    img.src = src;
    img.className = className;
    img.style.position = 'absolute';
    img.style.display = 'none';
    img.style.pointerEvents = 'none';
    const container = document.getElementById('camera-container');
    if (container) container.appendChild(img);
  }
  return img;
}

function setOverlayPosition(img, x, y, width, angle = 0) {
  img.style.display = 'block';
  img.style.left = `${x - width / 2}px`;
  img.style.top = `${y - width / 2}px`;
  img.style.width = `${width}px`;
  img.style.transform = `rotate(${angle}deg)`;
  img.style.transformOrigin = 'center center';
}

// 4. Main detection and overlay logic
export async function startHandsDetection({
  videoElement,
  bangleSrc = 'public/jwellery/bangle1.png',
  ringSrc = 'public/jwellery/ring1.png',
  onResultsCallback = null
}) {
  // Load MediaPipe Hands
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  // Overlay image elements (one per wrist, four for left hand rings)
  const bangleImgs = [
    createOverlayImg('bangle-left', bangleSrc, 'jewelry-overlay bangle'),
    createOverlayImg('bangle-right', bangleSrc, 'jewelry-overlay bangle')
  ];
  const ringImgs = [
    createOverlayImg('ring-index', ringSrc, 'jewelry-overlay ring'),
    createOverlayImg('ring-middle', ringSrc, 'jewelry-overlay ring'),
    createOverlayImg('ring-ring', ringSrc, 'jewelry-overlay ring'),
    createOverlayImg('ring-pinky', ringSrc, 'jewelry-overlay ring')
  ];

  // Hide overlays initially
  bangleImgs.forEach(img => img.style.display = 'none');
  ringImgs.forEach(img => img.style.display = 'none');

  // 5. Results callback
  hands.onResults((results) => {
    // Hide all overlays by default
    bangleImgs.forEach(img => img.style.display = 'none');
    ringImgs.forEach(img => img.style.display = 'none');

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    // For each detected hand
    results.multiHandLandmarks.forEach((landmarks, handIdx) => {
      // Determine handedness (left/right)
      const handedness = results.multiHandedness && results.multiHandedness[handIdx]?.label;
      // 1. Bangles: overlay on both hands (landmark 0 = wrist)
      const wrist = landmarks[0];
      const mcp = landmarks[9]; // Middle finger MCP for angle
      if (wrist && mcp) {
        const wristPos = getDisplayedPosition(wrist, videoElement);
        const mcpPos = getDisplayedPosition(mcp, videoElement);
        const angle = Math.atan2(mcpPos.y - wristPos.y, mcpPos.x - wristPos.x) * 180 / Math.PI;
        const bangleWidth = Math.max(40, Math.abs(mcpPos.x - wristPos.x) * 2); // Dynamic sizing
        if (handedness === 'Left') {
          setOverlayPosition(bangleImgs[0], wristPos.x, wristPos.y, bangleWidth, angle);
        } else {
          setOverlayPosition(bangleImgs[1], wristPos.x, wristPos.y, bangleWidth, angle);
        }
      }

      // 2. Rings: only for left hand
      if (handedness === 'Left') {
        // Landmarks for finger bases: 5 (index), 9 (middle), 13 (ring), 17 (pinky)
        const ringLandmarks = [5, 9, 13, 17];
        ringLandmarks.forEach((lmIdx, i) => {
          const base = landmarks[lmIdx];
          const tip = landmarks[lmIdx + 3]; // Use tip for angle
          if (base && tip) {
            const basePos = getDisplayedPosition(base, videoElement);
            const tipPos = getDisplayedPosition(tip, videoElement);
            const angle = Math.atan2(tipPos.y - basePos.y, tipPos.x - basePos.x) * 180 / Math.PI;
            const ringWidth = Math.max(18, Math.abs(tipPos.x - basePos.x) * 2.2); // Dynamic sizing
            setOverlayPosition(ringImgs[i], basePos.x, basePos.y, ringWidth, angle);
          }
        });
      }
    });

    if (onResultsCallback) onResultsCallback(results);
  });

  // 6. Start detection loop
  async function detectionLoop() {
    if (videoElement.readyState < 2) {
      requestAnimationFrame(detectionLoop);
      return;
    }
    await hands.send({ image: videoElement });
    requestAnimationFrame(detectionLoop);
  }
  detectionLoop();

  // Return a stop function
  return () => {
    bangleImgs.forEach(img => img.style.display = 'none');
    ringImgs.forEach(img => img.style.display = 'none');
  };
}
