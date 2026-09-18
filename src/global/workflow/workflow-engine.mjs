import { TaskStatus, requiresHumanApproval } from "../core/domain-model.mjs";

export function compileWorkflow(template, context = {}) {
  if (!template?.id || !Array.isArray(template.steps)) throw new Error("invalid workflow template");
  const tasks = template.steps.map((step, index) => ({
    key: step.key || `${template.id}:${index + 1}`,
    title: step.title,
    taskType: step.taskType || "manual",
    status: TaskStatus.TODO,
    requiresApproval: Boolean(step.requiresApproval || requiresHumanApproval(step.risk || {})),
    dependsOn: [...(step.dependsOn || [])],
    assigneeType: step.assigneeType || "system",
    metadata: { ...(step.metadata || {}), contextSnapshot: context }
  }));
  validateWorkflow(tasks);
  return { templateId: template.id, version: template.version || 1, tasks };
}

export function validateWorkflow(tasks = []) {
  const keys = new Set(tasks.map((t) => t.key));
  if (keys.size !== tasks.length) throw new Error("workflow task keys must be unique");
  for (const task of tasks) {
    for (const dep of task.dependsOn) if (!keys.has(dep)) throw new Error(`missing dependency: ${dep}`);
  }
  detectCycles(tasks);
  return true;
}

function detectCycles(tasks) {
  const map = new Map(tasks.map((t) => [t.key, t.dependsOn]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    if (visiting.has(key)) throw new Error("workflow dependency cycle detected");
    visiting.add(key);
    for (const dep of map.get(key) || []) visit(dep);
    visiting.delete(key);
    visited.add(key);
  };
  for (const key of map.keys()) visit(key);
}

export function nextExecutableTasks(tasks = []) {
  const done = new Set(tasks.filter((t) => t.status === TaskStatus.DONE).map((t) => t.key));
  return tasks.filter((task) =>
    task.status === TaskStatus.TODO &&
    task.dependsOn.every((dep) => done.has(dep))
  );
}
