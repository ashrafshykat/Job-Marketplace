'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { projectsAPI, tasksAPI, submissionsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Clock, CheckCircle, Upload, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SolverProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    deadline: '',
  });
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState('');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectsAPI.getById(projectId),
        tasksAPI.getByProject(projectId),
      ]);
      setProject(projectRes.data.project);
      setTasks(tasksRes.data.tasks);
      
      // Fetch submissions
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tasksAPI.create({
        projectId,
        title: taskForm.title,
        description: taskForm.description,
        deadline: taskForm.deadline,
      });
      toast.success('Task created successfully');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', deadline: '' });
      fetchProjectData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await tasksAPI.update(taskId, { status });
      toast.success('Task status updated');
      fetchProjectData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleSubmitFile = async (taskId: string) => {
    if (!submissionFile) {
      toast.error('Please select a ZIP file');
      return;
    }

    if (!submissionFile.name.endsWith('.zip')) {
      toast.error('Only ZIP files are allowed');
      return;
    }

    try {
      await submissionsAPI.create(taskId, submissionFile, submissionMessage);
      toast.success('Submission uploaded successfully');
      setShowSubmissionModal(null);
      setSubmissionFile(null);
      setSubmissionMessage('');
      fetchProjectData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit file');
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

  if (!project) {
    return (
      <ProtectedRoute allowedRoles={['problem_solver']}>
        <div className="text-center py-12">
          <p className="text-gray-600">Project not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['problem_solver']}>
      <div>
        <Link href="/solver/projects">
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
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            {project.status !== 'open' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTaskModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Task
              </motion.button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {tasks.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tasks yet. Create your first task!</p>
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
                    <div className="flex items-center space-x-2 mt-4">
                      {task.status === 'pending' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleUpdateTaskStatus(task._id, 'in_progress')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Start Task
                        </motion.button>
                      )}
                      {task.status === 'in_progress' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSubmissionModal(task._id)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Submit Work
                          </motion.button>
                        </>
                      )}
                      {submission && (
                        <div className="ml-auto text-sm text-gray-600 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          {submission.status === 'pending' && 'Pending Review'}
                          {submission.status === 'accepted' && (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accepted
                            </span>
                          )}
                          {submission.status === 'rejected' && (
                            <span className="text-red-600">Rejected</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Create Task Modal */}
        <AnimatePresence>
          {showTaskModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowTaskModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
              >
                <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      required
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowTaskModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submission Modal */}
        <AnimatePresence>
          {showSubmissionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowSubmissionModal(null);
                setSubmissionFile(null);
                setSubmissionMessage('');
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Submit Work</h2>
                  <button
                    onClick={() => {
                      setShowSubmissionModal(null);
                      setSubmissionFile(null);
                      setSubmissionMessage('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP File
                    </label>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Only ZIP files are allowed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      value={submissionMessage}
                      onChange={(e) => setSubmissionMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Add any notes about your submission..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmissionModal(null);
                        setSubmissionFile(null);
                        setSubmissionMessage('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubmitFile(showSubmissionModal)}
                      disabled={!submissionFile}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

