const video = document.getElementById('background-video');

document.addEventListener("click", function() {
    video.muted = false;
    video.onplay();
}, { once: true });

const startButton = document.getElementById('start-button');

startButton.addEventListener('click', async function ()  {
    
try{
    await document.documentElement.requestFullscreen();
} catch (error) {
    console.error('Fooooolll screen not loaded:', error);
}
window.location.href = "intro.html";
});