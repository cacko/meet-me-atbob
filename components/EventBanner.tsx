import React, { useState } from 'react';
import { Event } from '../types';

interface EventBannerProps {
  event: Event;
}

export const EventBanner: React.FC<EventBannerProps> = ({ event }) => {
  const [showMap, setShowMap] = useState(false); // State for map visibility

  // URL for embedding the map, not opening in a new tab
  const googleMapsEmbedUrl = `https://www.google.com/maps/embed/v1/place?q=${encodeURIComponent(event.location)}`;

  return (
    <header className="mb-8 text-center pb-6 border-b border-border-color">
      <img
        src={event.banner}
        alt={`${event.name} Banner`}
        className="w-full aspect-[16/9] object-cover rounded-lg mb-4 shadow-lg animate-pop-in"
      />
      <h1 className="text-3xl md:text-5xl font-heading text-primary mb-2 tracking-widest uppercase">
        {event.name}
      </h1>
      <p className="text-lg md:text-xl text-text-base font-sans">
        Location:
        <button
          onClick={() => setShowMap(!showMap)}
          className="ml-1 text-accent hover:text-primary transition-colors duration-200 underline focus:outline-none focus:ring-2 focus:ring-accent"
          aria-expanded={showMap}
          aria-controls="event-map"
        >
          <span>{event.location}</span>
        </button>
      </p>

      {showMap && (
        <div id="event-map" className="mt-4 w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg animate-fade-in">
          <iframe
            width="100%"
            height="100%"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={googleMapsEmbedUrl}
            title={`Map of ${event.location}`}
            aria-label={`Interactive map showing the location of ${event.name} at ${event.location}`}
          ></iframe>
        </div>
      )}
    </header>
  );
};