import React, { memo } from 'react';

const MeshBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-20 bg-[#020617] overflow-hidden">
      {/* Dynamic 3D Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] mix-blend-screen opacity-40 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen opacity-30"></div>
      <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[90px] mix-blend-screen opacity-20"></div>

      {/* Subtle Grid for depth perception */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      
      {/* Noise Texture for realism */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

export default memo(MeshBackground);