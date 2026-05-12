const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Helper: check if user is admin of project
async function isProjectAdmin(projectId, userId) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member?.role === "ADMIN";
}

// GET /api/projects — list all projects user belongs to
router.get("/", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/projects — create project (creator becomes ADMIN)
router.post(
  "/",
  [body("name").trim().notEmpty().withMessage("Project name is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    try {
      const project = await prisma.project.create({
        data: {
          name,
          description,
          ownerId: req.user.id,
          members: {
            create: { userId: req.user.id, role: "ADMIN" },
          },
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { tasks: true } },
        },
      });
      res.status(201).json(project);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// GET /api/projects/:id
router.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const isMember = project.members.some((m) => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/projects/:id — admin only
router.put("/:id", async (req, res) => {
  const { name, description } = req.body;
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ error: "Admin access required" });

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/projects/:id — admin only
router.delete("/:id", async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ error: "Admin access required" });

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/projects/:id/members — add member (admin only)
router.post("/:id/members", async (req, res) => {
  const { email, role = "MEMBER" } = req.body;
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ error: "Admin access required" });

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ error: "User not found" });

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: req.params.id, userId: userToAdd.id },
      },
    });
    if (existing) return res.status(409).json({ error: "User already a member" });

    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId: userToAdd.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member (admin only)
router.delete("/:id/members/:userId", async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ error: "Admin access required" });

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: req.params.id,
          userId: req.params.userId,
        },
      },
    });
    res.json({ message: "Member removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
