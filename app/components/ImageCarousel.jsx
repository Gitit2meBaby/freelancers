// components/ImageCarousel.jsx
//
// FIX (2026-04-09): Resolved `received null` errors from Next.js image optimiser.
//
// Root cause: extendedImages triples the source array, so the same image object
// reference appears at indices 0, 5, and 10 (etc.) with different React keys.
// The Next.js optimiser processes each <Image> independently by key. When it
// encounters the same src object a second and third time under a different key,
// its deduplication path can return null — producing the `received null` errors
// logged 49–231 times per image per instance restart.
//
// Fix: only the first set of 5 images (indices 0–4) go through the optimiser.
// The two duplicate sets use unoptimized={true} — the optimised URLs from the
// first set are already cached by the browser, so the duplicates are served
// from browser cache at zero extra optimiser cost.
//
// The `sizes="388px"` prop on optimised images prevents Next.js generating
// multiple responsive size variants for a fixed-width slide — cuts optimiser
// work per image from ~4 variants to 1.
//
// The `priority` prop on the first visible slide in each row ensures the
// above-the-fold image is not lazy-loaded, eliminating LCP delay.
//
// The tripling of the array (30 total slides) is intentional and correct —
// the CSS animation scrolls by exactly one set width (2000px), requiring
// 3 copies so a full set is always visible during the transition.

import Image from "next/image";
import styles from "../styles/imageCarousel.module.scss";

const ImageCarousel = ({ images, direction = "left" }) => {
  const extendedImages = [...images, ...images, ...images];
  const setSize = images.length; // 5 — the number of originals

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carouselContainer}>
        <div
          className={styles.carouselTrack}
          data-direction={direction}
          aria-label="Image carousel"
        >
          {extendedImages.map((image, index) => {
            // Only the first set goes through the optimiser.
            // Duplicate sets (index >= setSize) use unoptimized — the browser
            // already has the optimised version cached from the first set.
            const isOriginalSet = index < setSize;
            // First image in the first set is above the fold — prioritise it.
            const isPriority = index === 0;

            return (
              <div key={`slide-${index}`} className={styles.slide}>
                <Image
                  src={image}
                  alt={`Slide ${(index % setSize) + 1}`}
                  width={388}
                  height={218}
                  className={styles.carouselImage}
                  sizes={isOriginalSet ? "388px" : undefined}
                  unoptimized={!isOriginalSet}
                  priority={isPriority}
                  loading={isPriority ? undefined : "lazy"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;
