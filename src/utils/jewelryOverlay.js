export function positionJewelry({landmarks, jewelryElement, jewelryId, jewelryType, calibration, videoElement}) {
  const video = videoElement || document.getElementById('webcam');
  if (!video || !landmarks || (landmarks.length !== 468 && landmarks.length !== 478)) return;

  const elements = {
    leftEar: document.getElementById('ear1'),
    rightEar: document.getElementById('ear2'),
    necklace: jewelryElement || (jewelryId ? document.getElementById(jewelryId) : null)
  };

  switch (jewelryType) {
    case 'earrings':
      positionEarrings(landmarks, video, elements, calibration);
      break;
    case 'necklace':
      positionNecklace(landmarks, video, elements.necklace, calibration);
      break;
  }
}
// function positionEarrings(landmarks, video, elements, calibration) {
//   const videoRect = video.getBoundingClientRect();
//   const containerWidth = videoRect.width;
//   const containerHeight = videoRect.height;

//   let earringWidth = 24;
//   if (landmarks[234] && landmarks[454]) {
//     const left = getDisplayedPosition(landmarks[234], video);
//     const right = getDisplayedPosition(landmarks[454], video);
//     const dist = Math.hypot(right.x - left.x, right.y - left.y);
//     earringWidth = Math.min(60, dist / 6);
//   }

//   const offsetX = 3.2, offsetY = 10;
//   const nose = landmarks[1];

//   function isEarVisible(earLandmark) {
//     if (!earLandmark || !nose) return false;

//     const dz = Math.abs(earLandmark.z - nose.z);
//     const dx = Math.abs(earLandmark.x - nose.x);

//     const maxDepthDifference = 50;
//     const minSideDistance = 0.04;

//     const visibleByDepth = dz > 15 && dz < maxDepthDifference;
//     const visibleBySide = dx > minSideDistance;

//     return visibleByDepth || visibleBySide;
//   }

//   // Left earring (landmark 132)
//   const leftEarVisible = isEarVisible(landmarks[132]);
//   if (leftEarVisible && elements.leftEar) {
//     const pos = getDisplayedPosition(landmarks[132], video);
//     const el = elements.leftEar;
//     el.style.display = 'block';
//     el.style.width = `${earringWidth}px`;
//     const w = el.offsetWidth, h = el.offsetHeight;
//     el.style.left = `${clamp(pos.x - w / 2 - offsetX, 0, containerWidth - w)}px`;
//     el.style.top = `${clamp(pos.y - h / 2 + offsetY, 0, containerHeight - h)}px`;
//   } else if (elements.leftEar) {
//     elements.leftEar.style.display = 'none';
//   }

//   // Right earring (landmark 361)
//   const rightEarVisible = isEarVisible(landmarks[361]);
//   if (rightEarVisible && elements.rightEar) {
//     const pos = getDisplayedPosition(landmarks[361], video);
//     const el = elements.rightEar;
//     el.style.display = 'block';
//     el.style.width = `${earringWidth}px`;
//     const w = el.offsetWidth, h = el.offsetHeight;
//     el.style.left = `${clamp(pos.x - w / 2 + offsetX, 0, containerWidth - w)}px`;
//     el.style.top = `${clamp(pos.y - h / 2 + offsetY, 0, containerHeight - h)}px`;
//   } else if (elements.rightEar) {
//     elements.rightEar.style.display = 'none';
//   }
// }

