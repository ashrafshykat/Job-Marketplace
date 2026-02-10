'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { projectsAPI, requestsAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { Briefcase, Clock, User, Send, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Project {
  _id: string;
  title: string;
  description: string;
  status: string;
  buyer: { name: string; email: string };
  createdAt: string;
}

export default function SolverProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, requestsRes] = await Promise.all([
        projectsAPI.getAll(),
        requestsAPI.getAll(),
      ]);
      setProjects(projectsRes.data.projects);
      setRequests(requestsRes.data.requests);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (projectId: string) => {
    setRequesting(projectId);
    try {
      await requestsAPI.create({ projectId });
      toast.success('Request sent successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setRequesting(null);
    }
  };

  const hasRequested = (projectId: string) => {
    return requests.some((r) => r.project._id === projectId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['problem_solver']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  const openProjects = projects.filter((p) => p.status === 'open');
  const myProjects = projects.filter((p) => p.status !== 'open');

  return (
    <ProtectedRoute allowedRoles={['problem_solver']}>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Projects</h1>
          <p className="text-gray-600">Find projects to work on</p>
        </div>

        {openProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Projects</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {openProjects.map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Briefcase className="w-8 h-8 text-primary-600" />
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Buyer: {project.buyer.name}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                  {hasRequested(project._id) ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Request Sent
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRequest(project._id)}
                      disabled={requesting === project._id}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {requesting === project._id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Request to Work
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {myProjects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Assigned Projects</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myProjects.map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Briefcase className="w-8 h-8 text-primary-600" />
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  <Link href={`/solver/projects/${project._id}`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
                    >
                      Manage Tasks
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {openProjects.length === 0 && myProjects.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No projects available</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

