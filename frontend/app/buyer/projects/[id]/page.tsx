'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { projectsAPI, requestsAPI, tasksAPI, submissionsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, CheckCircle, XCircle, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function BuyerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'tasks'>('requests');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, requestsRes, tasksRes] = await Promise.all([
        projectsAPI.getById(projectId),
        requestsAPI.getByProject(projectId),
        tasksAPI.getByProject(projectId),
      ]);
      setProject(projectRes.data.project);
      setRequests(requestsRes.data.requests);
      setTasks(tasksRes.data.tasks);
      
      // Fetch submissions for all tasks
      const submissionsMap: Record<string, any> = {};
      for (const task of tasksRes.data.tasks) {
        try {
          const subRes = await submissionsAPI.getByTask(task._id);
          submissionsMap[task._id] = subRes.data.submission;
        } catch (error) {
          // No submission yet
        }
      }
      setSubmissions(submissionsMap);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch project data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (solverId: string) => {
    try {
      await projectsAPI.assign(projectId, solverId);
      toast.success('Problem solver assigned successfully');
      fetchProjectData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign solver');
    }
  };

  const handleReviewSubmission = async (submissionId: string, status: 'accepted' | 'rejected') => {
    try {
      await submissionsAPI.review(submissionId, status);
      toast.success(`Submission ${status} successfully`);
      fetchProjectData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to review submission');
    }
  };

  const handleDownload = async (submissionId: string) => {
    try {
      const response = await submissionsAPI.download(submissionId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submission-${submissionId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute allowedRoles={['buyer']}>
        <div className="text-center py-12">
          <p className="text-gray-600">Project not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['buyer']}>
      <div>
        <Link href="/buyer/projects">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </motion.button>
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
              <p className="text-gray-600">{project.description}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              project.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
              project.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
              project.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.assignedSolver && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700">
                  Assigned to: <span className="font-medium">{project.assignedSolver.name}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-3 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Requests ({requests.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-6 py-3 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tasks ({tasks.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'requests' ? (
                <motion.div
                  key="requests"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {requests.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No requests yet</p>
                  ) : (
                    requests.map((request) => (
                      <motion.div
                        key={request._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <User className="w-5 h-5 text-gray-600 mr-2" />
                              <span className="font-medium">{request.solver.name}</span>
                              <span className="ml-2 text-sm text-gray-500">({request.solver.email})</span>
                            </div>
                            {request.solver.profile && (
                              <div className="ml-7 text-sm text-gray-600 mb-2">
                                {request.solver.profile.bio && <p>{request.solver.profile.bio}</p>}
                                {request.solver.profile.skills && request.solver.profile.skills.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {request.solver.profile.skills.map((skill: string, idx: number) => (
                                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {request.message && (
                              <p className="ml-7 text-sm text-gray-600">{request.message}</p>
                            )}
                            <p className="ml-7 text-xs text-gray-500 mt-2">
                              {format(new Date(request.createdAt), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                          {project.status === 'open' && request.status === 'pending' && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleAssign(request.solver._id)}
                              className="ml-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Assign
                            </motion.button>
                          )}
                          {request.status === 'accepted' && (
                            <span className="ml-4 text-green-600 flex items-center">
                              <CheckCircle className="w-5 h-5 mr-1" />
                              Accepted
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {tasks.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No tasks yet</p>
                  ) : (
                    tasks.map((task) => {
                      const submission = submissions[task._id];

                      return (
                        <motion.div
                          key={task._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{task.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <div className="flex items-center mt-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                Deadline: {format(new Date(task.deadline), 'MMM d, yyyy')}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          {submission && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Submission</p>
                                  <p className="text-xs text-gray-500">{submission.fileName}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDownload(submission._id)}
                                    className="p-2 text-gray-600 hover:text-gray-900"
                                  >
                                    <Download className="w-5 h-5" />
                                  </motion.button>
                                  {submission.status === 'pending' && (
                                    <>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleReviewSubmission(submission._id, 'accepted')}
                                        className="p-2 text-green-600 hover:text-green-700"
                                      >
                                        <CheckCircle className="w-5 h-5" />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleReviewSubmission(submission._id, 'rejected')}
                                        className="p-2 text-red-600 hover:text-red-700"
                                      >
                                        <XCircle className="w-5 h-5" />
                                      </motion.button>
                                    </>
                                  )}
                                  {submission.status === 'accepted' && (
                                    <span className="text-green-600 flex items-center">
                                      <CheckCircle className="w-5 h-5 mr-1" />
                                      Accepted
                                    </span>
                                  )}
                                  {submission.status === 'rejected' && (
                                    <span className="text-red-600 flex items-center">
                                      <XCircle className="w-5 h-5 mr-1" />
                                      Rejected
                                    </span>
                                  )}
                                </div>
                              </div>
                              {submission.message && (
                                <p className="text-sm text-gray-600 mt-2">{submission.message}</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

