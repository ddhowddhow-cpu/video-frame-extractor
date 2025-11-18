const videoInput = document.getElementById('video');
const goBtn = document.getElementById('go');
const zipBtn = document.getElementById('zip');
const status = document.getElementById('status');
const result = document.getElementById('result');

let frames = [];

 숨겨진 video, canvas 생성
const video = document.createElement('video');
video.style.display = 'none';
video.muted = true;
video.playsInline = true;

const canvas = document.createElement('canvas');
canvas.style.display = 'none';

document.body.appendChild(video);
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

 파일 선택 시 버튼 활성화
videoInput.addEventListener('change', () = {
  if (videoInput.files[0]) {
    goBtn.disabled = false;
    status.innerHTML =
      `strong${videoInput.files[0].name}strongn파란 버튼을 누르면 프레임을 추출합니다!`;
  }
});

 video 메타데이터 로드 보장
function loadVideoMetadata(file) {
  return new Promise((resolve, reject) = {
    const url = URL.createObjectURL(file);
    video.src = url;

    const onLoaded = () = {
      URL.revokeObjectURL(url);
      resolve();
    };

    const onError = (e) = {
      URL.revokeObjectURL(url);
      reject(new Error('영상 메타데이터를 불러오지 못했습니다.'));
    };

    video.addEventListener('loadedmetadata', onLoaded, { once true });
    video.addEventListener('error', onError, { once true });
  });
}

 특정 시간으로 시킹
function seekTo(time) {
  return new Promise((resolve, reject) = {
    const onSeeked = () = {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const onError = (e) = {
      video.removeEventListener('error', onError);
      reject(new Error('영상 시킹 중 오류가 발생했습니다.'));
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError, { once true });

    video.currentTime = Math.min(time, video.duration);
  });
}

 현재 프레임을 캔버스에 그려 blob으로 반환
function captureFrameAsBlob() {
  return new Promise((resolve, reject) = {
    try {
      if (!canvas.width  !canvas.height) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) = {
          if (!blob) {
            reject(new Error('프레임 캡처에 실패했습니다.'));
          } else {
            resolve(blob);
          }
        },
        'imagejpeg',
        0.9
      );
    } catch (e) {
      reject(e);
    }
  });
}

 프레임 추출 메인 로직
goBtn.addEventListener('click', async () = {
  const file = videoInput.files[0];
  if (!file) return;

  goBtn.disabled = true;
  zipBtn.disabled = true;
  result.innerHTML = '';
  frames = [];
  status.textContent = '영상 로딩 중...';

  try {
     메타데이터 로딩 (duration, width, height)
    await loadVideoMetadata(file);

    const duration = video.duration;
    const intervalSec = parseFloat(document.getElementById('interval').value);

    if (!isFinite(duration)  duration = 0) {
      throw new Error('영상 길이를 가져오지 못했습니다.');
    }

     캡처할 시간 목록 생성
    const captureTimes = [];
    for (let t = 0; t = duration; t += intervalSec) {
      captureTimes.push(t);
    }
     마지막 프레임이 끝 근처가 아니면 한 번 더 추가
    if (captureTimes[captureTimes.length - 1]  duration - intervalSec  2) {
      captureTimes.push(duration);
    }

    status.textContent = `프레임 추출 중... (총 ${captureTimes.length}장 예정)`;

     순차적으로 시킹 + 캡처
    for (let i = 0; i  captureTimes.length; i++) {
      const t = captureTimes[i];
      status.textContent = `프레임 추출 중... (${i + 1}${captureTimes.length})`;

      await seekTo(t);
      const blob = await captureFrameAsBlob();
      frames.push(blob);

      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.loading = 'lazy';
      img.alt = `frame_${i + 1}`;
      result.appendChild(img);
    }

    status.textContent = `완료! 총 ${frames.length}장의 프레임이 추출되었습니다 🎉`;
    zipBtn.disabled = frames.length === 0;
  } catch (e) {
    console.error(e);
    status.textContent = `에러 발생 ${e.message  e}`;
  }

  goBtn.disabled = false;
});

 ZIP 다운로드
zipBtn.addEventListener('click', async () = {
  if (!frames.length) return;

  zipBtn.disabled = true;
  status.textContent = 'ZIP 파일 생성 중...';

  try {
    const zip = new JSZip();
    frames.forEach((blob, i) = {
      zip.file(`frame_${String(i + 1).padStart(4, '0')}.jpg`, blob);
    });

    const content = await zip.generateAsync({ type 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'frames.zip';
    a.click();

    status.textContent = 'ZIP 다운로드 완료!';
  } catch (e) {
    console.error(e);
    status.textContent = `ZIP 생성 중 에러 발생 ${e.message  e}`;
  }

  zipBtn.disabled = false;
});
