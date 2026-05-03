function initAnimatedGrid() {
  const grid = document.querySelector("[data-animated-grid]");
  const cols = document.querySelectorAll("[data-animated-grid-col]");
  const toggles = document.querySelectorAll("[data-animated-grid-toggle]");

  if (!grid || !cols.length) return;

  const storageKey = "animatedGridState";
  let isOpen = localStorage.getItem(storageKey) === "open";

  gsap.set(grid, { display: "block" });

  if (isOpen) {
    gsap.set(cols, { yPercent: 0 });
  } else {
    gsap.set(cols, { yPercent: 100 });
  }

  function openGrid() {
    isOpen = true;
    localStorage.setItem(storageKey, "open");

    gsap.fromTo(cols, {
      yPercent: 100,
    }, {
      yPercent: 0,
      duration: 1,
      ease: "expo.inOut",
      stagger: { each: 0.03, from: "start" },
      overwrite: true
    });
  }

  function closeGrid() {
    isOpen = false;
    localStorage.setItem(storageKey, "closed");

    gsap.fromTo(cols, {
      yPercent: 0,
    }, {
      yPercent: -100,
      duration: 1,
      ease: "expo.inOut",
      stagger: { each: 0.03, from: "start" },
      overwrite: true
    });
  }

  function toggleGrid() {
    if (isOpen) closeGrid();
    else openGrid();
  }

  function isTypingContext(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  toggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleGrid();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (isTypingContext(e)) return;
    if (!(e.shiftKey && (e.key || "").toLowerCase() === "g")) return;
    e.preventDefault();
    toggleGrid();
  });
}

// Initialize Animated Grid Overlay (Columns)
document.addEventListener("DOMContentLoaded", () => {
  initAnimatedGrid();
});

function initButtonCharacterStagger() {
  const offsetIncrement = 0.01; // Transition offset increment in seconds
  const buttons = document.querySelectorAll('[data-button-animate-chars]');

  buttons.forEach(button => {
    const text = button.textContent; // Get the button's text content
    button.innerHTML = ''; // Clear the original content

    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = `${index * offsetIncrement}s`;

      // Handle spaces explicitly
      if (char === ' ') {
        span.style.whiteSpace = 'pre'; // Preserve space width
      }

      button.appendChild(span);
    });
  });
}

// Initialize Button Character Stagger Animation
document.addEventListener('DOMContentLoaded', () => {
  initButtonCharacterStagger();
});








