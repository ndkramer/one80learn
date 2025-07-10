import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { Library, Search, Plus, Pencil, Trash2, X, ArrowLeft, ArrowUp, ArrowDown, GripVertical, Link as LinkIcon, FileSpreadsheet, FileVideo, FileText, Upload, File as FilePdf } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Resource } from '../../types';

interface Module {
  id: string;
  class_id: string;
  title: string;
  description: string;
  slide_pdf_url?: string;
  order: number;
  created_at: string;
  content?: string;
  resources?: any[];
}

interface Course {
  id: string;
  title: string;
}

const ModuleAdmin: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  console.log('ModuleAdmin - courseId from params:', courseId);
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slide_pdf_url: '',
    content: ''
  });
  const [uploadedSlidePdf, setUploadedSlidePdf] = useState<File | null>(null);
  const [isSlidePdfDragOver, setIsSlidePdfDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSlidePdfDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSlidePdfDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSlidePdfDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedSlidePdf(file);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedSlidePdf(file);
    } else {
      setError('Please select a PDF file');
    }
  };

  const uploadSlidePdf = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const fileExt = 'pdf';
      const filePath = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('slides-pdf')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      return filePath;
    } catch (err) {
      throw new Error('Failed to upload PDF');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadCourseAndModules();
      loadAllResources();
    }
  }, [courseId]);

  const loadAllResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllResources(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    }
  };

  useEffect(() => {
    if (editingModule) {
      setFormData({
        title: editingModule.title,
        description: editingModule.description,
        slide_pdf_url: editingModule.slide_pdf_url || '',
        content: editingModule.content || ''
      });
      setUploadedSlidePdf(null);
    } else {
      setFormData({
        title: '',
        description: '',
        slide_pdf_url: '',
        content: ''
      });
      setUploadedSlidePdf(null);
    }
  }, [editingModule]);

  useEffect(() => {
    if (editingModule) {
      const loadModuleResources = async () => {
        try {
          const { data, error } = await supabase
            .from('resources')
            .select('id')
            .eq('module_id', editingModule.id);

          if (error) throw error;
          setSelectedResources(data?.map(r => r.id) || []);
        } catch (err) {
          console.error('Error loading module resources:', err);
        }
      };
      loadModuleResources();
    } else {
      setSelectedResources([]);
    }
  }, [editingModule]);

  const loadCourseAndModules = async () => {
    console.log('ModuleAdmin - Loading course and modules for courseId:', courseId);
    try {
      setIsLoading(true);
      const { data: courseData, error: courseError } = await supabase
        .from('classes')
        .select('id, title')
        .eq('id', courseId)
        .single();

      console.log('ModuleAdmin - Course query result:', { courseData, courseError });
      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          resources (
            id,
            title,
            type,
            url,
            description,
            file_type,
            file_size,
            order,
            file_path,
            download_count
          )
        `)
        .eq('class_id', courseId)
        .order('order');

      console.log('ModuleAdmin - Modules query result:', { modulesData, modulesError });
      if (modulesError) throw modulesError;
      setModules(modulesData || []);
      console.log('ModuleAdmin - Modules set to:', modulesData);
    } catch (err) {
      console.error('ModuleAdmin - Error loading course data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveResources = async () => {
    if (!editingModule) return;
    
    try {
      await supabase
        .from('resources')
        .update({ module_id: null })
        .eq('module_id', editingModule.id);

      if (selectedResources.length > 0) {
        await supabase
          .from('resources')
          .update({ module_id: editingModule.id })
          .in('id', selectedResources);
      }

      setSuccess('Resources updated successfully!');
      setShowResourceModal(false);
      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resources');
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'word':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-purple-500" />;
      default:
        return <LinkIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let slide_pdf_url = '';
      if (uploadedSlidePdf) {
        slide_pdf_url = await uploadSlidePdf(uploadedSlidePdf);
      }

      const newOrder = modules.length > 0 
        ? Math.max(...modules.map(m => m.order)) + 1 
        : 1;

      const { data, error } = await supabase
        .from('modules')
        .insert([{
          class_id: courseId,
          title: formData.title,
          description: formData.description,
          slide_pdf_url,
          order: newOrder,
          content: formData.content
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess('Module created successfully!');
      setShowFormModal(false);
      setFormData({
        title: '',
        description: '',
        slide_pdf_url: '',
        content: ''
      });
      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create module');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let slide_pdf_url = formData.slide_pdf_url;
      if (uploadedSlidePdf) {
        slide_pdf_url = await uploadSlidePdf(uploadedSlidePdf);
      }

      const { error } = await supabase
        .from('modules')
        .update({
          title: formData.title,
          description: formData.description,
          slide_pdf_url,
          content: formData.content
        })
        .eq('id', editingModule.id);

      if (error) throw error;

      setSuccess('Module updated successfully!');
      setShowFormModal(false);
      setEditingModule(null);
      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      setSuccess('Module deleted successfully');
      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete module');
    }
  };

  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex(m => m.id === moduleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    try {
      const currentModule = modules[currentIndex];
      const targetModule = modules[newIndex];

      const updates = [
        {
          id: currentModule.id,
          class_id: currentModule.class_id,
          title: currentModule.title,
          description: currentModule.description,
          slide_pdf_url: currentModule.slide_pdf_url,
          order: targetModule.order
        },
        {
          id: targetModule.id,
          class_id: targetModule.class_id,
          title: targetModule.title,
          description: targetModule.description,
          slide_pdf_url: targetModule.slide_pdf_url,
          order: currentModule.order
        }
      ];

      const { error } = await supabase
        .from('modules')
        .upsert(updates);

      if (error) throw error;

      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder modules');
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('modules')
        .update({
          content: formData.content
        })
        .eq('id', editingModule.id);

      if (error) throw error;

      setSuccess('Module content updated successfully!');
      setShowContentModal(false);
      setEditingModule(null);
      loadCourseAndModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module content');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredModules = modules.filter(module => {
    const searchLower = searchQuery.toLowerCase();
    return (
      module.title.toLowerCase().includes(searchLower) ||
      module.description.toLowerCase().includes(searchLower)
    );
  });
  
  console.log('ModuleAdmin - Filtered modules:', filteredModules);
  console.log('ModuleAdmin - Rendering with isLoading:', isLoading);

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/courses')}
          className="flex items-center text-[#F98B3D] hover:text-[#e07a2c] mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Courses
        </button>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {course ? `Modules for ${course.title}` : 'Loading...'}
            </h1>
            <p className="text-gray-600">Manage modules for this course.</p>
          </div>
          <Button
            onClick={() => {
              setEditingModule(null);
              setShowFormModal(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Add Module
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
          />
        </div>
      </div>

      {/* Module Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-[#F98B3D]" />
                  {editingModule ? 'Edit Module' : 'Create New Module'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingModule(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="moduleForm" onSubmit={editingModule ? handleUpdateSubmit : handleCreateSubmit} className="space-y-6 pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                    placeholder="Introduction to the Course"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                    placeholder="Enter module description..."
                  />
                </div>

                {/* Slide PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slide PDF
                  </label>
                  <div 
                    className={`p-6 border-2 border-dashed rounded-lg transition-colors duration-200 ${
                      isSlidePdfDragOver 
                        ? 'border-[#F98B3D] bg-[#F98B3D]/5' 
                        : 'border-gray-300 bg-gray-50 hover:border-[#F98B3D] hover:bg-gray-100'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      {uploadedSlidePdf ? (
                        <>
                          <FilePdf className="w-8 h-8 mb-2 text-[#F98B3D]" />
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {uploadedSlidePdf.name}
                          </p>
                          <button
                            onClick={() => setUploadedSlidePdf(null)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className={`w-8 h-8 mb-2 transition-colors duration-200 ${
                            isSlidePdfDragOver ? 'text-[#F98B3D]' : 'text-gray-400'
                          }`} />
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {isSlidePdfDragOver ? 'Drop to upload' : 'Drag and drop PDF here'}
                          </p>
                          <p className="text-xs text-gray-500">
                            or <label className="text-[#F98B3D] hover:text-[#e07a2c] cursor-pointer">
                              browse
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {formData.slide_pdf_url && !uploadedSlidePdf && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <FilePdf className="w-4 h-4 mr-1" />
                      <span>Current PDF: </span>
                      <a 
                        href={formData.slide_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-[#F98B3D] hover:text-[#e07a2c]"
                      >
                        View PDF
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                    placeholder="Enter additional module content or notes..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This content will be available to students as supplementary material
                  </p>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFormModal(false);
                      setEditingModule(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    form="moduleForm"
                    type="submit"
                    isLoading={isLoading}
                  >
                    {editingModule ? 'Update Module' : 'Create Module'}
                  </Button>
                </div>
            </div>
         </div>
        </div>
      )}

      {/* Alerts */}
      {(error || success) && (
        <div className="mb-6">
          {error && (
            <Alert
              type="error"
              title="Error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              type="success"
              title="Success"
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}
        </div>
      )}

      {/* Modules List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No modules found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredModules.map((module, index) => (
              <div
                key={module.id}
                className="flex items-center p-4 bg-white"
              >
                <div className="mr-4 cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {module.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {module.description}
                      </p>
                      {/* Resource Bar */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {module.resources?.map((resource) => (
                          <span
                            key={resource.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {getResourceIcon(resource.type)}
                            <span className="ml-1.5">{resource.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveModule(module.id, 'up')}
                          disabled={index === 0}
                          className={`text-gray-400 hover:text-gray-600 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveModule(module.id, 'down')}
                          disabled={index === modules.length - 1}
                          className={`text-gray-400 hover:text-gray-600 ${index === modules.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setEditingModule(module);
                          setShowFormModal(true);
                        }}
                        className="text-[#F98B3D] hover:text-[#e07a2c]"
                        title="Edit module"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/courses/${courseId}/modules/${module.id}/resources`)}
                        className="text-[#F98B3D] hover:text-[#e07a2c] ml-3"
                        title="Manage resources"
                      >
                        <Library size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className="text-red-600 hover:text-red-900 ml-3"
                        title="Delete module"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleAdmin;