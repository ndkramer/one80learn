import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  ArrowUp, 
  ArrowDown, 
  GripVertical, 
  FileText, 
  Upload,
  File as FilePdf,
  Search
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import RichTextEditor from '../../components/RichTextEditor';

interface Step {
  id: string;
  module_id: string;
  step_number: number;
  title: string;
  description: string;
  slide_pdf_url?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

interface Module {
  id: string;
  title: string;
  class_id: string;
}

const StepAdmin: React.FC = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  
  const [module, setModule] = useState<Module | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slide_pdf_url: '',
    content: ''
  });
  const [uploadedSlidePdf, setUploadedSlidePdf] = useState<File | null>(null);
  const [isSlidePdfDragOver, setIsSlidePdfDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (moduleId) {
      loadModuleAndSteps();
    }
  }, [moduleId]);

  useEffect(() => {
    if (editingStep) {
      setFormData({
        title: editingStep.title,
        description: editingStep.description,
        slide_pdf_url: editingStep.slide_pdf_url || '',
        content: editingStep.content || ''
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
  }, [editingStep]);

  const loadModuleAndSteps = async () => {
    try {
      setIsLoading(true);
      
      // Load module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, class_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Load steps for this module
      const { data: stepsData, error: stepsError } = await supabase
        .from('steps')
        .select('*')
        .eq('module_id', moduleId)
        .order('step_number');

      if (stepsError) throw stepsError;
      setSteps(stepsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module and steps');
    } finally {
      setIsLoading(false);
    }
  };

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
      const filePath = `steps/${Date.now()}.${fileExt}`;

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

      // Get the next step number
      const nextStepNumber = steps.length > 0 
        ? Math.max(...steps.map(s => s.step_number)) + 1 
        : 1;

      const { data, error } = await supabase
        .from('steps')
        .insert([{
          module_id: moduleId,
          step_number: nextStepNumber,
          title: formData.title,
          description: formData.description,
          slide_pdf_url,
          content: formData.content
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess('Step created successfully!');
      setShowFormModal(false);
      setFormData({
        title: '',
        description: '',
        slide_pdf_url: '',
        content: ''
      });
      loadModuleAndSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create step');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let slide_pdf_url = formData.slide_pdf_url;
      if (uploadedSlidePdf) {
        slide_pdf_url = await uploadSlidePdf(uploadedSlidePdf);
      }

      const { error } = await supabase
        .from('steps')
        .update({
          title: formData.title,
          description: formData.description,
          slide_pdf_url,
          content: formData.content
        })
        .eq('id', editingStep.id);

      if (error) throw error;

      setSuccess('Step updated successfully!');
      setShowFormModal(false);
      setEditingStep(null);
      loadModuleAndSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update step');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
      
      setSuccess('Step deleted successfully');
      loadModuleAndSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete step');
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    try {
      const currentStep = steps[currentIndex];
      const targetStep = steps[newIndex];

      // Swap step numbers
      const updates = [
        {
          id: currentStep.id,
          step_number: targetStep.step_number
        },
        {
          id: targetStep.id,
          step_number: currentStep.step_number
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('steps')
          .update({ step_number: update.step_number })
          .eq('id', update.id);

        if (error) throw error;
      }

      loadModuleAndSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder steps');
    }
  };

  const filteredSteps = steps.filter(step => {
    const searchLower = searchQuery.toLowerCase();
    return (
      step.title.toLowerCase().includes(searchLower) ||
      step.description.toLowerCase().includes(searchLower)
    );
  });

  if (!module) {
    return (
      <div className="p-6">
        <Alert type="error" title="Error">
          Module not found
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/admin/courses/${courseId}/modules`)}
          className="flex items-center text-[#F98B3D] hover:text-[#e07a2c] mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Modules
        </button>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Steps for {module.title}
            </h1>
            <p className="text-gray-600">
              Manage individual learning steps for this module. Students will progress through steps sequentially.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingStep(null);
              setShowFormModal(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Add Step
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
          />
        </div>
      </div>

      {/* Step Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-[#F98B3D]" />
                  {editingStep ? 'Edit Step' : 'Create New Step'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingStep(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="stepForm" onSubmit={editingStep ? handleUpdateSubmit : handleCreateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Step Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                      placeholder="Introduction to the Topic"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Step Number
                    </label>
                    <input
                      type="text"
                      value={editingStep ? `Step ${editingStep.step_number}` : `Step ${steps.length + 1}`}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Step numbers are automatically assigned
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                    placeholder="Brief description of what students will learn in this step..."
                  />
                </div>

                {/* Slide PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slide PDF
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isSlidePdfDragOver
                        ? 'border-[#F98B3D] bg-[#F98B3D10]'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploadedSlidePdf ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FilePdf className="w-8 h-8 text-red-500" />
                        <span className="text-sm text-gray-900">{uploadedSlidePdf.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedSlidePdf(null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Drag and drop a PDF file here, or{' '}
                          <label className="text-[#F98B3D] hover:text-[#e07a2c] cursor-pointer">
                            browse
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-xs text-gray-500">PDF files only</p>
                      </div>
                    )}
                  </div>
                  {formData.slide_pdf_url && !uploadedSlidePdf && (
                    <p className="mt-2 text-sm text-gray-600">
                      Current PDF: {formData.slide_pdf_url.split('/').pop()}
                    </p>
                  )}
                </div>

                {/* Step Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Step Content
                  </label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    placeholder="Enter detailed content for this step. This can include explanations, examples, instructions, or any additional materials students need for this step..."
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    This content will be displayed below the slide PDF for students
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
                    setEditingStep(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  form="stepForm"
                  type="submit"
                  isLoading={isLoading || isUploading}
                >
                  {editingStep ? 'Update Step' : 'Create Step'}
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

      {/* Steps List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredSteps.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No steps found</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating the first step for this module.
            </p>
            <Button
              onClick={() => {
                setEditingStep(null);
                setShowFormModal(true);
              }}
              leftIcon={<Plus size={16} />}
            >
              Create First Step
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSteps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center p-4 bg-white hover:bg-gray-50"
              >
                <div className="mr-4 cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-shrink-0 mr-4">
                  <div className="w-8 h-8 bg-[#F98B3D] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {step.step_number}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {step.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        {step.slide_pdf_url && (
                          <span className="inline-flex items-center">
                            <FilePdf className="w-3 h-3 mr-1" />
                            PDF Slide
                          </span>
                        )}
                        {step.content && (
                          <span className="inline-flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            Content
                          </span>
                        )}
                        <span>
                          Updated {new Date(step.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveStep(step.id, 'up')}
                          disabled={index === 0}
                          className={`text-gray-400 hover:text-gray-600 ${
                            index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveStep(step.id, 'down')}
                          disabled={index === steps.length - 1}
                          className={`text-gray-400 hover:text-gray-600 ${
                            index === steps.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => {
                          setEditingStep(step);
                          setShowFormModal(true);
                        }}
                        className="text-[#F98B3D] hover:text-[#e07a2c]"
                        title="Edit step"
                      >
                        <Pencil size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete step"
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

      {/* Summary */}
      {!isLoading && filteredSteps.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{filteredSteps.length} step{filteredSteps.length !== 1 ? 's' : ''} total</span>
            <span>Students will progress through steps 1-{filteredSteps.length} sequentially</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepAdmin; 