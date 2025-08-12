import * as facemesh from '@tensorflow-models/facemesh';
import '@tensorflow/tfjs-backend-cpu'; // can use webgl as well instead of cpu

export class CameraFeed {
  constructor(onResultsCallback) {
    this.onResultsCallback = onResultsCallback;
    this.model = null;
    this.videoElement = null;
    this.isRunning = false;
    this.animationFrameId = null;

    // Calibration configuration
    this.calibration = {
      isCalibrated: false,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      referenceFaceWidth: 0.14, // in meters
    };

    this.LANDMARKS = {
      CHIN: 152,
      JAW_LEFT: 93,
      JAW_RIGHT: 323,
      NECK_BASE: 200,
    };
  }

  async loadModel() {
    if (!this.model) {
      this.model = await facemesh.load({
        maxFaces: 1, 
        detectionConfidence: 0.8,
      });
    }
  }

  async start() {
    await this.loadModel();
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'webcam';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.width = 640;
    this.videoElement.height = 480; //

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
      });

      this.videoElement.srcObject = stream;

      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve);
        };
      });

      this.isRunning = true;
      this.detectionLoop();
      return this.videoElement;
    } catch (error) {
      throw new Error(`Camera initialization failed: ${error.message}`);
    }
  }

  async detectionLoop() {
    if (!this.isRunning) return;

    try {
      await this.detectFaces();
    } catch (error) {
      console.error('Detection error:', error);
    }

    this.animationFrameId = requestAnimationFrame(() => this.detectionLoop());
  }

  async detectFaces() {
    if (
      !this.model ||
      !this.videoElement ||
      this.videoElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      return;
    }

    const predictions = await this.model.estimateFaces(this.videoElement);
    if (predictions.length > 0) {
      const prediction = predictions[0];
      const rawLandmarks = prediction.scaledMesh;

      const landmarks = rawLandmarks.map(([x, y, z]) => ({
        x: x / this.videoElement.width,
        y: y / this.videoElement.height,
        z,
      }));

      // Live scale calculation using jawLeft and jawRight
      const jawLeft = landmarks[this.LANDMARKS.JAW_LEFT];
      const jawRight = landmarks[this.LANDMARKS.JAW_RIGHT];

      if (jawLeft && jawRight) {
        const faceWidthPx = Math.abs(jawRight.x - jawLeft.x) * this.videoElement.width;
        const liveScale = faceWidthPx / this.calibration.referenceFaceWidth;

        this.calibration.scale = liveScale; // Update every frame
      }

      // Calculate vertical offset once (optional, can move this to dynamic too)
      if (!this.calibration.isCalibrated) {
        this.autoCalibrate(landmarks);
      }

      // Pass results with image size + bounding box
      this.onResultsCallback({
        multiFaceLandmarks: [landmarks],
        calibration: this.calibration,
        boundingBox: prediction.boundingBox,
        imageWidth: this.videoElement.width,
        imageHeight: this.videoElement.height,
      });
    }
  }

  autoCalibrate(landmarks) {
    try {
      const chin = landmarks[this.LANDMARKS.CHIN];
      const neckBase = landmarks[this.LANDMARKS.NECK_BASE];

      if (chin && neckBase) {
        this.calibration.offsetY = (neckBase.y - chin.y) * 0.35;
        this.calibration.isCalibrated = true;
        console.log('Auto-calibration complete:', this.calibration);
      }
    } catch (error) {
      console.error('Auto-calibration failed:', error);
    }
  }

  adjustCalibration(adjustments) {
    Object.assign(this.calibration, adjustments);
    console.log('Calibration updated:', this.calibration);
  }

  resetCalibration() {
    this.calibration = {
      ...this.calibration,
      isCalibrated: false,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.videoElement?.srcObject) {
      this.videoElement.srcObject.getTracks().forEach((track) => track.stop());
    }
  }
}
