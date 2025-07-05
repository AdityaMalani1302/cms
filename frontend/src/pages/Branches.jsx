import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card, Badge, LoadingSpinner, Button } from '../components/ui';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/api/branches');
      if (response.data.success) {
        setBranches(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBranchColor = (index) => {
    const colors = [
      'from-primary-500 to-primary-600',
      'from-success-500 to-success-600',
      'from-blue-500 to-blue-600',
      'from-warning-500 to-warning-600',
      'from-danger-500 to-danger-600',
      'from-purple-500 to-purple-600'
    ];
    return colors[index % colors.length];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading branches..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative gradient-bg-success overflow-hidden py-20">
        <div className="absolute inset-0 hero-pattern"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <i className="fas fa-map-marked-alt text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-display mb-4">
              Our Branch Network
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Find our service centers near you for convenient package drop-off and pickup services
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 font-display mb-4">
              Service <span className="text-gradient">Centers</span>
            </h2>
            <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
              Our nationwide network ensures reliable courier services in major cities across the country
            </p>
          </motion.div>

          {branches.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {branches.map((branch, index) => (
                <motion.div key={branch.id} variants={itemVariants}>
                  <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                    <div className="p-6">
                      {/* Branch Icon */}
                      <div className="text-center mb-6">
                        <div className={`w-20 h-20 bg-gradient-to-br ${getBranchColor(index)} rounded-3xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-6`}>
                          <i className="fas fa-building text-white text-2xl"></i>
                        </div>
                      </div>

                      {/* Branch Header */}
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                          {branch.branchName}
                        </h3>
                        <Badge variant="primary" size="sm">
                          Branch Office
                        </Badge>
                      </div>

                      {/* Branch Details */}
                      <div className="space-y-4">
                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-primary-200 transition-colors duration-200">
                            <i className="fas fa-phone text-primary-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">Contact Number</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{branch.branchContactNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-success-200 transition-colors duration-200">
                            <i className="fas fa-envelope text-success-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">Email Address</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200 break-all">{branch.branchEmail}</p>
                          </div>
                        </div>

                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-warning-200 transition-colors duration-200">
                            <i className="fas fa-map-marker-alt text-warning-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">Address</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{branch.branchAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-blue-200 transition-colors duration-200">
                            <i className="fas fa-city text-blue-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">City</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{branch.branchCity}</p>
                          </div>
                        </div>

                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-purple-200 transition-colors duration-200">
                            <i className="fas fa-map text-purple-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">State & Pincode</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{branch.branchState} - {branch.branchPincode}</p>
                          </div>
                        </div>

                        <div className="flex items-start group/item">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <i className="fas fa-globe text-indigo-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">Country</p>
                            <p className="font-semibold text-secondary-800 dark:text-secondary-200">{branch.branchCountry}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-600">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon="fas fa-directions"
                          className="flex-1"
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(branch.branchAddress + ', ' + branch.branchCity)}`)}
                        >
                          Directions
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon="fas fa-phone"
                          className="flex-1"
                          onClick={() => window.open(`tel:${branch.branchContactNumber}`)}
                        >
                          Call Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-24 h-24 bg-secondary-100 dark:bg-secondary-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-map-marked-alt text-secondary-400 dark:text-secondary-300 text-3xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                No Branches Found
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 max-w-md mx-auto">
                We're expanding our network. Check back soon for new locations in your area!
              </p>
            </motion.div>
          )}

          {/* Statistics Section */}
          {branches.length > 0 && (
            <motion.div
              className="mt-20 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card variant="gradient" className="p-8">
                <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-8">
                  Our Network at a Glance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gradient mb-2">
                      {branches.length}
                    </div>
                    <p className="text-secondary-600 dark:text-secondary-400">Active Branches</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gradient mb-2">
                      {new Set(branches.map(b => b.branchState)).size}
                    </div>
                    <p className="text-secondary-600 dark:text-secondary-400">States Covered</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gradient mb-2">
                      {new Set(branches.map(b => b.branchCity)).size}
                    </div>
                    <p className="text-secondary-600 dark:text-secondary-400">Cities Served</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Branches; 