import React from 'react';
import './GlobalStarfield.css';

const GlobalStarfield = () => {
    return (
        <div className="global-starfield-container" aria-hidden="true">
            {/* Twinkling Stars */}
            {Array.from({ length: 60 }).map((_, i) => (
                <span key={`star-${i}`} className="global-star" style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 4}s`,
                    width: `${Math.random() * 2 + 1}px`,
                    height: `${Math.random() * 2 + 1}px`,
                    opacity: Math.random() * 0.5 + 0.1,
                }} />
            ))}
            
            {/* Shooting Stars */}
            {Array.from({ length: 8 }).map((_, i) => (
                <span key={`shooting-star-${i}`} className="global-shooting-star" style={{
                    top: `${Math.random() * 100 - 20}%`,
                    left: `${Math.random() * 100 + 20}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${Math.random() * 3 + 2}s`,
                }} />
            ))}
        </div>
    );
};

export default GlobalStarfield;
