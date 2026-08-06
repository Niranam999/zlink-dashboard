/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - TV CAROUSEL CONTROLLER (tv-carousel.html)
   ========================================================================== */

// Default Configuration: Daily Report view duration (180s), Z-Link view duration (60s)
const CONFIG = {
  DAILY_REPORT_DURATION: 180, // seconds
  ZLINK_DURATION: 60,         // seconds
  DAILY_REPORT_URL: 'https://niranam999.github.io/aveam-daily-assembly-dashboard/dashboard.html'
};

let currentFrameIndex = 0; // 0 = Daily Report, 1 = Z-Link Dashboard
let secondsRemaining = CONFIG.DAILY_REPORT_DURATION;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
});

function initCarousel() {
  const frameDaily = document.getElementById('frameDailyReport');
  const frameZLink = document.getElementById('frameZLink');

  // Load Daily Report & Z-Link Dashboard into iframes
  if (frameDaily && (!frameDaily.src || frameDaily.src === 'about:blank')) {
    frameDaily.src = CONFIG.DAILY_REPORT_URL;
  }
  if (frameZLink && (!frameZLink.src || frameZLink.src === 'about:blank')) {
    frameZLink.src = 'index.html';
  }

  // Start with Frame 0 (Daily Report)
  switchFrame(0);

  // Start rotation countdown ticker
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  secondsRemaining--;

  const totalDuration = (currentFrameIndex === 0) ? CONFIG.DAILY_REPORT_DURATION : CONFIG.ZLINK_DURATION;
  const progressPercent = ((totalDuration - secondsRemaining) / totalDuration) * 100;

  // Update top progress bar
  const progressBar = document.getElementById('carouselProgress');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  // Update badge label
  const badgeLabel = document.getElementById('carouselBadgeLabel');
  if (badgeLabel) {
    const currentName = (currentFrameIndex === 0) ? 'Assembly Progress Daily Report' : 'Z-Link Kanban Dashboard';
    badgeLabel.textContent = `📺 TV Display: ${currentName} (สลับใน ${secondsRemaining}s)`;
  }

  // When timer reaches 0, switch frame
  if (secondsRemaining <= 0) {
    const nextFrameIndex = (currentFrameIndex === 0) ? 1 : 0;
    switchFrame(nextFrameIndex);
  }
}

function switchFrame(index) {
  currentFrameIndex = index;
  secondsRemaining = (currentFrameIndex === 0) ? CONFIG.DAILY_REPORT_DURATION : CONFIG.ZLINK_DURATION;

  const frameDaily = document.getElementById('frameDailyReport');
  const frameZLink = document.getElementById('frameZLink');

  if (index === 0) {
    if (frameDaily) {
      // Reload iframe content to ensure fresh realtime state & release TV memory
      frameDaily.src = CONFIG.DAILY_REPORT_URL;
      frameDaily.classList.add('active');
    }
    if (frameZLink) frameZLink.classList.remove('active');
  } else {
    if (frameZLink) {
      // Reload iframe content to ensure fresh realtime state & release TV memory
      frameZLink.src = 'index.html';
      frameZLink.classList.add('active');
    }
    if (frameDaily) frameDaily.classList.remove('active');
  }
}
