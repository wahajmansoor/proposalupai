import type { SVGProps } from 'react';

export function ProposalUpLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100"
      height="100"
      {...props}
    >
      <defs>
        <linearGradient id="yolkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FFD180' }} />
          <stop offset="100%" style={{ stopColor: '#FF8F00' }} />
        </linearGradient>
      </defs>
      
      {/* Green Outline */}
      <path
        d="M89.7,65.8c-4.8,11.5-17.3,23.5-31.5,25.4c-14.1,1.9-29-5.2-38.3-15.4C9.5,65.7,2.8,51.1,5.9,36.5 C9.1,21.9,21.9,8.5,36.7,5.4C51.5,2.2,68.4,7.8,79.5,19.3C90.6,30.8,96.3,49,89.7,65.8z"
        fill="#14A800"
      />
      
      {/* White egg part */}
      <path
        d="M85.5,63.9c-4.4,10.6-15.9,21.6-28.9,23.4c-13,1.7-26.7-4.8-35.2-14.2C12.9,63.9,4.9,50,7.7,36.4 C10.6,22.8,22.3,10.5,35.6,7.7C48.8,5,64.2,10.1,74.3,20.6C84.4,31.1,89.5,48.1,85.5,63.9z"
        fill="#FFFFFF"
        stroke="#F5F5F5"
        strokeWidth="1"
      />

      {/* Yolk */}
      <ellipse
        cx="57"
        cy="45"
        rx="18"
        ry="15"
        transform="rotate(-20 57 45)"
        fill="url(#yolkGradient)"
      />
      
      {/* Yolk Highlight */}
       <path
        d="M52,38 a10,7 0 0,1 12,2"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}


export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 48 48" 
      width="48px" 
      height="48px"
      {...props}
    >
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.463-11.128-8.169l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.904,36.336,44,30.608,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}