// Testimonials
function initLineRevealTestimonials() {
  const wraps = document.querySelectorAll("[data-testimonial-wrap]");
  if (!wraps.length) return;

  const imageClipHidden = "circle(0% at 50% 50%)";
  const imageClipVisible = "circle(50% at 50% 50%)";

  wraps.forEach((wrap) => {
    const list = wrap.querySelector("[data-testimonial-list]");
    if (!list) return;

    const items = Array.from(list.querySelectorAll("[data-testimonial-item]"));
    if (!items.length) return;

    const btnPrev = wrap.querySelector("[data-prev]");
    const btnNext = wrap.querySelector("[data-next]");
    const elCurrent = wrap.querySelector("[data-current]");
    const elTotal = wrap.querySelector("[data-total]");

    // NEW: stack of images at the wrap level
    const stackImages = Array.from(
      wrap.querySelectorAll("[data-testimonial-stack-img]")
    );

    if (elTotal) elTotal.textContent = String(items.length);

    let activeIndex = items.findIndex((el) => el.classList.contains("is--active"));
    if (activeIndex < 0) activeIndex = 0;

    let isAnimating = false;
    let reduceMotion = false;

    const autoplayEnabled = wrap.getAttribute("data-autoplay") === "true";
    const autoplayDuration = parseInt(wrap.getAttribute("data-autoplay-duration"), 10) || 4000;

    let autoplayCall = null;
    let isInView = true;

    const slides = items.map((item) => ({
      item,
      image: item.querySelector("[data-testimonial-img]"),
      splitTargets: [
        item.querySelector("[data-testimonial-text]"),
        ...item.querySelectorAll("[data-testimonial-split]"),
      ].filter(Boolean),
      splitInstances: [],
      getLines() {
        return this.splitInstances.flatMap((instance) => instance.lines);
      },
    }));

    function setSlideState(slideIndex, isActive) {
      const { item } = slides[slideIndex];
      item.classList.toggle("is--active", isActive);
      item.setAttribute("aria-hidden", String(!isActive));
      gsap.set(item, {
        autoAlpha: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none",
      });
    }

    function updateCounter() {
      if (elCurrent) elCurrent.textContent = String(activeIndex + 1);
    }

    function startAutoplay() {
      if (!autoplayEnabled) return;
      if (autoplayCall) autoplayCall.kill();

      autoplayCall = gsap.delayedCall(autoplayDuration / 1000, () => {
        if (!isInView || isAnimating) {
          startAutoplay();
          return;
        }
        goTo((activeIndex + 1) % slides.length);
        startAutoplay();
      });
    }

    function pauseAutoplay() {
      if (autoplayCall) autoplayCall.pause();
    }

    function resumeAutoplay() {
      if (!autoplayEnabled) return;
      if (!autoplayCall) startAutoplay();
      else autoplayCall.resume();
    }

    function resetAutoplay() {
      if (!autoplayEnabled) return;
      startAutoplay();
    }

    // Set initial state
    slides.forEach((_, i) => setSlideState(i, i === activeIndex));
    updateCounter();

    // NEW: initial state for stacked images — only the active one visible
    stackImages.forEach((img, i) => {
      gsap.set(img, { autoAlpha: i === activeIndex ? 1 : 0 });
    });

    // Handle reduced motion preference
    gsap.matchMedia().add(
      { reduce: "(prefers-reduced-motion: reduce)" },
      (context) => {
        reduceMotion = context.conditions.reduce;
      }
    );

    // Create SplitText instances
    slides.forEach((slide, slideIndex) => {
      slide.splitInstances = slide.splitTargets.map((el) =>
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "text-line",
          autoSplit: true,
          onSplit(self) {
            if (reduceMotion) return;

            const isActive = slideIndex === activeIndex;
            gsap.set(self.lines, { yPercent: isActive ? 0 : 110 });

            if (slide.image) {
              gsap.set(slide.image, {
                clipPath: isActive ? imageClipVisible : imageClipHidden,
              });
            }
          },
        })
      );
    });

    function goTo(nextIndex) {
      if (isAnimating || nextIndex === activeIndex) return;
      isAnimating = true;

      const outgoingSlide = slides[activeIndex];
      const incomingSlide = slides[nextIndex];

      // NEW: stack image refs
      const outgoingStackImg = stackImages[activeIndex];
      const incomingStackImg = stackImages[nextIndex];

      const tl = gsap.timeline({
        onComplete: () => {
          setSlideState(activeIndex, false);
          setSlideState(nextIndex, true);
          activeIndex = nextIndex;
          updateCounter();
          isAnimating = false;
        },
      });

      if (reduceMotion) {
        tl.to(outgoingSlide.item, {
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2"
          }, 0)
          .fromTo(incomingSlide.item, {
            autoAlpha: 0
          }, {
            autoAlpha: 1,
            duration: 0.4,
            ease: "power2"
          }, 0);

        // NEW: snap stack images on reduced motion
        if (outgoingStackImg) tl.set(outgoingStackImg, { autoAlpha: 0 }, 0);
        if (incomingStackImg) tl.set(incomingStackImg, { autoAlpha: 1 }, 0);

        return;
      }

      const outgoingLines = outgoingSlide.getLines();
      const incomingLines = incomingSlide.getLines();

      gsap.set(incomingSlide.item, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(incomingLines, { yPercent: 110 });

      if (outgoingSlide.image) gsap.set(outgoingSlide.image, { clipPath: imageClipVisible });

      tl.to(outgoingLines, {
        yPercent: -110,
        duration: 0.6,
        ease: "power4.inOut",
        stagger: { amount: 0.25 },
      }, 0);

      if (outgoingSlide.image) {
        tl.to(outgoingSlide.image, {
          clipPath: imageClipHidden,
          duration: 0.6,
          ease: "power4.inOut",
        }, 0);
      }

      // NEW: crossfade the stacked images alongside the line animations
      if (outgoingStackImg) {
        tl.to(outgoingStackImg, {
          autoAlpha: 0,
          duration: 0.6,
          ease: "power2.inOut",
        }, 0);
      }
      if (incomingStackImg) {
        tl.to(incomingStackImg, {
          autoAlpha: 1,
          duration: 0.6,
          ease: "power2.inOut",
        }, 0);
      }

      tl.to(incomingLines, {
        yPercent: 0,
        duration: 0.7,
        ease: "power4.inOut",
        stagger: { amount: 0.4 },
      }, ">-=0.3");

      if (incomingSlide.image) {
        tl.fromTo(incomingSlide.image, {
          clipPath: imageClipHidden,
        }, {
          clipPath: imageClipVisible,
          duration: 0.75,
          ease: "power4.inOut",
        }, "<");
      }

      tl.set(outgoingSlide.item, { autoAlpha: 0 }, ">");
    }

    // Start autoplay on the wrap (only works if autoplay is set to 'true')
    startAutoplay();

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      });
    }

    function onKeyDown(e) {
      if (!isInView) return;

      const t = e.target;
      const isTypingTarget =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);

      if (isTypingTarget) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    ScrollTrigger.create({
      trigger: wrap,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => { isInView = true; resumeAutoplay(); },
      onEnterBack: () => { isInView = true; resumeAutoplay(); },
      onLeave: () => { isInView = false; pauseAutoplay(); },
      onLeaveBack: () => { isInView = false; pauseAutoplay(); },
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLineRevealTestimonials();
});











