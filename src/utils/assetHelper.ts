export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return await copyTextWithExecCommand(text);
  }

  return copyTextWithExecCommand(text);
}

async function copyTextWithExecCommand(text: string): Promise<boolean> {
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) textarea.parentNode.removeChild(textarea);
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function downloadBannerAsPng(dataUrl: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Blob conversion failed'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

/**
 * Creates an animated 9:16 vertical test video clip with audio track for instant testing
 * Fixed duration of 4.0 seconds with clean metadata.
 */
export async function createSampleVideoBlob(): Promise<{ blob: Blob; url: string; duration: number }> {
  return new Promise((resolve, reject) => {
    try {
      if (
        typeof MediaRecorder === 'undefined' ||
        typeof HTMLCanvasElement.prototype.captureStream !== 'function'
      ) {
        reject(new Error('Demo clip generation is not supported by this browser.'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not available in this browser.'));
        return;
      }

      // Setup audio tone
      let audioTrack: MediaStreamTrack | null = null;
      let osc: OscillatorNode | null = null;
      let audioCtx: AudioContext | null = null;

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const dest = audioCtx.createMediaStreamDestination();
          osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(330, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
          osc.connect(gainNode);
          gainNode.connect(dest);
          osc.start();
          audioTrack = dest.stream.getAudioTracks()[0] || null;
        }
      } catch (e) {
        console.warn('AudioContext not available for sample:', e);
      }

      const canvasStream = canvas.captureStream(30);
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      let mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recordedChunks: Blob[] = [];
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      const durationSecs = 4.0;
      const totalMs = durationSecs * 1000;

      recorder.onstop = () => {
        try {
          if (osc) osc.stop();
          if (audioCtx) audioCtx.close();
        } catch {
          // ignore
        }
        const videoBlob = new Blob(recordedChunks, { type: mimeType.includes('mp4') ? 'video/mp4' : 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        resolve({ blob: videoBlob, url: videoUrl, duration: durationSecs });
      };

      recorder.start(100);
      const startTime = performance.now();

      const drawFrame = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / totalMs, 1);

        // Gradient Background
        const grad = ctx.createLinearGradient(0, 0, 720, 1280);
        const hue = (elapsed / 15) % 360;
        grad.addColorStop(0, `hsl(${hue}, 65%, 16%)`);
        grad.addColorStop(0.5, `hsl(${(hue + 45) % 360}, 60%, 10%)`);
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 720, 1280);

        // Tech Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 720; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 1280);
          ctx.stroke();
        }
        for (let y = 0; y < 1280; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(720, y);
          ctx.stroke();
        }

        // Center card
        ctx.save();
        ctx.translate(360, 640);
        ctx.fillStyle = 'rgba(18, 18, 21, 0.9)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        roundedRectPath(ctx, -260, -180, 520, 360, 28);
        ctx.fill();
        ctx.stroke();

        // Badge
        ctx.fillStyle = '#10b981';
        roundedRectPath(ctx, -110, -145, 220, 32, 16);
        ctx.fill();
        ctx.fillStyle = '#04150f';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('9:16 TEST FOOTAGE', 0, -125);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px -apple-system, sans-serif';
        ctx.fillText('ClipGuard Studio', 0, -65);

        // Animated Equalizer Wave
        for (let i = 0; i < 14; i++) {
          const barH = 15 + Math.abs(Math.sin((elapsed / 150) + i * 0.4)) * 50;
          ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#06b6d4';
          ctx.fillRect(-140 + i * 20, 0 - barH / 2 + 10, 12, barH);
        }

        // Timer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 15px monospace';
        const curSec = (elapsed / 1000).toFixed(1);
        ctx.fillText(`00:0${Math.floor(elapsed / 1000)} / 00:04`, 0, 75);

        // Progress bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        roundedRectPath(ctx, -200, 110, 400, 8, 4);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        roundedRectPath(ctx, -200, 110, 400 * progress, 8, 4);
        ctx.fill();

        ctx.restore();

        if (elapsed < totalMs) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      }

      requestAnimationFrame(drawFrame);
    } catch (err) {
      reject(err);
    }
  });
}
