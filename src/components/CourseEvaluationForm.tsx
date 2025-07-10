import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import Button from './Button';
import Alert from './Alert';

interface CourseEvaluationFormProps {
  courseId: string;
  userId: string;
  onClose: () => void;
}

const CourseEvaluationForm: React.FC<CourseEvaluationFormProps> = ({ courseId, userId, onClose }) => {
  const [formData, setFormData] = useState({
    overallRating: '',
    mostValuableTip: '',
    appropriatePace: '',
    moreConfident: '',
    planToUse: '',
    interestedInProgram: false,
    interestedInOrganization: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: submitError } = await supabase
        .from('course_evaluations')
        .insert([
          {
            course_id: courseId,
            user_id: userId,
            overall_rating: formData.overallRating,
            most_valuable_tip: formData.mostValuableTip,
            appropriate_pace: formData.appropriatePace,
            more_confident: formData.moreConfident,
            plan_to_use: formData.planToUse,
            interested_in_program: formData.interestedInProgram,
            interested_in_organization: formData.interestedInOrganization
          }
        ]);
      
      if (submitError) throw submitError;
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      setError('Failed to submit your evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">ChatGPT Productivity Class – Quick Survey</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            Thank you for attending! Your feedback helps us improve and continue delivering high-impact sessions.
          </p>
          
          {error && (
            <Alert
              type="error"
              title="Error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          {success ? (
            <Alert
              type="success"
              title="Thank You!"
            >
              Your feedback has been submitted successfully! We appreciate your input.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. How would you rate this session overall?
                </label>
                <div className="space-y-2">
                  {['Excellent', 'Good', 'Fair', 'Needs Improvement'].map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        type="radio"
                        id={`rating-${option}`}
                        name="overallRating"
                        value={option}
                        checked={formData.overallRating === option}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300"
                      />
                      <label htmlFor={`rating-${option}`} className="ml-2 text-gray-700">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="mostValuableTip" className="block text-sm font-medium text-gray-700 mb-2">
                  2. What was the most valuable tip or feature you learned today?
                </label>
                <textarea
                  id="mostValuableTip"
                  name="mostValuableTip"
                  value={formData.mostValuableTip}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. Was the pace and format of the session appropriate?
                </label>
                <div className="space-y-2">
                  {['Yes', 'No – Too fast', 'No – Too slow'].map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        type="radio"
                        id={`pace-${option}`}
                        name="appropriatePace"
                        value={option}
                        checked={formData.appropriatePace === option}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300"
                      />
                      <label htmlFor={`pace-${option}`} className="ml-2 text-gray-700">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  4. Do you feel more confident using ChatGPT to improve your productivity?
                </label>
                <div className="space-y-2">
                  {['Yes', 'Somewhat', 'Not yet'].map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        type="radio"
                        id={`confident-${option}`}
                        name="moreConfident"
                        value={option}
                        checked={formData.moreConfident === option}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300"
                      />
                      <label htmlFor={`confident-${option}`} className="ml-2 text-gray-700">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="planToUse" className="block text-sm font-medium text-gray-700 mb-2">
                  5. What's one way you plan to use ChatGPT differently after this session?
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  (We may share select responses on social media. Feel free to keep it short and creative!)
                </p>
                <textarea
                  id="planToUse"
                  name="planToUse"
                  value={formData.planToUse}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Stay Connected</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Let us know if you'd like to explore more:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="interestedInProgram"
                      name="interestedInProgram"
                      checked={formData.interestedInProgram}
                      onChange={handleChange}
                      className="h-4 w-4 mt-1 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300 rounded"
                    />
                    <label htmlFor="interestedInProgram" className="ml-2 text-sm text-gray-700">
                      I'm interested in receiving more information about the "Unlocking ChatGPT: Work Smarter, Not Harder" program.
                      <span className="block text-xs font-medium text-[#F98B3D] mt-1">
                        Special offer: $500 for the full 5-week program (exclusive for today's attendees).
                      </span>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="interestedInOrganization"
                      name="interestedInOrganization"
                      checked={formData.interestedInOrganization}
                      onChange={handleChange}
                      className="h-4 w-4 mt-1 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300 rounded"
                    />
                    <label htmlFor="interestedInOrganization" className="ml-2 text-sm text-gray-700">
                      I'd like to learn more about how One80Labs can help my organization automate workflows and AI solutions.
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Submit Feedback
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseEvaluationForm;