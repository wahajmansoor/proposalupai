import type { SVGProps } from 'react';

export function ProposalProLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1" />
      <path d="M18 6h-5" />
      <path d="M18 10h-3" />
      <path d="m2 13 6 6" />
      <path d="m2 19 6-6" />
      <path d="M18 14h-1" />
    </svg>
  );
}
