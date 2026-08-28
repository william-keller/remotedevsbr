"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

import { useI18n, pickLocaleField } from "@/lib/i18n";
import { HOME_BANNER_SLIDES, BANNER_AUTOPLAY_DELAY_MS } from "@/lib/home-banner-slides";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselDots,
  type CarouselApi,
} from "@/components/ui/carousel";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

function BannerSlide({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function HomeBannerCarousel() {
  const { locale, t } = useI18n();
  const prefersReducedMotion = usePrefersReducedMotion();
  const slides = HOME_BANNER_SLIDES.length > 0 ? HOME_BANNER_SLIDES : [];
  const [api, setApi] = React.useState<CarouselApi>();

  const autoplayPlugin = React.useRef(
    Autoplay({ delay: BANNER_AUTOPLAY_DELAY_MS, stopOnInteraction: true }),
  );

  const getSlideHtml = (slide: (typeof HOME_BANNER_SLIDES)[number]) =>
    pickLocaleField(slide, "html", locale);

  const dotLabel = (index: number) =>
    t("home.banner.goToSlide").replace("{n}", String(index + 1));

  if (slides.length === 0) {
    return null;
  }

  if (slides.length === 1) {
    return (
      <div className="home-banner">
        <BannerSlide html={getSlideHtml(slides[0])} />
      </div>
    );
  }

  const plugins = prefersReducedMotion ? [] : [autoplayPlugin.current];
  const controlClassName =
    "top-1/2 -translate-y-1/2 border-white/30 bg-black/20 text-white hover:bg-black/40 hover:text-white disabled:opacity-40";

  return (
    <div className="home-banner">
      <Carousel setApi={setApi} opts={{ loop: true }} plugins={plugins} className="relative">
        <CarouselContent className="-ml-0">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-0">
              <BannerSlide html={getSlideHtml(slide)} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          label={t("home.banner.prev")}
          className={`left-4 ${controlClassName}`}
          onClick={() => {
            api?.scrollPrev();
            autoplayPlugin.current.stop();
          }}
        />
        <CarouselNext
          label={t("home.banner.next")}
          className={`right-4 ${controlClassName}`}
          onClick={() => {
            api?.scrollNext();
            autoplayPlugin.current.stop();
          }}
        />
        <CarouselDots
          count={slides.length}
          getLabel={dotLabel}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        />
      </Carousel>
    </div>
  );
}
