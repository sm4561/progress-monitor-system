// Data model documentation for developers

// User document (Firestore /users/{uid})
/*
User {
  uid: string
  email: string
  displayName: string
  role: "user" | "admin"
  startDate: Timestamp
  timezone: string
  targetDailyMinutes: number
  theme: "system" | "light" | "dark"
}
*/

// Week template document (/weekTemplates/{id}) id: "P1", "W1", ...
/*
WeekTemplate {
  id: string
  kind: "prereq" | "placement"
  title: string
  description: string
  days: DayTemplate[]
  totalTasks: number
}
DayTemplate {
  dayIndex: number
  title: string
  defaultSubjects: string[]
  tasks: TaskTemplate[]
}
TaskTemplate {
  id: string
  title: string
  subject: string
  estimatedMinutes: number
  problemListUrl?: string
}
*/

// Daily log document (/dailyLogs/{autoId})
/*
DailyLog {
  userId: string
  date: Timestamp
  weekId: string
  dayIndex: number
  tasksCompleted: number
  totalTasks: number
  subjects: string[]
  status: "present" | "absent" | "excused"
  effortScore: number
  focusScore: number
  completionScore: number
  learningScore: number
  consistencyScore: number
  totalScore: number
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
*/
