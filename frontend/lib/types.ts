export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskStatus = "todo" | "doing" | "done" | "blocked";

export type ReminderKind = "normal" | "persistent";

export type Reminder = {
  id: string;
  user_id: string;
  task_id: string;
  project_id: string;
  kind: ReminderKind;
  start_at: string;
  end_at: string | null;
  frequency_minutes: number | null;
  is_stealth: boolean;
  codename_id: string | null;
  last_fired_at: string | null;
  next_fire_at: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: number;
  priority_reason: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
