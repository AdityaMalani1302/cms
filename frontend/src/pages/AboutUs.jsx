import React from 'react';
import { motion } from 'framer-motion';

const AboutUs = () => {

  const values = [
    {
      icon: 'fas fa-shield-alt',
      title: 'Security First',
      description: 'Your packages are protected with advanced security measures throughout the delivery process.',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: 'fas fa-clock',
      title: 'On-Time Delivery',
      description: 'We pride ourselves on punctual deliveries and reliable service you can count on.',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: 'fas fa-heart',
      title: 'Customer Care',
      description: '24/7 customer support to assist you with all your shipping needs and queries.',
      color: 'text-red-600 dark:text-red-400'
    },
    {
      icon: 'fas fa-globe',
      title: 'Global Reach',
      description: 'Extensive network covering domestic and international shipping destinations.',
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  const stats = [
    { number: '50,000+', label: 'Packages Delivered', icon: 'fas fa-box' },
    { number: '10,000+', label: 'Happy Customers', icon: 'fas fa-users' },
    { number: '25+', label: 'Cities Covered', icon: 'fas fa-map-marker-alt' },
    { number: '99.8%', label: 'Delivery Success Rate', icon: 'fas fa-chart-line' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 dark:text-white mb-6">
              About <span className="text-gradient">CMS</span>
            </h1>
            <p className="text-xl text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto leading-relaxed">
              Leading the future of courier and logistics services with innovative technology, 
              reliable delivery solutions, and unmatched customer care.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-lg"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-bullseye text-primary-600 dark:text-primary-400 text-xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">Our Mission</h2>
              </div>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                To provide fast, reliable, and secure courier services that connect people and businesses 
                across the globe. We strive to make shipping simple, transparent, and affordable for everyone.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-secondary-800 rounded-2xl p-8 shadow-lg"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center mr-4">
                  <i className="fas fa-eye text-success-600 dark:text-success-400 text-xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-secondary-900 dark:text-white">Our Vision</h2>
              </div>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                To become the world's most trusted courier service provider, revolutionizing logistics 
                through technology innovation while maintaining human-centered customer service.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-secondary-800">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-secondary-600 dark:text-secondary-300">
              These numbers reflect our commitment to excellence and customer satisfaction
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-700 dark:to-secondary-800"
              >
                <i className={`${stat.icon} text-3xl text-primary-600 dark:text-primary-400 mb-4`}></i>
                <div className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-secondary-600 dark:text-secondary-300 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-secondary-600 dark:text-secondary-300 max-w-2xl mx-auto">
              These values guide everything we do and shape our commitment to exceptional service
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-secondary-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-center">
                  <i className={`${value.icon} text-3xl ${value.color} mb-4`}></i>
                  <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>




    </div>
  );
};

export default AboutUs; 