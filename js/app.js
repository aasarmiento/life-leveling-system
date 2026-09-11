// Background music – starts on first user interaction
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
let musicPlaying = false;
let hasInteracted = false;

if (bgMusic && musicToggle) {
  // Start music on the FIRST click/tap anywhere on the page
  const startMusicOnFirstInteraction = async () => {
    if (hasInteracted) return;
    hasInteracted = true;

    try {
      bgMusic.muted = false;
      await bgMusic.play();
      musicPlaying = true;
      musicToggle.textContent = '🔊';
    } catch (err) {
      console.warn('Could not start music:', err.message);
    }

    // Remove the listeners after the first interaction
    document.removeEventListener('click', startMusicOnFirstInteraction);
    document.removeEventListener('touchstart', startMusicOnFirstInteraction);
  };

  document.addEventListener('click', startMusicOnFirstInteraction);
  document.addEventListener('touchstart', startMusicOnFirstInteraction);

  // Manual toggle button
  musicToggle.addEventListener('click', async (e) => {
    e.stopPropagation(); // prevent double-triggering the first-interaction logic

    try {
      if (musicPlaying) {
        bgMusic.pause();
        musicToggle.textContent = '🔇';
        musicPlaying = false;
      } else {
        bgMusic.muted = false;
        await bgMusic.play();
        musicToggle.textContent = '🔊';
        musicPlaying = true;
      }
    } catch (err) {
      console.warn('Music toggle error:', err.message);
    }
  });
}