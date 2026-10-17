export interface Star {
  id: string;
  name: string;
  constellation: string;
  /** Apparent visual magnitude (lower is brighter). */
  magnitude: number;
  /** Right ascension in decimal hours, 0 <= ra < 24. */
  rightAscension: number;
  /** Declination in decimal degrees, -90 <= dec <= 90. */
  declination: number;
  spectralType?: string;
  createdAt: string;
  updatedAt: string;
}

export type StarInput = Omit<Star, 'id' | 'createdAt' | 'updatedAt'>;
export type StarPatch = Partial<StarInput>;

export interface StarQuery {
  constellation?: string;
  maxMagnitude?: number;
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
