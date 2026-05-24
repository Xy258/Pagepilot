/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export default function Logo({ 
  size = 48, 
  animated = false, 
  className = "", 
  showText = false,
  textColor = "text-stone-900 dark:text-stone-100"
}: LogoProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center shrink-0">
        {/* Simple SVG reflecting the new design */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background Circle */}
          <circle cx="50" cy="50" r="45" fill="#1E293B" />
          
          {/* Floating Glowy Circle (Top Right) */}
          <motion.circle 
            cx="75" 
            cy="25" 
            r="12" 
            fill="#3B82F6" 
            initial={animated ? { scale: 0.8, opacity: 0.6 } : { scale: 1, opacity: 1 }}
            animate={animated ? { 
              scale: [0.8, 1.2, 0.8],
              opacity: [0.6, 1, 0.6]
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating Dark Diamond (Bottom Left) */}
          <motion.rect
            x="15"
            y="65"
            width="15"
            height="15"
            rx="4"
            fill="#0F172A"
            transform="rotate(-15 22.5 72.5)"
            initial={animated ? { y: 65 } : { y: 65 }}
            animate={animated ? { y: [65, 70, 65] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main "P" */}
          <text
            x="50"
            y="65"
            fontFamily="sans-serif"
            fontWeight="900"
            fontSize="48"
            fill="white"
            textAnchor="middle"
          >
            P
          </text>

          {/* Blue Underline */}
          <rect
            x="35"
            y="72"
            width="30"
            height="4"
            rx="2"
            fill="#3B82F6"
          />
        </svg>
      </div>
      {showText && (
        <motion.div
           initial={animated ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex flex-col leading-none"
        >
            <span className={`text-xl md:text-2xl font-black tracking-tighter ${textColor} uppercase`}>
              Page Pilot
            </span>
            <span className={`text-[10px] font-bold ${textColor} opacity-40 uppercase tracking-[0.3em] mt-1`}>
              Design Artisan
            </span>
        </motion.div>
      )}
    </div>
  );
}
