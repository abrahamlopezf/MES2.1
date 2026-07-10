import { motion, useReducedMotion } from 'motion/react';

const PageMotion = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(3px)' }}
      transition={{
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageMotion;