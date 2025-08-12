import { FaceMesh } from 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';

export const initFaceDetection = async (onResultsCallback) => {
  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(onResultsCallback);

  return faceMesh;
};