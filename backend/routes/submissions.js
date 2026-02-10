import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import prisma from '../prisma/client.js';
import { protect, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for ZIP file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `submission-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept ZIP files
  if (file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed' ||
      path.extname(file.originalname).toLowerCase() === '.zip') {
    cb(null, true);
  } else {
    cb(new Error('Only ZIP files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// @route   POST /api/submissions
// @desc    Submit a ZIP file for a task (Problem Solver only)
// @access  Private/Problem Solver
router.post('/', protect, authorize('problem_solver'), upload.single('file'), [
  body('taskId').notEmpty().withMessage('Task ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'ZIP file is required' });
    }

    const { taskId, message } = req.body;

    // Check if task exists and is assigned to this solver
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true
      }
    });

    if (!task) {
      // Delete uploaded file if task doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.project.assignedSolverId !== req.user.id) {
      // Delete uploaded file if not authorized
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if submission already exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { taskId }
    });
    
    if (existingSubmission) {
      // Delete old file
      if (fs.existsSync(existingSubmission.filePath)) {
        fs.unlinkSync(existingSubmission.filePath);
      }
      // Update existing submission
      const updatedSubmission = await prisma.submission.update({
        where: { taskId },
        data: {
          filePath: req.file.path,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          message: message || existingSubmission.message,
          status: 'pending'
        },
        include: {
          task: {
            select: { title: true, status: true }
          },
          project: {
            select: { title: true }
          },
          solver: {
            select: { name: true, email: true }
          }
        }
      });

      // Update task status
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'submitted' }
      });

      return res.json({ 
        message: 'Submission updated successfully',
        submission: updatedSubmission
      });
    }

    // Create new submission
    const submission = await prisma.submission.create({
      data: {
        taskId,
        projectId: task.projectId,
        solverId: req.user.id,
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message
      },
      include: {
        task: {
          select: { title: true, status: true }
        },
        project: {
          select: { title: true }
        },
        solver: {
          select: { name: true, email: true }
        }
      }
    });

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'submitted' }
    });

    res.status(201).json({ 
      message: 'Submission created successfully',
      submission
    });
  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions
// @desc    Get submissions (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'buyer') {
      // Buyers see submissions for their projects
      const buyerProjects = await prisma.project.findMany({
        where: { buyerId: req.user.id },
        select: { id: true }
      });
      where.projectId = { in: buyerProjects.map(p => p.id) };
    } else if (req.user.role === 'problem_solver') {
      // Problem solvers see their own submissions
      where.solverId = req.user.id;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        task: {
          select: { title: true, status: true, deadline: true }
        },
        project: {
          select: { title: true, status: true }
        },
        solver: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ submissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/task/:taskId
// @desc    Get submission for a specific task
// @access  Private
router.get('/task/:taskId', protect, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        project: true
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access
    if (req.user.role === 'buyer' && task.project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'problem_solver' && 
        task.project.assignedSolverId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const submission = await prisma.submission.findUnique({
      where: { taskId: req.params.taskId },
      include: {
        task: {
          select: { title: true, status: true, deadline: true },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        project: {
          select: { title: true }
        },
        solver: {
          select: { name: true, email: true, bio: true, skills: true, experience: true, portfolio: true }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this task' });
    }

    res.json({ submission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/review
// @desc    Review submission - accept or reject (Buyer only)
// @access  Private/Buyer
router.put('/:id/review', protect, authorize('buyer'), [
  body('status').isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        task: true
      }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if buyer owns the project
    if (submission.project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedAt: new Date()
      },
      include: {
        task: {
          select: { title: true, status: true }
        },
        project: {
          select: { title: true }
        },
        solver: {
          select: { name: true, email: true }
        }
      }
    });

    // Update task status
    if (status === 'accepted') {
      await prisma.task.update({
        where: { id: submission.taskId },
        data: { status: 'completed' }
      });

      // Check if all tasks are completed
      const allTasks = await prisma.task.findMany({
        where: { projectId: submission.projectId }
      });
      const allCompleted = allTasks.every(t => t.status === 'completed');
      
      if (allCompleted && allTasks.length > 0) {
        await prisma.project.update({
          where: { id: submission.projectId },
          data: { status: 'completed' }
        });
      }
    } else if (status === 'rejected') {
      await prisma.task.update({
        where: { id: submission.taskId },
        data: { status: 'rejected' }
      });
    }

    res.json({ 
      message: `Submission ${status} successfully`,
      submission: updatedSubmission
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/:id/download
// @desc    Download submission file
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        project: true
      }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access
    if (req.user.role === 'buyer' && 
        submission.project.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'problem_solver' && 
        submission.solverId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!fs.existsSync(submission.filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(submission.filePath, submission.fileName);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
