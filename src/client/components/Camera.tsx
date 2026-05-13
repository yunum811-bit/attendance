import React, { useRef, useState, useEffect } from 'react';

interface CameraProps {
  onCapture: (photoData: string) => void;
  onCancel: () => void;
}

export default function Camera({ onCapture, onCancel }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraReady, setCameraReady] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [useNativeCapture, setUseNativeCapture] = useState(false);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkCameraSupport();
    return () => stopStream();
  }, []);

  const checkCameraSupport = async () => {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native capture (input type=file with capture)
      setUseNativeCapture(true);
      return;
    }

    // Check number of cameras
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    } catch {
      // Ignore
    }

    startCamera('user');
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (facing: 'user' | 'environment') => {
    stopStream();
    setCameraReady(false);
    setError('');

    try {
      // Try with facingMode constraint
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 960 },
        },
        audio: false,
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback: try without facingMode (some devices don't support it)
        constraints = { video: true, audio: false };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play()
              .then(() => {
                setCameraReady(true);
                resolve();
              })
              .catch(reject);
          };
          video.onerror = () => reject(new Error('Video error'));
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
      }
    } catch (err: any) {
      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('กรุณาอนุญาตการเข้าถึงกล้อง\n\nAndroid: ไปที่ Settings > Apps > Browser > Permissions > Camera\niOS: ไปที่ Settings > Safari > Camera > Allow');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('ไม่พบกล้องในอุปกรณ์นี้');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('กล้องถูกใช้งานโดยแอปอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่');
      } else if (err.name === 'OverconstrainedError') {
        // Try again with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = basicStream;
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            await videoRef.current.play();
            setCameraReady(true);
          }
          return;
        } catch {
          setError('ไม่สามารถเปิดกล้องได้');
        }
      } else if (err.message === 'Timeout') {
        setError('กล้องใช้เวลานานเกินไป กรุณาลองใหม่');
      } else {
        // If getUserMedia completely fails, offer native capture
        setUseNativeCapture(true);
        return;
      }
    }
  };

  const switchCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use actual video dimensions
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setCaptured(photoData);

    // Pause video to save battery
    video.pause();
  };

  const retake = () => {
    setCaptured(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const confirmPhoto = () => {
    if (captured) {
      stopStream();
      onCapture(captured);
    }
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  // Handle native file input capture (fallback for problematic browsers)
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize if too large
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const photoData = canvas.toDataURL('image/jpeg', 0.7);
          setCaptured(photoData);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerNativeCapture = () => {
    nativeInputRef.current?.click();
  };

  // Native capture fallback UI
  if (useNativeCapture) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="bg-black/80 text-white px-4 py-3 flex justify-between items-center">
          <button onClick={handleCancel} className="text-white text-sm px-3 py-1">
            ✕ ยกเลิก
          </button>
          <span className="text-sm font-medium">📷 ถ่ายรูปยืนยันตัวตน</span>
          <span className="w-16" />
        </div>

        <div className="flex-1 flex items-center justify-center bg-black p-6">
          {captured ? (
            <img src={captured} alt="Captured" className="max-w-full max-h-full object-contain rounded-lg" />
          ) : (
            <div className="text-center">
              <p className="text-white text-lg mb-6">กดปุ่มด้านล่างเพื่อเปิดกล้องถ่ายรูป</p>
              <button
                onClick={triggerNativeCapture}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-medium"
              >
                📷 เปิดกล้อง
              </button>
              {/* Hidden input - capture="user" forces camera, not file picker */}
              <input
                ref={nativeInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleNativeCapture}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="bg-black/80 px-4 py-4 flex justify-center items-center gap-6">
          {captured ? (
            <>
              <button
                onClick={() => { setCaptured(null); }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full text-sm font-medium"
              >
                🔄 ถ่ายใหม่
              </button>
              <button
                onClick={() => { if (captured) onCapture(captured); }}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-sm font-medium"
              >
                ✅ ใช้รูปนี้
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // getUserMedia camera UI
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 text-white px-4 py-3 flex justify-between items-center safe-area-top">
        <button onClick={handleCancel} className="text-white text-sm px-3 py-1 min-h-[44px]">
          ✕ ยกเลิก
        </button>
        <span className="text-sm font-medium">📷 ถ่ายรูปยืนยันตัวตน</span>
        {!captured && hasMultipleCameras ? (
          <button onClick={switchCamera} className="text-white text-sm px-3 py-1 min-h-[44px]">
            🔄 สลับ
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
        {error ? (
          <div className="text-center p-6 max-w-sm">
            <p className="text-red-400 text-4xl mb-4">⚠️</p>
            <p className="text-white mb-4 whitespace-pre-line text-sm">{error}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => startCamera(facingMode)}
                className="bg-green-600 text-white px-4 py-3 rounded-lg"
              >
                🔄 ลองใหม่
              </button>
              <button
                onClick={() => setUseNativeCapture(true)}
                className="bg-gray-600 text-white px-4 py-3 rounded-lg text-sm"
              >
                📷 ใช้กล้องแบบอื่น
              </button>
            </div>
          </div>
        ) : captured ? (
          <img
            src={captured}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-white text-sm">กำลังเปิดกล้อง...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 px-4 py-5 flex justify-center items-center gap-6 safe-area-bottom">
        {captured ? (
          <>
            <button
              onClick={retake}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full text-sm font-medium min-h-[48px]"
            >
              🔄 ถ่ายใหม่
            </button>
            <button
              onClick={confirmPhoto}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-sm font-medium min-h-[48px]"
            >
              ✅ ใช้รูปนี้
            </button>
          </>
        ) : (
          <button
            onClick={takePhoto}
            disabled={!cameraReady}
            className="w-18 h-18 bg-white rounded-full border-4 border-gray-300 active:border-green-400 disabled:opacity-50 transition-all active:scale-90 flex items-center justify-center"
            style={{ width: '72px', height: '72px' }}
            aria-label="ถ่ายรูป"
          >
            <div className="w-14 h-14 bg-white rounded-full border-2 border-gray-400" style={{ width: '56px', height: '56px' }} />
          </button>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
