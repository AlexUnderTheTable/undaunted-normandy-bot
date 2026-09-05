export type AiGoal = "keyPoints" | "suppression";

export interface QuestionNode {
  type: "question";
  text: string;
  memo?: string | string[];
  note?: string;
  yes: TreeNode;
  no: TreeNode;
}

export interface ChoiceOption {
  label: string;
  next: TreeNode;
}

export interface ChoiceNode {
  type: "choice";
  text: string;
  memo?: string | string[];
  note?: string;
  options: ChoiceOption[];
}

export interface ActionNode {
  type: "action";
  text: string;
  memo?: string | string[];
  note?: string;
}

export type TreeNode = QuestionNode | ChoiceNode | ActionNode;

export interface UnitDef {
  id: string;
  name: string;
  tree?: TreeNode;
  trees?: Record<AiGoal, TreeNode>;
}

export interface UnitListEntry {
  id: string;
  name: string;
  file: string;
}

export interface CommonData {
  generalRule: string;
  reinforceRule: string;
  priorityLists: Record<string, string[]>;
  memos: Record<string, string>;
}
