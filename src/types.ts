export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  instructor: string;
  category: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  video_url: string;
  duration: string;
  order_index: number;
}

export interface Enrollment {
  user_id: number;
  course_id: number;
  enrolled_at: string;
}
