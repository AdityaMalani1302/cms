import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const DeliveryConfirmation = () => {
  const navigate = useNavigate();
  const { deliveryId } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [deliveryData, setDeliveryData] = useState({
    deliveredTo: '',
    recipientRelation: 'self',
    otp: '',
    notes: '',
    photos: [],
    signature: null
  });
  
  // Camera and signature refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('deliveryAgentToken');
    if (!token) {
      navigate('/delivery-agent/login');
      return;
    }
    fetchDeliveryDetails();
  }, [deliveryId, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeliveryDetails = async () => {
    try {
      const token = localStorage.getItem('deliveryAgentToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/delivery/${deliveryId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setDelivery(response.data.data);
        setDeliveryData(prev => ({
          ...prev,
          deliveredTo: response.data.data.recipientName
        }));
      }
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      if (error.response?.status === 401) {
        navigate('/delivery-agent/login');
      } else {
        toast.error('Failed to load delivery details');
        navigate('/delivery-agent/assignments');
      }
    } finally {
      setLoading(false);
    }
  };

  // Camera functions
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
        const file = new File([blob], `delivery_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setDeliveryData(prev => ({
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

  // Signature functions
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = signatureCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const ctx = signatureCanvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = signatureCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const ctx = signatureCanvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Save signature as base64
      const signature = signatureCanvasRef.current.toDataURL();
      setDeliveryData(prev => ({ ...prev, signature }));
    }
  };

  const clearSignature = () => {
    const ctx = signatureCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
    setDeliveryData(prev => ({ ...prev, signature: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!deliveryData.deliveredTo || !deliveryData.signature) {
      toast.error('Please fill in recipient name and signature');
      return;
    }

    if (delivery.requiresOTP && !deliveryData.otp) {
      toast.error('OTP is required for this delivery');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('deliveryAgentToken');
      const formData = new FormData();
      
      // Append text data
      formData.append('deliveredTo', deliveryData.deliveredTo);
      formData.append('recipientRelation', deliveryData.recipientRelation);
      formData.append('notes', deliveryData.notes);
      formData.append('signature', deliveryData.signature);
      
      if (deliveryData.otp) {
        formData.append('otp', deliveryData.otp);
      }
      
      // Append photos
      deliveryData.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/delivery-agent/delivery/${deliveryId}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Delivery completed successfully!');
        navigate('/delivery-agent/assignments');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to complete delivery';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/delivery-agent/assignments')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mr-2"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                Delivery Confirmation
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                #{delivery?.refNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
        >
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Delivery Information</h3>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">To:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">{delivery?.recipientName}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Address:</span>
              <span className="ml-2 text-gray-800 dark:text-white">{delivery?.recipientAddress}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Phone:</span>
              <span className="ml-2 text-gray-800 dark:text-white">{delivery?.recipientContactNumber}</span>
            </p>
          </div>
        </motion.div>

        {/* Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivered To */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Recipient Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivered To
                </label>
                <input
                  type="text"
                  value={deliveryData.deliveredTo}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveredTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of person who received the package"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship to Recipient
                </label>
                <select
                  value={deliveryData.recipientRelation}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, recipientRelation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="self">Self</option>
                  <option value="family">Family Member</option>
                  <option value="friend">Friend</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="security">Security Guard</option>
                  <option value="office">Office Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {delivery?.requiresOTP && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OTP Verification
                  </label>
                  <input
                    type="text"
                    value={deliveryData.otp}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, otp: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter OTP provided by recipient"
                    maxLength="6"
                    required
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Photo Capture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Proof of Delivery</h3>
            
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <i className="fas fa-camera text-gray-400 text-2xl mb-2"></i>
                <p className="text-gray-600 dark:text-gray-400">Tap to take delivery photo</p>
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
            {deliveryData.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Captured Photos ({deliveryData.photos.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {deliveryData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Delivery proof ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setDeliveryData(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, i) => i !== index)
                        }))}
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

          {/* Digital Signature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Digital Signature</h3>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <canvas
                ref={signatureCanvasRef}
                width={300}
                height={150}
                className="w-full border rounded"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ touchAction: 'none' }}
              />
              <div className="flex justify-between mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recipient's signature required
                </p>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={deliveryData.notes}
              onChange={(e) => setDeliveryData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any additional information about the delivery..."
            />
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={submitting || !deliveryData.deliveredTo || !deliveryData.signature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Completing Delivery...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <i className="fas fa-check-circle mr-2"></i>
                Complete Delivery
              </div>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default DeliveryConfirmation; 