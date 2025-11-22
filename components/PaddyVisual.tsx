import React from 'react';

interface Props {
  stageIndex: number; // 0 to 7
}

export const PaddyVisual: React.FC<Props> = ({ stageIndex }) => {
  // Colors
  const stemGreen = "#16a34a"; // green-600
  const leafGreen = "#22c55e"; // green-500
  const darkGreen = "#15803d"; // green-700
  const gold = "#eab308"; // yellow-500
  const brown = "#a16207"; // yellow-800
  
  // Animation class
  const swayClass = "animate-sway origin-bottom";

  const renderSeedling = () => (
    <g className={swayClass}>
       <path d="M50 90 Q 45 70 35 60" stroke={stemGreen} strokeWidth="2" fill="none" />
       <path d="M52 90 Q 55 65 65 55" stroke={stemGreen} strokeWidth="2" fill="none" />
       <path d="M48 90 Q 48 75 45 50" stroke={leafGreen} strokeWidth="2" fill="none" />
       <path d="M20 95 Q 50 92 80 95" stroke="#93c5fd" strokeWidth="2" fill="none" opacity="0.6" />
    </g>
  );

  const renderTillering = () => (
    <g className={swayClass}>
       <path d="M50 90 Q 30 60 20 40" stroke={darkGreen} strokeWidth="3" fill="none" />
       <path d="M50 90 Q 70 60 80 40" stroke={darkGreen} strokeWidth="3" fill="none" />
       <path d="M50 90 Q 40 50 35 20" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M50 90 Q 60 50 65 20" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M50 90 Q 50 40 50 15" stroke={stemGreen} strokeWidth="3" fill="none" />
       <path d="M35 50 Q 20 40 15 55" stroke={leafGreen} strokeWidth="2" fill="none" />
       <path d="M65 50 Q 80 40 85 55" stroke={leafGreen} strokeWidth="2" fill="none" />
    </g>
  );

  const renderStemElongation = () => (
    <g className={swayClass}>
       {/* Taller and denser than tillering */}
       <path d="M50 90 L 50 30" stroke={darkGreen} strokeWidth="4" fill="none" />
       <path d="M50 90 Q 30 60 25 30" stroke={darkGreen} strokeWidth="3" fill="none" />
       <path d="M50 90 Q 70 60 75 30" stroke={darkGreen} strokeWidth="3" fill="none" />
       
       <path d="M25 30 Q 15 20 10 25" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M75 30 Q 85 20 90 25" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M50 30 Q 50 10 30 10" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M50 30 Q 50 10 70 10" stroke={leafGreen} strokeWidth="3" fill="none" />
    </g>
  );

  const renderBooting = () => (
    <g className={swayClass}>
        {/* Tall Stems with Flag Leaf sticking up */}
       <path d="M45 90 Q 40 50 40 15" stroke={darkGreen} strokeWidth="3" fill="none" />
       <path d="M55 90 Q 60 50 60 15" stroke={darkGreen} strokeWidth="3" fill="none" />
       
       {/* Flag Leaves - Upright */}
       <path d="M40 30 L 30 5" stroke={leafGreen} strokeWidth="3" fill="none" />
       <path d="M60 30 L 70 5" stroke={leafGreen} strokeWidth="3" fill="none" />
       
       {/* Swollen Stem (Boot) */}
       <ellipse cx="40" cy="35" rx="4" ry="10" fill={leafGreen} />
       <ellipse cx="60" cy="35" rx="4" ry="10" fill={leafGreen} />
    </g>
  );

  const renderFlowering = () => (
    <g className={swayClass}>
       <path d="M50 90 L 50 20" stroke={darkGreen} strokeWidth="3" fill="none" />
       <path d="M50 60 Q 20 40 10 50" stroke={leafGreen} strokeWidth="2" fill="none" />
       <path d="M50 50 Q 80 30 90 40" stroke={leafGreen} strokeWidth="2" fill="none" />
       
       {/* Panicle spray */}
       <path d="M50 20 L 35 5" stroke={leafGreen} strokeWidth="1" />
       <path d="M50 20 L 65 5" stroke={leafGreen} strokeWidth="1" />
       <path d="M50 20 L 50 0" stroke={leafGreen} strokeWidth="1" />

       {/* White flowers/pollen */}
       <circle cx="35" cy="5" r="1.5" fill="#fff" />
       <circle cx="65" cy="5" r="1.5" fill="#fff" />
       <circle cx="50" cy="0" r="1.5" fill="#fff" />
       <circle cx="42" cy="10" r="1.5" fill="#fff" />
       <circle cx="58" cy="10" r="1.5" fill="#fff" />
    </g>
  );

  const renderFilling = () => (
    <g className={swayClass}>
       <path d="M50 90 L 50 20" stroke={darkGreen} strokeWidth="3" fill="none" />
       
       {/* Drooping Panicles (Green-Yellow) */}
       <path d="M50 20 Q 30 20 20 40" stroke="#bddc39" strokeWidth="2" fill="none" />
       <path d="M50 20 Q 70 20 80 40" stroke="#bddc39" strokeWidth="2" fill="none" />

       <ellipse cx="20" cy="40" rx="3" ry="8" fill="#bddc39" transform="rotate(-20 20 40)" />
       <ellipse cx="80" cy="40" rx="3" ry="8" fill="#bddc39" transform="rotate(20 80 40)" />
    </g>
  );

  const renderMature = () => (
    <g className={swayClass}>
       {/* Bent stalks due to grain weight */}
       <path d="M50 90 Q 50 40 70 25" stroke={brown} strokeWidth="3" fill="none" />
       <path d="M40 90 Q 40 50 20 35" stroke={brown} strokeWidth="3" fill="none" />
       
       {/* Drooping Leaves (Brown/Gold) */}
       <path d="M50 70 Q 70 60 75 80" stroke={gold} strokeWidth="2" fill="none" />
       
       {/* Full Grain Heads */}
       <ellipse cx="70" cy="25" rx="6" ry="14" fill={gold} transform="rotate(30 70 25)" />
       <ellipse cx="20" cy="35" rx="6" ry="14" fill={gold} transform="rotate(-30 20 35)" />
    </g>
  );

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full max-h-[160px]">
        {/* Ground */}
        <path d="M0 90 L 100 90" stroke={stageIndex >= 6 ? brown : "#15803d"} strokeWidth="4" opacity="0.3" />
        
        {stageIndex === 0 && renderSeedling()}
        {stageIndex === 1 && renderTillering()}
        {stageIndex === 2 && renderStemElongation()}
        {stageIndex === 3 && renderBooting()}
        {stageIndex === 4 && renderFlowering()}
        {stageIndex === 5 && renderFilling()}
        {stageIndex >= 6 && renderMature()}
      </svg>
    </div>
  );
};
