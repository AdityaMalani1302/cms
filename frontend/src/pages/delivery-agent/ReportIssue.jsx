import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const ReportIssue = () => {
  const navigate = useNavigate();
  const { deliveryId } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [, ] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const [issueData, setIssueData] = useState({
    deliveryId: deliveryId || '',
    issueType: '',
    severity: 'medium',
    title: '',
    description: '',
    customerNotAvailable: false,
    addressIssue: false,
    vehicleProblem: false,
    packageDamaged: false,
    photos: [],
    location: null
  });

  const issueTypes = [
    { value: 'delivery_failed', label: 'Delivery Failed', icon: 'fa-exclamation-triangle', color: 'text-red-600' },
    { value: 'customer_unavailable', label: 'Customer Unavailable', icon: 'fa-user-times', color: 'text-orange-600' },
    { value: 'address_issue', label: 'Address Issue', icon: 'fa-map-marker-alt', color: 'text-yellow-600' },
    { value: 'package_damaged', label: 'Package Damaged', icon: 'fa-box-open', color: 'text-red-600' },
    { value: 'vehicle_problem', label: 'Vehicle Problem', icon: 'fa-truck', color: 'text-purple-600' },
    { value: 'safety_concern', label: 'Safety Concern', icon: 'fa-shield-alt', color: 'text-red-600' },
    { value: 'weather_delay', label: 'Weather Delay', icon: 'fa-cloud-rain', color: 'text-blue-600' },
    { value: 'other', label: 'Other Issue', icon: 'fa-question-circle', color: 'text-gray-600' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800', description: 'Minor inconvenience' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800', description: 'Moderate impact' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-800', description: 'Significant problem' },
    { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-900', description: 'Urgent attention needed' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('deliveryAgentToken');
    if (!token) {
      navigate('/delivery-agent/login');
      return;
    }

    // Get current location
    getCurrentLocation();
  }, [navigate]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIssueData(prev => ({
            ...prev,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `issue_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setIssueData(prev => ({
          ...prev,
          photos: [...prev.photos, file]
        }));
        toast.success('Photo captured!');
      }, 'image/jpeg', 0.8);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const removePhoto = (index) => {
    setIssueData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!issueData.issueType || !issueData.title || !issueData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('deliveryAgentToken');
      const formData = new FormData();
      
      // Append text data
      Object.keys(issueData).forEach(key => {
        if (key !== 'photos' && key !== 'location') {
          formData.append(key, issueData[key]);
        }
      });

      // Append location
      if (issueData.location) {
        formData.append('location', JSON.stringify(issueData.location));
      }
      
      // Append photos
      issueData.photos.forEach((photo, index) => {
        formData.append('photos', photo);
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/report-issue`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Issue reported successfully!');
        navigate(deliveryId ? '/delivery-agent/assignments' : '/delivery-agent/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to report issue';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(deliveryId ? '/delivery-agent/assignments' : '/delivery-agent/dashboard')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mr-2"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                Report Issue
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {deliveryId ? `Delivery: ${deliveryId}` : 'General Issue Report'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Issue Type
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {issueTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setIssueData(prev => ({ ...prev, issueType: type.value }))}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    issueData.issueType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <i className={`fas ${type.icon} ${type.color} text-2xl mb-2`}></i>
                  <p className="text-sm font-medium">{type.label}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Severity Level */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Severity Level
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {severityLevels.map(level => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setIssueData(prev => ({ ...prev, severity: level.value }))}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    issueData.severity === level.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${level.color}`}>
                    {level.label}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{level.description}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Issue Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Issue Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issue Title *
                </label>
                <input
                  type="text"
                  value={issueData.title}
                  onChange={(e) => setIssueData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  value={issueData.description}
                  onChange={(e) => setIssueData(prev => ({ ...prev, description: e.target.value }))}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please provide detailed information about the issue, what happened, when it occurred, and any other relevant details..."
                  required
                />
              </div>

              {deliveryId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Flags
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={issueData.customerNotAvailable}
                        onChange={(e) => setIssueData(prev => ({ ...prev, customerNotAvailable: e.target.checked }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Customer was not available</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={issueData.addressIssue}
                        onChange={(e) => setIssueData(prev => ({ ...prev, addressIssue: e.target.checked }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Address is incorrect or incomplete</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={issueData.packageDamaged}
                        onChange={(e) => setIssueData(prev => ({ ...prev, packageDamaged: e.target.checked }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Package is damaged</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={issueData.vehicleProblem}
                        onChange={(e) => setIssueData(prev => ({ ...prev, vehicleProblem: e.target.checked }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Vehicle problem affecting delivery</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Photo Evidence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Photo Evidence (Optional)
            </h3>
            
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <i className="fas fa-camera text-gray-400 text-2xl mb-2"></i>
                <p className="text-gray-600 dark:text-gray-400">Tap to add photo evidence</p>
              </button>
            ) : (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: '300px' }}
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    <i className="fas fa-camera mr-2"></i>
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Captured Photos */}
            {issueData.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photos ({issueData.photos.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {issueData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </motion.div>

          {/* Location Info */}
          {issueData.location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4"
            >
              <div className="flex items-center text-blue-800 dark:text-blue-200">
                <i className="fas fa-map-marker-alt mr-2"></i>
                <span className="text-sm">
                  Location captured: {issueData.location.latitude.toFixed(6)}, {issueData.location.longitude.toFixed(6)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={submitting || !issueData.issueType || !issueData.title || !issueData.description}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Submitting Report...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Submit Issue Report
              </div>
            )}
          </motion.button>
        </form>

        {/* Help Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-4"
        >
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
            <i className="fas fa-info-circle mr-2"></i>
            Reporting Guidelines
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Provide as much detail as possible to help resolve the issue quickly</li>
            <li>• Include photos when relevant (damaged packages, address issues, etc.)</li>
            <li>• For urgent safety concerns, contact your supervisor immediately</li>
            <li>• You will receive updates on your report via the app notifications</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportIssue; 