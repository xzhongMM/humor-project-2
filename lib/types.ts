export type Profile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isSuperadmin: boolean;
  created: string | null;
};

export type Meme = {
  id: string;
  userId: string | null;
  imagePath: string;
  imageUrl: string;
  vibe: string;
  prompt: string;
  model: string;
  created: string | null;
  source: "user" | "bot";
  imageCredit: string | null;
  imageSourceUrl: string | null;
};

export type Caption = {
  id: string;
  content: string;
  memeId: string | null;
  profileId: string | null;
  created: string | null;
};

export type Vote = {
  id: string;
  captionId: string;
  profileId: string | null;
  value: number;
  created: string | null;
};

export type VoteSummary = { up: number; down: number; total: number; net: number };