// Vimeo Lightbox
function initVimeoLightboxAdvanced() {
  // Single lightbox container
  const lightbox = document.querySelector('[data-vimeo-lightbox-init]');
  if (!lightbox) return;

  // Open & close buttons
  const openButtons  = document.querySelectorAll('[data-vimeo-lightbox-control="open"]');
  const closeButtons = document.querySelectorAll('[data-vimeo-lightbox-control="close"]');

  // Core elements inside lightbox
  let iframe            = lightbox.querySelector('iframe');               // ← now let
  const placeholder     = lightbox.querySelector('.vimeo-lightbox__placeholder');
  const calcEl          = lightbox.querySelector('.vimeo-lightbox__calc');
  const wrapEl          = lightbox.querySelector('.vimeo-lightbox__calc-wrap');
  const playerContainer = lightbox.querySelector('[data-vimeo-lightbox-player]');

  // State
  let player = null;
  let currentVideoID = null;
  let videoAspectRatio = null;
  let globalMuted = lightbox.getAttribute('data-vimeo-muted') === 'true';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const playedOnce = new Set();  // track first play on touch

  // Format time (seconds → "m:ss")
  function formatTime(s) {
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  // Clamp wrap height
  function clampWrapSize(ar) {
    const w = calcEl.offsetWidth;
    const h = calcEl.offsetHeight;
    wrapEl.style.maxWidth = Math.min(w, h / ar) + 'px';
  }

  // Adjust sizing in "cover" mode
  function adjustCoverSizing() {
    if (!videoAspectRatio) return;
    const cH = playerContainer.offsetHeight;
    const cW = playerContainer.offsetWidth;
    const r  = cH / cW;
    const wEl = lightbox.querySelector('.vimeo-lightbox__iframe');
    if (r > videoAspectRatio) {
      wEl.style.width  = (r / videoAspectRatio * 100) + '%';
      wEl.style.height = '100%';
    } else {
      wEl.style.height = (videoAspectRatio / r * 100) + '%';
      wEl.style.width  = '100%';
    }
  }

  // Close & pause lightbox
  function closeLightbox() {
    lightbox.setAttribute('data-vimeo-activated', 'false');
    if (player) {
      player.pause();
      lightbox.setAttribute('data-vimeo-playing', 'false');
    }
  }

  // Wire Escape key & close buttons
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });
  closeButtons.forEach(btn => btn.addEventListener('click', closeLightbox));

  // Setup Vimeo Player event handlers
  function setupPlayerEvents() {
    // Hide placeholder when playback starts
    player.on('play', () => {
      lightbox.setAttribute('data-vimeo-loaded', 'true');
      lightbox.setAttribute('data-vimeo-playing', 'true');
    });
    // Close on video end
    player.on('ended', closeLightbox);

    // Paused
    player.on('pause', () => {
      lightbox.setAttribute('data-vimeo-playing', 'false');
    });

    // Duration UI
    const durEl = lightbox.querySelector('[data-vimeo-duration]');
    player.getDuration().then(d => {
      if (durEl) durEl.textContent = formatTime(d);
      lightbox.querySelectorAll('[data-vimeo-control="timeline"],progress')
        .forEach(el => el.max = d);
    });

    // Timeline & progress updates
    const tl = lightbox.querySelector('[data-vimeo-control="timeline"]');
    const pr = lightbox.querySelector('progress');
    player.on('timeupdate', data => {
      if (tl) tl.value = data.seconds;
      if (pr) pr.value = data.seconds;
      if (durEl) durEl.textContent = formatTime(Math.trunc(data.seconds));
    });
    if (tl) {
      ['input','change'].forEach(evt =>
        tl.addEventListener(evt, e => {
          const v = e.target.value;
          player.setCurrentTime(v);
          if (pr) pr.value = v;
        })
      );
    }

    // Hover → hide controls after a timeout
    let hoverTimer;
    playerContainer.addEventListener('mousemove', () => {
      lightbox.setAttribute('data-vimeo-hover', 'true');
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        lightbox.setAttribute('data-vimeo-hover', 'false');
      }, 3000);
    });

    // Fullscreen toggle on player container
    const fsBtn = lightbox.querySelector('[data-vimeo-control="fullscreen"]');
    if (fsBtn) {
      const isFS = () => document.fullscreenElement || document.webkitFullscreenElement;
      if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        fsBtn.style.display = 'none';
      }
      fsBtn.addEventListener('click', () => {
        if (isFS()) {
          lightbox.setAttribute('data-vimeo-fullscreen', 'false');
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
          lightbox.setAttribute('data-vimeo-fullscreen', 'true');
          (playerContainer.requestFullscreen || playerContainer.webkitRequestFullscreen)
            .call(playerContainer);
        }
      });
      ['fullscreenchange','webkitfullscreenchange'].forEach(evt =>
        document.addEventListener(evt, () =>
          lightbox.setAttribute('data-vimeo-fullscreen', isFS() ? 'true' : 'false')
      ));
    }
  }

  // Run sizing logic
  async function runSizing() {
    const mode = lightbox.getAttribute('data-vimeo-update-size');
    const w    = await player.getVideoWidth();
    const h    = await player.getVideoHeight();
    const ar   = h / w;
    const bef  = lightbox.querySelector('.vimeo-lightbox__before');

    if (mode === 'true') {
      if (bef) bef.style.paddingTop = (ar * 100) + '%';
      clampWrapSize(ar);
    } else if (mode === 'cover') {
      videoAspectRatio = ar;
      if (bef) bef.style.paddingTop = '0%';
      adjustCoverSizing();
    } else {
      clampWrapSize(ar);
    }
  }

  // Re-run sizing on viewport resize
  window.addEventListener('resize', () => {
    if (player) runSizing();
  });

  // Open or switch video
  async function openLightbox(id, placeholderBtn) {
    // Enter loading state immediately
    lightbox.setAttribute('data-vimeo-activated', 'loading');
    lightbox.setAttribute('data-vimeo-loaded',    'false');

    // — FULL RESET if new video ID —
    if (player && id !== currentVideoID) {
      await player.pause();
      await player.unload();

      // Replace old iframe with a fresh one
      const oldIframe = iframe;
      const newIframe = document.createElement('iframe');
      newIframe.className = oldIframe.className;
      newIframe.setAttribute('allow', oldIframe.getAttribute('allow'));
      newIframe.setAttribute('frameborder', '0');
      newIframe.setAttribute('allowfullscreen', 'true');
      newIframe.setAttribute('allow', 'autoplay; encrypted-media');
      oldIframe.parentNode.replaceChild(newIframe, oldIframe);

      // Reset state
      iframe         = newIframe;
      player         = null;
      currentVideoID = null;
      lightbox.setAttribute('data-vimeo-playing', 'false');
    }

    // Update placeholder image attributes
    if (placeholderBtn) {
      ['src','srcset','sizes','alt','width'].forEach(attr => {
        const val = placeholderBtn.getAttribute(attr);
        if (val != null) placeholder.setAttribute(attr, val);
      });
    }

    // Build a brand-new player if needed
    if (!player) {
      iframe.src = `https://player.vimeo.com/video/${id}?api=1&background=1&autoplay=0&loop=0&muted=0`;
      player = new Vimeo.Player(iframe);
      setupPlayerEvents();
      currentVideoID = id;
      await runSizing();
    }

    // Now sizing is ready — show lightbox
    lightbox.setAttribute('data-vimeo-activated', 'true');

    // Autoplay logic
    if (!isTouch) {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        setTimeout(() => player.play(), 50);
      });
    } else if (playedOnce.has(currentVideoID)) {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        player.play();
      });
    }
  }

  // Internal controls
  lightbox.querySelector('[data-vimeo-control="play"]').addEventListener('click', () => {
    if (isTouch) {
      if (!playedOnce.has(currentVideoID)) {
        player.setVolume(0).then(() => {
          lightbox.setAttribute('data-vimeo-playing', 'true');
          player.play();
          if (!globalMuted) {
            setTimeout(() => {
              player.setVolume(1);
              lightbox.setAttribute('data-vimeo-muted', 'false');
            }, 100);
          }
          playedOnce.add(currentVideoID);
        });
      } else {
        player.setVolume(globalMuted ? 0 : 1).then(() => {
          lightbox.setAttribute('data-vimeo-playing', 'true');
          player.play();
        });
      }
    } else {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        setTimeout(() => player.play(), 50);
      });
    }
  });

  lightbox.querySelector('[data-vimeo-control="pause"]').addEventListener('click', () => {
    player.pause();
  });

  lightbox.querySelector('[data-vimeo-control="mute"]').addEventListener('click', () => {
    globalMuted = !globalMuted;
    player.setVolume(globalMuted ? 0 : 1).then(() =>
      lightbox.setAttribute('data-vimeo-muted', globalMuted ? 'true' : 'false')
    );
  });

  // Wire up open buttons
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const vid = btn.getAttribute('data-vimeo-lightbox-id');
      const img = btn.querySelector('[data-vimeo-lightbox-placeholder]');
      openLightbox(vid, img);
    });
  });
}

