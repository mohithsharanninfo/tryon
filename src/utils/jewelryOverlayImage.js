// ===== Utility to map normalized FaceMesh coords (0–1) to container coordinates =====
function getDisplayCoord(normX, normY, imgEl, containerEl) {
  const origW = imgEl.naturalWidth;
  const origH = imgEl.naturalHeight;
  const contW = containerEl.clientWidth;
  const contH = containerEl.clientHeight;

  const imgAspect = origW / origH;
  const contAspect = contW / contH;

  let scale, offsetX = 0, offsetY = 0;

  if (imgAspect > contAspect) {
    // Fit width
    scale = contW / origW;
    offsetY = (contH - origH * scale) / 2;
  } else {
    // Fit height
    scale = contH / origH;
    offsetX = (contW - origW * scale) / 2;
  }

  return {
    x: normX * origW * scale + offsetX,
    y: normY * origH * scale + offsetY,
    scale
  };
}

// ===== Main positioning with dynamic proportional offsets =====
export function positionJewelryForImage({ landmarks, jewelryElement, jewelryType, imageElement, parent }) {
  if (!landmarks || !jewelryElement || !imageElement || !parent) return;
  removeExistingJewelry(jewelryType, parent);

  const containerEl = parent;
  const getDist = (lm1, lm2) => {
    const p1 = getDisplayCoord(lm1.x, lm1.y, imageElement, containerEl);
    const p2 = getDisplayCoord(lm2.x, lm2.y, imageElement, containerEl);
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  // Landmark references
  const chin = landmarks[152];
  const jawLeft = landmarks[234];
  const jawRight = landmarks[454];
  const faceTop = landmarks[10];
  const leftEarLobe = landmarks[132];
  const rightEarLobe = landmarks[361];
  const neckBase = landmarks[200] || null;

  if (!chin || !jawLeft || !jawRight) return;

  // Face size in px
  const faceWidthPx = getDist(jawLeft, jawRight);
  const faceHeightPx = getDist(faceTop, chin);

  // === Earrings ===
  if (jewelryType === 'earrings') {
    const leftEar = getDisplayCoord(leftEarLobe.x, leftEarLobe.y, imageElement, containerEl);
    const rightEar = getDisplayCoord(rightEarLobe.x, rightEarLobe.y, imageElement, containerEl);

    // Tilt compensation: horizontal offset sign based on ear relative position
    const tiltFactor = Math.sign(rightEar.x - leftEar.x) || 1;

    // Offsets proportional to face height for better tilt handling
    const offsetX = faceHeightPx * 0.05 * tiltFactor; // 3% sideways
    const offsetY = faceHeightPx * 0.06;              // 6% drop

    // Dynamic earring size: proportional but clamped for realism
    const earringSize = Math.min(faceWidthPx * 0.4, faceHeightPx * 0.28);

    const earringsWrapper = createOverlayWrapper();

    // Left Earring
    earringsWrapper.appendChild(
      createOverlayClone(jewelryElement, 'earring-overlay left-earring', {
        position: 'absolute',
        left: `${leftEar.x - earringSize / 2 - offsetX}px`,
        top: `${leftEar.y - earringSize / 2 + offsetY}px`,
        width: `${earringSize}px`,
        height: `${earringSize}px`,
      })
    );

    // Right Earring
    earringsWrapper.appendChild(
      createOverlayClone(jewelryElement, 'earring-overlay right-earring', {
        position: 'absolute',
        left: `${rightEar.x - earringSize / 2 + offsetX}px`,
        top: `${rightEar.y - earringSize / 2 + offsetY}px`,
        width: `${earringSize}px`,
        height: `${earringSize}px`,
      })
    );

    parent.appendChild(earringsWrapper);
  }
  // === Necklace ===
if (jewelryType === 'necklace') {
  const chinPos = getDisplayCoord(chin.x, chin.y, imageElement, containerEl);

  // Drop from chin to neck/collarbone: 38% of face height
  const anchorY = chinPos.y + (faceHeightPx * 0.40);

  // Horizontal center between jaw corners
  const jawLeftPos = getDisplayCoord(jawLeft.x, jawLeft.y, imageElement, containerEl);
  const jawRightPos = getDisplayCoord(jawRight.x, jawRight.y, imageElement, containerEl);
  const anchorX = (jawLeftPos.x + jawRightPos.x) / 2;

  // Scale necklace size proportional to jaw width
  const jawWidth = getDist(jawLeft, jawRight);
  const necklaceWidth = Math.min(jawWidth * 1.45, faceHeightPx * 1.6);
  const necklaceHeight = necklaceWidth * 0.9;

  const necklaceWrapper = createOverlayWrapper();
  Object.assign(necklaceWrapper.style, {
    left: `${anchorX - necklaceWidth / 2}px`,
    top: `${anchorY - necklaceHeight / 2}px`,
    width: `${necklaceWidth}px`,
    height: `${necklaceHeight}px`,
    transformOrigin: 'center top'
  });

  necklaceWrapper.appendChild(
    createOverlayClone(jewelryElement, 'necklace-overlay', {
      left: '0px',
      top: '0px',
      width: '100%',
      height: '100%'
    })
  );
  parent.appendChild(necklaceWrapper);
}}
// ===== Utilities =====
function removeExistingJewelry(jewelryType, container) {
  const selector = jewelryType === 'earrings' ? '.earring-overlay' : '.necklace-overlay';
  container.querySelectorAll(selector).forEach(el => el.closest('.jewelry-overlay-wrapper')?.remove());
}

export function clearAllJewelryOverlays(container) {
  if (!container) return;
  container.querySelectorAll('.jewelry-overlay-wrapper').forEach(el => el.remove());
}

function createOverlayWrapper() {
  const wrapper = document.createElement('div');
  wrapper.className = 'jewelry-overlay-wrapper';
  wrapper.dataset.x = '0';
  wrapper.dataset.y = '0';
  wrapper.dataset.scale = '1';
  Object.assign(wrapper.style, {
    position: 'absolute',
    display: 'block',
    pointerEvents: 'auto',
    zIndex: 10
  });
  return wrapper;
}

function createOverlayClone(baseElement, className, styleMap) {
  const innerWrapper = document.createElement('div');
  innerWrapper.className = className;
  Object.assign(innerWrapper.style, styleMap);

  const clone = baseElement.cloneNode(true);
  Object.assign(clone.style, {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0
  });

  innerWrapper.appendChild(clone);
  return innerWrapper;
}
