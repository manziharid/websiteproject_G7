(function () {
  const STAGE_SCROLL_DISTANCE = 250;
  const ALIGN_DISTANCE = 250;

  function init(spacer, sticky, shapeEls, headingEl) {
    let named = {};
    let stagedOrder = [];
    let triggerGreen = 0;
    let triggerBlue = 0;
    let triggerRed = 0;
    let firstGreenName = null;
    let finalAlign = {};
    let spacerDocTop = 0;
    let ticking = false;

    function pinnedTransform(shape, localScroll) {
      const { distanceToTop, stageStart, stageEnd } = shape;
      let progress;
      if (localScroll <= stageStart) progress = 0;
      else if (localScroll >= stageEnd) progress = 1;
      else progress = (localScroll - stageStart) / STAGE_SCROLL_DISTANCE;
      return -distanceToTop * progress;
    }

    function flowingTransform(shape, localScroll) {
      const { distanceToTop, stageStart, stageEnd } = shape;
      const unlockAt = Math.max(stageEnd, triggerGreen);

      if (localScroll <= stageStart) return 0;
      if (localScroll <= stageEnd) {
        const progress = (localScroll - stageStart) / STAGE_SCROLL_DISTANCE;
        return -distanceToTop * progress;
      }
      if (localScroll <= unlockAt) {
        return -distanceToTop;
      }
      return -distanceToTop - (localScroll - unlockAt);
    }

    function redTransform(localScroll) {
      if (localScroll <= triggerBlue) return 0;
      return -(localScroll - triggerBlue);
    }

    function preFinaleTransform(name, localScroll) {
      if (name === "red") return redTransform(localScroll);
      if (name === "pink" || name === "blue" || name === firstGreenName) {
        return pinnedTransform(named[name], localScroll);
      }
      return flowingTransform(named[name], localScroll);
    }


    function measure() {
      shapeEls.forEach((el) => {
        el.style.transform = "";
      });
      spacer.style.height = "";

      const stickyRect = sticky.getBoundingClientRect();
      const naturalHeight = stickyRect.height;

      named = {};
      shapeEls.forEach((el) => {
        const name = el.dataset.shape;
        if (!name) return;
        const rect = el.getBoundingClientRect();
        named[name] = {
          name,
          el,
          distanceToTop: rect.top - stickyRect.top,
          height: rect.height,
        };
      });

      stagedOrder = ["yellow", "pink", "blue", "green-center", "green-right"]
        .map((name) => named[name])
        .filter(Boolean)
        .sort((a, b) => a.distanceToTop - b.distanceToTop);

      stagedOrder.forEach((shape, i) => {
        shape.stageStart = i * STAGE_SCROLL_DISTANCE;
        shape.stageEnd = shape.stageStart + STAGE_SCROLL_DISTANCE;
      });

      const greens = ["green-center", "green-right"].map((n) => named[n]).filter(Boolean);
      greens.sort((a, b) => a.distanceToTop - b.distanceToTop);
      firstGreenName = greens.length ? greens[0].name : null;
      triggerGreen = greens.length ? greens[0].stageEnd : 0;

      triggerBlue = named.blue ? named.blue.stageEnd : 0;

      triggerRed = named.red ? triggerBlue + named.red.distanceToTop : triggerBlue;

      const names = Object.keys(named);
      const bottomAtTrigger = {};
      names.forEach((name) => {
        const shape = named[name];
        const t = preFinaleTransform(name, triggerRed);
        bottomAtTrigger[name] = shape.distanceToTop + shape.height + t;
      });
      const commonLineStart = Math.min(...names.map((n) => bottomAtTrigger[n]));

      finalAlign = {};
      names.forEach((name) => {
        const shape = named[name];
        finalAlign[name] = {
          bottomOffset: shape.distanceToTop + shape.height,
          alignOffset: bottomAtTrigger[name] - commonLineStart,
        };
      });
      finalAlign.commonLineStart = commonLineStart;

      const exitDistance = Math.max(ALIGN_DISTANCE, commonLineStart);
      const totalDistance = triggerRed + exitDistance;
      spacer.style.height = naturalHeight + totalDistance + "px";

      spacerDocTop = spacer.getBoundingClientRect().top + window.scrollY;

      update();
    }

    function finaleTransform(name, localScroll) {
      const shape = named[name];
      const align = finalAlign[name];
      const finalScroll = localScroll - triggerRed;
      const alignProgress = Math.min(1, Math.max(0, finalScroll / ALIGN_DISTANCE));

      const commonLine = finalAlign.commonLineStart - finalScroll;
      const bottomPos = commonLine + align.alignOffset * (1 - alignProgress);

      return bottomPos - align.bottomOffset;
    }

    function update() {
      const localScroll = Math.max(0, window.scrollY - spacerDocTop);

      Object.keys(named).forEach((name) => {
        const shape = named[name];
        const transform =
          localScroll >= triggerRed ? finaleTransform(name, localScroll) : preFinaleTransform(name, localScroll);
        shape.el.style.transform = `translateY(${transform}px)`;
      });

      if (headingEl) {
        const textTransform = localScroll <= triggerGreen ? 0 : -(localScroll - triggerGreen);
        headingEl.style.transform = `translateY(${textTransform}px)`;
      }

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
    const headingEl = document.getElementById("hero-heading-text");
    if (spacer && sticky && shapeEls.length) {
      init(spacer, sticky, shapeEls, headingEl);
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
