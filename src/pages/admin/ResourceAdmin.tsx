import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { FileText, Search, Plus, Pencil, Trash2, X, Link as LinkIcon, FileSpreadsheet, FileVideo, GripVertical, Upload, Download } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  file_size?: number;
  updated_at: string;
  file_path?: string;
}

const ResourceAdmin: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'link',
    url: undefined,
    description: ''
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    if (editingResource) {
      setFormData({
        title: editingResource.title,
        type: editingResource.type,
        url: editingResource.url || undefined,
        description: editingResource.description
      });
    } else {
      setFormData({
        title: '',
        type: 'link',
        url: undefined,
        description: ''
      });
    }
  }, [editingResource]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    setUploadedFile(file);
    const fileType = getFileType(file.type);
    if (!fileType) {
      setError('Unsupported file type. Please upload PDF, Word, Excel, or video files.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      title: file.name.split('.')[0],
      type: fileType,
      url: undefined,
      description: `Uploaded ${file.name}`
    }));
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      throw new Error('Failed to upload file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let filePath = null;
      if (uploadedFile) {
        filePath = await handleFileUpload(uploadedFile);
      }

      if (editingResource) {
        const { error } = await supabase
          .from('resources')
          .update({
            title: formData.title,
            type: formData.type,
            url: formData.type === 'link' ? formData.url : null,
            description: formData.description,
            file_path: filePath || editingResource.file_path
          })
          .eq('id', editingResource.id);

        if (error) throw error;
        setSuccess('Resource updated successfully!');
      } else {
        const { error } = await supabase
          .from('resources')
          .insert([{
            title: formData.title,
            type: formData.type,
            url: formData.type === 'link' ? formData.url : null,
            description: formData.description,
            file_path: filePath
          }]);

        if (error) throw error;
        setSuccess('Resource created successfully!');
      }

      setShowFormModal(false);
      setEditingResource(null);
      setUploadedFile(null);
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setIsLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(resources);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setResources(items);
    
    try {
      // Update the order in the database
      const updates = items.map((resource, index) => ({
        id: resource.id,
        order: index + 1
      }));
      
      const { error } = await supabase
        .from('resources')
        .upsert(updates);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder resources');
      loadResources(); // Reload original order if update fails
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Resource deleted successfully');
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  const getFileType = (mimeType: string): string | null => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('officedocument.wordprocessingml')) return 'word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
    if (mimeType.includes('video')) return 'video';
    return null;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'video':
        return <FileVideo className="w-5 h-5 text-purple-500" />;
      default:
        return <LinkIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredResources = resources.filter(resource => {
    const searchLower = searchQuery.toLowerCase();
    return (
      resource.title.toLowerCase().includes(searchLower) ||
      resource.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Resource Management</h1>
            <p className="text-gray-600">Manage additional resources for the learning platform.</p>
          </div>
          <Button
            onClick={() => {
              setEditingResource(null);
              setShowFormModal(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Add Resource
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
          />
        </div>
      </div>

      {/* Resource Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-[#F98B3D]" />
                  {editingResource ? 'Edit Resource' : 'Add New Resource'}
                </h2>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingResource(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Resource title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="word">Word Document</option>
                    <option value="excel">Excel Spreadsheet</option>
                    <option value="video">Video</option>
                    <option value="link">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      required={formData.type === 'link'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                      placeholder="https://example.com/resource"
                    />
                    {formData.type === 'link' ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Required for external links
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        Optional - leave empty to upload a file instead
                      </p>
                    )}
                  </div>
                </div>

                {/* File Upload Area */}
                {formData.type !== 'link' && (
                  <div 
                    className={`p-6 border-2 border-dashed rounded-lg transition-colors duration-200 ${
                      isDragOver 
                        ? 'border-[#F98B3D] bg-[#F98B3D]/5' 
                        : 'border-gray-300 bg-gray-50 hover:border-[#F98B3D] hover:bg-gray-100'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      <Upload className={`w-8 h-8 mb-2 transition-colors duration-200 ${
                        isDragOver ? 'text-[#F98B3D]' : 'text-gray-400'
                      }`} />
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {uploadedFile ? uploadedFile.name : isDragOver ? 'Drop to upload' : 'Drag and drop file here'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Support for PDF, Word, Excel, and video files
                      </p>
                    </div>
                  </div>
                )}

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
                    placeholder="Describe this resource..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFormModal(false);
                      setEditingResource(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                  >
                    {editingResource ? 'Update Resource' : 'Add Resource'}
                  </Button>
                </div>
              </form>
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

      {/* Resources List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Drop Zone */}
        <div 
          className={`p-8 border-2 border-dashed transition-colors duration-200 ${
            isDragOver 
              ? 'border-[#F98B3D] bg-[#F98B3D]/5' 
              : 'border-gray-300 bg-gray-50 hover:border-[#F98B3D] hover:bg-gray-100'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className={`w-12 h-12 mb-4 transition-colors duration-200 ${
              isDragOver ? 'text-[#F98B3D]' : 'text-gray-400'
            }`} />
            <p className="text-lg font-medium text-gray-900 mb-1">
              {isDragOver ? 'Drop to upload' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-gray-500">
              Support for PDF, Word, Excel, and video files
            </p>
          </div>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-[#F98B3D]/10 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Upload className="w-12 h-12 text-[#F98B3D] mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Drop file to upload</p>
              <p className="text-sm text-gray-500">PDF, Word, Excel, or video files</p>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-6 text-center text-gray-500 border-t border-gray-200">
            No resources found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border-t border-gray-200">
            {filteredResources.map((resource, index) => (
              <div
                key={resource.id}
                className="flex items-center p-4 bg-white"
              >
                <div className="mr-4 cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getResourceIcon(resource.type)}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {resource.title}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {resource.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {resource.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Updated {new Date(resource.updated_at).toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {resource.file_path && (
                          <a
                            href={resource.file_path}
                            download
                            className="text-[#F98B3D] hover:text-[#e07a2c]"
                            title="Download file"
                          >
                            <Download size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setEditingResource(resource);
                            setShowFormModal(true);
                          }}
                          className="text-[#F98B3D] hover:text-[#e07a2c]"
                          title="Edit resource"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete resource"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

export default ResourceAdmin;