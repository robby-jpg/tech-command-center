import * as React from "react";

/**
 * The Kind Home mark, reproduced verbatim from the official brand asset
 * (`brand-assets/logos/KHP_Logo_Primary_Icon.svg`). The fills are the logo's
 * own and are deliberately not routed through the token file — the logo is not
 * themeable, and redrawing or recolouring it is not permitted.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 33.87 72.37"
      className={className}
      role="img"
      aria-label="Kind Home Solutions"
    >
      <g>
        <path
          fill="#0e3178"
          d="M31.42,26.02h-.56v1.7h-.45v-1.7h-.56v-.41h1.57v.41Z"
        />
        <path
          fill="#0e3178"
          d="M33.85,25.61v2.12h-.45v-1.2s-.6.66-.6.66h-.04l-.61-.66v.51s.01.69.01.69h-.45v-2.12h.17l.9,1,.9-1h.17Z"
        />
        <polygon
          fill="#00b9b7"
          points="33.85 58.46 33.87 37.41 .01 37.39 0 58.47 16.93 46.16 33.85 58.46"
        />
        <path
          fill="#0e3178"
          d="M33.87,34.12s0-.01,0-.02c0-.43-.21-.84-.56-1.1l-9.31-6.58c-1.17-.86-2.16-2.56-2.62-4.27-.22-.82-.23-1.68-.07-2.52l1.86-9.39c.58-2.34.06-4.83-1.48-6.68C19.84,1.34,17.3.14,16.99,0h0s0,0,0,0c0,0,0,0,0,0h0c-.31.14-2.85,1.34-4.69,3.55-1.54,1.85-2.06,4.35-1.48,6.68l1.83,9.27c.19.98.15,2-.2,2.94-.59,1.61-1.72,3.16-2.82,3.97L.5,33.13c-.32.23-.45.6-.49.99,0,.03,0,.05,0,.08H0s0,3.2,0,3.2l33.86.02v-3.22s0-.09,0-.09ZM18.97,10.15c-1.12,1.12-2.95,1.12-4.07,0-1.12-1.12-1.12-2.95,0-4.07,1.12-1.12,2.95-1.12,4.07,0s1.12,2.95,0,4.07Z"
        />
        <path
          fill="#00b9b7"
          d="M25.46,58.97c0,4.7-3.83,8.52-8.53,8.52s-8.53-3.82-8.53-8.52l-4.47,3.25c1.46,5.82,6.74,10.14,13,10.14s11.54-4.32,13-10.14l-4.47-3.25Z"
        />
      </g>
    </svg>
  );
}
