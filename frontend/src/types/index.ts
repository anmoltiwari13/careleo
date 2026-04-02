export interface Doctor {
  id: number;
  specialization: string;
  bio?: string;
  availability?: string;
}

export interface Branding {
  logo?: string;
  colors?: string;
  description?: string;
}
