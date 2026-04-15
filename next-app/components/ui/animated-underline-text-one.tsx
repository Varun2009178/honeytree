"use client"

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  textClassName?: string
  underlineClassName?: string
  underlinePath?: string
  underlineHoverPath?: string
  underlineDuration?: number
  underlineColor?: string
  underlineStrokeWidth?: number
}

const AnimatedText = React.forwardRef<HTMLSpanElement, AnimatedTextProps>(
  (
    {
      text,
      textClassName,
      underlineClassName,
      underlinePath = "M 0,10 Q 75,0 150,10 Q 225,20 300,10",
      underlineHoverPath = "M 0,10 Q 75,20 150,10 Q 225,0 300,10",
      underlineDuration = 1.5,
      underlineColor = "currentColor",
      underlineStrokeWidth = 2.5,
      ...props
    },
    ref
  ) => {
    const pathVariants: Variants = {
      hidden: {
        pathLength: 0,
        opacity: 0,
      },
      visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: underlineDuration,
          ease: "easeInOut",
        },
      },
    }

    return (
      <motion.span
        ref={ref}
        className={cn("relative inline-block", props.className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className={cn(textClassName)}>{text}</span>

        <motion.svg
          width="100%"
          height="12"
          viewBox="0 0 300 20"
          preserveAspectRatio="none"
          className={cn("absolute -bottom-1 left-0 w-full", underlineClassName)}
          style={{ overflow: "visible" }}
        >
          <motion.path
            d={underlinePath}
            stroke={underlineColor}
            strokeWidth={underlineStrokeWidth}
            strokeLinecap="round"
            fill="none"
            variants={pathVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{
              d: underlineHoverPath,
              transition: { duration: 0.6 },
            }}
          />
        </motion.svg>
      </motion.span>
    )
  }
)

AnimatedText.displayName = "AnimatedText"

export { AnimatedText }
