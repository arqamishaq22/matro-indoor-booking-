import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../../features/theme/themeSlice';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const ThemeToggle = ({ className = '', style = {} }) => {
  const dispatch = useDispatch();
  const themeMode = useSelector((state) => state.theme.mode);
  const isDark = themeMode === 'dark';
  const shouldReduceMotion = useReducedMotion();

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  // Motion variants for icon transition respecting prefers-reduced-motion
  const iconVariants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, rotate: isDark ? -90 : 90, scale: 0.5 },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          rotate: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 20
          }
        },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          rotate: isDark ? 90 : -90,
          scale: 0.5,
          transition: {
            duration: 0.18
          }
        }
  };

  return (
    <motion.button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={handleToggle}
      whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '42px',
        height: '42px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-card)',
        boxShadow: isDark
          ? '0 0 16px rgba(245, 158, 11, 0.2), var(--shadow-sm)'
          : 'var(--shadow-sm)',
        color: isDark ? '#fbbf24' : '#0ea5e9',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal)',
        ...style
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="sun-icon"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}
          >
            <Sun size={20} strokeWidth={2.2} />
          </motion.div>
        ) : (
          <motion.div
            key="moon-icon"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}
          >
            <Moon size={20} strokeWidth={2.2} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggle;
