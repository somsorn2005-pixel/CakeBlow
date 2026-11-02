document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  const candleCountDisplay = document.getElementById("candleCount");
  const microphoneStatus = document.getElementById("microphoneStatus");
  let candles = [];
  let audioContext;
  let analyser;
  let microphone;
  let blowFrames = 0;
  const requiredBlowFrames = 3;

  function setMicrophoneStatus(message, isError = false) {
    if (!microphoneStatus) return;
    microphoneStatus.textContent = message;
    microphoneStatus.classList.toggle("error", isError);
  }

  function updateCandleCount() {
    const activeCandles = candles.filter(
      (candle) => !candle.classList.contains("out")
    ).length;
    candleCountDisplay.textContent = activeCandles;
  }

  function addCandle(left, top) {
    const candle = document.createElement("div");
    candle.className = "candle";
    left = Math.max(12, Math.min(238, left));
    top = Math.max(0, Math.min(150, top));
    candle.style.left = left + "px";
    candle.style.top = top + "px";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    candle.addEventListener("click", function (event) {
      event.stopPropagation();
      candle.classList.toggle("out");
      updateCandleCount();
    });

    cake.appendChild(candle);
    candles.push(candle);
    updateCandleCount();
  }

  cake.addEventListener("click", function (event) {
    const rect = cake.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;
    addCandle(left, top);
  });

  function isBlowing() {
    if (!analyser) return false;

    const dataArray = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (const value of dataArray) {
      const normalized = (value - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / dataArray.length);
    return rms > 0.08;
  }

  function blowOutCandles() {
    if (!isBlowing()) {
      blowFrames = 0;
      return;
    }

    blowFrames++;
    if (blowFrames < requiredBlowFrames) return;

    let blownOut = 0;
    candles.forEach((candle) => {
      if (!candle.classList.contains("out") && Math.random() > 0.45) {
        candle.classList.add("out");
        blownOut++;
      }
    });

    blowFrames = 0;
    if (blownOut > 0) updateCandleCount();
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    setMicrophoneStatus("Allow microphone access to blow out candles");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async function (stream) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error("Web Audio is not supported");

        audioContext = new AudioContext();
        await audioContext.resume();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.2;
        setMicrophoneStatus("Microphone ready — blow toward the cake");
        setInterval(blowOutCandles, 200);
      })
      .catch(function (err) {
        console.log("Unable to access microphone:", err);
        setMicrophoneStatus("Microphone unavailable: " + err.message, true);
      });
  } else {
    setMicrophoneStatus("Microphone access is unavailable. Use HTTPS or localhost.", true);
  }
});
