export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Parse trimRange string into start and end values.
 * Format: "start,end" where either can be omitted.
 */
export const parseTrimRange = (trimRange: string | null | undefined): { start: number | null; end: number | null } => {
  if (!trimRange || trimRange.trim() === "") {
    return { start: null, end: null };
  }

  const parts = trimRange.split(",");
  const start = parts[0]?.trim() ? Number(parts[0].trim()) : null;
  const end = parts[1]?.trim() ? Number(parts[1].trim()) : null;

  if (start !== null && Number.isNaN(start)) {
    return { start: null, end: null };
  }
  if (end !== null && Number.isNaN(end)) {
    return { start: null, end: null };
  }

  return { start, end };
};

export const formatTrimRange = (trimRange: string | null | undefined) => {
  const { start, end } = parseTrimRange(trimRange);

  if (start == null || end == null) {
    return null;
  }

  const formatSeconds = (value: number) => {
    const whole = Math.max(0, Math.floor(value));
    const minutes = Math.floor(whole / 60);
    const seconds = whole % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return `${formatSeconds(start)} → ${formatSeconds(end)}`;
};

export const combineAliases = (aliases: string[] | undefined | null) => {
  if (!aliases || aliases.length === 0) {
    return null;
  }

  return aliases.join(', ');
};
