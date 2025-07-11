import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle } from 'lucide-react';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  allowFullscreen?: boolean;
  showControls?: boolean;
}

// Extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Validate YouTube URL
const isValidYouTubeUrl = (url: string): boolean => {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  title = 'YouTube Video',
  className = '',
  autoPlay = false,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  allowFullscreen = true,
  showControls = true
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract video ID from URL
  const videoId = extractVideoId(videoUrl);

  useEffect(() => {
    if (!videoId) {
      setHasError(true);
      setErrorMessage('Invalid YouTube URL. Please check the URL format.');
      onError?.('Invalid YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(videoUrl)) {
      setHasError(true);
      setErrorMessage('Please provide a valid YouTube URL.');
      onError?.('Invalid YouTube URL format');
      return;
    }

    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
  }, [videoUrl, videoId, onError]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    onReady?.();
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load video. The video may be private or unavailable.');
    onError?.('Failed to load video');
  };

  const buildEmbedUrl = (videoId: string): string => {
    const params = new URLSearchParams({
      rel: '0', // Don't show related videos
      modestbranding: '1', // Reduce YouTube branding
      enablejsapi: '1', // Enable JavaScript API
      origin: window.location.origin,
    });

    if (autoPlay) {
      params.append('autoplay', '1');
    }

    if (!showControls) {
      params.append('controls', '0');
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const toggleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  if (hasError) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Video</h3>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <div className="text-sm text-gray-500">
          <p>Please ensure:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The YouTube URL is valid</li>
            <li>The video is not private or restricted</li>
            <li>You have permission to view the video</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Video URL</h3>
        <p className="text-gray-600">Please provide a valid YouTube URL.</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <LoadingSpinner size="large" />
        </div>
      )}

      {/* YouTube Embed */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
        <iframe
          ref={iframeRef}
          className="absolute top-0 left-0 w-full h-full"
          src={buildEmbedUrl(videoId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={allowFullscreen}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{ border: 'none' }}
        />
      </div>

      {/* Custom Controls Overlay (if needed) */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black bg-opacity-50 text-white p-2 rounded opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{title}</span>
          </div>
          
          {allowFullscreen && (
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="small"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <Maximize size={16} />
            </Button>
          )}
        </div>
      )}

      {/* Video Info */}
      <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded opacity-0 hover:opacity-100 transition-opacity">
        <h3 className="text-lg font-medium truncate">{title}</h3>
        <p className="text-sm text-gray-200">YouTube Video</p>
      </div>
    </div>
  );
};

export default YouTubePlayer; 