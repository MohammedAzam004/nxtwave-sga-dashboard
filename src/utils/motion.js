const easeOutExpo = [0.22, 1, 0.36, 1];

export const pageTransition = {
  duration: 0.55,
  ease: easeOutExpo,
};

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 26,
    filter: "blur(10px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      ...pageTransition,
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    filter: "blur(8px)",
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

export const staggerGroup = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const subtleStaggerGroup = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const fadeUpItem = {
  initial: {
    opacity: 0,
    y: 24,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
};

export const fadeInItem = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: easeOutExpo,
    },
  },
};

export const cardHover = {
  y: -8,
  scale: 1.02,
  transition: {
    duration: 0.24,
    ease: easeOutExpo,
  },
};

export const cardTap = {
  scale: 0.985,
  transition: {
    duration: 0.18,
    ease: "easeOut",
  },
};

export const buttonHover = {
  y: -2,
  scale: 1.02,
  transition: {
    duration: 0.18,
    ease: easeOutExpo,
  },
};

export const buttonTap = {
  scale: 0.98,
  transition: {
    duration: 0.14,
    ease: "easeOut",
  },
};
