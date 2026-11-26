
const chapterTitle = document.getElementById("chapter-title");
const introTitle = document.getElementById("intro-title");

const locationScene = document.querySelector(".location-scene");
const locationText = document.getElementById("location-text");

const titleText = "THE ARRIVAL";
const locationMessage = "SOMEWHERE IN THE PACIFIC OCEAN";

let index = 0;
let locationIndex = 0;

introTitle.textContent = "";
locationText.textContent = "";

function typeTitle() {

    if (index < titleText.length) {

        introTitle.textContent += titleText[index];

        playKeySound();

        index++;

        setTimeout(typeTitle, 300);

    } else {

        setTimeout(showLocation, 2000);

    }

}

function showLocation() {

    locationScene.style.display = "flex";

    const introVideo = document.getElementById("intro-video");

    typeLocation();

    requestAnimationFrame(() => {
        introVideo.classList.add("visible");
    });

}

function typeLocation() {

    if (locationIndex < locationMessage.length) {

        locationText.textContent += locationMessage[locationIndex];

        playKeySound();

        locationIndex++;

        setTimeout(typeLocation, 100);

    }

}

setTimeout(typeTitle, 1500);


function playKeySound() {

    const audioContext = new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "triangle";

    oscillator.frequency.setValueAtTime(
        1200 + Math.random() * 500,
        audioContext.currentTime
    );

    gain.gain.setValueAtTime(
        0.12,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.035
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.035
    );

}
