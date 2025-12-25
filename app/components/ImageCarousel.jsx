import Image from "next/image";
import styles from "../styles/imageCarousel.module.scss";

const ImageCarousel = ({ images, direction = "left" }) => {
  const extendedImages = [...images, ...images, ...images];

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carouselContainer}>
        <div
          className={styles.carouselTrack}
          data-direction={direction}
          aria-label="Image carousel"
        >
          {extendedImages.map((image, index) => (
            <div key={`slide-${index}`} className={styles.slide}>
              <Image
                src={image}
                alt={`Slide ${index + 1}`}
                width={388}
                height={218}
                className={styles.carouselImage}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;
