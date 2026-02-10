import express from 'express';
import prisma from '../prisma/client.js';
import { protect, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// @route   POST /api/tasks
// @desc    Create a task for an assigned project (Problem Solver only)
// @access  Private/Problem Solver
router.post('/', protect, authorize('problem_solver'), [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('deadline').notEmpty().withMessage('Deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, title, description, deadline } = req.body;

    // Check if project exists and is assigned to this solver
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.assignedSolverId) {
      return res.status(400).json({ message: 'Project is not assigned yet' });
    }

    if (project.assignedSolverId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create tasks for this project' });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        userId: req.user.id, // Problem solver who creates the task
        title,
        description,
        deadline: new Date(deadline),
        status: 'pending'
      },
      include: {
        project: {
          select: { title: true, status: true }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Update project status
    if (project.status === 'assigned') {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'in_progress' }
      });
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'buyer') {
      // Buyers see tasks for their projects
      const buyerProjects = await prisma.project.findMany({
        where: { buyerId: req.user.id },
        select: { id: true }
      });
      where.projectId = { in: buyerProjects.map(p => p.id) };
    } else if (req.user.role === 'problem_solver') {
      // Problem solvers see tasks for their assigned projects
      const solverProjects = await prisma.project.findMany({
        where: { assignedSolverId: req.user.id },
        select: { id: true }
      });
      where.projectId = { in: solverProjects.map(p => p.id) };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { title: true, status: true, buyerId: true, assignedSolverId: true }
        },
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tasks/project/:projectId
// @desc    Get all tasks for a specific project
// @access  Private
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check access
    if (req.user.role === 'buyer' && project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'problem_solver' && 
        project.assignedSolverId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          select: { title: true, status: true, buyerId: true, assignedSolverId: true }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task (Problem Solver can update status, Buyer can review)
// @access  Private
router.put('/:id', protect, [
  body('status').optional().isIn(['pending', 'in_progress', 'submitted', 'completed', 'rejected'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: true
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, deadline, status } = req.body;
    let updateData = {};

    // Problem solvers can update their tasks
    if (req.user.role === 'problem_solver') {
      if (task.project.assignedSolverId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (deadline) updateData.deadline = new Date(deadline);
      if (status && ['pending', 'in_progress', 'submitted'].includes(status)) {
        updateData.status = status;
      }
    }

    // Buyers can update task status to completed/rejected
    if (req.user.role === 'buyer') {
      if (task.project.buyerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      if (status && ['completed', 'rejected'].includes(status)) {
        updateData.status = status;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        project: {
          select: { title: true, status: true }
        },
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