// Initialize Vimeo Lightbox (Advanced)
document.addEventListener('DOMContentLoaded', function() {
  initVimeoLightboxAdvanced();
});




// Large Title Marquee
function initMarqueeScrollDirection() {
  document.querySelectorAll('[data-marquee-scroll-direction-target]').forEach((marquee) => {
    // Query marquee elements
    const marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
    const marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
    if (!marqueeContent || !marqueeScroll) return;

    // Get data attributes
    const { marqueeSpeed: speed, marqueeDirection: direction, marqueeDuplicate: duplicate, marqueeScrollSpeed: scrollSpeed } = marquee.dataset;

    // Convert data attributes to usable types
    const marqueeSpeedAttr = parseFloat(speed);
    const marqueeDirectionAttr = direction === 'right' ? 1 : -1; // 1 for right, -1 for left
    const duplicateAmount = parseInt(duplicate || 0);
    const scrollSpeedAttr = parseFloat(scrollSpeed);
    const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    // Precompute styles for the scroll container
    marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
    marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

    // Duplicate marquee content
    if (duplicateAmount > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < duplicateAmount; i++) {
        fragment.appendChild(marqueeContent.cloneNode(true));
      }
      marqueeScroll.appendChild(fragment);
    }

    // GSAP animation for marquee content
    const marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
    const animation = gsap.to(marqueeItems, {
      xPercent: -100, // Move completely out of view
      repeat: -1,
      duration: marqueeSpeed,
      ease: 'linear'
    }).totalProgress(0.5);

    // Initialize marquee in the correct direction
    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(marqueeDirectionAttr); // Set correct direction
    animation.play(); // Start animation immediately

    // Set initial marquee status
    marquee.setAttribute('data-marquee-status', 'normal');


    // ScrollTrigger logic for direction inversion
    ScrollTrigger.create({
      trigger: marquee,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const isInverted = self.direction === 1; // Scrolling down
        const currentDirection = isInverted ? -marqueeDirectionAttr : marqueeDirectionAttr;

        // Update animation direction and marquee status
        animation.timeScale(currentDirection);
        marquee.setAttribute('data-marquee-status', isInverted ? 'normal' : 'inverted');
      }
    });


    // Extra speed effect on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: marquee,
        start: '0% 100%',
        end: '100% 0%',
        scrub: 0
      }
    });

    const scrollStart = marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr;
    const scrollEnd = -scrollStart;

    tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: 'none' });
  });
}

