export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  first_name: string;
  card_number: string;
  expiry: string;
  security_code: string;
  email: string;
  status: SubmissionStatus;
  created_at: string;
  waiting_name: string | null;
  reviewed_at: string | null;
};

export type AppSettings = {
  id: number;
  price: number;
  updated_at: string;
};