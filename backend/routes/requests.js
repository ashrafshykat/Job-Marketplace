import express from 'express';
import prisma from '../prisma/client.js';
import { protect, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// @route   POST /api/requests
// @desc    Create a request to work on a project (Problem Solver only)
// @access  Private/Problem Solver
router.post('/', protect, authorize('problem_solver'), [
  body('projectId').notEmpty().withMessage('Project ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, message } = req.body;

    // Check if project exists and is open
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ message: 'Project is not open for requests' });
    }

    // Check if request already exists
    const existingRequest = await prisma.request.findUnique({
      where: {
        projectId_solverId: {
          projectId: projectId,
          solverId: req.user.id
        }
      }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already exists' });
    }

    const request = await prisma.request.create({
      data: {
        projectId,
        solverId: req.user.id,
        message
      },
      include: {
        project: {
          select: { title: true, description: true, status: true }
        },
        solver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      }
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Request already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests
// @desc    Get requests (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'buyer') {
      // Buyers see requests for their projects
      const buyerProjects = await prisma.project.findMany({
        where: { buyerId: req.user.id },
        select: { id: true }
      });
      where.projectId = { in: buyerProjects.map(p => p.id) };
    } else if (req.user.role === 'problem_solver') {
      // Problem solvers see their own requests
      where.solverId = req.user.id;
    }

    const requests = await prisma.request.findMany({
      where,
      include: {
        project: {
          include: {
            buyer: {
              select: { name: true, email: true }
            }
          }
        },
        solver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/requests/project/:projectId
// @desc    Get all requests for a specific project
// @access  Private
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the buyer
    if (req.user.role === 'buyer' && project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const requests = await prisma.request.findMany({
      where: { projectId: req.params.projectId },
      include: {
        solver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
