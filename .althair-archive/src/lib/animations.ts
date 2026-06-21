export const fadeIn = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.45 } },
  exit: { opacity: 0, y: -18, transition: { duration: 0.25 } }
};
