import React, { memo } from 'react';

const MeshBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-20 bg-[#060a1d] overflow-hidden">
      {/* Premium Ambient Floating 3D Lights - drift organically with GPU translation */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[130px] mix-blend-screen opacity-50 animate-orbit-1"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-amber-500/25 rounded-full blur-[140px] mix-blend-screen opacity-40 animate-orbit-2"></div>
      <div className="absolute top-[35%] left-[40%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen opacity-35 animate-orbit-3"></div>
      <div className="absolute bottom-[20%] left-[-20%] w-[550px] h-[550px] bg-emerald-500/15 rounded-full blur-[130px] mix-blend-screen opacity-30 animate-orbit-1"></div>

      {/* Futuristic 3D Cyber Grid to establish depth perspective */}
      <div 
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '45px 45px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
          perspective: '600px',
          transform: 'scale(1.2) rotateX(15deg)'
        }}
      ></div>
      
      {/* Aesthetic Grainy Texture overlay of premium digital interfaces */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>

      {/* Vignette Shadowing for depth focus */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" style={{ background: 'radial-gradient(circle, transparent 20%, rgba(2, 4, 15, 0.6) 100%)' }}></div>
    </div>
  );
};

export default memo(MeshBackground);