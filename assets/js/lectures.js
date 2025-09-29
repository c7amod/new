(function(){
  function formatScrollTo(el){
    try {
      const header = document.querySelector('header');
      const offset = (header && header.offsetHeight) ? header.offsetHeight + 12 : 76;
      const rect = el.getBoundingClientRect();
      const y = rect.top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } catch (_) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function addThumbNumbers(ul){
    // Apply numeric overlays only to non-YouTube items
    const lis = Array.from(ul.querySelectorAll('li[data-drive], li[data-src]'));
    lis.forEach((li, i) => {
      const thumb = li.querySelector('.thumb');
      if (!thumb) return;
      // Ensure positioning for overlay
      if (getComputedStyle(thumb).position === 'static') {
        thumb.style.position = 'relative';
      }
      // Clean up prior overlays
      thumb.querySelectorAll('.num-badge, .num-center').forEach(el => el.remove());
      // Remove plain text nodes (e.g., 'Google Drive') but keep elements like .play-badge
      Array.from(thumb.childNodes).forEach(node => {
        if (node.nodeType === 3 && String(node.textContent).trim().length) node.remove();
      });
      // Big centered number overlay (place at bottom of stacking context)
      const overlay = document.createElement('div');
      overlay.className = 'num-center absolute inset-0 grid place-items-center select-none pointer-events-none z-0';
      const label = document.createElement('span');
      label.className = 'text-4xl sm:text-5xl font-extrabold text-slate-700/80';
      // Index should reflect overall order within UL (including YouTube). Compute from all items.
      const allLis = Array.from(ul.querySelectorAll('li[data-video], li[data-drive], li[data-src]'));
      const idx = allLis.indexOf(li);
      label.textContent = String((idx >= 0 ? idx : i) + 1);
      overlay.appendChild(label);
      // insert as first element so .play-badge stays above
      const firstEl = thumb.firstElementChild;
      if (firstEl) thumb.insertBefore(overlay, firstEl); else thumb.appendChild(overlay);
    });
  }

  function getCachedTitle(videoId){
    try {
      return localStorage.getItem(`yt_title_${videoId}`) || null;
    } catch(_) { return null; }
  }

  function setCachedTitle(videoId, title){
    try {
      if (title) localStorage.setItem(`yt_title_${videoId}`, title);
    } catch(_) {}
  }
  

  async function fetchYouTubeTitle(videoId) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.title ? data.title : null;
    } catch (_) {
      return null;
    }
  }

  async function autoUpdateTitles(ul){
    // Only YouTube items support auto title fetch
    const lis = Array.from(ul.querySelectorAll('li[data-video]'));
    for (let i = 0; i < lis.length; i++) {
      const li = lis[i];
      const vid = li.getAttribute('data-video');
      if (!vid) continue;
      const title = await fetchYouTubeTitle(vid);
      const span = li.querySelector('.video-title');
      if (span) {
        if (title) {
          span.textContent = `Lecture ${i + 1} - ${title}`;
          li.setAttribute('title', title);
          setCachedTitle(vid, title);
        } else {
          // fallback keeps placeholder only
          span.textContent = `Lecture ${i + 1}`;
          li.removeAttribute('title');
        }
      }
    }
  }

  function prefixNumbers(ul){
    // Number all lecture items regardless of source
    const lis = Array.from(ul.querySelectorAll('li[data-video], li[data-drive], li[data-src]'));
    lis.forEach((li, i) => {
      const span = li.querySelector('.video-title');
      if (!span) return;
      // Use cached title if available for YouTube, else placeholder 'Lecture N'
      const vid = li.getAttribute('data-video');
      const cached = vid ? getCachedTitle(vid) : null;
      if (cached) {
        span.textContent = `Lecture ${i + 1} - ${cached}`;
        li.setAttribute('title', cached);
      } else {
        span.textContent = `Lecture ${i + 1}`;
        li.removeAttribute('title');
      }
    });
  }

  function providerUrl(provider, videoId){
    switch (provider) {
      case 'savefrom':
        return `https://en.savefrom.net/1-youtube-video-downloader/?url=https://youtu.be/${videoId}`;
      case 'ssyoutube':
        return `https://ssyoutube.com/watch?v=${videoId}`;
      default:
        return `https://youtu.be/${videoId}`;
    }
  }

  function initLectures(options){
    const opts = Object.assign({ autoTitle: false }, options || {});
    const ul = document.getElementById('lectures');
    const playerWrap = document.getElementById('playerWrap');
    const player = document.getElementById('player');
    const playerCard = document.getElementById('playerCard');
    const playerFrameWrap = document.getElementById('playerFrameWrap');
    const downloadBtn = document.getElementById('downloadBtn');
    const providerSelect = document.getElementById('providerSelect');
    if (!ul || !playerWrap || !player) return;

    let currentVideoId = null;

    function setPlayerSize(size){
      if (!playerCard || !playerFrameWrap || !player) return; // page might not support resizing
      const large = String(size).toLowerCase() === 'large';
      // Card width
      playerCard.classList.toggle('max-w-5xl', large);
      playerCard.classList.toggle('max-w-md', !large);
      // Frame ratio
      if (large) {
        playerFrameWrap.classList.add('aspect-video');
        playerFrameWrap.classList.remove('relative');
        playerFrameWrap.classList.remove('pb-[25%]');
        player.classList.remove('absolute');
        player.classList.remove('inset-0');
      } else {
        playerFrameWrap.classList.remove('aspect-video');
        playerFrameWrap.classList.add('relative');
        playerFrameWrap.classList.add('pb-[25%]'); // 16:4
        player.classList.add('absolute');
        player.classList.add('inset-0');
      }
    }

    function selectLecture(li){
      ul.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      const ytId = li.getAttribute('data-video');
      const driveId = li.getAttribute('data-drive');
      const directSrc = li.getAttribute('data-src');
      const sizePref = li.getAttribute('data-size') || 'small';
      const isYouTube = !!ytId;
      const isDrive = !!driveId;
      const hasDirect = !!directSrc;
      if (!isYouTube && !isDrive && !hasDirect) return;
      currentVideoId = ytId || null;
      if (playerWrap.classList.contains('hidden')) playerWrap.classList.remove('hidden');
      ul.classList.add('compact');
      ul.classList.add('sm:grid-cols-3', 'lg:grid-cols-4');
      formatScrollTo(playerWrap);
      // Apply size preference
      setPlayerSize(sizePref);
      if (isYouTube) {
        player.src = `https://www.youtube.com/embed/${ytId}`;
        if (downloadBtn && providerSelect) {
          downloadBtn.disabled = false;
          downloadBtn.title = '';
          downloadBtn.onclick = () => {
            if (!currentVideoId) return;
            const provider = providerSelect.value;
            const url = providerUrl(provider, currentVideoId);
            window.open(url, '_blank');
          };
        }
      } else if (isDrive) {
        // Google Drive preview embed
        player.src = `https://drive.google.com/file/d/${driveId}/preview`;
        if (downloadBtn) {
          downloadBtn.disabled = true;
          downloadBtn.title = 'التنزيل متاح ليوتيوب فقط';
          downloadBtn.onclick = null;
        }
      } else if (hasDirect) {
        player.src = directSrc;
        if (downloadBtn) {
          downloadBtn.disabled = true;
          downloadBtn.title = 'التنزيل متاح ليوتيوب فقط';
          downloadBtn.onclick = null;
        }
      }
    }

    ul.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => selectLecture(li));
    });

    // Always ensure numbering is prefixed
    prefixNumbers(ul);
    // Add numeric badges on thumbnails
    addThumbNumbers(ul);
    if (opts.autoTitle) {
      autoUpdateTitles(ul);
    }

    // expose for debugging if needed
    window.__lectures = window.__lectures || {};
    window.__lectures.initCount = (window.__lectures.initCount || 0) + 1;
    window.__lectures.lastInit = { autoTitle: !!opts.autoTitle };
  }

  // export
  window.initLectures = initLectures;
})();
