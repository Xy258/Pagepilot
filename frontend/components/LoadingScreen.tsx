/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import Logo from './Logo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-stone-50 z-50">
      <div className="flex flex-col items-center gap-8">
        <Logo size={120} animated={true} showText={true} />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-1 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-stone-400 font-sans text-[10px] uppercase tracking-[0.2em] animate-pulse">
            Chiseling your vision into reality
          </p>
        </div>
      </div>
    </div>
  );
}
