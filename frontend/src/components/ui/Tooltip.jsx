import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 0,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const tooltipVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0,
      x: position === 'left' ? 10 : position === 'right' ? -10 : 0
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      x: 0,
      transition: { delay: delay / 1000 }
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={clsx(
              'absolute z-50 px-3 py-2 text-sm text-white bg-secondary-900 rounded-lg shadow-lg pointer-events-none whitespace-nowrap',
              positions[position],
              className
            )}
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {content}
            {/* Arrow */}
            <div className={clsx(
              'absolute w-2 h-2 bg-secondary-900 transform rotate-45',
              position === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1',
              position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
              position === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1',
              position === 'right' && 'right-full top-1/2 -translate-y-1/2 -mr-1'
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip; 