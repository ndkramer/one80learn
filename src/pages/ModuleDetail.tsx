import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useBeforeUnload, useLocation } from 'react-router-dom';
import { ChevronLeft, Save, FileText, Link as LinkIcon, ExternalLink, CheckCircle, Download, AlertTriangle, Presentation } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../utils/authContext';
import { useClass } from '../utils/classContext';
import { useModule } from '../utils/moduleContext';
import { useNotes } from '../utils/noteContext';
import RichTextEditor from '../components/RichTextEditor';
import ErrorBoundary from '../components/ErrorBoundary';
import SlideViewer from '../components/SlideViewer';
import SyncedSlideViewer from '../components/SyncedSlideViewer';
import InstructorPresentationControl from '../components/InstructorPresentationControl';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { isModuleInstructor, moduleSupportsSync } from '../utils/instructorAuth';
import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ModuleDetail: React.FC = () => {
  const { classId, moduleId } = useParams<{ classId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { enrolledClasses, isLoading: classLoading } = useClass();
  const { user } = useAuth();
  const { getNoteForModule, saveNote, isLoading: isNoteLoading } = useNotes();
  const { moduleProgress, updateModuleProgress } = useModule();

  const [noteContent, setNoteContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [lastSaved, setLastSaved] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [initialNoteContent, setInitialNoteContent] = useState('');
  
  // Presentation sync state
  const [isInstructor, setIsInstructor] = useState(false);
  const [supportsSync, setSupportsSync] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // For navigation warning
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const location = useLocation();
  
  const classItem = classId ? enrolledClasses.find(c => c.id === classId) : undefined;
  const module = classItem?.modules.find(m => m.id === moduleId);
  
  // Debug logs
  console.log('Module Data:', {
    moduleId,
    module,
  });

  const isModuleCompleted = moduleId ? moduleProgress[moduleId] : false;

  // Set up beforeunload event to warn about unsaved changes
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return 'You have unsaved notes. Are you sure you want to leave?';
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Listen for location changes to intercept navigation
  useEffect(() => {
    // This effect will run on component mount and when location changes
    // We use it to reset the pending navigation when the user has actually navigated
    setPendingNavigation(null);
    setShowNavigationWarning(false);
  }, [location]);

  // Listen for custom navigation events from Layout component
  useEffect(() => {
    const handleModuleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const to = customEvent.detail.to;
      
      if (hasUnsavedChanges) {
        setPendingNavigation(to);
        setShowNavigationWarning(true);
      } else {
        navigate(to);
      }
    };
    
    window.addEventListener('moduleNavigation', handleModuleNavigation);
    
    return () => {
      window.removeEventListener('moduleNavigation', handleModuleNavigation);
    };
  }, [hasUnsavedChanges, navigate]);

  // Handle navigation within the app
  const handleNavigateAway = (to: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(to);
      setShowNavigationWarning(true);
    } else {
      navigate(to);
    }
  };

  // Handle confirmation of navigation
  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      setShowNavigationWarning(false);
      navigate(pendingNavigation);
    }
  };

  // Handle cancellation of navigation
  const handleCancelNavigation = () => {
    setPendingNavigation(null);
    setShowNavigationWarning(false);
  };

  // Handle clicks on sidebar links
  const handleLinkClick = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (hasUnsavedChanges) {
      setPendingNavigation(to);
      setShowNavigationWarning(true);
    } else {
      navigate(to);
    }
  };

  // Handle back button click
  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasUnsavedChanges) {
      setPendingNavigation(`/classes/${classId}`);
      setShowNavigationWarning(true);
    } else {
        navigate(`/classes/${classId}`);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadNote = async () => {
      if (!moduleId || !user?.id) {
        return;
      }

      try {
        setError(null);
        setNoteError(null);
        const note = await getNoteForModule(moduleId);

        if (isMounted) {
          if (note) {
            setNoteContent(note.content);
            setLastSaved(note.lastUpdated);
            setInitialNoteContent(note.content);
            setHasUnsavedChanges(false);
          } else {
            setNoteContent('');
            setLastSaved(undefined);
            setInitialNoteContent('');
            setHasUnsavedChanges(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading note:', error);
          setNoteError('Failed to load note');
          setNoteContent('');
          setInitialNoteContent('');
          setLastSaved(undefined);
          setHasUnsavedChanges(false);
        }
      }
    };

    loadNote();
    
    return () => {
      isMounted = false;
    };
  }, [moduleId, user?.id, getNoteForModule]);

  // Check instructor permissions and sync support
  useEffect(() => {
    const checkPresentationCapabilities = async () => {
      if (!moduleId) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        setIsCheckingAuth(true);
        
        // Check if user is instructor for this module
        const instructorCheck = await isModuleInstructor(moduleId);
        setIsInstructor(instructorCheck);

        // Check if module supports sync
        const syncSupport = await moduleSupportsSync(moduleId);
        setSupportsSync(syncSupport);

        // If module supports sync, get PDF page count from database
        if (syncSupport) {
          const { data: moduleData } = await supabase
            .from('modules')
            .select('pdf_total_pages')
            .eq('id', moduleId)
            .single();

          if (moduleData?.pdf_total_pages) {
            setTotalSlides(moduleData.pdf_total_pages);
          }
        }
      } catch (error) {
        console.error('Error checking presentation capabilities:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkPresentationCapabilities();
  }, [moduleId]);

  // Track changes to note content
  const handleNoteChange = (content: string) => {
    setNoteContent(content);
    setHasUnsavedChanges(content !== initialNoteContent);
  };

  // Handle slide changes from presentation sync
  const handleSlideChange = (slide: number) => {
    setCurrentSlide(slide);
  };

  const handleToggleProgress = async () => {
    if (!moduleId) return;
    
    setIsUpdatingProgress(true);
    setProgressError('');
    
    try {
      await updateModuleProgress(moduleId, !isModuleCompleted);
    } catch (error) {
      setProgressError('Failed to update progress');
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdatingProgress(false);
    }
  };
  
  const handleSaveNote = async () => {
    if (!moduleId || !user?.id) {
      setSaveStatus('error');
      setNoteError('Please log in to save notes');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('saving');
    setNoteError(null);
    
    try {
      const savedNote = await saveNote(moduleId, noteContent);
      if (savedNote) {
        setLastSaved(savedNote.updated_at);
        setSaveStatus('saved');
        setInitialNoteContent(noteContent);
        setHasUnsavedChanges(false);

        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveStatus('error');
      setNoteError('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!module) return;
    
    setIsDownloading(true);
    
    // Create PDF for notes
    // Create a temporary container for the content
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.width = '800px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.backgroundColor = 'white';
    
    // Add module information
    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 24px; color: #333; margin-bottom: 10px;">${module.title}</h1>
        <p style="font-size: 16px; color: #666; margin-bottom: 20px;">${module.description}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <h2 style="font-size: 20px; color: #333; margin-bottom: 15px;">My Notes</h2>
        <div>${noteContent}</div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    try {
      // Generate PDF from notes
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const notesPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      notesPdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      let finalPdf;
      
      // If we have a slide PDF URL, merge it with the notes
      if (module.slide_pdf_url) {
        try {
          // Get the public URL for the PDF file
          const { data } = supabase.storage
            .from('slides-pdf')
            .getPublicUrl(module.slide_pdf_url);
          
          // Fetch the slideshow PDF
          const response = await fetch(data.publicUrl);
          const slideshowPdfBytes = await response.arrayBuffer();
          
          // Load both PDFs
          const mergedPdf = await PDFDocument.create();
          const notesBytes = await notesPdf.output('arraybuffer');
          const notesDoc = await PDFDocument.load(notesBytes);
          const slidesPdf = await PDFDocument.load(slideshowPdfBytes);
          
          // Copy pages from both PDFs
          const notesPages = await mergedPdf.copyPages(notesDoc, notesDoc.getPageIndices());
          const slidesPages = await mergedPdf.copyPages(slidesPdf, slidesPdf.getPageIndices());
          
          // Add all pages to the merged PDF
          notesPages.forEach(page => mergedPdf.addPage(page));
          slidesPages.forEach(page => mergedPdf.addPage(page));
          
          finalPdf = await mergedPdf.save();
        } catch (err) {
          console.error('Error merging PDFs:', err);
          finalPdf = await notesPdf.output('arraybuffer');
        }
      } else {
        finalPdf = await notesPdf.output('arraybuffer');
      }
      
      // Generate a clean filename
      const fileName = `${module.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.pdf`;
      
      // Save the final PDF
      const blob = new Blob([finalPdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      // Clean up
      document.body.removeChild(container);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (classLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F98B3D]"></div>
      </div>
    );
  }
  
  if (!classItem || !module) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Module not found</h2>
        <p className="text-gray-600 mb-6">The module you're looking for doesn't exist or you don't have access to it.</p>
        <Button
          onClick={() => navigate('/classes')}
        >
          Back to Classes
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Breadcrumb navigation */}
      {/* Navigation Warning Modal */}
      {showNavigationWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Unsaved Changes</h3>
                <p className="mt-2 text-sm text-gray-500">
                  You have unsaved notes. If you leave this page, your changes will be lost.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D]"
                onClick={handleCancelNavigation}
              >
                Stay on this page
              </button>
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleConfirmNavigation}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
      
      <nav className="mb-4">
        <Link 
          onClick={handleBackClick}
          to={`/classes/${classId}`}
          className="inline-flex items-center text-[#F98B3D] hover:text-[#e07a2c] font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to {classItem.title}
        </Link>
      </nav>
      
      {/* Module header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-[#F98B3D] text-white w-10 h-10 rounded-full flex items-center justify-center mr-4">
                {module.order}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
                <p className="text-gray-600">{module.description}</p>
              </div>
            </div>
            <Button
              onClick={handleToggleProgress}
              isLoading={isUpdatingProgress}
              variant={isModuleCompleted ? 'outline' : 'primary'}
              leftIcon={isModuleCompleted ? <CheckCircle size={16} /> : undefined}
            >
              {isModuleCompleted ? 'Completed' : 'Mark as Complete'}
            </Button>
          </div>
          
          {progressError && (
            <Alert type="error" onClose={() => setProgressError('')}>
              {progressError}
            </Alert>
          )}
        </div>
      </div>
      
      {/* Content area */}
      <div className="space-y-6">
        {/* Slides section */}
        <div className="space-y-4">
          {/* Instructor Controls - Only show for instructors when sync is supported */}
          {isInstructor && supportsSync && !isCheckingAuth && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <ErrorBoundary>
                <InstructorPresentationControl
                  moduleId={moduleId!}
                  totalSlides={totalSlides}
                  currentSlide={currentSlide}
                  onSlideChange={handleSlideChange}
                  presentationTitle={module.title}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Slides viewer */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[600px]">
            <div className="relative">
              <ErrorBoundary>
                {supportsSync && !isCheckingAuth ? (
                  <SyncedSlideViewer
                    title={`Slides for ${module.title}`}
                    moduleId={moduleId!}
                    pdfUrl={module.slide_pdf_url}
                  />
                ) : (
                  <SlideViewer
                    title={`Slides for ${module.title}`}
                    pdfUrl={module.slide_pdf_url}
                  />
                )}
              </ErrorBoundary>
              
              {/* Sync capability indicator */}
              {!isCheckingAuth && (
                <div className="absolute top-4 left-4 z-10">
                  {supportsSync ? (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                      <Presentation size={12} className="mr-1" />
                      Sync Enabled
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                      Standard View
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Notes column */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">My Notes</h2>
              <div className="flex items-center">
                {saveStatus === 'saved' && (
                  <span className="text-green-600 text-sm mr-3">Saved successfully!</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-600 text-sm mr-3">Error saving!</span>
                )}
                {noteError && (
                  <span className="text-red-600 text-sm mr-3">{noteError}</span>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDownloadPdf}
                    isLoading={isDownloading}
                    variant="outline"
                    leftIcon={<Download size={16} />}
                  >
                    Download PDF & Notes
                  </Button>
                  <Button
                    onClick={handleSaveNote}
                    isLoading={isSaving}
                    leftIcon={<Save size={16} />}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
              {hasUnsavedChanges && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 flex items-start">
                  <AlertTriangle className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-amber-800">You have unsaved changes</p>
                    <p className="text-amber-700 text-sm">Your notes will be lost if you navigate away without saving.</p>
                  </div>
                </div>
              )}
              
              {isNoteLoading ? (
                <div className="flex justify-center items-center h-[300px]">
                  <LoadingSpinner />
                </div>
              ) : (
                <RichTextEditor
                  initialValue={noteContent}
                  onChange={handleNoteChange}
                  onSave={handleSaveNote}
                  placeholder="Start typing your notes about this module..."
                  lastSaved={lastSaved}
                />
              )}
            </div>
            
            <p className="mt-4 text-sm text-gray-500">
              Press Ctrl+S (Cmd+S on Mac) to save your notes.
            </p>
          </div>
        </div>
        
        {/* Additional Resources */}
        {module.resources && module.resources.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Additional Resources</h2>
                <span className="text-sm text-gray-500">{module.resources.length} resources available</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {module.resources.map((resource) => (
                  <div 
                    key={resource.id}
                    className="group flex flex-col p-4 border border-gray-100 rounded-lg hover:border-[#F98B3D] hover:shadow-md transition-all duration-200 bg-gray-50"
                  >
                    <div className="flex items-center mb-3">
                      {resource.type === 'pdf' ? (
                        <FileText className="w-5 h-5 text-[#F98B3D] mr-2" />
                      ) : (
                        <LinkIcon className="w-5 h-5 text-[#F98B3D] mr-2" />
                      )}
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-[#F98B3D] transition-colors duration-200">
                        {resource.title}
                      </h3>
                    </div>
                    
                    {resource.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    
                    <div className="mt-auto">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[#F98B3D] hover:text-[#e07a2c] text-sm font-medium group-hover:translate-x-1 transition-transform duration-200"
                      >
                        {resource.type === 'pdf' ? 'Download PDF' : 'Visit Resource'}
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;