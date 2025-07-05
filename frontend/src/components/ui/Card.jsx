import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = true,
  className = '',
  ...props
}) => {
  const baseClasses = 'bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-100 dark:border-secondary-700 transition-all duration-300';

  const variants = {
    default: 'shadow-lg',
    elevated: 'shadow-xl',
    outline: 'border-2 shadow-sm',
    gradient: 'bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-secondary-800 dark:to-secondary-900'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const hoverEffects = hover ? 'hover:shadow-xl hover:-translate-y-1' : '';

  const cardClasses = clsx(
    baseClasses,
    variants[variant],
    paddings[padding],
    hoverEffects,
    className
  );

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: hover ? { 
      y: -4,
      transition: { duration: 0.3 }
    } : {}
  };

  return (
    <motion.div
      className={cardClasses}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      {...props}
    >
      {children}
    </motion.div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={clsx('mb-4', className)}>
    {children}
  </div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={clsx('', className)}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={clsx('mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-600', className)}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card; 