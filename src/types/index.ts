export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  is_super_admin?: boolean;
  needs_password_set?: boolean;
  email_confirmed_at?: string | null;
}

export interface Class {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor?: string;
  thumbnailUrl: string;
  instructorImage?: string;
  instructorBio?: string;
  schedule_data?: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    location: string;
  };
  modules: Module[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  slideUrl?: string;
  slide_pdf_url?: string;
  order: number;
  resources: Resource[];
}

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'word' | 'excel' | 'video' | 'link';
  url?: string;
  description?: string;
  file_type?: string;
  file_size?: number;
  order?: number;
  file_path?: string;
  download_count?: number;
  module_id?: string;
}

export interface Note {
  id: string;
  userId: string;
  moduleId: string;
  content: string;
  created_at: string;
  updated_at: string;
}