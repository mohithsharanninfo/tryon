import { CameraFeed } from './components/CameraFeed.js';
import { jewelryLibrary, preloadJewelry, createJewelryElement } from './utils/uiHelpers.js';
import { positionJewelry } from './utils/jewelryOverlay.js';
import { renderJewelryButtons } from './components/JewelrySelector.js';
import { createUploadTryOn } from './components/Upload.js';

class JewelryTryOnApp {
  constructor() {
    this.camera = null;
    this.activeNecklace = null;  // Track active necklace
    this.activeEarrings = null;  // Track active earrings
    this.isTracking = false;
    this.videoElement = null;
    this.jewelryElements = {};
    this.calibrationData = {
      isCalibrated: false,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0
    };
  }

  async init() {
    try {
      this.initContainers();
      await this.loadDependencies();
      this.setupEventListeners();
      this.startDetectionLoop();
      // Remove loading indicator after initialization
      if (this.loadingIndicator && this.loadingIndicator.parentNode) {
        this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async loadDependencies() {
    // Preload all jewelry assets first
    await preloadJewelry();
    
    // Initialize camera and face detection
    this.camera = new CameraFeed(this.handleFaceDetection.bind(this));
    this.videoElement = await this.camera.start();
    this.cameraContainer.appendChild(this.videoElement);
    
    // Create jewelry overlay elements
    this.createAllJewelryElements();
    
    // Render UI controls
    this.controlsContainer.appendChild(
      renderJewelryButtons(this.handleJewelrySelection.bind(this))
    );
  }

  initContainers() {
    this.appContainer = document.getElementById('app-container');
    this.cameraContainer = document.getElementById('camera-container');
    this.controlsContainer = document.getElementById('controls-container');
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = 'loading-indicator';
    this.loadingIndicator.textContent = 'Initializing...';
    this.appContainer.appendChild(this.loadingIndicator);
  }

  createAllJewelryElements() {
    Object.entries(jewelryLibrary).forEach(([category, items]) => {
      Object.entries(items).forEach(([_, jewelry]) => {
        // Add alt text for accessibility
        if (!jewelry.alt) {
          jewelry.alt = `${jewelry.type} - ${jewelry.id}`;
        }
        this.jewelryElements[jewelry.id] = createJewelryElement(jewelry);
        console.log('Created jewelry element:', jewelry.id, this.jewelryElements[jewelry.id]);
      });
    });
    console.log('All jewelryElements:', this.jewelryElements);
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
  }

  handleFaceDetection(results) {
    console.log('handleFaceDetection called. Active jewelry:', this.activeJewelry, 'Results:', results);
    if (!results.multiFaceLandmarks?.[0]) return;
    
    // Handle earrings if active
    if (this.activeEarrings) {
      positionJewelry({
        landmarks: results.multiFaceLandmarks[0],
        jewelryType: 'earrings',
        calibration: this.calibrationData,
        videoElement: this.videoElement
      });
    }
    
    // Handle necklace if active
    if (this.activeNecklace) {
      const jewelryConfig = this.findJewelryConfig(this.activeNecklace);
      if (jewelryConfig) {
        positionJewelry({
          landmarks: results.multiFaceLandmarks[0],
          jewelryElement: this.jewelryElements[this.activeNecklace],
          jewelryType: jewelryConfig.type,
          calibration: this.calibrationData,
          videoElement: this.videoElement
        });
      }
    }
  }

  handleJewelrySelection(jewelryId) {
    // Check if it's an earring or necklace
    const isEarring = jewelryId === 'ear1' || jewelryId === 'ear2';
    const isNecklace = jewelryId === 'necklace1' || jewelryId === 'necklace2';

    // Handle earring selection (only affect earrings)
    if (isEarring) {
      // Hide previous earrings only
      this.jewelryElements['ear1'].style.display = 'none';
      this.jewelryElements['ear2'].style.display = 'none';
      // Set up new earrings
      this.activeEarrings = 'earrings';
      const selectedEarring = jewelryId === 'ear1' ? 'diamond' : 'pearl';
      const earringPath = jewelryLibrary.earrings[selectedEarring].path;
      this.jewelryElements['ear1'].src = earringPath;
      this.jewelryElements['ear2'].src = earringPath;
      this.jewelryElements['ear1'].style.display = 'none';
      this.jewelryElements['ear2'].style.display = 'none';
      this.configureJewelryElement('ear1');
      this.configureJewelryElement('ear2');
    }

    // Handle necklace selection (only affect necklaces)
    if (isNecklace) {
      // Hide previous necklace only
      if (this.activeNecklace && this.activeNecklace !== jewelryId) {
        this.jewelryElements[this.activeNecklace].style.display = 'none';
      }
      // Set up new necklace
      this.activeNecklace = jewelryId;
      this.jewelryElements[jewelryId].style.display = 'block';
      this.configureJewelryElement(jewelryId);
    }

    // Ensure tracking is on when any jewelry is active
    this.isTracking = !!(this.activeEarrings || this.activeNecklace);
  }

  configureJewelryElement(jewelryId) {
    const element = this.jewelryElements[jewelryId];
    const config = this.findJewelryConfig(jewelryId);
    if (!config) {
      console.warn('Jewelry config not found for id:', jewelryId);
      return;
    }
    // If earrings, set width for both
    if (jewelryId === 'ear1' || jewelryId === 'ear2') {
      element.style.transformOrigin = 'center center';
      element.style.width = '24px'; // or test different values
      return;
    }
    switch(config.type) {
      case 'necklace':
        element.style.transformOrigin = 'center top';
        break;
    }
  }

  findJewelryConfig(id) {
    for (const category of Object.values(jewelryLibrary)) {
      for (const item of Object.values(category)) {
        if (item.id === id) {
          return item;
        }
      }
    }
    return null;
  }

  startDetectionLoop() {
    const processFrame = async () => {
      if (this.isTracking && this.videoElement?.readyState >= 2) {
        await this.camera.detectFaces();
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.isTracking = false;
    } else if (this.activeJewelry) {
      this.isTracking = true;
    }
  }

  handleWindowResize() {
    // Recalculate positions when window resizes
    if (this.activeJewelry) {
      this.isTracking = false;
      setTimeout(() => { this.isTracking = true }, 100);
    }
  }

  handleError(error) {
    console.error('Application error:', error);
    this.loadingIndicator.textContent = this.getErrorMessage(error);
    this.loadingIndicator.style.color = '#ff3333';
  }

  getErrorMessage(error) {
    const messages = {
      'MediaDevices': 'Camera access is not supported or blocked in this browser.',
      'permission': 'Please allow camera permissions to use this feature.',
      'model': 'Failed to load face detection model.',
      'default': 'An error occurred while initializing the application.'
    };

    return Object.entries(messages).find(([key]) => 
      error.message.includes(key)
    )?.[1] || messages.default;
  }

  cleanup() {
    if (this.camera) {
      this.camera.stop();
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleWindowResize);
  }
}

// --- Mode Selector and UI Toggle Logic ---
function renderModeSelector() {
  const container = document.createElement('div');
  container.style.marginBottom = '20px';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.gap = '16px';

  const liveBtn = document.createElement('button');
  liveBtn.textContent = 'Live Try-On';
  liveBtn.style.padding = '10px 20px';
  liveBtn.style.fontWeight = 'bold';
  liveBtn.onclick = () => showLiveTryOn();

  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = 'Upload Image';
  uploadBtn.style.padding = '10px 20px';
  uploadBtn.style.fontWeight = 'bold';
  uploadBtn.onclick = () => showUploadTryOn();

  container.appendChild(liveBtn);
  container.appendChild(uploadBtn);

  document.getElementById('app-container').prepend(container);
}

function showLiveTryOn() {
  const camera = document.getElementById('camera-container');
  const controls = document.getElementById('controls-container');
  if (camera) camera.style.display = 'block';
  if (controls) controls.style.display = 'block';
  const uploadUI = document.getElementById('upload-tryon-container');
  if (uploadUI) uploadUI.style.display = 'none';
}

function showUploadTryOn() {
  const camera = document.getElementById('camera-container');
  const controls = document.getElementById('controls-container');
  if (camera) camera.style.display = 'none';
  if (controls) controls.style.display = 'none';
  let uploadUI = document.getElementById('upload-tryon-container');
  if (!uploadUI) {
    uploadUI = createUploadTryOn(() => {});
    uploadUI.id = 'upload-tryon-container';
    document.getElementById('app-container').appendChild(uploadUI);
  }
  uploadUI.style.display = 'block';
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  const app = new JewelryTryOnApp();
  app.init();

  // Add mode selector and default to live try-on
  renderModeSelector();
  showLiveTryOn();
  
  // Cleanup on exit
  window.addEventListener('beforeunload', () => app.cleanup());
});