// Initialize Marquee with Scroll Direction
document.addEventListener('DOMContentLoaded', () => {
  initMarqueeScrollDirection();
});




// Case Studies Slider
gsap.registerPlugin(Observer, CustomEase);
CustomEase.create("slideshow-wipe", "0.6, 0.08, 0.02, 0.99");

function initSlideShow(el) {
  const ui = {
    el,
    slides: Array.from(el.querySelectorAll('[data-slideshow="slide"]')),
    inner: Array.from(el.querySelectorAll('[data-slideshow="parallax"]')),
    thumbs: Array.from(el.querySelectorAll('[data-slideshow="thumb"]')),
    prev: el.querySelector('[data-slideshow="prev"]'),
    next: el.querySelector('[data-slideshow="next"]')
  };

  let current = 0;
  const length = ui.slides.length;
  let animating = false;
  let observer = {
    enable() {},
    disable() {},
    kill() {}
  };
  let animationDuration = 0.9;

  ui.slides.forEach((slide, index) => {
    slide.setAttribute('data-index', index);
  });

  ui.thumbs.forEach((thumb, index) => {
    thumb.setAttribute('data-index', index);
  });

  ui.slides[current].classList.add('is--current');
  ui.thumbs[current].classList.add('is--current');

  function navigate(direction, targetIndex = null) {
    if (animating) return;
    animating = true;
    observer.disable();

    const previous = current;
    current =
      targetIndex !== null && targetIndex !== undefined
        ? targetIndex
        : direction === 1
        ? current < length - 1
          ? current + 1
          : 0
        : current > 0
        ? current - 1
        : length - 1;

    const currentSlide = ui.slides[previous];
    const currentInner = ui.inner[previous];
    const upcomingSlide = ui.slides[current];
    const upcomingInner = ui.inner[current];

    gsap.timeline({
      defaults: {
        duration: animationDuration,
        ease: 'slideshow-wipe'
      },
      onStart() {
        upcomingSlide.classList.add('is--current');
        ui.thumbs[previous].classList.remove('is--current');
        ui.thumbs[current].classList.add('is--current');
      },
      onComplete() {
        currentSlide.classList.remove('is--current');
        animating = false;
        setTimeout(() => observer.enable(), animationDuration * 1000);
      }
    })
      .to(currentSlide, { xPercent: -direction * 100 }, 0)
      .to(currentInner, { xPercent: direction * 50 }, 0)
      .fromTo(upcomingSlide, { xPercent: direction * 100 }, { xPercent: 0 }, 0)
      .fromTo(upcomingInner, { xPercent: -direction * 50 }, { xPercent: 0 }, 0);
  }

  function onClick(event) {
    const targetIndex = parseInt(event.currentTarget.getAttribute('data-index'), 10);
    if (targetIndex === current || animating) return;
    const direction = targetIndex > current ? 1 : -1;
    navigate(direction, targetIndex);
  }

  function onPrev() {
    if (animating) return;
    navigate(-1);
  }

  function onNext() {
    if (animating) return;
    navigate(1);
  }

  ui.thumbs.forEach(thumb => {
    thumb.addEventListener('click', onClick);
  });

  if (ui.prev) ui.prev.addEventListener('click', onPrev);
  if (ui.next) ui.next.addEventListener('click', onNext);

  return {
    destroy() {
      observer.kill();
      ui.thumbs.forEach(thumb => {
        thumb.removeEventListener('click', onClick);
      });
      if (ui.prev) ui.prev.removeEventListener('click', onPrev);
      if (ui.next) ui.next.removeEventListener('click', onNext);
    }
  };
}

