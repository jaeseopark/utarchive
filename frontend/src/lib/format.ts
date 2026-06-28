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

export const formatTrimRange = (start: number | null | undefined, end: number | null | undefined) => {
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
