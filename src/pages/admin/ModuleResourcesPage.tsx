import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { ChevronLeft, FileText, FileSpreadsheet, FileVideo, Link as LinkIcon, Plus, Minus } from 'lucide-react';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Resource } from '../../types';

interface Module {
  id: string;
  title: string;
  class_id: string;
}

interface ResourceWithSelection extends Resource {
  isSelected: boolean;
}

const ModuleResourcesPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<Module | null>(null);
  const [resources, setResources] = useState<ResourceWithSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (moduleId) {
      loadModuleAndResources();
    }
  }, [moduleId]);

  const loadModuleAndResources = async () => {
    try {
      // Load module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, class_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Load all resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      // Load selected resources for this module
      const { data: selectedData, error: selectedError } = await supabase
        .from('resources')
        .select('id')
        .eq('module_id', moduleId);

      if (selectedError) throw selectedError;
      
      // Combine resources with selection state
      const selectedIds = new Set(selectedData?.map(r => r.id) || []);
      const combinedResources = (resourcesData || []).map(resource => ({
        ...resource,
        isSelected: selectedIds.has(resource.id)
      }));
      
      setResources(combinedResources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleResource = (resourceId: string) => {
    setResources(prev => prev.map(resource => 
      resource.id === resourceId 
        ? { ...resource, isSelected: !resource.isSelected }
        : resource
    ));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const selectedIds = resources
        .filter(r => r.isSelected)
        .map(r => r.id);

      // First, clear all resources for this module
      const { error: clearError } = await supabase
        .from('resources')
        .update({ module_id: null })
        .eq('module_id', moduleId);

      if (clearError) throw clearError;

      // Then, assign selected resources to this module
      if (selectedIds.length > 0) {
        const { error: assignError } = await supabase
          .from('resources')
          .update({ module_id: moduleId })
          .in('id', selectedIds);

        if (assignError) throw assignError;
      }

      setSuccess('Resources updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resources');
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

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
          onClick={() => navigate(`/admin/courses/${module.class_id}/modules`)}
          className="flex items-center text-[#F98B3D] hover:text-[#e07a2c] mb-4"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Modules
        </button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Manage Resources for {module.title}
            </h1>
            <p className="text-gray-600">
              Click the buttons to add or remove resources from this module.
            </p>
          </div>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Changes
          </Button>
        </div>

        {error && (
          <Alert type="error" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" title="Success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Available Resources */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Available Resources</h2>
            <div className="bg-gray-50 p-4 rounded-lg min-h-[500px]">
              {resources
                .filter(resource => !resource.isSelected)
                .map(resource => (
                  <div
                    key={resource.id}
                    className="bg-white p-4 rounded-md shadow-sm mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        {getResourceIcon(resource.type)}
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{resource.title}</div>
                          <div className="text-sm text-gray-500">{resource.description}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleResource(resource.id)}
                        leftIcon={<Plus size={16} />}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Selected Resources */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Module Resources</h2>
            <div className="bg-gray-50 p-4 rounded-lg min-h-[500px]">
              {resources
                .filter(resource => resource.isSelected)
                .map(resource => (
                  <div
                    key={resource.id}
                    className="bg-white p-4 rounded-md shadow-sm mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        {getResourceIcon(resource.type)}
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{resource.title}</div>
                          <div className="text-sm text-gray-500">{resource.description}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleResource(resource.id)}
                        leftIcon={<Minus size={16} />}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleResourcesPage;