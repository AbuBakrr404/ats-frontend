export type Stage = "applied" | "screening" | "interview" | "offer" | "rejected";

export interface Experience {
  company: string;
  period: string;
  position: string;
  duties: string[];
  reason_for_leaving: string;
}

export interface Education {
  institution: string;
  date: string;
  qualification: string;
}

export interface Reference {
  name: string;
  company: string;
  phone: string;
}

export interface Candidate {
  id: string;
  user_id: string;
  created_at: string;
  storage_path: string;
  original_name: string | null;

  first_name: string | null;
  surname: string | null;
  identity_number: string | null;
  equity: string | null;
  residential_area: string | null;
  language: string | null;
  transport: string | null;
  drivers_licence: string | null;
  current_salary: string | null;
  required_salary: string | null;
  availability: string | null;

  achievements: string[];
  computer_skills: string[];
  education: Education[];
  employment_history: Experience[];
  references_data: Reference[];

  ai_summary: string | null;
  ai_strengths: string[];
  ai_weaknesses: string[];

  stage: Stage;
  stage_changed_at: string;
  profile_storage_path: string | null;
}

export interface Job {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  required_skills: string[];
  is_open: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  candidate_id: string;
  body: string;
  created_at: string;
}
