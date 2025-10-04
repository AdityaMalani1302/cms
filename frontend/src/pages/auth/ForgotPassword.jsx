import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { LoadingSpinner } from '../../components/ui';

const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // email, questions, reset
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // First check if user has security questions
      const response = await axios.post(`${baseURL}/api/auth/forgot-password-user`, {
        email: email.trim()
      });

      if (response.data.success && response.data.hasSecurityQuestions) {
        // Get security questions
        const questionsResponse = await axios.get(`${baseURL}/api/auth/security-questions/${email.trim()}`);
        
        if (questionsResponse.data.success) {
          setSecurityQuestions(questionsResponse.data.data.questions);
          setAnswers(new Array(questionsResponse.data.data.questions.length).fill(''));
          setStep('questions');
        } else {
          toast.error('No security questions found for this account');
        }
      } else {
        toast.info(response.data.message);
      }
    } catch (error) {
      console.error('Email submission error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to process request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityQuestionsSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all answers are filled
    if (answers.some(answer => !answer.trim())) {
      toast.error('Please answer all security questions');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const formattedAnswers = answers.map((answer, index) => ({
        questionIndex: index,
        answer: answer.trim()
      }));

      const response = await axios.post(`${baseURL}/api/auth/verify-security-questions`, {
        email: email.trim(),
        answers: formattedAnswers
      });

      if (response.data.success) {
        setResetToken(response.data.resetToken);
        setStep('reset');
        toast.success('Security questions verified! You can now reset your password.');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Security questions verification error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to verify security questions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(`${baseURL}/api/auth/reset-password-user`, {
        resetToken,
        newPassword
      });

      if (response.data.success) {
        toast.success('Password reset successfully! You can now login with your new password.');
        setStep('success');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Reset Password
            </h2>
            <p className="text-gray-600">
              {step === 'email' && 'Enter your email to get started'}
              {step === 'questions' && 'Answer your security questions'}
              {step === 'reset' && 'Create your new password'}
              {step === 'success' && 'Password reset successful!'}
            </p>
          </div>

          <div className="mt-8">
            {/* Step 1: Email Input */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Processing...</span>
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Security Questions */}
            {step === 'questions' && (
              <form onSubmit={handleSecurityQuestionsSubmit} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm">
                    <i className="fas fa-info-circle mr-2"></i>
                    Answer your security questions to verify your identity
                  </p>
                </div>

                {securityQuestions.map((sq, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {sq.question}
                    </label>
                    <input
                      type="text"
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your answer"
                    />
                  </div>
                ))}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Verifying...</span>
                    </>
                  ) : (
                    'Verify Answers'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to email
                </button>
              </form>
            )}

            {/* Step 3: Password Reset */}
            {step === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 text-sm">
                    <i className="fas fa-check-circle mr-2"></i>
                    Security questions verified! Create your new password below.
                  </p>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Resetting...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <i className="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Password Reset Successful!</h3>
                  <p className="text-green-700">
                    Your password has been reset successfully. You can now login with your new password.
                  </p>
                </div>

                <Link
                  to="/customer/login"
                  className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Go to Login
                </Link>
              </div>
            )}

            {/* Back to Login Link */}
            {step !== 'success' && (
              <div className="text-center mt-6">
                <Link
                  to="/customer/login"
                  className="text-primary-600 hover:text-primary-500 text-sm"
                >
                  ← Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Academic Project Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800 text-sm">
            <i className="fas fa-graduation-cap mr-2"></i>
            <strong>Academic Project:</strong> This password recovery system uses security questions instead of email for demonstration purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;