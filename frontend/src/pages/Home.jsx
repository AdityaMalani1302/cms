import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const Home = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [aboutData, setAboutData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAboutData();
    fetchBranches();
  }, []);

  const fetchAboutData = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/pages/aboutus`);
      if (response.data.success) {
        setAboutData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching about data:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/branches`);
      if (response.data.success) {
        setBranches(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleTrackingSubmit = (e) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate('/track-parcel', { state: { searchData: trackingNumber } });
    } else {
      toast.error('Please enter a tracking number');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(`${baseURL}/api/contact`, {
        name: contactForm.name,
        mobileNumber: contactForm.phone,
        email: contactForm.email,
        message: contactForm.message
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setContactForm({ name: '', phone: '', email: '', message: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };



  const services = [
    {
      icon: 'fas fa-ship',
      title: 'Sea Freight',
      description: 'Cost-effective international shipping solutions for large cargo and bulk deliveries across continents.',
      image: '/images/hero/sea_freight.jpg',
      fallback: '/images/hero/sea_freight.jpg',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: 'fas fa-plane',
      title: 'Air Freight',
      description: 'Fast and secure air delivery for urgent packages and time-sensitive shipments worldwide.',
      image: '/images/services/air-freight.jpg',
      fallback: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: 'fas fa-box',
      title: 'Package Forwarding',
      description: 'Professional package handling and forwarding services with tracking and insurance options.',
      image: '/images/services/package-forwarding.jpg',
      fallback: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative gradient-bg hero-pattern overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white animate-slide-up">
              <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight">
                Fast & Reliable 
                <span className="block text-warning-300">Courier Services</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
                Track your packages with ease. We provide secure, timely delivery services 
                across the country with real-time tracking and 24/7 customer support.
              </p>

              {/* Tracking Form */}
              <div className="card-elevated p-6 bg-white/10 backdrop-blur-lg border border-white/20">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-warning-500 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-search text-white text-sm"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Track Your Package</h3>
                </div>
                <form onSubmit={handleTrackingSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter your tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/90 border border-white/30 rounded-xl focus:ring-4 focus:ring-warning-300 focus:border-warning-500 transition-all duration-300 text-secondary-800 placeholder-secondary-500"
                  />
                  <button
                    type="submit"
                    className="btn-primary bg-gradient-to-r from-warning-500 to-warning-600 hover:from-warning-600 hover:to-warning-700 whitespace-nowrap"
                  >
                    <i className="fas fa-search mr-2"></i>
                    Track Now
                  </button>
                </form>
              </div>
            </div>

            <div className="hidden lg:block animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-warning-500/30 to-primary-500/30 rounded-3xl blur-3xl"></div>
                <img
                  src="https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
                  alt="Delivery Services"
                  className="relative rounded-3xl shadow-2xl w-full h-96 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 font-display mb-4">
              Our <span className="text-gradient">Services</span>
            </h2>
            <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
              We offer comprehensive delivery solutions for all your shipping needs with state-of-the-art technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="card group hover-glow animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-8">
                  {/* Service Image */}
                  <div className="relative mb-6 overflow-hidden rounded-2xl">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = service.fallback;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>

                  {/* Service Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center mb-4 mx-auto transform group-hover:rotate-12 transition-transform duration-300`}>
                    <i className={`${service.icon} text-white text-2xl`}></i>
                  </div>

                  <h3 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4 text-center">
                    {service.title}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed text-center">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white dark:bg-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-up">
              <h2 className="text-4xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 font-display mb-6">
                {aboutData?.pageTitle || 'About Our Company'}
              </h2>
              <div className="text-lg text-secondary-600 dark:text-secondary-400 leading-relaxed space-y-4">
                {aboutData ? (
                  <div dangerouslySetInnerHTML={{ __html: aboutData.pageDescription }} />
                ) : (
                  <div>
                    <p key="about-para-1">
                      We are a leading courier service provider committed to delivering your packages 
                      safely and on time. With years of experience and a network of reliable partners, 
                      we ensure your shipments reach their destination efficiently.
                    </p>
                    <p key="about-para-2">
                      Our state-of-the-art tracking system provides real-time updates, giving you peace 
                      of mind throughout the delivery process.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-6">
                                  <div className="text-center">
                    <div className="text-3xl font-bold text-gradient">50K+</div>
                    <div className="text-secondary-600 dark:text-secondary-400">Packages Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gradient">24/7</div>
                    <div className="text-secondary-600 dark:text-secondary-400">Customer Support</div>
                  </div>
              </div>
            </div>

            <div className="animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-success-500/30 rounded-3xl blur-3xl"></div>
                <img
                  src="/images/hero/image.jpg"
                  alt="About Our Delivery Services"
                  className="relative rounded-3xl shadow-2xl w-full h-96 object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-secondary-800 dark:to-primary-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 font-display mb-4">
              Our <span className="text-gradient">Branches</span>
            </h2>
            <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
              Find our service centers near you for convenient package drop-off and pickup
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {branches.slice(0, 6).map((branch, index) => (
              <div
                key={branch._id || branch.id || index}
                className="card group animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4">
                      <i className="fas fa-building text-white text-lg"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-secondary-800 dark:text-secondary-200">{branch.branchName}</h3>
                      <span className="text-sm text-secondary-500 dark:text-secondary-400">Branch Office</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                      <i className="fas fa-phone text-primary-500 w-5"></i>
                      <span className="ml-3">{branch.branchContactNumber}</span>
                    </div>
                    <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                      <i className="fas fa-envelope text-primary-500 w-5"></i>
                      <span className="ml-3">{branch.branchEmail}</span>
                    </div>
                    <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                      <i className="fas fa-map-marker-alt text-primary-500 w-5"></i>
                      <span className="ml-3">{branch.branchCity}, {branch.branchState}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {branches.length > 6 && (
            <div className="text-center mt-12">
              <button
                onClick={() => navigate('/branches')}
                className="btn-primary"
              >
                <i className="fas fa-map-marked-alt mr-2"></i>
                View All Branches
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white dark:bg-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold text-secondary-800 dark:text-secondary-200 font-display mb-4">
              Get In <span className="text-gradient">Touch</span>
            </h2>
            <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="card-elevated animate-scale-in">
              <div className="p-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-user text-primary-500 mr-2"></i>
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={contactForm.name}
                        onChange={handleContactChange}
                        required
                        className="input-field"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                        <i className="fas fa-phone text-primary-500 mr-2"></i>
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={contactForm.phone}
                        onChange={handleContactChange}
                        required
                        className="input-field"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-envelope text-primary-500 mr-2"></i>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      required
                      className="input-field"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                      <i className="fas fa-comment text-primary-500 mr-2"></i>
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactChange}
                      required
                      rows={5}
                      className="input-field resize-none"
                      placeholder="Enter your message"
                    />
                  </div>
                  <div className="text-center">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 