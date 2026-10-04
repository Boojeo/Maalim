import { readCurriculumFile, readPassagesFile, readVideosFile } from "./content-files";
import { isPlaceholder } from "./types";

export interface ConceptStatus {
  id: string;
  title_en: string;
  level: string;
  reviewed_by: string | null;
  passages: number;
  placeholders: number;
  verified: number;
  videos: { id: string; kind: string; permission: string; credit: string; timestampsVerified: boolean }[];
}

export function contentStatus(): ConceptStatus[] {
  const { concepts } = readCurriculumFile();
  const passages = readPassagesFile();
  const videos = readVideosFile();
  return concepts.map((c) => {
    const ps = passages.filter((p) => p.concept_id === c.id);
    return {
      id: c.id,
      title_en: c.title_en,
      level: c.level,
      reviewed_by: c.reviewed_by,
      passages: ps.length,
      placeholders: ps.filter((p) => isPlaceholder(p.text)).length,
      verified: ps.filter((p) => p.verified && !isPlaceholder(p.text)).length,
      videos: videos
        .filter((v) => v.concept_id === c.id)
        .map((v) => ({
          id: v.id,
          kind: v.kind,
          permission: v.permission,
          credit: v.creator_credit,
          timestampsVerified: v.timestamps_verified,
        })),
    };
  });
}