function positionEarrings(landmarks, video, elements, calibration) {
  const videoRect = video.getBoundingClientRect();
  const containerWidth = videoRect.width;
  const containerHeight = videoRect.height;

  function getDisplayedPosition(landmark) {
    return {
      x: landmark.x * containerWidth,
      y: landmark.y * containerHeight
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function distance2D(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  function estimateEarlobe(side = 'left') {
    const tragus = side === 'left' ? landmarks[234] : landmarks[454];
    const helixTop = side === 'left' ? landmarks[127] : landmarks[356];
    const jawCorner = side === 'left' ? landmarks[132] : landmarks[361];
    const nose = landmarks[1];
    if (!tragus || !helixTop || !jawCorner || !nose) return null;

    // Ear size metrics
    const earHeight = distance2D(tragus, helixTop);
    const earWidth = distance2D(tragus, jawCorner);

    // Head rotation measure (0 = front, ~0.25+ = side)
    const rotationFactor = Math.min(1, Math.abs(tragus.x - nose.x) / 0.25);

    // FRONT VIEW position: tragus → jaw vector, slightly down
    const frontVec = {
      x: tragus.x + (jawCorner.x - tragus.x) * 1.15,
      y: tragus.y + (jawCorner.y - tragus.y) * 1.15
    };

    // SIDE VIEW position: move down by % of ear height, outward by % of ear width
    const outwardDir = side === 'left' ? -1 : 1;
    const sideVec = {
      x: tragus.x + outwardDir * earWidth * 0.35,
      y: tragus.y + earHeight * 0.8
    };

    // Blend between front and side positions based on rotation
    return {
      x: frontVec.x * (1 - rotationFactor) + sideVec.x * rotationFactor,
      y: frontVec.y * (1 - rotationFactor) + sideVec.y * rotationFactor,
      z: jawCorner.z
    };
  }

  function isEarVisible(earLandmark) {
    const nose = landmarks[1];
    if (!earLandmark || !nose) return false;

    const dz = Math.abs(earLandmark.z - nose.z);
    const dx = Math.abs(earLandmark.x - nose.x);

    const maxDepthDifference = 50;
    const minSideDistance = 0.04;

    const visibleByDepth = dz > 15 && dz < maxDepthDifference;
    const visibleBySide = dx > minSideDistance;

    return visibleByDepth || visibleBySide;
  }

  // === Earring width estimation ===
  let earringWidth = 24;
  if (landmarks[234] && landmarks[454]) {
    const left = getDisplayedPosition(landmarks[234]);
    const right = getDisplayedPosition(landmarks[454]);
    const dist = Math.hypot(right.x - left.x, right.y - left.y);
    earringWidth = Math.min(60, dist / 6);
  }

  const offsetX = 3.2, offsetY = 0;

  // === Left earring ===
  const leftLobe = estimateEarlobe('left');
  if (leftLobe && isEarVisible(leftLobe) && elements.leftEar) {
    const pos = getDisplayedPosition(leftLobe);
    const el = elements.leftEar;
    el.style.display = 'block';
    el.style.width = `${earringWidth}px`;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${clamp(pos.x - w / 2 - offsetX, 0, containerWidth - w)}px`;
    el.style.top = `${clamp(pos.y - h / 2 + offsetY, 0, containerHeight - h)}px`;
  } else if (elements.leftEar) {
    elements.leftEar.style.display = 'none';
  }

  // === Right earring ===
  const rightLobe = estimateEarlobe('right');
  if (rightLobe && isEarVisible(rightLobe) && elements.rightEar) {
    const pos = getDisplayedPosition(rightLobe);
    const el = elements.rightEar;
    el.style.display = 'block';
    el.style.width = `${earringWidth}px`;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${clamp(pos.x - w / 2 + offsetX, 0, containerWidth - w)}px`;
    el.style.top = `${clamp(pos.y - h / 2 + offsetY, 0, containerHeight - h)}px`;
  } else if (elements.rightEar) {
    elements.rightEar.style.display = 'none';
  }
}



function positionNecklace(landmarks, video, element, calibration) {
  if (!element || !landmarks) return;

  const chin = landmarks[152];
  const neckBase = landmarks[200];
  const jawLeft = landmarks[234];
  const jawRight = landmarks[454];

  if (!chin || !neckBase || !jawLeft || !jawRight) return;

  const necklaceAnchor = {
    x: chin.x * 0.7 + neckBase.x * 0.3,
    y: chin.y * 0.4 + neckBase.y * 0.58
  };

  const pos = getCalibratedPosition(necklaceAnchor, video, calibration);

  // Dynamic scaling based on face width (jaw-to-jaw distance)
  const faceWidthPx = Math.abs(jawRight.x - jawLeft.x) * video.videoWidth;
  const referenceFaceWidth = 140; // You can calibrate this based on a known good sample (180)
  const scaleFromFace = Math.min(1.4, Math.max(0.6, faceWidthPx / referenceFaceWidth));

  const finalScale = (calibration?.scale || 1.0) * scaleFromFace;

  element.style.display = 'block';
  element.style.width = `120px`; // Base width
  element.style.left = `${pos.x - element.offsetWidth / 2}px`;
  element.style.top = `${pos.y}px`;
  element.style.transform = `scale(${finalScale})`;
  element.style.transformOrigin = 'center top';
}

function getCalibratedPosition(landmark, video, calibration) {
  const raw = getDisplayedPosition(landmark, video);
  if (!calibration?.isCalibrated) return raw;
  return {
    x: raw.x + (calibration.offsetX * video.videoWidth * calibration.scale),
    y: raw.y + (calibration.offsetY * video.videoHeight * calibration.scale)
  };
}

function getDisplayedPosition(landmark, video) {
  const rect = video.getBoundingClientRect();
  return {
    x: landmark.x * rect.width,
    y: landmark.y * rect.height
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}