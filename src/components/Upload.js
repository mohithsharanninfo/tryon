import { jewelryLibrary, createJewelryElement } from '../utils/uiHelpers.js';
import { positionJewelryForImage, clearAllJewelryOverlays } from "../utils/jewelryOverlayImage";
import html2canvas from 'html2canvas';

let selectedJewelryWrapper = null;

export function createUploadTryOn(onJewelrySelect) {
  const container = document.createElement('div');
  container.className = 'upload-tryon-container';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.margin = '20px 0';

  const imgPreview = document.createElement('img');
  imgPreview.id = 'uploaded-image';
  Object.assign(imgPreview.style, {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: '0',
    left: '0',
    display: 'none'
  });

  const zoomWrapper = document.createElement('div');
  zoomWrapper.className = 'zoom-wrapper';
  Object.assign(zoomWrapper.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease',
    cursor: 'grab'
  });
  zoomWrapper.appendChild(imgPreview);

  const overlayContainer = document.createElement('div');
  overlayContainer.className = 'image-overlay-container';
  Object.assign(overlayContainer.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    aspectRatio: '4 / 5',
    overflow: 'hidden',
    backgroundColor: 'transparent'
  });

  const transformWrapper = document.createElement('div');
  transformWrapper.className = 'image-transform-wrapper';
  Object.assign(transformWrapper.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease',
  });

  transformWrapper.appendChild(zoomWrapper);
  overlayContainer.appendChild(transformWrapper);

  const zoomControls = document.createElement('div');
  zoomControls.className = 'image-zoom-controls';
  zoomControls.style.display = 'flex';
  zoomControls.style.gap = '10px';
  zoomControls.style.marginBottom = '10px';
  zoomControls.style.justifyContent = 'flex-end';
  zoomControls.innerHTML = `
    <button id="zoom-in-btn">Zoom In</button>
    <button id="zoom-out-btn">Zoom Out</button>
    <button id="reset-btn">Reset</button>
  `;

  const controls = document.createElement('div');
  controls.className = 'jewelry-selector';

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download Result';
  downloadBtn.style.display = 'none';
  downloadBtn.style.margin = '20px 0';

  const manualControls = document.createElement('div');
  manualControls.className = 'manual-controls';
  manualControls.innerHTML = `
    <button data-action="up">⬆</button>
    <button data-action="down">⬇</button>
    <button data-action="left">⬅</button>
    <button data-action="right">➡</button>
    <button data-action="zoom-in">＋</button>
    <button data-action="zoom-out">－</button>
  `;
  manualControls.style.display = 'none';

  let currentLandmarks = null;
  let faceDimensions = null;
  let isDetecting = false;
  let facemeshModel = null;

  async function loadModel() {
    if (!facemeshModel) {
      const facemesh = await import('@tensorflow-models/facemesh');
      facemeshModel = await facemesh.load({
        maxFaces: 1,
        staticImageMode: true, // Force full detection each time
        refineLandmarks: true
      });
    }
    return facemeshModel;
  }

  function setJewelryButtonsDisabled(disabled) {
    const buttons = controls.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.5' : '1';
      btn.style.pointerEvents = disabled ? 'none' : 'auto';
    });
  }

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset state to avoid stale data between uploads
    currentLandmarks = null;
    faceDimensions = null;
    selectedJewelryWrapper = null;
    isDetecting = true;
    setJewelryButtonsDisabled(true);
    clearAllJewelryOverlays(zoomWrapper);
    manualControls.style.display = 'none';
    downloadBtn.style.display = 'none';

    URL.revokeObjectURL(imgPreview.src);
    const url = URL.createObjectURL(file);
    imgPreview.src = url;
    imgPreview.style.display = 'block';

    imgPreview.onload = async () => {
      try {
        const model = await loadModel();
        const predictions = await model.estimateFaces(imgPreview);

        if (predictions.length === 0) {
          alert('No face detected.');
          isDetecting = false;
          setJewelryButtonsDisabled(false);
          return;
        }

        const scaledMesh = predictions[0].scaledMesh;
        currentLandmarks = scaledMesh.map(([x, y]) => ({
          x: x / imgPreview.width,
          y: y / imgPreview.height
        }));

        const leftEar = scaledMesh[132];
        const rightEar = scaledMesh[361];
        const faceTop = scaledMesh[10];
        const faceBottom = scaledMesh[152];

        faceDimensions = {
          width: Math.abs(rightEar[0] - leftEar[0]) / imgPreview.width,
          height: Math.abs(faceBottom[1] - faceTop[1]) / imgPreview.height
        };

        isDetecting = false;
        setJewelryButtonsDisabled(false);
      } catch (err) {
        console.error("Face detection error:", err);
        alert('Error running face detection.');
        isDetecting = false;
        setJewelryButtonsDisabled(false);
      }
    };
  };

  function overlayJewelry(jewelry) {
    if (isDetecting) return alert('Please wait... Face detection in progress.');
    if (!currentLandmarks || !faceDimensions) return alert('Please upload a valid image with a clear face.');

    const jewelryElement = createJewelryElement(jewelry);
    jewelryElement.style.position = 'absolute';
    jewelryElement.style.pointerEvents = 'none';
    jewelryElement.style.display = 'block';

    positionJewelryForImage({
      landmarks: currentLandmarks,
      jewelryElement,
      jewelryType: jewelry.type,
      imageElement: imgPreview,
      faceDimensions,
      calibration: null,
      parent: zoomWrapper,
      zoomState: { zoomScale, offsetX, offsetY }
    });

    selectedJewelryWrapper = [...zoomWrapper.querySelectorAll('.jewelry-overlay-wrapper')]
      .filter(w => jewelry.type === 'earrings'
        ? w.querySelector('.earring-overlay')
        : w.querySelector('.necklace-overlay')
      )[0];

    if (selectedJewelryWrapper) {
      selectedJewelryWrapper.dataset.x = 0;
      selectedJewelryWrapper.dataset.y = 0;
      selectedJewelryWrapper.dataset.scale = 1;
      selectedJewelryWrapper.style.transform = `translate(0px, 0px) scale(1)`;
    }

    manualControls.style.display = 'flex';
    downloadBtn.style.display = 'inline-block';
  }

  // Manual adjust buttons
  manualControls.querySelectorAll('button').forEach(btn => {
    const action = btn.getAttribute('data-action');
    btn.onclick = () => {
      if (!selectedJewelryWrapper) return;

      let x = parseFloat(selectedJewelryWrapper.dataset.x || '0');
      let y = parseFloat(selectedJewelryWrapper.dataset.y || '0');
      let scale = parseFloat(selectedJewelryWrapper.dataset.scale || '1');

      switch (action) {
        case 'up':    y -= 2.0; break;
        case 'down':  y += 2.0; break;
        case 'left':  x -= 2.0; break;
        case 'right': x += 2.0; break;
        case 'zoom-in':  scale *= 1.05; break;
        case 'zoom-out': scale /= 1.05; break;
      }
      selectedJewelryWrapper.dataset.x = x;
      selectedJewelryWrapper.dataset.y = y;
      selectedJewelryWrapper.dataset.scale = scale;
      selectedJewelryWrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };
  });

  // Zoom and Pan
  let zoomScale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function updateZoomTransform() {
    transformWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomScale})`;
  }

  function clampZoom(scale) {
    return Math.max(0.3, Math.min(scale, 3));
  }

  zoomControls.querySelector('#zoom-in-btn').onclick = () => {
    zoomScale = clampZoom(zoomScale * 1.1);
    updateZoomTransform();
  };
  zoomControls.querySelector('#zoom-out-btn').onclick = () => {
    zoomScale = clampZoom(zoomScale / 1.1);
    updateZoomTransform();
  };
  zoomControls.querySelector('#reset-btn').onclick = () => {
    zoomScale = 1;
    offsetX = 0;
    offsetY = 0;
    updateZoomTransform();
  };

  zoomWrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    zoomWrapper.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    zoomWrapper.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    offsetX += dx;
    offsetY += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    updateZoomTransform();
  });

  // Jewelry buttons
  Object.entries(jewelryLibrary).forEach(([category, items]) => {
    Object.entries(items).forEach(([_, jewelry]) => {
      const btn = document.createElement('button');
      btn.className = `jewelry-btn ${jewelry.type}-btn`;
      btn.textContent =
        jewelry.id.includes('ear')
          ? jewelry.id === 'ear1'
            ? 'Diamond Earrings'
            : 'Pearl Earrings'
          : jewelry.id === 'necklace1'
            ? 'Gold Necklace'
            : 'Silver Pendant';

      btn.onclick = () => {
        onJewelrySelect(jewelry.id);
        overlayJewelry(jewelry);
      };

      controls.appendChild(btn);
    });
  });

  // Download button
  downloadBtn.onclick = async () => {
    try {
      const canvas = await html2canvas(overlayContainer, {
        useCORS: true,
        backgroundColor: null
      });

      const link = document.createElement('a');
      link.download = 'jewelry-tryon.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to capture image:', error);
      alert('Something went wrong while capturing the image.');
    }
  };

  // Append UI
  container.appendChild(fileInput);
  container.appendChild(zoomControls);
  container.appendChild(overlayContainer);
  container.appendChild(controls);
  container.appendChild(downloadBtn);
  container.appendChild(manualControls);

  return container;
}
