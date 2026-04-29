import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useRef, useState } from 'react';

const polaroids = [
  {
    id: '01',
    title: 'Secure by design',
    label: 'End-to-end encrypted',
    caption:
      'Messages are protected with E2EE so only you and the recipient can read them.',
    image: '/quant.jpg',
  },
  {
    id: '02',
    title: 'One-to-one flow',
    label: 'Direct messages',
    caption:
      'Stay focused on personal conversations without extra distractions.',
    image: '/lilith.avif',
  },
  {
    id: '03',
    title: 'Fast presence',
    label: 'Live status',
    caption:
      'See who is active, typing, and ready to continue the conversation.',
    image: '/nijika.jpg',
  },
  {
    id: '04',
    title: 'Media moments',
    label: 'Photos & files',
    caption:
      'Keep memorable files and images close to the conversation they belong to.',
    image: '/zeta.jpg',
  },
];

const wrapIndex = (value: number) =>
  (value + polaroids.length) % polaroids.length;
const SHUFFLE_COMPLETE_MS = 240;
const WHEEL_LOCK_MS = 760;

export const PolaroidShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isShuffling, setIsShuffling] = useState(false);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const wheelLockedUntil = useRef(0);
  const shuffleTimeout = useRef<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateXBase = useTransform(y, [-220, 220], [10, -10]);
  const rotateYBase = useTransform(x, [-220, 220], [-12, 12]);
  const rotateX = useSpring(rotateXBase, {
    stiffness: 180,
    damping: 18,
    mass: 0.45,
  });
  const rotateY = useSpring(rotateYBase, {
    stiffness: 180,
    damping: 18,
    mass: 0.45,
  });

  const rotateTo = (direction: number) => {
    if (isShuffling || direction === 0) {
      return;
    }

    const directionSign = direction > 0 ? 1 : -1;
    setDirection(directionSign);
    setExitingIndex(activeIndex);
    setActiveIndex((current) => wrapIndex(current + direction));
    x.set(0);
    y.set(0);
    setIsShuffling(true);

    if (shuffleTimeout.current !== null) {
      window.clearTimeout(shuffleTimeout.current);
    }

    shuffleTimeout.current = window.setTimeout(() => {
      setExitingIndex(null);
      setIsShuffling(false);
      shuffleTimeout.current = null;
    }, SHUFFLE_COMPLETE_MS);
  };

  const goTo = (index: number) => {
    if (index === activeIndex) {
      return;
    }

    const forwardDistance = wrapIndex(index - activeIndex);
    const backwardDistance = wrapIndex(activeIndex - index);
    rotateTo(
      forwardDistance <= backwardDistance ? forwardDistance : -backwardDistance,
    );
  };

  return (
    <article
      className="polaroid-showcase"
      aria-label="Convo preview card"
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const now = window.performance.now();

        if (
          isShuffling ||
          now < wheelLockedUntil.current ||
          (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8)
        ) {
          return;
        }

        wheelLockedUntil.current = now + WHEEL_LOCK_MS;
        rotateTo(event.deltaY + event.deltaX > 0 ? 1 : -1);
      }}
    >
      {polaroids.map((item, index) => {
        const position = wrapIndex(index - activeIndex);
        const isActive = position === 0;
        const isExiting = exitingIndex === index;
        const isVisible =
          isExiting || position < 3 || position === polaroids.length - 1;
        const stackPosition = position === polaroids.length - 1 ? -1 : position;
        const activeShuffle = isExiting && isShuffling;
        const nextShuffle = isActive && isShuffling;

        if (!isVisible) {
          return null;
        }

        return (
          <motion.div
            key={item.id}
            className="polaroid-card"
            drag={isActive && !isShuffling}
            dragConstraints={{ left: -120, right: 120, top: -54, bottom: 54 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -78 || info.velocity.x < -420) {
                rotateTo(1);
              } else if (info.offset.x > 78 || info.velocity.x > 420) {
                rotateTo(-1);
              }
            }}
            initial={false}
            animate={{
              x: activeShuffle
                ? direction * 150
                : nextShuffle
                  ? 0
                  : isActive
                    ? 0
                    : stackPosition * 46 + (stackPosition === -1 ? -34 : 0),
              y: activeShuffle
                ? 48
                : nextShuffle
                  ? 0
                  : isActive
                    ? 0
                    : Math.abs(stackPosition) * 24 +
                      (stackPosition === -1 ? 18 : 0),
              rotate: activeShuffle
                ? direction * 18
                : nextShuffle
                  ? 0
                  : isActive
                    ? 0
                    : stackPosition * 11 + (stackPosition === -1 ? -10 : 0),
              scale: activeShuffle
                ? 0.82
                : nextShuffle
                  ? 1
                  : isActive
                    ? 1
                    : 0.9 - Math.abs(stackPosition) * 0.04,
              opacity: activeShuffle
                ? 0.62
                : nextShuffle
                  ? 1
                  : isActive
                    ? 1
                    : 0.72,
              zIndex: activeShuffle
                ? 2
                : nextShuffle
                  ? 6
                  : isActive
                    ? 5
                    : 5 - Math.abs(stackPosition),
            }}
            transition={{
              default: {
                type: 'spring',
                stiffness: 380,
                damping: 32,
                mass: 0.56,
              },
              opacity: { duration: 0.2, ease: 'easeOut' },
              scale: {
                type: 'spring',
                stiffness: 360,
                damping: 30,
                mass: 0.52,
              },
            }}
            onAnimationComplete={() => {
              if (!activeShuffle) {
                return;
              }

              if (shuffleTimeout.current === null) {
                setExitingIndex(null);
                setIsShuffling(false);
              }
            }}
            style={
              isActive && !isShuffling ? { x, y, rotateX, rotateY } : undefined
            }
            whileHover={isActive ? { scale: 1.03 } : undefined}
            whileTap={
              isActive ? { cursor: 'grabbing', scale: 1.01 } : undefined
            }
          >
            <div className="polaroid-card__photo">
              <img src={item.image} alt={`${item.title} placeholder preview`} />
              <div className="polaroid-card__photo-overlay">
                <span>{item.label}</span>
                <strong>{item.title}</strong>
              </div>
            </div>

            <div className="polaroid-card__caption">
              <span>CONVO / {item.id}</span>
              <p>{item.caption}</p>
            </div>
          </motion.div>
        );
      })}

      <div className="polaroid-carousel-dots" aria-label="Choose preview">
        {polaroids.map((item, index) => (
          <button
            key={item.id}
            aria-label={`Show preview ${item.id}`}
            className={index === activeIndex ? 'is-active' : undefined}
            type="button"
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </article>
  );
};
