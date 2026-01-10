/**
 * Footer con link a otra página de auth
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface AuthFooterProps {
  text: string
  linkText: string
  linkTo: string
}

export function AuthFooter({ text, linkText, linkTo }: AuthFooterProps) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-8 text-center text-surface-400"
    >
      {text}{' '}
      <Link to={linkTo} className="text-primary-400 hover:text-primary-300 font-medium">
        {linkText}
      </Link>
    </motion.p>
  )
}

