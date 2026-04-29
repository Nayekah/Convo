import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useEffect } from 'react';

const PLANE_TRACK_WIDTH = 1420;

type PlaneItem = {
  id: string;
  label: string;
  baseX: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  z: number;
  rotateY: number;
  rotateX: number;
  scale: number;
  layer: number;
  speed: number;
  gradient: string;
};

const planes: PlaneItem[] = [
  {
    id: '00',
    label: 'Conversation threads',
    baseX: 0,
    y: 260,
    width: 310,
    height: 230,
    depth: 0.7,
    z: -190,
    rotateY: -34,
    rotateX: 6,
    scale: 0.86,
    layer: 1,
    speed: 0.72,
    gradient: 'linear-gradient(135deg, #161a33 0%, #6952b8 48%, #f3a6c8 100%)',
  },
  {
    id: '01',
    label: 'Private messages',
    baseX: 255,
    y: 126,
    width: 390,
    height: 260,
    depth: 1.15,
    z: 70,
    rotateY: -18,
    rotateX: 4,
    scale: 1,
    layer: 3,
    speed: 0.86,
    gradient: 'linear-gradient(135deg, #071e2d 0%, #2c8b9d 46%, #d7f1f0 100%)',
  },
  {
    id: '02',
    label: 'Encrypted chats',
    baseX: 590,
    y: 224,
    width: 330,
    height: 255,
    depth: 0.95,
    z: 170,
    rotateY: 8,
    rotateX: -2,
    scale: 1.08,
    layer: 5,
    speed: 1,
    gradient: 'linear-gradient(135deg, #1b0e2c 0%, #ff6d7f 52%, #ffd48a 100%)',
  },
  {
    id: '03',
    label: 'Personal threads',
    baseX: 860,
    y: 74,
    width: 270,
    height: 300,
    depth: 1.35,
    z: -40,
    rotateY: 22,
    rotateX: 5,
    scale: 0.94,
    layer: 4,
    speed: 1.12,
    gradient: 'linear-gradient(135deg, #0f1720 0%, #3b4766 48%, #a9b7ff 100%)',
  },
  {
    id: '04',
    label: 'Realtime presence',
    baseX: 1080,
    y: 188,
    width: 330,
    height: 230,
    depth: 0.82,
    z: -230,
    rotateY: 36,
    rotateX: -4,
    scale: 0.82,
    layer: 2,
    speed: 0.78,
    gradient: 'linear-gradient(135deg, #061716 0%, #26b99a 46%, #c5fff2 100%)',
  },
  {
    id: '05',
    label: 'Shared media',
    baseX: 1260,
    y: 34,
    width: 270,
    height: 250,
    depth: 1.05,
    z: -330,
    rotateY: 46,
    rotateX: 7,
    scale: 0.72,
    layer: 1,
    speed: 0.94,
    gradient: 'linear-gradient(135deg, #170b16 0%, #7c3d6f 44%, #efc3af 100%)',
  },
];

const wrap = (value: number, max: number) => ((value % max) + max) % max;

type PlaneProps = {
  item: PlaneItem;
  offset: ReturnType<typeof useMotionValue<number>>;
  velocity: ReturnType<typeof useVelocity>;
};

const Plane = ({ item, offset, velocity }: PlaneProps) => {
  const x = useTransform(
    offset,
    (latest) => wrap(item.baseX + latest * item.speed, PLANE_TRACK_WIDTH) - 300,
  );
  const zBase = useTransform(
    velocity,
    [-2600, 0, 2600],
    [item.z - item.depth * 90, item.z, item.z + item.depth * 90],
  );
  const z = useSpring(zBase, { stiffness: 120, damping: 22, mass: 0.6 });
  const rotateYBase = useTransform(
    velocity,
    [-2600, 0, 2600],
    [
      item.rotateY - item.depth * 10,
      item.rotateY,
      item.rotateY + item.depth * 10,
    ],
  );
  const rotateY = useSpring(rotateYBase, {
    stiffness: 130,
    damping: 24,
    mass: 0.55,
  });
  const rotateX = useSpring(item.rotateX, {
    stiffness: 130,
    damping: 24,
    mass: 0.55,
  });
  const rotateZ = item.depth > 1 ? -1.6 : 1.4;

  return (
    <motion.figure
      className="scroll-plane"
      whileHover={{
        scale: item.scale + 0.08,
        z: item.z + 180,
        rotateY: 0,
        rotateX: 0,
        transition: { duration: 0.28 },
      }}
      style={{
        transformPerspective: 850,
        x,
        y: item.y,
        z,
        scale: item.scale,
        zIndex: item.layer,
        rotateX,
        rotateY,
        rotateZ,
        width: item.width,
        height: item.height,
      }}
    >
      <span className="scroll-plane__index">{item.id}</span>
      <div
        className="scroll-plane__placeholder"
        style={{ background: item.gradient }}
      >
        <span>{item.label}</span>
      </div>
    </motion.figure>
  );
};

export const ScrollVelocityPlanes = () => {
  const offset = useMotionValue(0);
  const velocity = useVelocity(offset);
  const { scrollY } = useScroll();

  useAnimationFrame((_, delta) => {
    offset.set(offset.get() - delta * 0.034);
  });

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      offset.set(offset.get() - event.deltaY * 0.55);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => window.removeEventListener('wheel', handleWheel);
  }, [offset]);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? latest;
    offset.set(offset.get() - (latest - previous) * 0.7);
  });

  return (
    <motion.div
      className="scroll-planes"
      onPan={(_, info) => offset.set(offset.get() + info.delta.x)}
      onWheel={(event) => offset.set(offset.get() - event.deltaY * 0.9)}
    >
      <div className="scroll-planes__title">
        <span>CONVO</span>
        <strong>PRIVATE CHATS</strong>
      </div>
      <div className="scroll-planes__hint">SCROLL TO SURF</div>
      <div className="scroll-planes__stage">
        {planes.map((item) => (
          <Plane
            key={item.id}
            item={item}
            offset={offset}
            velocity={velocity}
          />
        ))}
      </div>
    </motion.div>
  );
};
