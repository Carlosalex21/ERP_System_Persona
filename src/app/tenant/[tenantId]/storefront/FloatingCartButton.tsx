"use client";

import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  visible: boolean;
  totalItems: number;
  onClick: () => void;
}

/** Botón flotante del carrito para móvil: aparece solo cuando hay ítems y el drawer está cerrado. */
export default function FloatingCartButton({ visible, totalItems, onClick }: FloatingCartButtonProps): ReactElement {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          onClick={onClick}
          className="md:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-2xl hover:bg-primary-700 flex items-center justify-center z-30"
          aria-label="Abrir carrito"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {totalItems}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
