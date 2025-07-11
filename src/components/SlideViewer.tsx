import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '../utils/supabase';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface SlideViewerProps {
  title: string;
  pdfUrl?: string;
  currentSlide?: number; // Add prop to control which slide to display
}

const SlideViewer: React.FC<SlideViewerProps> = ({ title, pdfUrl, currentSlide }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle external slide navigation (from instructor controls)
  useEffect(() => {
    if (currentSlide && currentSlide !== pageNumber && currentSlide >= 1 && currentSlide <= numPages) {
      setPageNumber(currentSlide);
    }
  }, [currentSlide, pageNumber, numPages]);

  // Load PDF file when pdfUrl changes
  useEffect(() => {
    if (!pdfUrl) {
      setPdfFile(null);
      setNumPages(0);
      setPageNumber(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = supabase.storage
        .from('slides-pdf')
        .getPublicUrl(pdfUrl);
      
      setPdfFile(data.publicUrl);
    } catch (err) {
      console.error('Error getting public URL:', err);
      setError('Failed to get public URL for PDF');
      setIsLoading(false);
    }
  }, [pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF document:', error);
    setError('Failed to load PDF document. Please try again later.');
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  return (
    <div className="relative h-full bg-gray-100">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        {pdfFile && numPages > 0 && (
          <>
            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md p-1">
              <button
                onClick={zoomOut}
                className="p-2 hover:bg-gray-100 rounded transition-colors duration-200"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={resetZoom}
                className="px-3 py-2 hover:bg-gray-100 rounded transition-colors duration-200 text-sm font-medium"
                title="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className="p-2 hover:bg-gray-100 rounded transition-colors duration-200"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Page navigation */}
            {numPages > 1 && (
              <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md p-1">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="p-2 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-2 text-sm font-medium">
                  {pageNumber} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-2 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors duration-200"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* PDF Content */}
      <div className="overflow-auto p-4">
        {!pdfFile ? (
          <div className="text-center text-gray-600 p-8">
            <p>No PDF document available</p>
          </div>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="text-center text-gray-600 p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F98B3D] mx-auto mb-2"></div>
                <p>Loading PDF...</p>
              </div>
            }
            error={
              <div className="text-center text-red-600 p-8">
                <p>Failed to load PDF</p>
                <p className="text-sm mt-2">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-[#F98B3D] text-white rounded hover:bg-[#e07a2c] transition-colors duration-200"
                >
                  Retry
                </button>
              </div>
            }
            externalLinkTarget="_blank"
          >
            {numPages > 0 && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                  <div className="text-center text-gray-600 p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F98B3D] mx-auto mb-2"></div>
                    <p>Loading page {pageNumber}...</p>
                  </div>
                }
                error={
                  <div className="text-center text-red-600 p-8">
                    <p>Failed to load page {pageNumber}</p>
                  </div>
                }
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            )}
          </Document>
        )}
      </div>

      {/* Page indicator for mobile */}
      {pdfFile && numPages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm lg:hidden">
          {pageNumber} / {numPages}
        </div>
      )}
    </div>
  );
};

export default SlideViewer;