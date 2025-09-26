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
    const lis = Array.from(ul.querySelectorAll('li[data-video]'));
    lis.forEach((li, i) => {
      const span = li.querySelector('.video-title');
      if (!span) return;
      // Use cached title if available, else placeholder 'Lecture N'
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
    const downloadBtn = document.getElementById('downloadBtn');
    const providerSelect = document.getElementById('providerSelect');
    if (!ul || !playerWrap || !player) return;

    let currentVideoId = null;

    function selectLecture(li){
      ul.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      const id = li.getAttribute('data-video');
      if (!id) return;
      currentVideoId = id;
      if (playerWrap.classList.contains('hidden')) playerWrap.classList.remove('hidden');
      ul.classList.add('compact');
      ul.classList.add('sm:grid-cols-3', 'lg:grid-cols-4');
      formatScrollTo(playerWrap);
      player.src = `https://www.youtube.com/embed/${id}`;
      if (downloadBtn && providerSelect) {
        downloadBtn.onclick = () => {
          if (!currentVideoId) return;
          const provider = providerSelect.value;
          const url = providerUrl(provider, currentVideoId);
          window.open(url, '_blank');
        };
      }
    }

    ul.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => selectLecture(li));
    });

    // Always ensure numbering is prefixed
    prefixNumbers(ul);
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
