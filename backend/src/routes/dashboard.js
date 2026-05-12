const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard — global dashboard for the user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get all project IDs user belongs to
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true, role: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    // Tasks accessible to user
    const allTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [
          { project: { members: { some: { userId, role: "ADMIN" } } } },
          { assigneeId: userId },
        ],
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const totalTasks = allTasks.length;
    const byStatus = {
      TODO: allTasks.filter((t) => t.status === "TODO").length,
      IN_PROGRESS: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
      DONE: allTasks.filter((t) => t.status === "DONE").length,
    };
    const overdue = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    ).length;

    // Tasks per user (group by assignee)
    const tasksPerUser = {};
    allTasks.forEach((t) => {
      if (t.assignee) {
        const key = t.assignee.name;
        tasksPerUser[key] = (tasksPerUser[key] || 0) + 1;
      }
    });

    // Recent tasks
    const recentTasks = allTasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      totalTasks,
      byStatus,
      overdue,
      tasksPerUser,
      totalProjects: projectIds.length,
      recentTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/dashboard/project/:id — project-specific stats
router.get("/project/:id", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const now = new Date();

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: "Access denied" });

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const totalTasks = tasks.length;
    const byStatus = {
      TODO: tasks.filter((t) => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      DONE: tasks.filter((t) => t.status === "DONE").length,
    };
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    ).length;

    const tasksPerUser = {};
    tasks.forEach((t) => {
      if (t.assignee) {
        const key = t.assignee.name;
        tasksPerUser[key] = (tasksPerUser[key] || 0) + 1;
      }
    });

    res.json({ totalTasks, byStatus, overdue, tasksPerUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
