"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value || [0]);
  const twoThumbs = Array.isArray(localValue) && localValue.length > 1;

  React.useEffect(() => {
    setLocalValue(value || [0]);
  }, [value]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={localValue as number[]}
      onValueChange={(newValue) => {
          if (props.onValueChange) {
            // @ts-ignore
            props.onValueChange(newValue)
          }
          setLocalValue(newValue);
      }}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <TooltipProvider>
        {twoThumbs ? (
          <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{localValue[0]}</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{localValue[1]}</p>
                </TooltipContent>
            </Tooltip>
          </>
        ) : (
            <Tooltip>
                <TooltipTrigger asChild>
                    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{Array.isArray(localValue) ? localValue[0] : localValue}</p>
                </TooltipContent>
            </Tooltip>
        )}
      </TooltipProvider>
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
