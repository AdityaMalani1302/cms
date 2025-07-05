import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const QRScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [, setScannedData] = useState(null);
  const [packageInfo, setPackageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
    if (!token) {
      navigate('/delivery-agent/login');
      return;
    }

    // Load QR scanner library dynamically
    loadQRScanner();

    return () => {
      stopCamera();
    };
  }, [navigate]);

  const loadQRScanner = async () => {
    try {
      // You would typically load a QR scanner library here
      // For this example, we'll simulate QR scanning with manual input
  
    } catch (error) {
      console.error('Failed to load QR scanner:', error);
      setShowManualEntry(true);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        startQRDetection();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Camera access required for QR scanning');
      setShowManualEntry(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setScanning(false);
    }
  };

  // Simulated QR detection - in real implementation, use a QR scanner library
  const startQRDetection = () => {
    // This would be replaced with actual QR detection logic
    
  };

  const fetchPackageInfo = async (identifier) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/package-info/${identifier}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setPackageInfo(response.data.data);
        toast.success('Package information loaded');
      } else {
        toast.error('Package not found or not assigned to you');
        setPackageInfo(null);
      }
    } catch (error) {
      console.error('Error fetching package info:', error);
      if (error.response?.status === 404) {
        toast.error('Package not found');
      } else if (error.response?.status === 403) {
        toast.error('This package is not assigned to you');
      } else {
        toast.error('Failed to load package information');
      }
      setPackageInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualEntry.trim()) {
      toast.error('Please enter a tracking number or QR code');
      return;
    }
    
    setScannedData(manualEntry.trim());
    fetchPackageInfo(manualEntry.trim());
    setManualEntry('');
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!packageInfo) return;

    try {
      const token = localStorage.getItem('agentToken') || localStorage.getItem('deliveryAgentToken');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/status/${packageInfo._id}`,
        {
          status: newStatus,
          remark: `Status updated via QR scan to ${newStatus}`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(`Package status updated to ${newStatus}`);
        setPackageInfo(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      toast.error('Failed to update package status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Intransit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pickup':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setPackageInfo(null);
    setShowManualEntry(false);
    if (!scanning) {
      startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/delivery-agent/dashboard')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mr-2"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                Package Scanner
              </h1>
            </div>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <i className="fas fa-keyboard"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Scanner Section */}
        {!packageInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
          >
            {showManualEntry ? (
              // Manual Entry Form
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-keyboard text-blue-600 dark:text-blue-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Enter Tracking Number
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Type the tracking number or QR code manually
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
                      placeholder="Enter tracking number"
                      autoFocus
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Searching...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <i className="fas fa-search mr-2"></i>
                          Find Package
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualEntry(false);
                        startCamera();
                      }}
                      className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    >
                      <i className="fas fa-camera"></i>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Camera Scanner
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-qrcode text-blue-600 dark:text-blue-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Scan QR Code
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Point your camera at the package QR code
                  </p>
                </div>

                {!scanning ? (
                  <button
                    onClick={startCamera}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    <i className="fas fa-camera text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Tap to start camera
                    </p>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover"
                      />
                      {/* Scanner overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg">
                          <div className="w-6 h-6 border-t-4 border-l-4 border-white absolute top-2 left-2"></div>
                          <div className="w-6 h-6 border-t-4 border-r-4 border-white absolute top-2 right-2"></div>
                          <div className="w-6 h-6 border-b-4 border-l-4 border-white absolute bottom-2 left-2"></div>
                          <div className="w-6 h-6 border-b-4 border-r-4 border-white absolute bottom-2 right-2"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 text-center">
                        <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
                          Align QR code within the frame
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <i className="fas fa-times mr-2"></i>
                      Stop Camera
                    </button>
                  </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            )}
          </motion.div>
        )}

        {/* Package Information */}
        {packageInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Package Information
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(packageInfo.status)}`}>
                  {packageInfo.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tracking Number</p>
                    <p className="font-medium text-gray-800 dark:text-white">{packageInfo.refNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Weight</p>
                    <p className="font-medium text-gray-800 dark:text-white">{packageInfo.weight} kg</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recipient</p>
                  <p className="font-medium text-gray-800 dark:text-white">{packageInfo.recipientName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{packageInfo.recipientAddress}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sender</p>
                  <p className="font-medium text-gray-800 dark:text-white">{packageInfo.senderName}</p>
                </div>

                {packageInfo.expectedDeliveryDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expected Delivery</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {new Date(packageInfo.expectedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {packageInfo.status === 'Pickup' && (
                  <button
                    onClick={() => handleStatusUpdate('Intransit')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Mark as Collected
                  </button>
                )}

                {packageInfo.status === 'Intransit' && (
                  <button
                    onClick={() => handleStatusUpdate('Out for Delivery')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-truck mr-2"></i>
                    Mark Out for Delivery
                  </button>
                )}

                {packageInfo.status === 'Out for Delivery' && (
                  <button
                    onClick={() => navigate(`/delivery-agent/deliver/${packageInfo._id}`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-hand-holding-heart mr-2"></i>
                    Complete Delivery
                  </button>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/delivery-agent/delivery-details/${packageInfo._id}`)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <i className="fas fa-info-circle mr-2"></i>
                    View Details
                  </button>
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(packageInfo.recipientAddress)}`, '_blank')}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <i className="fas fa-directions mr-2"></i>
                    Navigate
                  </button>
                </div>

                <button
                  onClick={resetScanner}
                  className="w-full border border-blue-600 text-blue-600 dark:text-blue-400 py-3 px-4 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                >
                  <i className="fas fa-qrcode mr-2"></i>
                  Scan Another Package
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        {!packageInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4"
          >
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              Scanning Tips
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Ensure good lighting for better scanning</li>
              <li>• Hold the camera steady and close to the QR code</li>
              <li>• Make sure the entire QR code is within the frame</li>
              <li>• Use manual entry if camera scanning fails</li>
            </ul>
          </motion.div>
        )}
      </div>


    </div>
  );
};

export default QRScanner; 