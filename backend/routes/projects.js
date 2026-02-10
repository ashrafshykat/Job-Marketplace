import express from 'express';
import prisma from '../prisma/client.js';
import { protect, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// @route   POST /api/projects
// @desc    Create a new project (Buyer only)
// @access  Private/Buyer
router.post('/', protect, authorize('buyer'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, budget, deadline } = req.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        buyerId: req.user.id,
        budget: budget ? parseFloat(budget) : undefined,
        deadline: deadline ? new Date(deadline) : undefined
      },
      include: {
        buyer: {
          select: { name: true, email: true }
        },
        assignedSolver: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects
// @desc    Get all projects (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let where = {};
    
    // Buyers see only their projects
    if (req.user.role === 'buyer') {
      where.buyerId = req.user.id;
    }
    // Problem solvers see only open or assigned projects
    else if (req.user.role === 'problem_solver') {
      where.OR = [
        { status: 'open' },
        { assignedSolverId: req.user.id }
      ];
    }
    // Admins see all

    const projects = await prisma.project.findMany({
      where,
      include: {
        buyer: {
          select: { name: true, email: true }
        },
        assignedSolver: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: {
          select: { name: true, email: true }
        },
        assignedSolver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check access permissions
    if (req.user.role === 'buyer' && project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'problem_solver' && 
        project.status === 'open' && 
        project.assignedSolverId !== req.user.id) {
      // Problem solvers can view open projects to request
      // But can only view assigned projects if they're the assigned solver
    }

    // Get requests for this project
    const requests = await prisma.request.findMany({
      where: { projectId: project.id },
      include: {
        solver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get tasks if project is assigned
    let tasks = [];
    if (project.assignedSolverId) {
      tasks = await prisma.task.findMany({
        where: { projectId: project.id },
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({ 
      project,
      requests,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/assign
// @desc    Assign a problem solver to a project (Buyer only)
// @access  Private/Buyer
router.put('/:id/assign', protect, authorize('buyer'), [
  body('solverId').notEmpty().withMessage('Solver ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { solverId } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if buyer owns the project
    if (project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        assignedSolverId: solverId,
        status: 'assigned'
      },
      include: {
        buyer: {
          select: { name: true, email: true }
        },
        assignedSolver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      }
    });

    // Update the accepted request
    await prisma.request.updateMany({
      where: {
        projectId: project.id,
        solverId: solverId
      },
      data: { status: 'accepted' }
    });

    // Reject other requests
    await prisma.request.updateMany({
      where: {
        projectId: project.id,
        solverId: { not: solverId }
      },
      data: { status: 'rejected' }
    });

    res.json({ 
      message: 'Project assigned successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
