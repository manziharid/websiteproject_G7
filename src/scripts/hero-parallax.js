(function () {
  const STAGE_SCROLL_DISTANCE = 250;

  function init(spacer, sticky, shapeEls) {
    let entries = [];
    let spacerDocTop = 0;
    let totalDistance = 0;
    let ticking = false;

    function measure() {
      shapeEls.forEach((el) => {
        el.style.transform = "";
      });
      spacer.style.height = "";

      const stickyRect = sticky.getBoundingClientRect();
      const naturalHeight = stickyRect.height;

      entries = shapeEls.map((el) => {
        const rect = el.getBoundingClientRect();
        return { el, distanceToTop: rect.top - stickyRect.top };
      });
      entries.sort((a, b) => a.distanceToTop - b.distanceToTop);

      totalDistance = entries.length * STAGE_SCROLL_DISTANCE;

      spacer.style.height = naturalHeight + totalDistance + "px";

      spacerDocTop = spacer.getBoundingClientRect().top + window.scrollY;

      update();
    }

    function update() {
      const localScroll = Math.max(0, window.scrollY - spacerDocTop);

      entries.forEach(({ el, distanceToTop }, i) => {
        const stageStart = i * STAGE_SCROLL_DISTANCE;
        const stageEnd = stageStart + STAGE_SCROLL_DISTANCE;

        let progress;
        if (localScroll <= stageStart) {
          progress = 0;
        } else if (localScroll >= stageEnd) {
          progress = 1;
        } else {
          progress = (localScroll - stageStart) / STAGE_SCROLL_DISTANCE;
        }

        el.style.transform = `translateY(${-distanceToTop * progress}px)`;
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
  }

  function tryInit() {
    const spacer = document.getElementById("hero-sequence-spacer");
    const sticky = document.getElementById("hero-shapes-sticky");
    const shapeEls = Array.from(document.querySelectorAll("[data-stack-shape]"));
    if (spacer && sticky && shapeEls.length) {
      init(spacer, sticky, shapeEls);
      return true;
    }
    return false;
  }

  if (!tryInit()) {
    const observer = new MutationObserver(() => {
      if (tryInit()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
