// This JS handles file input, image preview, and enabling Scan button

const fileInput = document.getElementById('receiptFileInput');
const previewImage = document.getElementById('receiptPreview');
const noPreviewText = document.getElementById('noPreviewText');
const scanButton = document.getElementById('scanBtn');
const captureBtn = document.getElementById('captureBtn');

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    previewImage.src = url;
    previewImage.style.display = 'block';
    noPreviewText.style.display = 'none';
    scanButton.disabled = false;
  } else {
    previewImage.src = '';
    previewImage.style.display = 'none';
    noPreviewText.style.display = 'block';
    scanButton.disabled = true;
  }
});

// Camera capture support (simple demo)
// Will open device camera if supported and capture single photo

captureBtn.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera capture not supported by your browser.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Create video element dynamically
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    const captureArea = document.createElement('div');
    captureArea.style.position = 'fixed';
    captureArea.style.top = '0';
    captureArea.style.left = '0';
    captureArea.style.width = '100vw';
    captureArea.style.height = '100vh';
    captureArea.style.backgroundColor = 'rgba(0,0,0,0.8)';
    captureArea.style.display = 'flex';
    captureArea.style.flexDirection = 'column';
    captureArea.style.alignItems = 'center';
    captureArea.style.justifyContent = 'center';
    captureArea.style.zIndex = '1000';

    const captureBtn = document.createElement('button');
    captureBtn.textContent = 'Capture Photo';
    captureBtn.style.marginTop = '10px';
    captureBtn.style.padding = '10px 20px';
    captureBtn.style.fontSize = '16px';

    captureArea.appendChild(video);
    captureArea.appendChild(captureBtn);
    document.body.appendChild(captureArea);

    captureBtn.onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        // Stop video stream before proceeding
        stream.getTracks().forEach(track => track.stop());
        // Remove capture UI
        document.body.removeChild(captureArea);

        // Create a File like object from blob
        const fileFromCamera = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' });

        // Use the selected file for preview and scanning
        fileInput.files = createFileList(fileFromCamera);
        fileInput.dispatchEvent(new Event('change'));
      }, 'image/jpeg', 0.95);
    };

  } catch (err) {
    alert('Error accessing camera: ' + err.message);
  }
});

// Helper to create FileList from a single File object (since input.files is read-only)
function createFileList(file) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  return dataTransfer.files;
}
