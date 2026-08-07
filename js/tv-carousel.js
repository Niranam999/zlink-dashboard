/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - TV CAROUSEL CONTROLLER (tv-carousel.html)
   Dynamic Carousel Duration based on File 5 / Daily Report In-Progress Jobs
   ========================================================================== */

const CONFIG = {
  PER_JOB_DURATION: 15,          // 15 seconds per In-Progress job
  MIN_DAILY_REPORT_DURATION: 30, // Minimum 30 seconds for Daily Report fallback
  ZLINK_DURATION: 30,            // 30 seconds fixed for Z-Link Dashboard
  DAILY_REPORT_URL: 'https://niranam999.github.io/aveam-daily-assembly-dashboard/dashboard.html',
  DATA_JSON_URL: 'https://niranam999.github.io/aveam-daily-assembly-dashboard/projects_data.json'
};

let currentFrameIndex = 0; // 0 = Daily Report, 1 = Z-Link Dashboard
let secondsRemaining = CONFIG.MIN_DAILY_REPORT_DURATION;
let currentTotalDuration = CONFIG.MIN_DAILY_REPORT_DURATION;
let inProgressJobCount = 0;
let timerInterval = null;

// Listen for postMessage from the Daily Report iframe if sent
window.addEventListener('message', (event) => {
  if (event.data && typeof event.data.inProgressCount === 'number') {
    inProgressJobCount = event.data.inProgressCount;
    if (currentFrameIndex === 0) {
      recalculateDailyReportDuration();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
});

async function fetchInProgressCount() {
  try {
    const res = await fetch(CONFIG.DATA_JSON_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('Network response not ok');
    const projects = await res.json();
    if (Array.isArray(projects)) {
      const activeJobs = projects.filter(p => 
        (p.kanban_in_progress || 0) > 0 || 
        p.kanban_stage === 'in_progress' ||
        p.status === 'in_progress' ||
        (p.progress > 0 && p.progress < 100)
      );
      return Math.max(1, activeJobs.length);
    }
  } catch (err) {
    console.warn('Could not fetch projects_data.json, using default count fallback:', err);
  }
  return inProgressJobCount > 0 ? inProgressJobCount : 4; // default fallback if offline
}

async function recalculateDailyReportDuration() {
  const count = await fetchInProgressCount();
  inProgressJobCount = count;
  currentTotalDuration = Math.max(CONFIG.MIN_DAILY_REPORT_DURATION, count * CONFIG.PER_JOB_DURATION);
  secondsRemaining = currentTotalDuration;
}

async function initCarousel() {
  const frameDaily = document.getElementById('frameDailyReport');
  const frameZLink = document.getElementById('frameZLink');

  if (frameDaily) {
    frameDaily.removeAttribute('srcdoc');
    if (!frameDaily.getAttribute('src')) {
      frameDaily.src = CONFIG.DAILY_REPORT_URL;
    }
  }

  if (frameZLink) {
    if (!frameZLink.getAttribute('src')) {
      frameZLink.src = 'index.html';
    }
  }

  // Calculate initial dynamic duration
  await switchFrame(0);

  // Start rotation countdown ticker
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  secondsRemaining--;

  const progressPercent = Math.min(100, Math.max(0, ((currentTotalDuration - secondsRemaining) / currentTotalDuration) * 100));

  // Update top progress bar
  const progressBar = document.getElementById('carouselProgress');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  // Update badge label
  const badgeLabel = document.getElementById('carouselBadgeLabel');
  if (badgeLabel) {
    if (currentFrameIndex === 0) {
      badgeLabel.textContent = `📺 TV Display: Daily Report (${inProgressJobCount} งาน In-Progress - สลับใน ${secondsRemaining}s)`;
    } else {
      badgeLabel.textContent = `📺 TV Display: Z-Link Dashboard (สลับใน ${secondsRemaining}s)`;
    }
  }

  // When timer reaches 0, switch frame
  if (secondsRemaining <= 0) {
    const nextFrameIndex = (currentFrameIndex === 0) ? 1 : 0;
    switchFrame(nextFrameIndex);
  }
}

async function switchFrame(index) {
  currentFrameIndex = index;

  const frameDaily = document.getElementById('frameDailyReport');
  const frameZLink = document.getElementById('frameZLink');

  if (index === 0) {
    await recalculateDailyReportDuration();
    if (frameDaily) {
      frameDaily.removeAttribute('srcdoc');
      frameDaily.classList.add('active');
      frameDaily.style.display = 'block';
    }
    if (frameZLink) {
      frameZLink.classList.remove('active');
      frameZLink.style.display = 'none';
    }
  } else {
    currentTotalDuration = CONFIG.ZLINK_DURATION;
    secondsRemaining = CONFIG.ZLINK_DURATION;

    if (frameZLink) {
      frameZLink.classList.add('active');
      frameZLink.style.display = 'block';
    }
    if (frameDaily) {
      frameDaily.classList.remove('active');
      frameDaily.style.display = 'none';
    }
  }
}
