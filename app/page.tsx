"use client";

import AizawaScene from "../src/components/AizawaScene";

export default function Home() {
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
        top: '40px',
        left: '40px',
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 300,
          letterSpacing: '0.3em',
          marginBottom: '16px',
          textTransform: 'uppercase',
          color: 'white'
        }}>AIZAWA</h1>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '2',
          fontStyle: 'italic',
          color: 'rgba(255, 255, 255, 0.6)'
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
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        display: 'block'
      }}>
        Touch to rotate • Double tap to reset
      </div>
    </div>
  );
}
