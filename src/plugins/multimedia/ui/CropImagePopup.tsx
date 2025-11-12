import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop } from 'react-image-crop';


export type CropDataPropValue = {
  left: number;
  top: number;
  width: number;
  height: number;
  croppedBase64:string;
};

export function CropImagePopup({ src, onConfirm, onCancel, defaultUnit = 'px' }: {
  src: string;
  onConfirm: (cropData: CropDataPropValue) => void;
  onCancel: () => void;
  defaultUnit?: 'px' | '%';
}) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState<Crop>({
    unit: defaultUnit,
    x: 50,
    y: 50,
    width: 200,
    height: 150,
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  const handleCropConfirm = () => {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const croppedBase64 = canvas.toDataURL('image/png');

    onConfirm({
      left: completedCrop.x,
      top: completedCrop.y,
      width: completedCrop.width,
      height: completedCrop.height,
      croppedBase64,
    });
  };

  return (
    <div
      className="crop-popup-wrapper"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: 20,
        zIndex: 1000,
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        width: '650px',
      }}
    >
      <ReactCrop
        crop={crop}
        minWidth={50}
        onChange={(newCrop) => setCrop(newCrop)}
        onComplete={(c) => setCompletedCrop(c)}
      >
        <img
          alt="Crop"
          onLoad={(e) => {
            const { width, height } = e.currentTarget;
            const centered = centerCrop(
              makeAspectCrop(
                {
                  unit: 'px',
                  width: width * 0.8,
                },
                4 / 3,
                width,
                height
              ),
              width,
              height
            );
            setCrop(centered);
            setCompletedCrop(centered);
          }}
          ref={imgRef}
          src={src}
          style={{ maxWidth: '100%' }}
        />
      </ReactCrop>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleCropConfirm}>Crop</button>
      </div>
    </div>
  );
}