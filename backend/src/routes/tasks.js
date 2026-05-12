const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Helper: get user's role in a project
async function getUserRole(projectId, userId) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member?.role || null;
}

// GET /api/tasks?projectId=xxx — get tasks for a project
router.get("/", async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  try {
    const role = await getUserRole(projectId, req.user.id);
    if (!role) return res.status(403).json({ error: "Access denied" });

    const where = { projectId };
    // Members only see assigned tasks
    if (role === "MEMBER") {
      where.assigneeId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/tasks — create task (admin only)
router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("projectId").notEmpty().withMessage("projectId is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, dueDate, priority, assigneeId, projectId } = req.body;

    try {
      const role = await getUserRole(projectId, req.user.id);
      if (role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

      const task = await prisma.task.create({
        data: {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || "MEDIUM",
          projectId,
          assigneeId: assigneeId || null,
          creatorId: req.user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const role = await getUserRole(task.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: "Access denied" });
    if (role === "MEMBER" && task.assigneeId !== req.user.id)
      return res.status(403).json({ error: "Access denied" });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/tasks/:id — admin: full edit; member: status only
router.put("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const role = await getUserRole(task.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: "Access denied" });

    let updateData = {};

    if (role === "ADMIN") {
      const { title, description, dueDate, priority, assigneeId, status } = req.body;
      updateData = {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(status && { status }),
      };
    } else {
      // Member can only update status of their assigned task
      if (task.assigneeId !== req.user.id)
        return res.status(403).json({ error: "Access denied" });
      if (!req.body.status) return res.status(400).json({ error: "Only status can be updated" });
      updateData = { status: req.body.status };
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/tasks/:id — admin only
router.delete("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const role = await getUserRole(task.projectId, req.user.id);
    if (role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
