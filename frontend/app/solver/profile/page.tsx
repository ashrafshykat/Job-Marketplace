'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { User, Save, Plus, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '@/components/animations/PageTransition';
import AnimatedButton from '@/components/animations/Button';
import AnimatedCard from '@/components/animations/Card';

export default function SolverProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    skills: [] as string[],
    experience: '',
    portfolio: '',
  });
  const [newSkill, setNewSkill] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        bio: user.profile.bio || '',
        skills: user.profile.skills || [],
        experience: user.profile.experience || '',
        portfolio: user.profile.portfolio || '',
      });
    }
  }, [user]);

  useEffect(() => {
    // GSAP animation for title
    if (titleRef.current) {
      gsap.from(titleRef.current, {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: 'power3.out'
      });
    }

    // GSAP animation for card
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        delay: 0.2,
        ease: 'back.out(1.7)'
      });
    }
  }, []);

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill('');
      toast.success('Skill added!', {
        icon: '✨',
        duration: 2000,
      });
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
    toast.success('Skill removed', {
      duration: 1500,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.updateProfile(formData);
      await refreshUser();
      toast.success('Profile updated successfully! 🎉', {
        duration: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['problem_solver']}>
      <PageTransition>
        <div className="max-w-3xl mx-auto">
          <motion.div
            ref={titleRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center space-x-3 mb-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-8 h-8 text-primary-600" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            </div>
            <p className="text-gray-600">Update your profile to attract buyers</p>
          </motion.div>

          <AnimatedCard className="p-6" delay={0.1}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <motion.textarea
                  whileFocus={{ scale: 1.01 }}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Tell buyers about yourself..."
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                <div className="flex space-x-2 mb-2">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Add a skill"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
                <AnimatePresence mode="popLayout">
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        layout
                        whileHover={{ scale: 1.1 }}
                        className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                      >
                        {skill}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.2, rotate: 90 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 hover:text-primary-900 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </motion.span>
                    ))}
                  </div>
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience
                </label>
                <motion.textarea
                  whileFocus={{ scale: 1.01 }}
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Describe your experience..."
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio URL
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="https://yourportfolio.com"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <AnimatedButton
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="w-full"
                >
                  <Save className="w-5 h-5 mr-2 inline" />
                  Save Profile
                </AnimatedButton>
              </motion.div>
            </form>
          </AnimatedCard>
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
}