function initParallaxImageGalleryThumbnails() {
  let wrappers = document.querySelectorAll('[data-slideshow="wrap"]');
  wrappers.forEach(wrap => initSlideShow(wrap));
}

document.addEventListener('DOMContentLoaded', () => {
  initParallaxImageGalleryThumbnails();
});






// Feature timed tabs
function initTabSystem() {
  const wrappers = document.querySelectorAll('[data-tabs="wrapper"]');

  wrappers.forEach((wrapper) => {
    const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
    const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');

    const autoplay = wrapper.dataset.tabsAutoplay === "true";
    const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration, 10) || 5000;

    let activeContent = null;
    let activeVisual = null;
    let isAnimating = false;
    let progressBarTween = null;
    let hasInitialized = false;

    function startProgressBar(index) {
      if (progressBarTween) progressBarTween.kill();

      const bar = contentItems[index].querySelector('[data-tabs="item-progress"]');
      if (!bar) return;

      gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });

      progressBarTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: "power1.inOut",
        onComplete: () => {
          if (!isAnimating) {
            const nextIndex = (index + 1) % contentItems.length;
            switchTab(nextIndex);
          }
        },
      });
    }

    function switchTab(index) {
      if (isAnimating || contentItems[index] === activeContent) return;

      isAnimating = true;
      if (progressBarTween) progressBarTween.kill();

      const outgoingContent = activeContent;
      const outgoingVisual = activeVisual;
      const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]');

      const incomingContent = contentItems[index];
      const incomingVisual = visualItems[index];
      const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]');

      const tl = gsap.timeline({
        defaults: { duration: 0.65, ease: "power3" },
        onComplete: () => {
          activeContent = incomingContent;
          activeVisual = incomingVisual;
          isAnimating = false;

          if (autoplay) startProgressBar(index);
        },
      });

      if (outgoingContent) {
        outgoingContent.classList.remove("active");
        outgoingVisual?.classList.remove("active");

        tl.set(outgoingBar, { transformOrigin: "right center" })
          .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
          .to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, 0);
      }

      incomingContent.classList.add("active");
      incomingVisual.classList.add("active");

      tl.fromTo(
        incomingVisual,
        { autoAlpha: 0, xPercent: 3 },
        { autoAlpha: 1, xPercent: 0 },
        0.3
      )
        .fromTo(
          incomingContent.querySelector('[data-tabs="item-details"]'),
          { height: 0 },
          { height: "auto" },
          0
        )
        .set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);
    }

    function initWhenVisible() {
      if (hasInitialized) return;
      hasInitialized = true;
      switchTab(0);
    }

    // Initialize only once when wrapper enters viewport
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            initWhenVisible();
            obs.unobserve(wrapper);
          }
        });
      },
      {
        threshold: 0.35, // adjust as needed
      }
    );

    observer.observe(wrapper);

    // Click handling still works
    contentItems.forEach((item, i) => {
      item.addEventListener("click", () => {
        if (!hasInitialized) {
          hasInitialized = true;
        }

        if (item === activeContent) return;
        switchTab(i);
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabSystem();
});






// Case Studies Modal
function initModalBasic() {

  const modalGroup = document.querySelector('[data-modal-group-status]');
  const modals = document.querySelectorAll('[data-modal-name]');
  const modalTargets = document.querySelectorAll('[data-modal-target]');

  // Open modal
  modalTargets.forEach((modalTarget) => {
    modalTarget.addEventListener('click', function () {
      const modalTargetName = this.getAttribute('data-modal-target');

      // Close all modals
      modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
      modals.forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));

      // Activate clicked modal
      document.querySelector(`[data-modal-target="${modalTargetName}"]`).setAttribute('data-modal-status', 'active');
      document.querySelector(`[data-modal-name="${modalTargetName}"]`).setAttribute('data-modal-status', 'active');

      // Set group to active
      if (modalGroup) {
        modalGroup.setAttribute('data-modal-group-status', 'active');
      }
    });
  });

  // Close modal
  document.querySelectorAll('[data-modal-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeAllModals);
  });

  // Close modal on `Escape` key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  // Function to close all modals
  function closeAllModals() {
    modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
    
    if (modalGroup) {
      modalGroup.setAttribute('data-modal-group-status', 'not-active');
    }
  }
}

