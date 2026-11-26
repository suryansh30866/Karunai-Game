
document.addEventListener("DOMContentLoaded", () => {

    const introVideo = document.getElementById("intro-video");
    const locationScene = document.querySelector(".location-scene");
    const introContainer = document.querySelector(".intro-container");

    const oceanScene = document.getElementById("ocean-scene");
    const girlScene = document.getElementById("girl-scene");

    const skipButton = document.getElementById("skip-video");
    const oceanAudio = document.getElementById("ocean-audio");
    const oceanLocation = document.getElementById("ocean-location");

    if (
        !introVideo ||
        !locationScene ||
        !introContainer ||
        !oceanScene ||
        !girlScene ||
        !skipButton ||
        !oceanAudio ||
        !oceanLocation
    ) {
        console.error("Some HTML elements are missing.");
        return;
    }

    let transitionStarted = false;
    let locationIndex = 0;

    const message = "SOMEWHERE IN THE PACIFIC OCEAN";
    const audioVolume = 0.6;

    oceanAudio.pause();
    oceanAudio.currentTime = 0;
    oceanAudio.volume = 0;


    const skipTimer = setTimeout(() => {

        if (!transitionStarted) {
            skipButton.classList.add("show");
        }

    }, 18000);
    function transitionToOcean() {

        if (transitionStarted) return;

        transitionStarted = true;

        clearTimeout(skipTimer);

        skipButton.classList.remove("show");

        introVideo.pause();

        introContainer.classList.add("fade-out");
        locationScene.classList.add("fade-out");

        setTimeout(() => {

            introContainer.style.display = "none";
            locationScene.style.display = "none";

            oceanScene.style.display = "block";

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {

                    oceanScene.classList.add("visible");

                    startOceanSequence();

                });
            });

        }, 3000);
    }


    function startOceanSequence() {

        oceanAudio.currentTime = 0;
        oceanAudio.volume = audioVolume;

        oceanAudio.play().catch(error => {
            console.warn("Ocean audio playback blocked:", error);
        });

        setTimeout(typeOceanLocation, 1500);

        // Ocean scene duration: 10 seconds
        setTimeout(transitionToGirl, 10000);
    }


    function typeOceanLocation() {

        if (locationIndex < message.length) {

            oceanLocation.textContent += message[locationIndex];

            locationIndex++;

            setTimeout(typeOceanLocation, 100);

        }
    }


    function transitionToGirl() {

        oceanScene.classList.add("fade-to-black");

        setTimeout(() => {

            oceanScene.style.display = "none";

            girlScene.hidden = false;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {

                    girlScene.classList.add("visible");

                    // Audio continues without restarting
                    // Girl scene duration: 10 seconds
                    setTimeout(endFinalSequence, 10000);

                });
            });

        }, 3000);
    }


    function endFinalSequence() {

    const fadeDuration = 3000;
    const steps = 30;
    let step = 0;

    const fadeTimer = setInterval(() => {

        step++;

        oceanAudio.volume = Math.max(
            0,
            audioVolume * (1 - step / steps)
        );

        if (step >= steps) {

            clearInterval(fadeTimer);

            oceanAudio.pause();
            oceanAudio.currentTime = 0;
            oceanAudio.volume = audioVolume;

        }

    }, fadeDuration / steps);

    girlScene.classList.add("fade-to-black");

    setTimeout(() => {
        window.location.href = "terrain.html";
    }, fadeDuration);
}


    skipButton.addEventListener("click", transitionToOcean);

    introVideo.addEventListener("ended", transitionToOcean);

});
