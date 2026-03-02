"use client";

import { useEffect, useState } from "react";
import AizawaScene from "../src/components/AizawaScene";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      color: 'white',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      width: '100vw',
      height: '100vh'
    }}>
      {/* HUD — Top Left, following the reference image style */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '20px' : '40px',
        left: isMobile ? '20px' : '40px',
        right: isMobile ? '20px' : 'auto',
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
        maxWidth: isMobile ? 'calc(100% - 40px)' : 'auto'
      }}>
        <h1 style={{
          fontSize: isMobile ? '20px' : '28px',
          fontWeight: 300,
          letterSpacing: '0.3em',
          marginBottom: isMobile ? '12px' : '16px',
          textTransform: 'uppercase',
          color: 'white',
          margin: 0
        }}>AIZAWA</h1>
        <div style={{
          fontFamily: 'monospace',
          fontSize: isMobile ? '8px' : '11px',
          lineHeight: '1.8',
          fontStyle: 'italic',
          color: 'rgba(255, 255, 255, 0.6)',
          display: isMobile ? 'none' : 'block'
        }}>
          <p style={{ margin: 0 }}>dx = (z−b)x − dy</p>
          <p style={{ margin: 0 }}>dy = dx + (z−b)y</p>
          <p style={{ margin: 0 }}>dz = c + az − z³/3 − (x²+y²)(1+ez) + fzx³</p>
        </div>
      </div>

      {/* The 3D Scene */}
      <div style={{ width: '100%', height: '100%' }}>
        <AizawaScene />
      </div>

      {/* Mobile Interaction Hint */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? '20px' : '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: isMobile ? '9px' : '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        display: 'block',
        textAlign: 'center',
        maxWidth: '90%',
        whiteSpace: isMobile ? 'normal' : 'nowrap'
      }}>
        {isMobile ? 'Touch to rotate\nDouble tap to reset' : 'Touch to rotate • Double tap to reset'}
      </div>
    </div>
  );
}