// Initialize Basic Modal
document.addEventListener('DOMContentLoaded', () => {
  initModalBasic();
});




// Lenis
// Lenis (with GSAP Scroltrigger)
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {lenis.raf(time * 1000);});
gsap.ticker.lagSmoothing(0);

// Scroll-To Anchor Lenis
function initScrollToAnchorLenis() {
  document.querySelectorAll("[data-anchor-target]").forEach(element => {
    element.addEventListener("click", function () {
      const targetScrollToAnchorLenis = this.getAttribute("data-anchor-target");

      lenis.scrollTo(targetScrollToAnchorLenis, {
        easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
        duration: 1.2,
        offset: 1 // Option to create an offset when there is a fixed navigation for example
      });
    });
  });
}

// Initialize Scroll-To Anchor Lenis
document.addEventListener('DOMContentLoaded', () => {
  initScrollToAnchorLenis();
});



// Loading Animation
function initWelcomingWordsLoader() {  
  const loadingContainer = document.querySelector('[data-loading-container]');
  if (!loadingContainer) return; // Stop animation when no [data-loading-words] is found
  
  const loadingWords = loadingContainer.querySelector('[data-loading-words]');
  const wordsTarget = loadingWords.querySelector('[data-loading-words-target]');
  const words = loadingWords.getAttribute('data-loading-words').split(',').map(w => w.trim());
  
  const tl = gsap.timeline();
  
  tl.set(loadingWords, {
    yPercent: 50
  });
  
  tl.to(loadingWords, { 
    opacity: 1, 
    yPercent: 0, 
    duration: 1.5,
    ease: "Expo.easeInOut"
  });
  
  words.forEach(word => {
    tl.call(() => {
      wordsTarget.textContent = word;
    }, null, '+=0.15');
  });
  
  tl.to(loadingWords, { 
    opacity: 0, 
    yPercent: -75, 
    duration: 0.8,
    ease: "Expo.easeIn"
  });
  
  tl.to(loadingContainer, { 
    autoAlpha: 0, 
    duration: 0.6,
    ease: "Power1.easeInOut"
  }, "+ -0.2");
}

// Initialize Welcoming Words Loader
document.addEventListener('DOMContentLoaded', () => {
  initWelcomingWordsLoader();
});