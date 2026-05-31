import { AgentRegistryDTO } from "@/lib/dto/resource-ai";

export const agentRegistrySeed: Omit<AgentRegistryDTO, "id">[] = [
  {
    agentKey: "LessonAgent",
    displayName: "Lesson Agent",
    capabilityManifestJson: {
      description: "Assists teachers in generating and refining lesson plans.",
      requiresTeacherApproval: true,
      capabilities: ["lesson_planning", "content_generation"],
    },
    featureFlag: "lesson_agent_enabled",
    enabled: false,
  },
  {
    agentKey: "HomeworkAgent",
    displayName: "Homework Agent",
    capabilityManifestJson: {
      description: "Assists teachers in creating homework and assignments.",
      requiresTeacherApproval: true,
      capabilities: ["homework_generation", "quiz_generation"],
    },
    featureFlag: "homework_agent_enabled",
    enabled: false,
  },
  {
    agentKey: "DataAgent",
    displayName: "Data Agent",
    capabilityManifestJson: {
      description: "Analyzes student performance data and provides insights.",
      requiresTeacherApproval: true,
      capabilities: ["data_analysis", "reporting"],
    },
    featureFlag: "data_agent_enabled",
    enabled: false,
  },
  {
    agentKey: "TutorAgent",
    displayName: "Tutor Agent",
    capabilityManifestJson: {
      description: "Provides personalized tutoring to students.",
      requiresTeacherApproval: true,
      capabilities: ["tutoring", "question_answering"],
    },
    featureFlag: "tutor_agent_enabled",
    enabled: false,
  },
  {
    agentKey: "ParentAgent",
    displayName: "Parent Agent",
    capabilityManifestJson: {
      description: "Provides updates and insights to parents.",
      requiresTeacherApproval: true,
      capabilities: ["parent_communication", "progress_reporting"],
    },
    featureFlag: "parent_agent_enabled",
    enabled: false,
  },
];
