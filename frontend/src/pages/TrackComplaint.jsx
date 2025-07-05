import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import moment from 'moment';
import { Card, Badge, Button, Input } from '../components/ui';

const TrackComplaint = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [complaintResult, setComplaintResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ticketNumber.trim()) {
      toast.error('Please enter a ticket number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/complaints/track/${ticketNumber.trim()}`);
      
      if (response.data.success) {
        setComplaintResult(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Invalid ticket number');
        setComplaintResult(null);
      } else {
        toast.error('Error occurred while tracking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Open':
        return 'danger';
      case 'In Progress':
        return 'warning';
      case 'Closed':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Open':
        return 'fas fa-exclamation-circle';
      case 'In Progress':
        return 'fas fa-clock';
      case 'Closed':
        return 'fas fa-check-circle';
      default:
        return 'fas fa-info-circle';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative gradient-bg overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-ticket-alt text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Track Your Complaint
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Enter your ticket number to check the status and progress of your complaint
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Search Form */}
            <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-search text-white text-xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">Enter Ticket Number</h2>
                  <p className="text-secondary-600 dark:text-secondary-400">Input your complaint ticket number to track its status</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        label="Ticket Number"
                        leftIcon="fas fa-hashtag"
                        type="text"
                        placeholder="Enter your ticket number (e.g., #12345)"
                        value={ticketNumber}
                        onChange={(e) => setTicketNumber(e.target.value)}
                        required
                        fullWidth
                      />
                    </div>
                    <div className="sm:mt-7">
                      <Button
                        type="submit"
                        loading={loading}
                        leftIcon={loading ? undefined : "fas fa-search"}
                        size="lg"
                        className="w-full sm:w-auto px-8"
                      >
                        {loading ? 'Tracking...' : 'Track Now'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            </motion.div>

            {/* Complaint Results */}
            {complaintResult && (
              <motion.div
                variants={itemVariants}
                className="max-w-5xl mx-auto space-y-8"
              >
                {/* Header */}
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                    Complaint Details
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Ticket #{complaintResult.ticketNumber}
                  </p>
                </div>

                {/* Main Details Card */}
                <Card variant="elevated" className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="text-center lg:text-left">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4">
                          <i className="fas fa-ticket-alt text-white text-2xl"></i>
                        </div>
                        <h4 className="text-xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                          Complaint Information
                        </h4>
                        <Badge
                          variant={getStatusBadgeVariant(complaintResult.status)}
                          icon={getStatusIcon(complaintResult.status)}
                          size="lg"
                        >
                          {complaintResult.status}
                        </Badge>
                      </div>

                      {/* Key Details */}
                      <div className="space-y-4">
                        <div className="flex items-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
                            <i className="fas fa-hashtag text-white text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">Ticket Number</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">#{complaintResult.ticketNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                            <i className="fas fa-barcode text-white text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">Tracking Number</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{complaintResult.trackingNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <h5 className="text-lg font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                          Complaint Details
                        </h5>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">Nature of Complaint</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-200 dark:border-warning-800">
                              {complaintResult.natureOfComplaint}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">Issue Description</p>
                            <p className="text-secondary-800 dark:text-secondary-200 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl leading-relaxed">
                              {complaintResult.issueDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-8 pt-8 border-t border-secondary-200 dark:border-secondary-700">
                    <h5 className="text-lg font-bold text-secondary-800 dark:text-secondary-200 mb-6">
                      Timeline
                    </h5>
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center mr-4">
                          <i className="fas fa-calendar-plus text-white"></i>
                        </div>
                        <div>
                          <p className="font-semibold text-primary-800 dark:text-primary-300">Complaint Submitted</p>
                          <p className="text-sm text-primary-600 dark:text-primary-400">
                            {moment(complaintResult.createdAt).format('MMMM DD, YYYY [at] HH:mm')}
                          </p>
                        </div>
                      </div>

                      {complaintResult.updationDate && (
                        <div className="flex items-center p-4 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 dark:border-success-800">
                          <div className="w-10 h-10 bg-success-500 rounded-xl flex items-center justify-center mr-4">
                            <i className="fas fa-calendar-check text-white"></i>
                          </div>
                          <div>
                            <p className="font-semibold text-success-800 dark:text-success-300">Last Updated</p>
                            <p className="text-sm text-success-600 dark:text-success-400">
                              {moment(complaintResult.updationDate).format('MMMM DD, YYYY [at] HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Remark */}
                  {complaintResult.remark && (
                    <div className="mt-8 pt-8 border-t border-secondary-200 dark:border-secondary-700">
                      <h5 className="text-lg font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                        Admin Response
                      </h5>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                            <i className="fas fa-user-shield text-white"></i>
                          </div>
                          <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Administrator</p>
                            <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
                              {complaintResult.remark}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Additional Info */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-info-circle text-white"></i>
                    </div>
                    <h5 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Need Additional Help?</h5>
                    <p className="text-blue-600 dark:text-blue-400 mb-4">
                      If you have any questions or concerns about your complaint, please contact our customer support team.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" leftIcon="fas fa-phone" onClick={() => window.open('tel:+911234567890')}>
                        Call Support
                      </Button>
                      <Button variant="ghost" leftIcon="fas fa-envelope" onClick={() => window.open('mailto:support@cms.com')}>
                        Email Us
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Help Section */}
            <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
              <Card className="p-6 bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-800 dark:to-primary-900/20">
                <div className="text-center">
                  <h5 className="text-lg font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                    Need Help?
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-xl shadow-sm">
                      <i className="fas fa-plus-circle text-primary-500 text-2xl mb-2"></i>
                      <p className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                        Submit New Complaint
                      </p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                        Don't have a ticket number?
                      </p>
                      <Button size="sm" leftIcon="fas fa-exclamation-circle" onClick={() => window.location.href = '/raise-complaint'}>
                        Raise Complaint
                      </Button>
                    </div>
                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-xl shadow-sm">
                      <i className="fas fa-search text-success-500 text-2xl mb-2"></i>
                      <p className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                        Track Your Parcel
                      </p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                        Check delivery status
                      </p>
                      <Button variant="success" size="sm" leftIcon="fas fa-package" onClick={() => window.location.href = '/track-parcel'}>
                        Track Parcel
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TrackComplaint; 