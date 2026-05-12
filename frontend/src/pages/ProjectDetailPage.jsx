import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, X, Loader2, Trash2, Users, UserPlus, ChevronLeft,
  CalendarDays, Flag, User, MoreVertical, Edit2, CheckCircle2, Circle, Timer
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format, isPast } from "date-fns";

const PRIORITY_BADGE = {
  LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high"
};
const STATUS_BADGE = {
  TODO: "badge-todo", IN_PROGRESS: "badge-in-progress", DONE: "badge-done"
};
const STATUS_LABEL = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const STATUS_COLS = ["TODO", "IN_PROGRESS", "DONE"];
const STATUS_ICONS = {
  TODO: Circle, IN_PROGRESS: Timer, DONE: CheckCircle2
};
const STATUS_COLORS = {
  TODO: "text-slate-400", IN_PROGRESS: "text-amber-400", DONE: "text-emerald-400"
};

// Task Card
function TaskCard({ task, isAdmin, onStatusChange, onEdit, onDelete }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
  const StatusIcon = STATUS_ICONS[task.status];

  return (
    <div className="glass border border-slate-700/40 rounded-xl p-3.5 group hover:border-slate-600/60 transition-all duration-200 animate-slide-up">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-200 leading-snug flex-1">{task.title}</p>
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 rounded"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-400 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-2.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
        {isOverdue && (
          <span className="bg-rose-500/20 text-rose-300 text-xs font-medium px-2 py-0.5 rounded-full border border-rose-500/30">
            Overdue
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-indigo-600/30 border border-indigo-500/30 rounded-full flex items-center justify-center text-[10px] font-semibold text-indigo-300 flex-shrink-0">
                {task.assignee.name[0]}
              </div>
              <span className="text-xs text-slate-400 truncate max-w-[80px]">{task.assignee.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-600">Unassigned</span>
          )}
          {task.dueDate && (
            <span className={`text-xs ${isOverdue ? "text-rose-400" : "text-slate-500"} flex items-center gap-0.5`}>
              <CalendarDays className="w-3 h-3" />
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
        </div>

        {/* Status selector */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs bg-slate-800 border border-slate-700 rounded-md px-1.5 py-0.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
    </div>
  );
}

// Task Modal
function TaskModal({ task, members, projectId, onClose, onSave }) {
  const isEdit = !!task;
  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          description: task.description || "",
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
          priority: task.priority,
          status: task.status,
          assigneeId: task.assigneeId || "",
        }
      : { title: "", description: "", dueDate: "", priority: "MEDIUM", status: "TODO", assigneeId: "" }
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, projectId, assigneeId: form.assigneeId || null };
      const { data } = isEdit
        ? await api.put(`/tasks/${task.id}`, payload)
        : await api.post("/tasks", payload);
      onSave(data, isEdit);
      toast.success(isEdit ? "Task updated!" : "Task created!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">{isEdit ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Describe what needs to be done..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select
                className="input"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Member Modal
function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdd(data);
      toast.success("Member added!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Add Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="member@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null); // null | "create" | task object
  const [memberModal, setMemberModal] = useState(false);
  const [activeTab, setActiveTab] = useState("board");

  const isAdmin = project?.members?.some(
    (m) => m.userId === user?.id && m.role === "ADMIN"
  );

  const load = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?projectId=${id}`),
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
    } catch (err) {
      toast.error("Failed to load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (taskId, status) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleTaskSave = (task, isEdit) => {
    if (isEdit) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } else {
      setTasks((prev) => [task, ...prev]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
      }));
      toast.success("Member removed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove member");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success("Project deleted");
      navigate("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tasksByStatus = STATUS_COLS.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Modals */}
      {taskModal !== null && (
        <TaskModal
          task={taskModal === "create" ? null : taskModal}
          members={project.members}
          projectId={id}
          onClose={() => setTaskModal(null)}
          onSave={handleTaskSave}
        />
      )}
      {memberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setMemberModal(false)}
          onAdd={(member) =>
            setProject((prev) => ({ ...prev, members: [...prev.members, member] }))
          }
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Projects
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-700 text-white">{project.name}</h1>
            {project.description && (
              <p className="text-slate-400 text-sm mt-1 max-w-lg">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button className="btn-secondary" onClick={() => setMemberModal(true)}>
                  <UserPlus className="w-4 h-4" /> Add Member
                </button>
                <button className="btn-primary" onClick={() => setTaskModal("create")}>
                  <Plus className="w-4 h-4" /> New Task
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl w-fit mb-6 border border-slate-700/50">
        {["board", "members"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "board" ? "Board" : "Members"}
          </button>
        ))}
      </div>

      {/* Board view */}
      {activeTab === "board" && (
        <div className="grid lg:grid-cols-3 gap-4">
          {STATUS_COLS.map((status) => {
            const Icon = STATUS_ICONS[status];
            return (
              <div key={status} className="glass rounded-xl p-4 min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${STATUS_COLORS[status]}`} />
                    <h3 className="font-medium text-slate-200 text-sm">{STATUS_LABEL[status]}</h3>
                    <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-md font-mono">
                      {tasksByStatus[status].length}
                    </span>
                  </div>
                  {isAdmin && status === "TODO" && (
                    <button
                      onClick={() => setTaskModal("create")}
                      className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-indigo-400 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {tasksByStatus[status].length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-6">No tasks</p>
                  ) : (
                    tasksByStatus[status].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isAdmin={isAdmin}
                        onStatusChange={handleStatusChange}
                        onEdit={(t) => setTaskModal(t)}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members view */}
      {activeTab === "members" && (
        <div className="glass-card max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Team Members ({project.members.length})
            </h2>
            {isAdmin && (
              <button className="btn-secondary text-sm py-1.5" onClick={() => setMemberModal(true)}>
                <UserPlus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>
          <div className="space-y-2">
            {project.members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors"
              >
                <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center font-semibold text-indigo-300 text-sm flex-shrink-0">
                  {m.user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{m.user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.role === "ADMIN"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-slate-700 text-slate-400"
                  }`}>
                    {m.role}
                  </span>
                  {isAdmin && m.userId !== user.id && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-rose-400 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <button onClick={handleDeleteProject} className="btn-danger text-sm">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
