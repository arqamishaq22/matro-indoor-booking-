import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon = null,
  rightIcon = null,
  className = '',
  as: Component = 'button',
  onClick,
  disabled = false,
  type = 'button',
  fullWidth = false,
  style = {},
  ...props
}) => {
  const reduced = useReducedMotion();
  const MotionComponent = useMemo(
    () => Component === 'button' ? motion.button : motion.create(Component),
    [Component],
  );
  const springCfg = { type: 'spring', stiffness: 440, damping: 22 };
  // Size styles
  const sizeStyles = {
    sm: {
      padding: '0.45rem 0.9rem',
      fontSize: '0.85rem',
      gap: '0.4rem',
      borderRadius: 'var(--radius-sm)'
    },
    md: {
      padding: '0.65rem 1.4rem',
      fontSize: '0.95rem',
      gap: '0.5rem',
      borderRadius: 'var(--radius-md)'
    },
    lg: {
      padding: '0.85rem 1.85rem',
      fontSize: '1.05rem',
      fontWeight: '600',
      gap: '0.65rem',
      borderRadius: 'var(--radius-lg)'
    }
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--text-on-primary)',
          boxShadow: '0 4px 14px var(--brand-primary-glow)',
          border: '1px solid transparent'
        };
      case 'glow':
        return {
          background: 'var(--gradient-cta)',
          color: 'var(--text-on-primary)',
          boxShadow: 'var(--shadow-brand)',
          border: '1px solid rgba(255,255,255,0.2)'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-card)'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-hover)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent'
        };
      case 'amber':
        return {
          background: 'linear-gradient(135deg, var(--palette-amber-500) 0%, var(--palette-amber-600) 100%)',
          color: 'var(--text-on-primary)',
          boxShadow: '0 4px 14px var(--brand-accent-glow)',
          border: '1px solid transparent'
        };
      default:
        return {
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--text-on-primary)'
        };
    }
  };

  const combinedStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    letterSpacing: '0.01em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    transition: 'all var(--transition-normal)',
    textDecoration: 'none',
    userSelect: 'none',
    ...sizeStyles[size],
    ...getVariantStyles(),
    ...style
  };
  const elementProps = Component === 'button'
    ? { type, disabled }
    : { 'aria-disabled': disabled || undefined };

  return (
    <MotionComponent
      className={`btn-component ${className}`}
      style={combinedStyles}
      onClick={onClick}
      {...elementProps}
      whileHover={disabled || reduced ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled || reduced  ? {} : { scale: 0.97, y: 0 }}
      transition={springCfg}
      {...props}
    >
      {leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
    </MotionComponent>
  );
};

export default Button;
