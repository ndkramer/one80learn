import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { ArrowLeft } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Admin Portal</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <p className="text-gray-600 mb-4">
          Welcome to the One80Learn administration portal. From here you can manage users and system settings.
        </p>
        <p className="text-gray-600">
          Select an option from the sidebar to get started.
        </p>
      </div>
      <Button
        onClick={() => navigate('/dashboard')}
        variant="outline"
        leftIcon={<ArrowLeft size={16} />}
      >
        Return to Main Dashboard
      </Button>
    </div>
  );
};

export default AdminDashboard;