import { useRef, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { IconButton } from "../IconButton/IconButton";

export interface CarouselProps {
  /** One item per slot, in display order. Each item supplies its own width. */
  children: ReactNode[];
  /** Accessible name for the scrollable region. */
  label: string;
  /** Optional class name applied to the outer wrapper. */
  className?: string;
}

/**
 * A horizontally scrolling row with scroll-snap and prev/next nav buttons. Items stay
 * in normal tab order (each is independently focusable, and the browser scrolls a
 * focused item into view automatically), so the nav buttons are a pointer convenience,
 * not the only way to reach an item. Use for a compact reference gallery, such as a
 * row of key-concept cards; it is not a full carousel widget with autoplay or slides.
 */
export function Carousel({ children, label, className }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  function scrollByAmount(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const step = Math.min(track.clientWidth * 0.8, 420);
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className={cx("mdn-carousel", className)}>
      <IconButton
        icon="chevron-right"
        label={`Scroll ${label} left`}
        variant="secondary"
        className="mdn-carousel__nav mdn-carousel__nav--prev"
        onClick={() => scrollByAmount(-1)}
        style={{ transform: "scaleX(-1)" }}
      />
      <div className="mdn-carousel__track" ref={trackRef} role="region" aria-label={label}>
        {children.map((child, index) => (
          <div className="mdn-carousel__slot" key={index}>
            {child}
          </div>
        ))}
      </div>
      <IconButton
        icon="chevron-right"
        label={`Scroll ${label} right`}
        variant="secondary"
        className="mdn-carousel__nav mdn-carousel__nav--next"
        onClick={() => scrollByAmount(1)}
      />
    </div>
  );
}
