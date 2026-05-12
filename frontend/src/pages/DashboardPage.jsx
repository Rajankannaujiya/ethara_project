import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare, Clock, AlertTriangle, FolderOpen, TrendingUp,
  ArrowRight, Calendar, User
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { format, isPast } from "date-fns";

const STATUS_LABEL = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const PRIORITY_BADGE = {
  LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high"
};
const STATUS_BADGE = {
  TODO: "badge-todo", IN_PROGRESS: "badge-in-progress", DONE: "badge-done"
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-card flex items-start gap-4 animate-slide-up">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-display font-700 text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard")
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completionRate = stats?.totalTasks
    ? Math.round((stats.byStatus.DONE / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-700 text-white">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          <span className="text-indigo-400">{user?.name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckSquare}
          label="Total Tasks"
          value={stats?.totalTasks ?? 0}
          color="bg-indigo-600/20 text-indigo-300"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats?.byStatus?.IN_PROGRESS ?? 0}
          color="bg-amber-500/20 text-amber-300"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={stats?.overdue ?? 0}
          color="bg-rose-500/20 text-rose-300"
        />
        <StatCard
          icon={FolderOpen}
          label="Projects"
          value={stats?.totalProjects ?? 0}
          color="bg-emerald-500/20 text-emerald-300"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="glass-card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Task Progress
            </h2>
            <span className="text-sm text-slate-400">{completionRate}% complete</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "TODO", label: "To Do", color: "text-slate-300", bg: "bg-slate-700/50" },
              { key: "IN_PROGRESS", label: "In Progress", color: "text-amber-300", bg: "bg-amber-500/10" },
              { key: "DONE", label: "Done", color: "text-emerald-300", bg: "bg-emerald-500/10" },
            ].map(({ key, label, color, bg }) => (
              <div key={key} className={`${bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-display font-700 ${color}`}>
                  {stats?.byStatus?.[key] ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks per user */}
        <div className="glass-card">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-indigo-400" />
            By Assignee
          </h2>
          {Object.keys(stats?.tasksPerUser || {}).length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No assignments yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.tasksPerUser)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-indigo-600/30 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300 flex-shrink-0">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 truncate">{name}</span>
                        <span className="text-xs text-slate-500 ml-2">{count}</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${(count / Math.max(...Object.values(stats.tasksPerUser))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Recent Tasks
          </h2>
          <Link to="/projects" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            View projects <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {stats?.recentTasks?.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No tasks yet. Create a project to get started!</p>
        ) : (
          <div className="space-y-2">
            {stats?.recentTasks?.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                    <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {task.project?.name}
                    {task.dueDate && (
                      <span className={isPast(new Date(task.dueDate)) && task.status !== "DONE" ? " text-rose-400" : ""}>
                        {" · "}Due {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                  </p>
                </div>
                <span className={STATUS_BADGE[task.status]}>{STATUS_LABEL[task.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
