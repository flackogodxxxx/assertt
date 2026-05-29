import { useEffect } from "react";

export function usePageMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    let progressFrame = 0;

    const updateScrollProgress = () => {
      const scrollableHeight = Math.max(root.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1);

      root.style.setProperty("--scroll-progress", progress.toFixed(4));
    };

    const scheduleScrollProgress = () => {
      if (progressFrame) {
        return;
      }

      progressFrame = window.requestAnimationFrame(() => {
        progressFrame = 0;
        updateScrollProgress();
      });
    };

    updateScrollProgress();
    window.addEventListener("scroll", scheduleScrollProgress, { passive: true });
    window.addEventListener("resize", scheduleScrollProgress);

    if (prefersReducedMotion) {
      root.classList.add("motion-ready");
      revealTargets.forEach((target) => target.classList.add("is-revealed"));

      return () => {
        if (progressFrame) {
          window.cancelAnimationFrame(progressFrame);
        }

        window.removeEventListener("scroll", scheduleScrollProgress);
        window.removeEventListener("resize", scheduleScrollProgress);
      };
    }

    if (!("IntersectionObserver" in window)) {
      root.classList.add("motion-ready");
      revealTargets.forEach((target) => target.classList.add("is-revealed"));

      return () => {
        if (progressFrame) {
          window.cancelAnimationFrame(progressFrame);
        }

        window.removeEventListener("scroll", scheduleScrollProgress);
        window.removeEventListener("resize", scheduleScrollProgress);
      };
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -14% 0px",
        threshold: 0.16
      }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));
    root.classList.add("motion-ready");

    return () => {
      if (progressFrame) {
        window.cancelAnimationFrame(progressFrame);
      }

      revealObserver.disconnect();
      window.removeEventListener("scroll", scheduleScrollProgress);
      window.removeEventListener("resize", scheduleScrollProgress);
    };
  }, []);
}
